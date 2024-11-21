// helper method to generate auth header for token exchange
const generateAuthHeader = (clientId, clientSecret) => {
	const authString = `${clientId}:${clientSecret}`
	return `Basic ${Buffer.from(authString).toString('base64')}`
}

module.exports = generateAuthHeader