# Description:
#   When someone writes a message with "XPOST #<somechannel>", post the message to that channel.
#
# Dependencies:
#   "<module name>": "<module version>"
#
# Configuration:
#   LIST_OF_ENV_VARS_TO_SET
#
# Commands:
#   hubot <trigger> - <what the respond trigger does>
#   <trigger> - <what the hear trigger does>
#
# Notes:
#   <optional notes required for the script>
#
# Author:
#   <github username of the original script author>

module.exports = (robot) ->
  console.log("XPOST script loaded.")
  robot.hear /\bxpost #([\w\-]+)/i, (msg) ->
    channel = msg.match[1]
    console.log("cross-posting to ##{channel}")

    text = msg.message.text
    robot.messageRoom(channel, text)
