# Description:
#   Tells you about US federal holidays
#
# Dependencies:
#   "@18f/us-federal-holidays": "^1.1.0"
#   "moment": ""
#
# Commands:
#   hubot next holiday - tells you when the next holiday is

fedHolidays = require('@18f/us-federal-holidays');
moment = require('moment');

module.exports = (robot) ->
  robot.respond /(when is( the)? )?next holiday/i, (msg) ->
    now = new Date
    holidays = fedHolidays.allForYear now.getFullYear()
    i = 0
    while i < holidays.length
      if holidays[i].date >= now
        nextOne = moment(holidays[i].date);
        msg.reply 'The next federal holiday is ' + holidays[i].name + ' on ' + nextOne.utc().format('dddd, MMMM Do')
        break
      i++
