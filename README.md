# Philips Hue Twitch Chat Control

The index.js file is a simple Node script that you can use to integrate a !lights chat command to your Twitch channel.

### Chat Commands

<li>!flarby (to test tmi.js connection to Twitch chat)</li>
<li>!colors (option)</li>

### Options:

<li>on</li>
<li>off</li>
<li>random</li>
<li>green</li>
<li>pink</li>
<li>teal</li>
<li>purple</li>
<li>red</li>
<li>gold</li>
<li>blue</li>
<li>peach</li>

<hr>

## What You'll Need:

Node <a href='https://nodejs.org/en/'>14.x</a> installed.

<hr>

#### Hue components, configs, and setup

You'll need a Philips Hue Bridge component and at least one compatible smart lighting fixture to control.  This code was tested in that scenario but is written to support all lights connected to the Bridge (though not tested as yet).

You'll also need to find the address of your Bridge component on your local network, set up an authorized user for your Bridge, and discover the id for each light connected to the bridge.  <a href="https://developers.meethue.com/develop/get-started-2/">This</a> article has everything you'll need to cover this part.  

<hr>

#### Twitch OAuth token & connecting to the tmi.js client

To connect the tmi.js client to your Twitch channel, you'll need to generate an <a href="https://twitchapps.com/tmi/">OAuth Token</a>.  Copy and paste this value into a <a href='https://www.npmjs.com/package/dotenv'>.env file</a> in this repo's root directory.  We'll use this to secure our environment variables for both our Twitch account and our Hue lights as follows:

TWITCH_OAUTH_TOKEN='<your_oauth_token_value>'

TWITCH_BOT_USERNAME='<the_name_of_the_bot_account>'

TWITCH_CHANNEL_NAME='<your_main_channel's_name>'

HUE_BRIDGE_ADDRESS='<your_hue_bridge_address_on_your_local_network>'

HUE_AUTH_USER='<your_hue_bridge_authorized_user_name>'

<hr>

#### Node Dependencies:

* axios
* dotenv
* tmi.js
* nodemon (optional)

<hr>

#### In use:

After cloning the repo and adding the necessary .env to secure your credentials, run "npm install" to add the necessary dependencies, and then "nodemon index.js" to start the script.

Make sure your Bridge and Hue lights are both powered on and connected properly (a quick test on the mobile app to check works).  Once they are, !lights (option) sent from your Twitch chat should trigger the settings change in your connected smart lights.  The user's message (command) will also display in the script's log.

<hr>

#### Testing:

To test the script, I ran it during several live streams from the same laptop handling the stream output via OBS.  On an i7 machine with 32GB of memory no noteable system/resource or streaming-related issues were found with OBS running concurrently.

I've tested the same script during live streams via Rasperry Pi 4 on my local network (SSH in to start/stop the script) and was suprised by the performance.  I assumed some latency between command and response from the Hue fixtures via the RPi but it was negligible.

<hr>

#### Questions:

Feel free to message me with any questions regrading the script, configs/setup, or feature requests to expand the concept here.

<hr>

#### The idea here...

To create a simple Node script for you to run locally that adds Hue smart-lighting control functionally to your Twitch channel. 

Marcus McBride, 2022.
