// Description:
//   Ask for an explanation of an abbreviation/jargon
//
// Depdeendencies:
//   "js-yaml": "3.4.1"
//
// Commands:
//   @bot define <abbreviation|term> - returns a defined term
//
// Examples:
//   @bot define ATO
//   @bot define contracting officer

const { directMention } = require("@slack/bolt");
const axios = require("axios");
const he = require("he");
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

const defineTerm = (key, entry) => {
  if (entry.description) {
    return `*${key}*: ${entry.description}`;
  }
  return `The term *${key}* is in the glossary, but does not have a definition. If you find out what it means, <https://github.com/18F/the-glossary/issues/new?title=Definition for ${key}|please add it>!`;
}

const lookupAndDefineTerm = (key, glossary) => defineTerm(key, glossary[key]);

const collectDefinitions = (entry, glossary) => [entry.term].flat().
    map(termKey => lookupAndDefineTerm(termKey, glossary)).
    join("\n");

const buildResponseText = (searchTerm, canonicalKey, glossary) => {
  const entry = glossary[canonicalKey];
  switch (entry.type) {
    case "acronym":
      return `**${canonicalKey}** means:\n${collectDefinitions(entry, glossary)}`
    case "term":
      return defineTerm(canonicalKey, entry);
    default:
      return "An unexpected error occurred.";
  }
}

module.exports = (app) => {
  app.message(
    directMention(),
    /(define|glossary) (.+)/i,
    async ({ context, event: { thread_ts: thread }, say }) => {
      // Grab this match from the context immediately. The context can change
      // when we give up the execution thread with an async call below, so we
      // need to grab it before we do that.
      const searchTerm = he.decode(context.matches[2].trim());

      const glossary = await cache("glossary get", 60, async () => {
        const { data } = await axios.get(
          "https://raw.githubusercontent.com/18F/the-glossary/main/glossary.yml"
        );

        return yaml.load(data, { json: true }).entries;
      });

      const terms = Object.keys(glossary);
      const maybeEntry = findCaseInsensitively(terms, searchTerm);

      const response = {
        icon_emoji: ":book:",
        thread_ts: thread,
        text: "",
      };

      if (maybeEntry) {
        response.text = buildResponseText(searchTerm, maybeEntry, glossary);
      } else {
        response.text = `I couldn't find *${searchTerm}*. Once you find out what it means, would you please <https://github.com/18F/the-glossary/issues/new?title=New%20entry|add it to the glossary>?`
      }

      say(response);
    }
  );
};
