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
#   @afeld and @wslack

module.exports = (robot) ->
  console.log("XPOST script loaded.")
  robot.hear /\bxpost #([\w\-]+)/i, (msg) ->
    target = msg.match[1]
    poster = msg.message.user.name
    text = msg.message.text
#    console.log("cross-posting to #{target}")
#    console.log(msg)
    robot.messageRoom(target, "XPOST from " + poster + " in " + msg.message.room + " -- " + text)
    msg.send "cross-posted to #{target}; Thanks, #{poster}!"
