const axios = require('axios')

const ids = [1]
const lightEffectControl = {}

const turnLightOnOrOff = async (lightId, on, hue, sat, bri, effect) => {
	console.log('EFFECT: ', effect)
	console.log('HUE: ', hue)
	lightEffectControl[lightId] = false
	try {
		// turns off any color effects present *first*
		await axios.put(
			`http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
			{
				on,
				...(effect && { effect }),
			}
		)
		// ...then sets to fixed color properties
		await axios.put(
			`http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
			{
				on,
				...(sat && { sat }),
				...(bri && { bri }),
				...(hue && { hue }),
			}
		)
	} catch (err) {
		console.error(err)
	}
}

const turnLightMorphOn = async (lightId, on, hue, sat, bri, effect) => {
	console.log('EFFECT: ', effect)
	console.log('HUE: ', hue)
	lightEffectControl[lightId] = false
	try {
		return await axios.put(
			`http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
			{
				on,
				...(sat && { sat }),
				...(bri && { bri }),
				...(hue && { hue }),
				...(effect && { effect }),
			}
		)
	} catch (err) {
		console.error(err)
	}
}

const setLightsToMorph = () => {
	ids.forEach((id) => {
		const hue = Math.floor(Math.random() * 65535) + 1
		const sat = 200
		const bri = 200
		const effect = 'colorloop'
		turnLightMorphOn(id, true, hue, sat, bri, effect)
	})
}

const turnLightsOnOrOff = (on) => {
	ids.forEach((id) => turnLightOnOrOff(id, on))
}

const setLightsToRandomColors = () => {
	ids.forEach((id) => {
		const hue = Math.floor(Math.random() * 65535) + 1
		const sat = 200
		const bri = 200
		const effect = 'none'
		turnLightOnOrOff(id, true, hue, sat, bri, effect)
	})
}

const setLightsToColor = (color) => {
	let hueValue	
	if (color == 'teal') {
		hueValue = 31421
	}
	if (color == 'pink') {
		hueValue = 60364
	}
	if (color == 'green') {
		hueValue = 25000
	}
	if (color == 'purple') {
		hueValue = 48500
	}
	if (color == 'red') {
		hueValue = 65000
	}
	if (color == 'gold') {
		hueValue = 11000
	}
	if (color == 'blue') {
		hueValue = 40000
	}
	if (color == 'peach') {
		hueValue = 2500
	}

	ids.forEach((id) => {
		const hue = hueValue
		const sat = 200
		const bri = 200
		const effect = 'none'
		turnLightOnOrOff(id, true, hue, sat, bri, effect)
	})
}

// requires more than one hue fixture for the effect to display properly
const setLightsForChristmas = () => {
	lightEffectControl[lightId] = false
	turnLightOnOrOff(ids[0], true, 27306, 150, 175)
	turnLightOnOrOff(ids[1], true, 1, 150, 175)
}

const simulateCandle = async (lightId) => {
	lightEffectControl[lightId] = true 
	const flicker = async () => {
		if (!lightEffectControl[lightId]) return 
		const bri = Math.floor(Math.random() * 20) + 200 
		const ct = Math.floor(Math.random() * 80) + 440 
		try {
			await axios.put(
				`http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
				{ on: true, bri, ct }
			)
			setTimeout(flicker, 200 + Math.random() * 200)
		} catch (err) {
			console.error(err)
		}
	}
	flicker()
}

const setLightsToCandleEffect = () => {
	ids.forEach((id) => simulateCandle(id))
}

const simulateFireplace = async (lightId) => {
	lightEffectControl[lightId] = true
	const flicker = async () => {
		if (!lightEffectControl[lightId]) return 
		const bri = Math.floor(Math.random() * 64) + 160 
		const ct = Math.floor(Math.random() * 120) + 400 
		try {
			await axios.put(
				`http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
				{ on: true, bri, ct }
			)
			setTimeout(flicker, 100 + Math.random() * 150)
		} catch (err) {
			console.error(err)
		}
	}
	flicker()
}

const setLightsToFireplaceEffect = () => {
	ids.forEach((id) => simulateFireplace(id))
}

const simulateTrafficLight = async (lightId) => {
	lightEffectControl[lightId] = true 
	const changeColor = async (hue, duration) => {
		if (!lightEffectControl[lightId]) return 
		try {
			await axios.put(
				`http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
				{ on: true, bri: 254, hue: hue }
			)
		} catch (err) {
			console.error(err)
		}
		return new Promise((resolve) => setTimeout(resolve, duration))
	}

	const cycleColors = async () => {
		if (!lightEffectControl[lightId]) return 
		await changeColor(25500, 5000) 
		await changeColor(12750, 2000) 
		await changeColor(0, 5000) 
		cycleColors() 
	}

	cycleColors()
}

const setLightsToTrafficLightEffect = () => {
	ids.forEach((id) => simulateTrafficLight(id))
}

module.exports = {
	setLightsForChristmas,
	setLightsToRandomColors,
	turnLightsOnOrOff,
	setLightsToColor,
	setLightsToMorph,
	setLightsToCandleEffect,
	setLightsToFireplaceEffect,
  setLightsToTrafficLightEffect
}
