const fs = require("fs/promises");
const jsYaml = require("js-yaml");

(async () => {
  // Load the current config yaml and prase it into Javascript
  const currentYaml = await fs.readFile("src/scripts/inclusion-bot.yaml", {
    encoding: "utf-8",
  });
  const json = jsYaml.load(currentYaml, { json: true });

  // Also find the frontmatter comments so we can preserve it. It's all of the
  // lines from the start up until the first non-comment line.
  const firstNonComment = currentYaml
    .split("\n")
    .findIndex((line) => !line.startsWith("#"));
  const frontmatter = currentYaml
    .split("\n")
    .slice(0, firstNonComment)
    .join("\n");

  // Read and parse the markdown.
  const mdf = await fs.readFile("InclusionBot.md", { encoding: "utf-8" });
  const md = {
    // Preserve the link and message properties from the current config...
    link: json.link,
    message: json.message,

    // ...but rebuild the triggers from the markdown.
    triggers: mdf
      // The parsing works by finding lines that start with a vertical pipe, a
      // space, and anything other than a dash. The vertical pipe represents the
      // start of a markdown table row, which we want, and the dash indicates
      // that what we're seeing is actually the divider between the table header
      // and the table body.
      //
      // Once we've pulled out a row, we split it along the vertical pipes,
      // which gives us 5 pieces: the empty string before the pipe, the list of
      // trigger words/phrases, the list of potential replacements, an
      // explanation of why the trigger is here, and the empty string after the
      // ending pipe (if there is one; it's valid for there to only be 4 pieces
      // after splitting). We only want the middle three, so we splice them out.
      .match(/\| [^-].+\|/gi)
      .map((v) => v.split("|"))
      .map((v) => v.slice(1, 4))

      // Next we turn those three pieces into a single object representing the
      // whole trigger instance.
      .map(([matches, alternatives, why]) => ({
        // Trigger matches are separated by commas, so we'll split them along
        // commas and trim any remaining whitespace
        matches: matches.split(",").map((v) => v.trim().toLowerCase()),

        // Suggested alternatives are separated by line breaks, because they can
        // include punctuation, including commas. Similarly split and trim.
        alternatives: alternatives.split("<br>").map((v) => v.trim()),

        // The markdown file doesn't include any ignore information, but there
        // might be some in the existing config yaml. In order to maintain
        // property ordering later, go ahead and put this property in now. We
        // can just delete it later if we don't need it.
        ignore: null,

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
      }))
      // And finally, we remove the "triggers" that include "instead of", which
      // is actually just the table header. There might be a better way to do
      // this, but... this worked well.
      .filter(({ matches }) => !/^instead of/i.test(matches.join(","))),
  };

  // Now we can loop over the triggers from the markdown to see if there is a
  // corresponding trigger in the existing config. If there is, we want to copy
  // over the ignore property, if there is one.
  for (const trigger of md.triggers) {
    const m = new Set(trigger.matches);
    const existing = json.triggers.find(({ matches }) =>
      matches.some((v) => m.has(v))
    );

    if (existing?.ignore) {
      trigger.ignore = existing.ignore;
    } else {
      delete trigger.ignore;
    }
  }

  // Parse the object back into a yaml string
  const yaml = jsYaml
    .dump(md)
    .replace(/\n([a-z]+):/gi, "\n\n$1:")
    .replace(/ {2}- matches/gi, "\n  - matches");

  // And write that puppy to disk
  await fs.writeFile(
    "src/scripts/inclusion-bot.yaml",
    [frontmatter, "", yaml].join("\n"),
    { encoding: "utf-8" }
  );
})();
