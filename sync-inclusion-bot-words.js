const fs = require("fs/promises");
const jsYaml = require("js-yaml");
const prettier = require("prettier"); // eslint-disable-line import/no-extraneous-dependencies

(async () => {
  const yaml = await fs.readFile("src/scripts/inclusion-bot.yaml", {
    encoding: "utf-8",
  });
  const json = jsYaml.load(yaml, { json: true });

  // Sort the groups of triggers alphabetically
  json.triggers.sort(({ group: a }, { group: b }) => {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return 0;
  });

  // Get the unique set of groups, and go ahead and dump them into a map with a
  // default empty set of triggers.
  const groups = new Map();
  [...new Set(json.triggers.map(({ group }) => group))].forEach((a) =>
    groups.set(a, [])
  );

  // Now add each trigger to the appropriate group in the map
  json.triggers.forEach((trigger) => groups.get(trigger.group).push(trigger));

  const text = [
    `> **NOTE:** This file on GitHub is a copy. The
> [primary document 🔐](https://docs.google.com/document/d/1iQT7Gy0iQa7sopBP0vB3CZ56GhyYrDNUzLdoWOowSHs/edit#)
> is on the TTS Google Drive. Please edit that file first rather than this one,
> unless you are just keeping this one in sync. 🙂

# Background:

An inclusive culture is built one interaction at a time, and language is the
foundation. Inclusion bot helps us live
[our values](https://handbook.tts.gsa.gov/tts-history/#our-values) here in TTS.

To quote Rachel Cohen-Rottenberg: “If a culture’s language is full of pejorative
metaphors about a group of people, that culture is not going to see those people
as fully entitled to the same inclusion as people in a more favored group.”

# How to Update:

The offensive words/phrases and alternatives listed in this doc are implemented
in the Inclusion Bot by updating
[the configuration file](https://github.com/18F/charlie/blob/main/src/scripts/inclusion-bot.yaml).
Anyone may update the configuration in the form of a GitHub pull request. The
file can be edited directly on the GitHub website, and it will offer to create
the pull request for you when you’re done editing. If you would like assistance
with updating the bot in GitHub, please reach out to Greg Walker or Ashley
Wichman. A summary of significant changes is available in
[Inclusion Bot’s changelog](https://github.com/18F/charlie/blob/main/CHANGELOG.inclusion_bot.md).

This document will be updated automatically when the configuration file is
edited and should not be modified manually. Manual changes will be overwritten!
`,
  ];

  for (const [group, triggers] of groups) {
    // Create a header and table for each group
    text.push(`# ${group.replace(/^[a-z]/, (m) => m.toUpperCase())}`);
    text.push("| Instead of | Consider | Why");
    text.push("| --- | --- | ---");

    for (const { matches, alternatives, why, more } of triggers) {
      // The bot will dynamically replace ":TERM:" with whatever specific term
      // triggered its response, but that doesn't make sense for a static
      // document, so replace it with a generic "This term"
      const info = [why.replace(/"?:TERM:"?/g, "This term").trim()];

      // If the trigger includes a "more" property, see if we have a matching
      // resource. If so, add a link.
      const resource = json.resources[more];
      if (resource) {
        info.push(`See [${resource.name}](${resource.url}) for more.`);
      }

      // Add a row to the table
      text.push(
        `| ${matches.join(", ")} | ${alternatives.join(", ")} | ${info.join(
          "<br><br>"
        )}`
      );
    }

    text.push("");
  }

  // Write the formatted markdown to disk
  await fs.writeFile(
    "InclusionBot.md",
    prettier.format(text.join("\n"), { parser: "markdown" }),
    {
      encoding: "utf-8",
    }
  );
})();
