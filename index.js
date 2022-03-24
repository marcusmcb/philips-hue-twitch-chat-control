const tmi = require('tmi.js')
const dotenv = require('dotenv')

const {
  setLightsToRandomColors,
  turnLightsOnOrOff,
  setLightsToColor,
  setLightsToMorph
} = require('./hueLights')

// global vars to track and prevent command spamming
let lastCommand
let lastUser
let commandCount = 0

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
  const channelName = channel.slice(1).split('#')

  const runCommand = (command) => {
    switch (command) {
      case 'lights-test':
        client.say(channel, `Your script is successfully connected to ${channelName}'s channel.`)
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
          // !lights options
          if (args == 'options') {
            client.say(
              channel,
              'You can control my lighting with the following options --> on, off, random, green, blue, red, purple, pink, teal, gold, peach.'
            )
          }
          // !lights morph
          if (args == 'morph') {
            setLightsToMorph()
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
  }

  // user is limited to 6 consecutive uses of each command
  // beyond that cap, user is prompted to use another command
  const rateLimited = () => {
    client.say(
      channel,
      `${tags.username}, try a different command before using that one again.`
    )
  }

  // master list of current commands in this script for our client connection to listen for
  // any commands added/updated above need to be added/updated here
  const commandList = ['lights', 'lights-test']

  // check if command is in list
  if (commandList.includes(command)) {
    // check if the same user has entered the same command consecutively more than once
    if (lastCommand == command && lastUser == tags.username) {
      console.log(true)
      commandCount++
      console.log('COMMAND COUNT: ', commandCount)
      // redirect user to another command on rate limit
      if (commandCount === 6) {
        rateLimited()
        // ignore further commands from user if spamming
      } else if (commandCount > 6) {
        return
        // run command otherwise
      } else {
        runCommand(command)
      }
      // if not, call method/function that runs switch selector, set vars and counter
    } else {
      console.log(false)
      lastCommand = command
      lastUser = tags.username
      commandCount = 1
      runCommand(command)
    }
  } else {
    // if command is not in list, reset count and return w/o response
    // we only want this script to listen for commands within the commandList
    // prevents response and rate-limiting conflicts w/other bots configured for the same channel
    commandCount = 0
    // reset args
    return
  }
})

// reference postman collections for PUT requests to change light params
