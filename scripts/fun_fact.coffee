# Description:
#   Random fun facts scraper. From http://randomfunfacts.com
#
# Dependencies:
#   "cheerio": "~0.12.0"
#
# Commands:
#   hubot fun fact me
#
# Author:
#   monfresh

cheerio = require 'cheerio'

module.exports = (robot) ->
  robot.respond /fun fact( me)?/i, (msg) ->
    msg.http("http://randomfunfacts.com/").get() (err, res, body) ->
      if err || res.statusCode != 200
        msg.send "The tubes are clogged. No fun facts for you!"
      else
        $ = cheerio.load(body)
        msg.send $('strong').text()
