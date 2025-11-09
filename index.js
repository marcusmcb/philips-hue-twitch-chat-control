// const tmi = require('tmi.js')
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
} = require('./hue/hueLightMethods')

const getNgrokURL = require('./helpers/getNgrokURL')
const verifySignature = require('./helpers/verifySignature')
const generateAuthHeader = require('./auth/generateAuthHeader')
const createEventSubSubscription = require('./helpers/eventSubHandlers')
const refreshHueToken = require('./helpers/hueCloudAPI')
const HUE_CALLBACK_URL = 'http://localhost:5000/auth/callback'

const app = express()
const PORT = process.env.PORT || 5000

const HUE_CLIENT_ID = process.env.HUE_CLOUD_APP_CLIENT_ID
const HUE_CLIENT_SECRET = process.env.HUE_CLOUD_APP_CLIENT_SECRET
const HEROKU_URL = process.env.HEROKU_URL

const isDev = process.env.NODE_ENV !== 'production'

// // global vars for rate limiting
// let lastCommand
// let lastUser
// let commandCount = 0

// // tmi.js client for Twitch
// const client = new tmi.Client({
// 	options: { debug: true },
// 	connection: { secure: true, reconnect: true },
// 	identity: {
// 		username: process.env.TWITCH_BOT_USERNAME,
// 		password: process.env.TWITCH_OAUTH_TOKEN,
// 	},
// 	channels: [process.env.TWITCH_CHANNEL_NAME],
// })

// client.connect()

// // original tmi.js chat command listener
// client.on('message', async (channel, tags, message, self) => {
// 	if (self || !message.startsWith('!')) return

// 	const args = message.slice(1).split(' ')
// 	const command = args.shift().toLowerCase()

// 	const runCommand = async (command, args) => {
// 		switch (command) {
// 			case 'candle':
// 				await setLightsToCandleEffect()
// 				break
// 			case 'lights':
// 				if (args[0] === 'random') {
// 					await setLightsToRandomColors()
// 				} else if (args[0] === 'test') {
// 					client.say(channel, 'Your light script is connected.')
// 				} else if (args[0] === 'morph') {
// 					await setLightsToMorph()
// 				} else if (args[0] === 'options') {
// 					client.say(
// 						channel,
// 						'You can choose from these lighting colors & FX: teal, pink, green, purple, red, gold, blue, peach, morph, random'
// 					)
// 				} else {
// 					await setLightsToColor(args[0])
// 				}
// 				break
// 			default:
// 				console.log(
// 					'This light script does not recognize this command: ',
// 					command
// 				)
// 				break
// 		}
// 	}

// 	if (lastCommand === command && lastUser === tags.username) {
// 		commandCount++
// 		if (commandCount > 15) return
// 	} else {
// 		lastCommand = command
// 		lastUser = tags.username
// 		commandCount = 1
// 	}

// 	runCommand(command, args)
// })

// method to return app-level access token
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
		return access_token
	} catch (error) {
		console.error(
			'Error generating App Access Token:',
			error.response?.data || error.message
		)
		throw error
	}
}

// IIFE to set up the EventSub subscription
;(async () => {
	try {
		const callbackURL = isDev
			? `${await getNgrokURL()}/webhook` // Dev URL
			: `${HEROKU_URL}/webhook` // Prod URL

		console.log(`Using callback URL: ${callbackURL}`)

		const appAccessToken = await getAppAccessToken()
		await createEventSubSubscription(callbackURL, appAccessToken)
		// await refreshHueToken()
	} catch (error) {
		console.error('Error setting up EventSub subscription:', error.message)
	}
})()

app.use(
	express.json({
		verify: (req, res, buf) => {
			req.rawBody = buf // store the raw body as a buffer
		},
	})
)

// webhook handler for channel point redemption events and
// channel eventsub subscription verification
app.post('/webhook', async (req, res) => {
	console.log('Raw Body:', req.rawBody.toString())
	console.log('-----------------')

	// verify the signature of the incoming notification
	const secret = process.env.TWITCH_EVENTSUB_SECRET
	const expectedSignature = verifySignature(req, secret)
	const actualSignature = req.header('Twitch-Eventsub-Message-Signature')

	if (
		!crypto.timingSafeEqual(
			Buffer.from(expectedSignature),
			Buffer.from(actualSignature || '')
		)
	) {
		console.error('Invalid signature')
		return res.status(403).send('Forbidden')
	} else {
		console.log('Valid signature')
	}

	// process the message type
	const messageType = req.header('Twitch-Eventsub-Message-Type')
	console.log('Message Type:', messageType)

	if (messageType === 'webhook_callback_verification') {
		try {
			const challenge = req.body.challenge
			res.set('Content-Type', 'text/plain').status(200).send(challenge)
			console.log('Verification challenge sent')
		} catch (error) {
			console.error('Error handling verification:', error.message)
			res.status(500).send('Internal Server Error')
		}
	} else if (messageType === 'notification') {
		console.log('Handling notification')
		console.log('Event Type: ', req.body.subscription.type)
		console.log('Channel Point Redemption Name: ', req.body.event.reward.title)

		switch (req.body.event.reward.title.toLowerCase()) {
			case 'aqua':
				await setLightsToColor('aqua')
				break
			case 'pink':
				await setLightsToColor('pink')
				break
			case 'green':
				await setLightsToColor('green')
				break
			case 'purple':
				await setLightsToColor('purple')
				break
			case 'red':
				await setLightsToColor('red')
				break
			case 'gold':
				await setLightsToColor('gold')
				break
			case 'blue':
				await setLightsToColor('blue')
				break
			case 'peach':
				await setLightsToColor('peach')
				break
			case 'morph':
				await setLightsToMorph()
				break
			case 'candle':
				await setLightsToCandleEffect()
				break
			case 'random':
				await setLightsToRandomColors()
				break
			default:
				console.log(`Unknown reward title: ${req.body.event.reward.title}`)
				break
		}
		res.status(204).end()
	} else {
		console.error(`Unknown message type: ${messageType}`)
		res.status(400).send('Unknown message type')
	}
})

app.get('/hue/authorize', (req, res) => {
	const hueAuthURL = `https://api.meethue.com/v2/oauth2/authorize?client_id=${HUE_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
		HUE_CALLBACK_URL
	)}`

	console.log('Redirecting to Hue authorization URL:', hueAuthURL)

	// Redirect user to Hue authorization URL
	res.redirect(hueAuthURL)
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
					Authorization: generateAuthHeader(HUE_CLIENT_ID, HUE_CLIENT_SECRET),
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		)
		const { access_token, refresh_token } = response.data
		console.log('Access Token:', access_token)
		console.log('Refresh Token:', refresh_token)
		// store the token values in the local .env file
		// or as environment vars in your hosted environment
		res.send('Tokens generated successfully. Check your console for details.')
	} catch (error) {
		console.error(
			'Error exchanging authorization code:',
			error.response?.data || error.message
		)
		res.status(500).send('Failed to exchange authorization code.')
	}
})

app.listen(PORT, () => {
	console.log(`Listening on http://localhost:${PORT}`)
})
