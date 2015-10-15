# Description:
#   When someone writes a message with "XPOST #<somechannel>", post the message to that channel. One use case is posting links to press articles that should be seen by a project team but also X-posted in #press.
#
# Dependencies: none
#
# Configuration: none
#
# Commands:
#   mention "XPOST @somechannel" in any message
#
# Notes:
#   No notes needed
#
# Author:
#   @afeld with ideas from @wslack

module.exports = (robot) ->
  console.log("XPOST script loaded.")
  robot.hear /\bxpost #([\w\-]+)/i, (msg) ->
    channel = msg.match[1]
    console.log("cross-posting to ##{channel}")

    text = msg.message.text
    robot.messageRoom(channel, text)
