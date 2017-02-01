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
#   Charlie will not tell you right now if the post has failed to the other channel (if Charlie's not there, if Charlie can't post, etc)
#
# Author:
#   @afeld and @wslack

module.exports = (robot) ->
  console.log("XPOST script loaded.")
  robot.hear /\bx\-?post #([\w\-]+)/i, (msg) ->
    if !msg.message.room.startsWith('C')
      msg.send 'Sorry, I can only XPOST from public channels!'
      return

    target = msg.match[1]
    poster = msg.message.user.id
    text = msg.message.text.replace(msg.match[0], '').trim()
    msg.send "cross-posted to #{target} (assuming I am in that channel); Thanks, <@#{poster}>!"

    robot.messageRoom target,
      attachments: [ {
        fallback: text
        color: '#36a64f'
        title: 'XPOST from <#' + msg.message.room + '>:'
        footer: "from: <@#{poster}>"
        text: text
      } ]
      channel: target
