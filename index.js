const axios = require('axios')
const tmi = require('tmi.js')
const dotenv = require('dotenv')

// import hue smart lighting functions
const {
  setLightsToRandomColors,
  turnLightsOnOrOff,
  setLightsToColor,
} = require('./hueLights')

// secure twitch oauth token for tmi
dotenv.config()

// create tmi instance
const client = new tmi.Client({
  options: { debug: true },
  connection: {
    secure: true,
    reconnect: true,
  },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: [process.env.TWITCH_CHANNEL_NAME],
})

client.connect()

// chat command listener
client.on('message', (channel, tags, message, self) => {
  console.log('MESSAGE: ', message)
  if (self || !message.startsWith('!')) {
    return
  }

  const args = message.slice(1).split(' ')
  const command = args.shift().toLowerCase()  

  switch (command) {
    case 'flarby':
      client.say(channel, 'WORKING')
      break

    // commands for hue lights
    case 'lights':
      // check for lighting command option
      if (args.length != 0) {
        // !lights on
        if (args == 'on') {
          turnLightsOnOrOff(true)
          break
        }
        // !lights off
        if (args == 'off') {
          turnLightsOnOrOff(false)
          break
        }
        // !lights random
        if (args == 'random') {
          setLightsToRandomColors()
          break
        }
        // !lights (color)
        if (
          args == 'green' ||
          'pink' ||
          'teal' ||
          'purple' ||
          'red' ||
          'gold' ||
          'blue' ||
          'peach'
        ) {
          setLightsToColor(args)
          break
        }
      } else {
        // if empty, display options & prompt user to try again
        client.say(
          channel,
          'You can control my lighting with the following options --> on, off, random, green, blue, red, purple, pink, teal, gold, peach.'
        )
        break
      }

    // no response as default for commands that don't exist
    default:
      break
  }
})
