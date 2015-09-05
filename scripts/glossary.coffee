# Description:
#   Ask for an explanation of an abbreviation/jargon
#
# Depdeendencies:
#   "js-yaml": "3.4.1"
#
# Commands:
#   hubot glossary <abbreviation> - returns a defined term
#
# Examples:
#   hubot glossary ATO

yaml = require('js-yaml');

module.exports = (robot) ->

  robot.respond /glossary (\w+)/i, (msg) ->
    robot.http("https://raw.githubusercontent.com/18F/procurement-glossary/master/abbreviations.yml")
      .get() (err, res, body) -> 
        g = yaml.safeLoad(body).abbreviations 
        term = msg.match[1]

        if term in Object.keys(g)
          console.log "The term " + g[term].longform + " (" +  term + ") means " + g[term].description
        else
          console.log "I don't know that term."