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


/**
 * Turn a string into a search slug, removing all non-word characters (including spaces and punctuation).
 */
const slugify = (term) => term.replaceAll(/\W/ig, '').toLowerCase();

/**
 * Find a string in a list of strings, ignoring case.
 * @param list [Array<String>] List of strings (the haystack)
 * @param searchTerm [String] The term to find (the needle)
 * @return [String | null] The canonical key for the found term
 */
const findCaseInsensitively = (list, searchTerm) => {
  const lowerSearch = slugify(searchTerm);
  for (let i = 0; i < list.length; i += 1) {
    const term = list[i];
    if (slugify(term) === lowerSearch) {
      return term;
    }
  }
  return null;
};

/**
 * Return the definition for a term
 *
 * @param key [String] The canonical key for the entry
 * @param entry [Object] The entry that may or may not have a definition. Should have `type: "term"`.
 * @return [String] The definition or, if no definition, the default message.
 * @todo Raise an error if entry doesn't have `type: "term"`
 */
const defineTerm = (key, entry) => {
  if (entry.description) {
    return `*${key}*: ${entry.description}`;
  }
  return `The term *${key}* is in the glossary, but does not have a definition. If you find out what it means, <https://github.com/18F/the-glossary/issues/new?assignees=&labels=&template=edit-a-term.md&title=Definition+for+${key}|please add it>!`;
}

/**
 * Given one or more terms, collect definitions.
 * Used to gather definitions of terms for an acronym.
 *
 * @param entry [Object | Array<Object>] The term or terms that will be defined.
 * @param glossary [Object] The entire glossary
 * @return [String] List of definitions (newline-separated)
 */
const collectDefinitions = (entry, glossary) => [entry.term].flat().
    map(termKey => defineTerm(termKey, glossary[termKey])).
    join("\n");

/**
 * The Slackbot response to be sent back to the user, based on whether
 * the entry is an acronym or term.
 *
 * @param searchTerm [String] The original term the user searched for
 * @param canonicalKey [String] The key from the glossary representing the term.
 * @param glossary [Object] The entire glossary
 * @return [String] Definition(s) for the given entry
 */
const buildResponseText = (searchTerm, canonicalKey, glossary) => {
  const entry = glossary[canonicalKey];
  switch (entry.type) {
    case "acronym":
      return `_${canonicalKey}_ means:\n${collectDefinitions(entry, glossary)}`
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

      // Cache the glossary for 1 minute
      const glossary = await cache("glossary get", 60, async () => {
        const { data } = await axios.get(
          "https://raw.githubusercontent.com/18F/the-glossary/main/glossary.yml"
        );

        return yaml.load(data, { json: true }).entries;
      });

      // Set up the Slack response
      const response = {
        icon_emoji: ":book:",
        thread_ts: thread,
        text: "",
      };

      const terms = Object.keys(glossary);
      const maybeEntry = findCaseInsensitively(terms, searchTerm);

      // If the term was found, return a response. Otherwise, send the 'not found' message.
      if (maybeEntry) {
        response.text = buildResponseText(searchTerm, maybeEntry, glossary);
      } else {
        response.text = `I couldn't find *${searchTerm}*. Once you find out what it means, would you please <https://github.com/18F/the-glossary/issues/new?assignees=&labels=&template=add-a-new-term.md&title=Add+new+term:+${searchTerm}|add it to the glossary>?`
      }

      say(response);
    }
  );
};
