// Description:
//   Ask for an explanation of an abbreviation/jargon
//
// Depdeendencies:
//   "js-yaml": "3.4.1"
//
// Commands:
//   @bot glossary <abbreviation> - returns a defined term
//
// Examples:
//   @bot glossary ATO

const { directMention } = require("@slack/bolt");
const axios = require("axios");
const yaml = require("js-yaml");
const { cache } = require("../utils");

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

module.exports = (robot) => {
  robot.message(
    directMention(),
    /(glossary|define) (.+)/i,
    async ({ context, event: { thread_ts: thread }, say }) => {
      // Grab this match from the context immediately. The context can change
      // when we give up the execution thread with an async call below, so we
      // need to grab it before we do that.
      const searchTerm = context.matches[2].trim();

      const abbreviations = await cache("glossary fetch", 60, async () => {
        const { data } = await axios.get(
          "https://api.github.com/repos/18f/procurement-glossary/contents/abbreviations.yml"
        );

        // GitHub sends back an object with metadata. The actual content is
        // a base64-encoded property on the response body.
        return yaml.safeLoad(Buffer.from(data.content, "base64").toString(), {
          json: true,
        }).abbreviations;
      });

      const terms = Object.keys(abbreviations);
      const term = findCaseInsensitively(terms, searchTerm);

      const response = {
        icon_emoji: ":books:",
        thread_ts: thread,
        text: `I don't know what *${searchTerm}* means. You can add it to <https://github.com/18F/procurement-glossary|the glossary>.`,
      };

      if (term) {
        response.text = `The term *${abbreviations[term].longform} (${term})* means ${abbreviations[term].description}`;
      }

      say(response);
    }
  );
};
