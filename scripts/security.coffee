# Description:
#   When someone writes a message with "https://fugacious.18f.gov/m/" or "fugacio.us/m/", post a warning.
#
# Dependencies: none
#
# Configuration: none
#
# Commands:
#   mention "https://fugacious.18f.gov/m/" in any message
#
# Notes: none
#
# Author:
#   @wslack

module.exports = (robot) ->
  robot.hear /(https?:\/\/)?(fugacious.18f.gov\/m\/)/i, (msg) ->
    msg.send "Please kindly keep your Fugacious links to DMs only."
  robot.hear /(https?:\/\/)?(fugacio.us\/m\/)/i, (msg) ->
    msg.send "Please kindly use https://fugacious.18f.gov and keep your Fugacious links to DMs only."
