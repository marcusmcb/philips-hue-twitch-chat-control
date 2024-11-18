const tmi = require('tmi.js')
const express = require('express')
const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()

const sendHueAPIRequest = require('./helpers/hueCloudAPI')

// Your bot and light control functions (as in your original script)
const {
	setLightsToRandomColors,
	turnLightsOnOrOff,
	setLightsToColor,
	setLightsToMorph,
	setLightsToCandleEffect,
	setLightsToFireplaceEffect,
	setLightsToTrafficLightEffect,
} = require('./hueLights')

const app = express()
const PORT = process.env.PORT || 5000

// Philips Hue API credentials from .env file
const HUE_CLIENT_ID = process.env.HUE_CLOUD_APP_CLIENT_ID
const HUE_CLIENT_SECRET = process.env.HUE_CLOUD_APP_CLIENT_SECRET

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
			case 'lights-test':
				client.say(channel, `Lights script is connected.`)
				break

			case 'fireplace':
				await setLightsToFireplaceEffect() // Requires a similar cloud API update in hueLights.js
				client.say(channel, 'Fireplace effect activated.')
				break

			case 'candle':
				await setLightsToCandleEffect()
				client.say(channel, 'Candle effect activated.')
				break

			case 'traffic':
				await setLightsToTrafficLightEffect() // Requires a similar cloud API update
				client.say(channel, 'Traffic light effect activated.')
				break

			case 'lights':
				if (args[0] === 'on') {
					await turnLightsOnOrOff(true)
					client.say(channel, 'Lights turned on.')
				} else if (args[0] === 'off') {
					await turnLightsOnOrOff(false)
					client.say(channel, 'Lights turned off.')
				} else if (args[0] === 'random') {
					await setLightsToRandomColors()
					client.say(channel, 'Lights set to a random color.')
				} else if (args[0] === 'morph') {
					await setLightsToMorph()
					client.say(channel, 'Lights set to morphing colors.')
				} else if (args[0] === 'options') {
					client.say(
						channel,
						'You can choose from these available lighting colors: teal, pink, green, purple, red, gold, blue, peach'
					)
				} else {
					await setLightsToColor(args[0])
					client.say(channel, `Lights set to ${args[0]}.`)
				}
				break

			default:
				client.say(channel, `Unknown command: ${command}`)
				break
		}
	}

	// const runCommand = async (command) => {
	// 	switch (command) {
	// 		case 'lights-test':
	// 			client.say(channel, `Lights script is connected.`)
	// 			break
	// 		case 'fireplace':
	// 			setLightsToFireplaceEffect()
	// 			break
	// 		case 'candle':
	// 			setLightsToCandleEffect()
	// 			break
	// 		case 'traffic':
	// 			setLightsToTrafficLightEffect()
	// 			break
	// 		case 'lights':
	// 			if (args[0] === 'on') turnLightsOnOrOff(true)
	// 			else if (args[0] === 'off') turnLightsOnOrOff(false)
	// 			else if (args[0] === 'random') setLightsToRandomColors()
	// 			else setLightsToColor(args[0])
	// 			break
	// 		default:
	// 			break
	// 	}
	// }

	if (lastCommand === command && lastUser === tags.username) {
		commandCount++
		if (commandCount > 5) return
	} else {
		lastCommand = command
		lastUser = tags.username
		commandCount = 1
	}

	runCommand(command, args)
})

// Express endpoint to handle Philips Hue authorization callback
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
