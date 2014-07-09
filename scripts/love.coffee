# Description:
#   Love is the script which captures lines like "I love donuts"
#   and places the content in the channel of your choosing, eg. #love
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

  robot.hear /^\s*love\s+(@\w+\s*)+(.*)$/, (msg) ->
    lover = msg.message.user.name
    lovee = msg.match[1]
    action = msg.match[2]
    room = "#love"
    robot.messageRoom room, lover + " loves " + lovee + "because " + action
    
