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
# Images are stored in a bucket in S3.

AWS = require('aws-sdk')
_u = require('underscore')

BUCKET = '18f-hugs'
s3 = new AWS.S3()

hugUrl = (s3Object) ->
  filename = s3Object.Key
  rand = _u.random(10000)
  url = "https://#{BUCKET}.s3.amazonaws.com/#{filename}?rnd=#{rand}"

hugBomb = (count, msg) ->
  s3.listObjects {Bucket: BUCKET}, (err, data) ->
    if err
      msg.reply("Error retrieving images: #{err}")
    else
      # send unique URLs
      s3Objects = _u.sample(data.Contents, count)
      for s3Object in s3Objects
        url = hugUrl(s3Object)
        msg.reply(url)

module.exports = (robot) ->
  robot.respond /hug me/i, (msg) ->
    hugBomb(1, msg)

  robot.respond /hug bomb( (\d+))?/i, (msg) ->
    count = msg.match[2] || 3
    hugBomb(count, msg)

  robot.respond /how many hugs are there/i, (msg) ->
    msg.send "There are #{hug_count} hugs."
