const tmi = require('tmi.js')
const express = require('express')
const axios = require('axios')
const dotenv = require('dotenv')
const crypto = require('crypto')

dotenv.config()

const {
	setLightsToRandomColors,
	setLightsToColor,
	setLightsToMorph,
	setLightsToCandleEffect,
} = require('./hueLights')

const app = express()
const PORT = process.env.PORT || 5000

// Philips Hue API credentials from .env file
const HUE_CLIENT_ID = process.env.HUE_CLOUD_APP_CLIENT_ID
const HUE_CLIENT_SECRET = process.env.HUE_CLOUD_APP_CLIENT_SECRET
// const HEROKU_APP_URL = 'https://a61b-107-184-172-73.ngrok-free.app'

// Function to generate Basic Auth header for token exchange
const generateBasicAuthHeader = (clientId, clientSecret) => {
	const authString = `${clientId}:${clientSecret}`
	return `Basic ${Buffer.from(authString).toString('base64')}`
}

// Global vars for rate limiting
let lastCommand
let lastUser
let commandCount = 0

// Create TMI client for Twitch
const client = new tmi.Client({
	options: { debug: true },
	connection: { secure: true, reconnect: true },
	identity: {
		username: process.env.TWITCH_BOT_USERNAME,
		password: process.env.TWITCH_OAUTH_TOKEN,
	},
	channels: [process.env.TWITCH_CHANNEL_NAME],
})

// Connect TMI client
client.connect()

// Twitch Chat Commands (unchanged)
client.on('message', async (channel, tags, message, self) => {
	if (self || !message.startsWith('!')) return

	const args = message.slice(1).split(' ')
	const command = args.shift().toLowerCase()

	const runCommand = async (command, args) => {
		switch (command) {
			case 'candle':
				await setLightsToCandleEffect()
				break
			case 'lights':
				if (args[0] === 'random') {
					await setLightsToRandomColors()
				} else if (args[0] === 'test') {
					client.say(channel, 'Your light script is connected.')
				} else if (args[0] === 'morph') {
					await setLightsToMorph()
				} else if (args[0] === 'options') {
					client.say(
						channel,
						'You can choose from these lighting colors & FX: teal, pink, green, purple, red, gold, blue, peach, morph, random'
					)
				} else {
					await setLightsToColor(args[0])
				}
				break
			default:
				console.log(
					'This light script does not recognize this command: ',
					command
				)
				break
		}
	}

	if (lastCommand === command && lastUser === tags.username) {
		commandCount++
		if (commandCount > 15) return
	} else {
		lastCommand = command
		lastUser = tags.username
		commandCount = 1
	}

	runCommand(command, args)
})

const verifySignature = (req, secret) => {
	const message = `${req.header('Twitch-Eventsub-Message-Id')}${req.header(
		'Twitch-Eventsub-Message-Timestamp'
	)}${JSON.stringify(req.body)}`
	const signature = crypto
		.createHmac('sha256', secret)
		.update(message)
		.digest('hex')
	return `sha256=${signature}`
}

const getAppAccessToken = async () => {
	try {
		const response = await axios.post(
			'https://id.twitch.tv/oauth2/token',
			null,
			{
				params: {
					client_id: process.env.TWITCH_CLIENT_ID,
					client_secret: process.env.TWITCH_CLIENT_SECRET,
					grant_type: 'client_credentials', // App Access Token
				},
			}
		)

		const { access_token } = response.data
		console.log('App Access Token:', access_token)

		return access_token // Return the token for EventSub management
	} catch (error) {
		console.error(
			'Error generating App Access Token:',
			error.response?.data || error.message
		)
		throw error
	}
}

const refreshTwitchToken = async () => {
	try {
		const response = await axios.post(
			`https://id.twitch.tv/oauth2/token`,
			null,
			{
				params: {
					grant_type: 'refresh_token',
					refresh_token: process.env.TWITCH_REFRESH_TOKEN,
					client_id: process.env.TWITCH_CLIENT_ID,
					client_secret: process.env.TWITCH_CLIENT_SECRET,
				},
			}
		)

		const { access_token, refresh_token } = response.data

		// Update environment variables or secure storage
		process.env.TWITCH_ACCESS_TOKEN = access_token
		process.env.TWITCH_REFRESH_TOKEN = refresh_token

		console.log('Token refreshed successfully')
		console.log('Access Token:', access_token)
		console.log('Refresh Token:', refresh_token)
		return access_token
	} catch (error) {
		console.error(
			'Error refreshing token:',
			error.response?.data || error.message
		)
		throw error
	}
}

const getActiveSubscriptions = async (appAccessToken) => {
	try {
		const response = await axios.get(
			'https://api.twitch.tv/helix/eventsub/subscriptions',
			{
				headers: {
					'Client-ID': process.env.TWITCH_CLIENT_ID,
					Authorization: `Bearer ${appAccessToken}`,
				},
			}
		)

		// console.log('Active subscriptions:', response.data)
		return response.data.data // Return the list of active subscriptions
	} catch (error) {
		console.error(
			'Error fetching subscriptions:',
			error.response?.data || error.message
		)
		throw error
	}
}

// Function to delete all existing subscriptions
// Function to delete all existing subscriptions using the App Access Token
const deleteExistingSubscriptions = async (appAccessToken) => {
	try {
		const response = await axios.get(
			'https://api.twitch.tv/helix/eventsub/subscriptions',
			{
				headers: {
					'Client-ID': process.env.TWITCH_CLIENT_ID,
					Authorization: `Bearer ${appAccessToken}`, // Use App Access Token
				},
			}
		)

		const subscriptions = response.data.data

		// Loop through and delete all subscriptions
		for (const sub of subscriptions) {
			if (sub.type === 'channel.channel_points_custom_reward_redemption.add') {
				console.log(`Deleting subscription: ${sub.id}`)
				await axios.delete(
					`https://api.twitch.tv/helix/eventsub/subscriptions?id=${sub.id}`,
					{
						headers: {
							'Client-ID': process.env.TWITCH_CLIENT_ID,
							Authorization: `Bearer ${appAccessToken}`, // Use App Access Token
						},
					}
				)
			}
		}
	} catch (error) {
		console.error(
			'Error deleting existing subscriptions:',
			error.response?.data || error.message
		)
	}
}

// Function to create a new subscription using the App Access Token
const createEventSubSubscription = async (callbackURL, appAccessToken) => {
	try {
		console.log('Creating new subscription...')
		await deleteExistingSubscriptions(appAccessToken) // Delete old subscriptions first

		const response = await axios.post(
			'https://api.twitch.tv/helix/eventsub/subscriptions',
			{
				type: 'channel.channel_points_custom_reward_redemption.add',
				version: '1',
				condition: {
					broadcaster_user_id: process.env.TWITCH_BROADCASTER_ID,
				},
				transport: {
					method: 'webhook',
					callback: callbackURL,
					secret: process.env.TWITCH_EVENTSUB_SECRET,
				},
			},
			{
				headers: {
					'Client-ID': process.env.TWITCH_CLIENT_ID,
					Authorization: `Bearer ${appAccessToken}`, // Use App Access Token
					'Content-Type': 'application/json',
				},
			}
		)

		console.log('Subscription created:', response.data)
	} catch (error) {
		console.error(
			'Error creating subscription:',
			error.response?.data || error.message
		)
	}
}

const getNgrokURL = async () => {
	try {
		const response = await axios.get('http://127.0.0.1:4040/api/tunnels')
		const tunnels = response.data.tunnels
		const httpsTunnel = tunnels.find((tunnel) => tunnel.proto === 'https')
		return httpsTunnel.public_url
	} catch (error) {
		console.error('Error fetching ngrok URL:', error.message)
		throw new Error('Ngrok must be running locally')
	}
}

;(async () => {
	try {
		// 1. Fetch the current ngrok URL for testing purposes
		const ngrokURL = await getNgrokURL() // Dynamically fetch ngrok URL
		console.log(`Using ngrok URL: ${ngrokURL}`)

		// 2. Obtain a valid App Access Token
		const appAccessToken = await getAppAccessToken()

		// 3. Use the App Access Token to create the EventSub subscription
		await createEventSubSubscription(`${ngrokURL}/webhook`, appAccessToken)
	} catch (error) {
		console.error('Error setting up EventSub subscription:', error.message)
	}
})()

// EventSub webhook endpoint
// EventSub webhook endpoint
app.post('/webhook', express.json(), async (req, res) => {
	const secret = process.env.TWITCH_EVENTSUB_SECRET

	// Verify the signature
	const expectedSignature = verifySignature(req, secret)
	const actualSignature = req.header('Twitch-Eventsub-Message-Signature')

	if (expectedSignature !== actualSignature) {
		console.log('Invalid signature')
		return res.status(403).send('Forbidden') // Respond with 403 if verification fails
	} else {
		console.log('Valid signature')
	}

	// Identify the type of message
	const messageType = req.header('Twitch-Eventsub-Message-Type')
	console.log('Message Type:', messageType)

	if (messageType === 'webhook_callback_verification') {
		console.log('Handling verification request')

		// Respond with the challenge string
		res.status(200).send(req.body.challenge)
		console.log('Verification challenge sent')
		return // Ensure no further processing occurs
	} else if (messageType === 'notification') {
		console.log('Handling notification')
		const event = req.body.event

		// Log the event and handle redemption logic
		if (event.type === 'channel.channel_points_custom_reward_redemption.add') {
			console.log(`Redemption received: ${event.reward.title}`)
			console.log(`User: ${event.user_name}`)
			console.log(`Input: ${event.user_input || 'None'}`)

			// Example: Trigger a light effect based on the reward title
			if (event.reward.title === 'Candle Effect') {
				await setLightsToCandleEffect()
			} else if (event.reward.title === 'Morph Lights') {
				await setLightsToMorph()
			} else if (event.reward.title === 'Random Colors') {
				await setLightsToRandomColors()
			} else if (event.reward.title === 'Custom Color') {
				const color = event.user_input.toLowerCase()
				await setLightsToColor(color)
			} else {
				console.log('Unknown redemption reward')
			}
		}

		// Acknowledge receipt of the event
		res.status(200).end()
		return
	} else {
		console.log(`Unknown message type: ${messageType}`)
		res.status(400).send('Unknown message type')
		return
	}
})

// endpoint to handle Philips Hue authorization callback
app.get('/auth/callback', async (req, res) => {
	const authCode = req.query.code

	if (!authCode) {
		return res.status(400).send('Authorization code not found.')
	}

	console.log('Authorization Code:', authCode)

	try {
		// Exchange the authorization code for tokens
		const response = await axios.post(
			'https://api.meethue.com/v2/oauth2/token',
			`grant_type=authorization_code&code=${authCode}&redirect_uri=http://localhost:5000/auth/callback`,
			{
				headers: {
					Authorization: generateBasicAuthHeader(
						HUE_CLIENT_ID,
						HUE_CLIENT_SECRET
					),
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		)

		const { access_token, refresh_token } = response.data

		console.log('Access Token:', access_token)
		console.log('Refresh Token:', refresh_token)

		// Save tokens to a secure place (e.g., .env or a database)
		res.send('Tokens generated successfully. Check your console for details.')
	} catch (error) {
		console.error(
			'Error exchanging authorization code:',
			error.response?.data || error.message
		)
		res.status(500).send('Failed to exchange authorization code.')
	}
})

// Start Express server
app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}`)
})
