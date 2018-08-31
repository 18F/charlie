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

CFENV = require('cfenv')
AWS = require('aws-sdk')
_u = require('underscore')

appEnv = CFENV.getAppEnv()
s3Creds = appEnv.getServiceCreds('charlie-bucket')
if s3Creds == null
  console.log("Unable to find service creds for 'charlie-bucket'.")
  return
console.log("Found service creds for 'charlie-bucket'.")

creds = new AWS.Credentials(s3Creds['access_key_id'], s3Creds['secret_access_key'])
BUCKET = s3Creds['bucket']
REGION = s3Creds['region']
s3 = new AWS.S3({ region: REGION, credentials: creds })

hugUrl = (s3Object) ->
  filename = s3Object.Key
  rand = _u.random(10000)
  url = "https://s3-#{REGION}.amazonaws.com/#{BUCKET}/#{filename}?rnd=#{rand}"

hugBomb = (count, msg) ->
  s3.listObjects { Bucket: BUCKET }, (err, data) ->
    if err
      msg.reply("Error retrieving images: #{err}")
    else
      # send unique URLs
      s3Objects = _u.sample(data.Contents, count)
      for s3Object in s3Objects
        url = hugUrl(s3Object)
        msg.send(url)
      msg.send("_If you would like to be added, send a picture in #bots._")

module.exports = (robot) ->
  robot.respond /hug me/i, (msg) ->
    hugBomb(1, msg)

  robot.respond /hug bomb( (\d+))?/i, (msg) ->
    count = msg.match[2] || 3
    hugBomb(count, msg)

  robot.respond /how many hugs are there/i, (msg) ->
    msg.send "There are #{hug_count} hugs."
