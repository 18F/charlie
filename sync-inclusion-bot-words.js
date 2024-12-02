const fs = require("fs/promises");
const jsYaml = require("js-yaml");

// The frontmatter here is all of the comments at the beginning of the file.
// Once there's a non-comment line, the frontmatter ends.
const getYamlFrontmatter = (yaml) => {
  const firstNonComment = yaml
    .split("\n")
    .findIndex((line) => !line.startsWith("#"));
  const frontmatter = yaml.split("\n").slice(0, firstNonComment).join("\n");

  return frontmatter;
};

// The parsing works by finding lines that start with a vertical pipe, a
// space, and anything other than a dash. The vertical pipe represents the
// start of a markdown table row, which we want, and the dash indicates
// that what we're seeing is actually the divider between the table header
// and the table body.
const getMarkdownTableRows = (md) =>
  md.match(/\| [^-].+\|/gi).map((v) => v.split("|"));

// Rows are split along the vertical pipes, which gives us an empty string
// before the pipe, so given the whole row, we'll just ignore the first item.
const markdownRowToTrigger = ([, matches, alternatives, why]) => ({
  // Trigger matches are separated by commas, so we'll split them along
  // commas and trim any remaining whitespace
  matches: matches.split(",").map((v) => v.trim().toLowerCase()),

  // Suggested alternatives are separated by line breaks, because they can
  // include punctuation, including commas. Similarly split and trim.
  alternatives: alternatives.split("<br>").map((v) => v.trim()),

  // The "why" text can contain some extra reading, after a pair of line
  // breaks, but the bot shouldn't show that because it's too much content
  // to display. So we strip that out. The "why" also uses "this term" in
  // most places to refer to the triggering phrase, but the bot is capable
  // of showing the user exactly what word triggered its response. So we
  // replace "this term" with the ":TERM:" token (in quotes, so it will be
  // quoted when the user sees it) to let the bot do that.
  why: why
    .trim()
    .replace(/<br>.*/, "")
    .replace(/this term/i, '":TERM:"'),
});

const getTriggerIgnoreMap = (currentConfig) => {
  const triggerWithIgnore = (newTrigger) => {
    // Find a trigger in the existing config that has at least one of the same
    // matches as the new trigger. There may not be one, but if...
    const existing = currentConfig.triggers.find(
      ({ matches: currentMatches }) =>
        currentMatches.some((v) => newTrigger.matches.includes(v)),
    );

    // If there is an existing config that matches AND it has an ignore property
    // return a new trigger that includes the ignore property. (We do it this
    // way instead of using an object spread so we get the properties in the
    // order we want for readability when it gets written to yaml.)
    if (existing?.ignore) {
      return {
        matches: newTrigger.matches,
        alternatives: newTrigger.alternatives,
        ignore: existing.ignore,
        why: newTrigger.why,
      };
    }

    // Otherwise just return what we got.
    return newTrigger;
  };
  return triggerWithIgnore;
};

const main = async () => {
  // Load the current config yaml and prase it into Javascript
  const currentYamlStr = await fs.readFile("src/scripts/inclusion-bot.yaml", {
    encoding: "utf-8",
  });
  const currentConfig = jsYaml.load(currentYamlStr, { json: true });

  // Also find the frontmatter comments so we can preserve it.
  const frontmatter = getYamlFrontmatter(currentYamlStr);

  const triggerWithIgnore = getTriggerIgnoreMap(currentConfig);

  // Read and parse the markdown.
  const mdf = await fs.readFile("InclusionBot.md", { encoding: "utf-8" });
  const md = {
    // Preserve the link and message properties from the current config...
    link: currentConfig.link,
    message: currentConfig.message,

    // ...but rebuild the triggers from the markdown.
    triggers: getMarkdownTableRows(mdf)
      // Turn each row into a trigger object.
      .map(markdownRowToTrigger)

      // Add an ignore property if there's a corresponding trigger in the
      // existing config that has an ignore property. This is how we make sure
      // we don't lose those when the new config is built.
      .map(triggerWithIgnore)

      // And remove the "triggers" that include "instead of", which is actually
      // the table header.
      .filter(({ matches }) => !/^instead of/i.test(matches.join(","))),
  };

  // Sort the triggers by their first matches. This is meant to make it easier
  // for folks to find what they're looking for if they need to manually tweak
  // the yaml file.
  md.triggers.sort(({ matches: aa }, { matches: bb }) => {
    // Get the Unicode numeric value for the first character of the first match
    // in each of the triggers we're comparing.
    const a = aa[0].toLowerCase().charCodeAt(0);
    const b = bb[0].toLowerCase().charCodeAt(0);

    // Now we can just do math!
    return a - b;
  });

  // Parse the object back into a yaml string
  const configYaml = jsYaml
    .dump(md)
    // Put in some newlines between things, so it looks nicer.
    .replace(/\n([a-z]+):/gi, "\n\n$1:")
    .replace(/ {2}- matches/gi, "\n  - matches");

  // And write that puppy to disk
  await fs.writeFile(
    "src/scripts/inclusion-bot.yaml",
    [frontmatter, "", configYaml].join("\n"),
    { encoding: "utf-8" },
  );
};

main();
