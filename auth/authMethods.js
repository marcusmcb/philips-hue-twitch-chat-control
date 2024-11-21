const axios = require('axios')

// helper method to refresh Twitch access token
// for later storage in local .env file if necessary
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

// helper method to get active subscriptions
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
		return response.data.data // return the list of active subscriptions
	} catch (error) {
		console.error(
			'Error fetching subscriptions:',
			error.response?.data || error.message
		)
		throw error
	}
}

module.exports = {
  refreshTwitchToken,
  getActiveSubscriptions,
}