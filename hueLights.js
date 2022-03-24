const axios = require('axios')

const ids = [1]

const turnLightOnOrOff = async (lightId, on, hue, sat, bri, effect) => {  
  console.log("EFFECT: ", effect)
  console.log("HUE: ", hue)
  try {
    // turns off any color effects present *first*
    await axios.put(
      `http://${process.env.HUE_BRIDGE_ADDRESS}/api/${process.env.HUE_AUTH_USER}/lights/${lightId}/state`,
      {
        on,
        ...(effect && { effect })        
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
  console.log("EFFECT: ", effect)
  console.log("HUE: ", hue)
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
  // console.log('COLOR: ', color[0])
  // philips hue values for color command options  
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
  turnLightOnOrOff(ids[0], true, 27306, 150, 175)
  turnLightOnOrOff(ids[1], true, 1, 150, 175)
}

module.exports = {
  setLightsForChristmas,
  setLightsToRandomColors,
  turnLightsOnOrOff,
  setLightsToColor,
  setLightsToMorph
}
