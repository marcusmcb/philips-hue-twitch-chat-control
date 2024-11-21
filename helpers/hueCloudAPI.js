const axios = require('axios')

// helper method to refresh Hue cloud API access token
const refreshHueToken = async () => {
	console.log('ACCESS TOKEN? ', process.env.HUE_ACCESS_TOKEN)
	try {
		const response = await axios.post(
			'https://api.meethue.com/v2/oauth2/token',
			`grant_type=refresh_token&refresh_token=${process.env.HUE_REFRESH_TOKEN}`,
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
		// update the .env if necessary or store tokens securely
		process.env.HUE_ACCESS_TOKEN = access_token
		process.env.HUE_REFRESH_TOKEN = refresh_token
		console.log('Token refreshed successfully')
	} catch (error) {
		console.error(
			'Error refreshing token:',
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