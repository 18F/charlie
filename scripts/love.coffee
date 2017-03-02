# Description:
#   For the giving of praise and thanks to colleagues.
#   Looks for messages like "love @username for [reason]", acknowledges them,
#   and copies them to #love.
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   None

module.exports = (robot) ->

  robot.hear /^\s*(love|<3|:heart\w*:)\s+((@[\w\-]+\s*)+)(.*)$/i, (msg) ->
    lover = msg.message.user.name
    lovees = msg.match[2].trim()
    action = msg.match[4]
    room = "love"
    robot.messageRoom room, lover + " loves " + lovees + ": " + action
    msg.send "Yay, more love for #love! Thanks, #{lover}!"
