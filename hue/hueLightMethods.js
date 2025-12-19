const sendHueAPIRequest = require('../helpers/hueCloudAPI')

const ids = [1] // Replace with your light IDs
const lightEffectControl = {}
const christmasEffectTimers = {}

const stopChristmasEffect = (lightId) => {
	const entry = christmasEffectTimers[lightId]
	if (!entry) return
	const timerId = typeof entry === 'number' ? entry : entry.timerId
	if (timerId) clearInterval(timerId)
	delete christmasEffectTimers[lightId]
}

const turnLightOnOrOff = async (lightId, on, hue, sat, bri, effect) => {
	console.log('EFFECT: ', effect)
	console.log('HUE: ', hue)
	lightEffectControl[lightId] = false
	stopChristmasEffect(lightId)

	try {
		// turns off any color effects first
		await sendHueAPIRequest(`lights/${lightId}/state`, 'PUT', {
			on,
			...(effect && { effect }),
		})

		// then sets fixed color properties
		await sendHueAPIRequest(`lights/${lightId}/state`, 'PUT', {
			on,
			...(sat && { sat }),
			...(bri && { bri }),
			...(hue && { hue }),
		})
	} catch (err) {
		console.error(err)
	}
}

const turnLightMorphOn = async (lightId, on, hue, sat, bri, effect) => {
	console.log('EFFECT: ', effect)
	console.log('HUE: ', hue)
	lightEffectControl[lightId] = false
	stopChristmasEffect(lightId)

	try {
		return await sendHueAPIRequest(`lights/${lightId}/state`, 'PUT', {
			on,
			...(sat && { sat }),
			...(bri && { bri }),
			...(hue && { hue }),
			...(effect && { effect }),
		})
	} catch (err) {
		console.error(err)
	}
}

const setLightsToMorph = () => {
	ids.forEach((id) => {
		const hue = Math.floor(Math.random() * 65535) + 1
		const sat = 200
		const bri = 100
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
		const bri = 100
		const effect = 'none'
		turnLightOnOrOff(id, true, hue, sat, bri, effect)
	})
}

const startChristmasMorphForLight = async (lightId, options = {}) => {
	const {
		redHue = 65000,
		greenHue = 25000,
		sat = 200,
		bri = 100,
		fadeSeconds = 2,
		pauseSeconds = 2,
	} = options

	stopChristmasEffect(lightId)
	lightEffectControl[lightId] = false

	const transitiontime = Math.max(1, Math.round(fadeSeconds * 10)) // deciseconds
	const periodMs = Math.max(250, Math.round((fadeSeconds + pauseSeconds) * 1000))

	let isRed = true
	const setTarget = async (targetHue) => {
		try {
			await sendHueAPIRequest(`lights/${lightId}/state`, 'PUT', {
				on: true,
				effect: 'none',
				hue: targetHue,
				sat,
				bri,
				transitiontime,
			})
		} catch (err) {
			console.error(err)
		}
	}

	// Kick off immediately, then alternate targets on a fixed cadence.
	await setTarget(redHue)
	const timerId = setInterval(async () => {
		isRed = !isRed
		await setTarget(isRed ? redHue : greenHue)
	}, periodMs)

	christmasEffectTimers[lightId] = { timerId }
}

const setLightsToChristmas = () => {
	ids.forEach((id) => {
		startChristmasMorphForLight(id)
	})
}

const setLightsToColor = (color) => {
	const colorMap = {
		aqua: 31421,
		pink: 60364,
		green: 25000,
		purple: 48500,
		red: 65000,
		gold: 11000,
		blue: 40000,
		peach: 2500,
	}

	const hueValue = colorMap[color]
	if (!hueValue) {
		console.error(`Unknown color: ${color}`)
		return
	}

	ids.forEach((id) => {
		const sat = 200
		const bri = 100
		const effect = 'none'
		turnLightOnOrOff(id, true, hueValue, sat, bri, effect)
	})
}

const simulateCandle = async (lightId) => {
	lightEffectControl[lightId] = true
	const flicker = async () => {
		if (!lightEffectControl[lightId]) return
		const bri = Math.floor(Math.random() * 20) + 200
		const ct = Math.floor(Math.random() * 80) + 440

		try {
			await sendHueAPIRequest(`lights/${lightId}/state`, 'PUT', {
				on: true,
				bri,
				ct,
			})
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

// other light methods (fireplace, traffic light, etc.)

module.exports = {
	setLightsToMorph,
	setLightsToRandomColors,
	setLightsToChristmas,
	turnLightsOnOrOff,
	setLightsToColor,
	setLightsToCandleEffect,
}
