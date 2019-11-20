# Description:
#   get opm status from api
#
# Dependencies:
#   None
#
# Commands:
#   hubot opm status
#
# Author:
#   lauraggit


# :greenlight: :redlight: :yellowlight:
icons = 
  'Open': ':greenlight:'
  'Alert': ':yellowlight:'
  'Closed': ':redlight:'

module.exports = (robot) ->
  robot.respond /opm status/i, (msg) ->
    msg.http("https://www.opm.gov/json/operatingstatus.json").get() (err, res, body) ->
      if err || res.statusCode != 200
        msg.send "Well, what does Capital Weather Gang say?"
      else
        status = JSON.parse(body)
        msg.send
          text: "#{icons[status.Icon]} #{status.Icon} for #{status.AppliesTo}. #{status.StatusSummary}. (<#{status.Url}|Read more>)"
          unfurl_links: false
          unfurl_media: false
      return