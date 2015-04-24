# Description:
#   Hugme is the most important thing in life
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot hug me - Receive a hug
#   hubot hug bomb N - get N hugs

module.exports = (robot) ->

  hug_count = parseInt(process.env.HUG_COUNT)
  base_url = process.env.HUG_BASE_URL

  randomHug = ->
    hug = Math.floor(Math.random() * hug_count)
    base_url + hug + ".jpg"

  robot.respond /hug me/i, (msg) ->
    msg.send randomHug()

  robot.respond /hug bomb( (\d+))?/i, (msg) ->
    count = msg.match[2] || 
    if count > hug_count
      count = hug_count
    (msg.send randomHug() for i in [1..count])

  robot.respond /how many hugs are there/i, (msg) ->
    msg.send "There are #{hug_count} hugs."

