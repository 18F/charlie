// Description:
//   Ask for an explanation of an abbreviation/jargon
//
// Depdeendencies:
//   "js-yaml": "3.4.1"
//
// Commands:
//   hubot glossary <abbreviation> - returns a defined term
//
// Examples:
//   hubot glossary ATO

const yaml = require('js-yaml');

const findCaseInsensitively = (list, searchTerm) => {
  const lowerSearch = searchTerm.toLowerCase();
  for (let i = 0; i < list.length; i += 1) {
    const term = list[i];
    if (term.toLowerCase() === lowerSearch) {
      return term;
    }
  }
  return null;
};

module.exports = robot => {
  robot.respond(/(glossary|define) (.+)/i, msg => {
    robot
      .http(
        'https://api.github.com/repos/18f/procurement-glossary/contents/abbreviations.yml'
      )
      .header('User-Agent', '18F-bot')
      .get()((err, res, body) => {
      const b = Buffer.from(JSON.parse(body).content, 'base64');
      const g = yaml.safeLoad(b.toString(), { json: true }).abbreviations;

      const searchTerm = msg.match[2].trim();
      const terms = Object.keys(g);
      const term = findCaseInsensitively(terms, searchTerm);

      if (term)
        msg.reply(
          `The term ${g[term].longform} (${term}) means ${g[term].description}`
        );
      else
        msg.reply(
          "I don't know that term. If you'd like to add it, the project is at https://github.com/18F/procurement-glossary."
        );
    });
  });
};
