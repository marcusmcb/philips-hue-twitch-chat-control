const axios = require('axios')
const generateAuthHeader = require('../auth/generateAuthHeader')

const HUE_CLIENT_ID = process.env.HUE_CLOUD_APP_CLIENT_ID
const HUE_CLIENT_SECRET = process.env.HUE_CLOUD_APP_CLIENT_SECRET

const updateHerokuConfigVar = async (key, value) => {
	const HEROKU_API_TOKEN = process.env.HEROKU_API_TOKEN // Long-lived token
	const HEROKU_APP_NAME = process.env.HEROKU_APP_NAME

	if (!HEROKU_API_TOKEN || !HEROKU_APP_NAME) {
		console.error('HEROKU_API_TOKEN or HEROKU_APP_NAME is missing.')
		return
	}

	try {
		const response = await axios.patch(
			`https://api.heroku.com/apps/${HEROKU_APP_NAME}/config-vars`,
			{ [key]: value },
			{
				headers: {
					Authorization: `Bearer ${HEROKU_API_TOKEN}`,
					Accept: 'application/vnd.heroku+json; version=3',
				},
			}
		)
		console.log(`Heroku config var ${key} updated successfully:`, response.data)
	} catch (error) {
		console.error(
			'Error updating Heroku config var:',
			error.response?.data || error.message
		)
	}
}

// helper method to refresh Hue cloud API access token
const refreshHueToken = async () => {
	console.log('Hue Refresh Token: ', process.env.HUE_REFRESH_TOKEN)
	console.log('Hue Client ID: ', HUE_CLIENT_ID)
	console.log('Hue Client Secret: ', HUE_CLIENT_SECRET)
	try {
		const response = await axios.post(
			'https://api.meethue.com/v2/oauth2/token',
			`grant_type=refresh_token&refresh_token=${process.env.HUE_REFRESH_TOKEN}`,
			{
				headers: {
					Authorization: generateAuthHeader(HUE_CLIENT_ID, HUE_CLIENT_SECRET),
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		)

		const { access_token, refresh_token } = response.data

		// Dynamically update tokens in Heroku config vars
		await updateHerokuConfigVar('HUE_ACCESS_TOKEN', access_token)
		await updateHerokuConfigVar('HUE_REFRESH_TOKEN', refresh_token)

		console.log('Hue tokens refreshed and updated in Heroku successfully')
	} catch (error) {
		console.error(
			'Error refreshing Hue token:',
			error.response?.data || error.message
		)
	}
}

const sendHueAPIRequest = async (endpoint, method = 'GET', data = null) => {
	try {
		const response = await axios({
			url: `https://api.meethue.com/bridge/${process.env.HUE_BRIDGE_USERNAME}/${endpoint}`,
			method,
			headers: {
				Authorization: `Bearer ${process.env.HUE_ACCESS_TOKEN}`,
				'Content-Type': 'application/json',
			},
			data,
		})
		console.log('HUE RESPONSE', response.data)
		return response.data
	} catch (error) {
		if (error.response?.status === 401) {
			console.log('*** HUE ERROR ***')
			console.log('Access token expired, refreshing...')
			await refreshHueToken()
			return sendHueAPIRequest(endpoint, method, data) // retry with refreshed token
		}
		console.error(
			'Error sending Hue API request:',
			error.response?.data || error.message
		)
	}
}

module.exports = sendHueAPIRequest
