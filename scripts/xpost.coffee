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

isInChannel = (robot, channel) ->
  new Promise((resolve, reject) ->
    robot.adapter.client.web.channels.list (err, res) ->
      if err
        return reject(err)
      else if !res.ok
        return reject(new Error('Unknown error with Slack API'))

      channelID = null;
      target = res.channels.filter((c) ->
        if c.name == channel
          channelID = c.id
          if c.is_member
            return true
        false
      )
      resolve
        inChannel: target.length > 0
        channelID: channelID
      return
    return
)

module.exports = (robot) ->
  robot.hear /\bx\-?post/i, (msg) ->
    messagePieces = msg.message.text.match /\bx\-?post (to |in )?#([\w\-]+)/i

    # If the above regex matches, then the xpost request is validly formed
    if messagePieces
      target = messagePieces[2]

      if !msg.message.room.startsWith('C')
        msg.send 'Sorry, I can only XPOST from public channels!'
        return

      poster = msg.message.user.id
      text = msg.message.text.replace(msg.match[0], '').trim()

      isInChannel(robot, target).then((result) ->
        if result.inChannel
          robot.messageRoom target,
            attachments: [ {
              fallback: text
              color: '#36a64f'
              title: 'XPOST from <#' + msg.message.room + '>:'
              footer: "from: <@#{poster}>"
              text: text
            } ]
            channel: target
          msg.send "cross-posted to <##{result.channelID}>; Thanks <@#{poster}>!"
        else
          msg.send "I can't cross-post to <##{result.channelID}> because I'm not in there!"
        return
      ).catch (err) ->
        msg.send "Something went wrong!"
        return
    # If the regex didn't match, tell the user how to use xpost
    # if they are in a public channel
    else if msg.message.room.startsWith('C')
      msg.send "XPOST usage: `<your message> XPOST #channel`"
