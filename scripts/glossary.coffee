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

findCaseInsensitively = (list, searchTerm) ->
  searchTerm = searchTerm.toLowerCase()
  for term in list
    if term.toLowerCase() is searchTerm
      return term
  null # else return null

module.exports = (robot) ->
  robot.respond /(glossary|define) (.+)/i, (msg) ->
    robot.http('https://api.github.com/repos/18f/procurement-glossary/contents/abbreviations.yml')
      .header('User-Agent', '18F-bot')
      .get() (err, res, body) ->
        b = new Buffer(JSON.parse(body).content, 'base64');
        g = yaml.safeLoad(b.toString()).abbreviations

        searchTerm = msg.match[2].trim()
        terms = Object.keys(g)
        term = findCaseInsensitively(terms, searchTerm)

        if term
          msg.reply "The term #{ g[term].longform } (#{ term }) means #{g[term].description}"
        else
          msg.reply "I don't know that term."
