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
#
# Notes:
# Images are stored in a bucket in S3. They should be continuously numbered and .jpg.
# HUG_COUNT and HUG_BASE_URL are required

_u = require('underscore')


hug_count = parseInt(process.env.HUG_COUNT)
all_indexes = [0...hug_count]
base_url = process.env.HUG_BASE_URL

hugUrl = (n) ->
  base_url + n + ".jpg"

hugBomb = (count, msg) ->
  if count > hug_count
    count = hug_count
  # send unique URLs
  selected = _u.sample(all_indexes, count)
  for i in selected
    url = hugUrl(i)
    msg.send(url)


module.exports = (robot) ->
  robot.respond /hug me/i, (msg) ->
    hugBomb(1, msg)

  robot.respond /hug bomb( (\d+))?/i, (msg) ->
    count = msg.match[2] || 3
    hugBomb(count, msg)

  robot.respond /how many hugs are there/i, (msg) ->
    msg.send "There are #{hug_count} hugs."
