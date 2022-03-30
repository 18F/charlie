const fs = require("fs/promises");
const jsYaml = require("js-yaml");

(async () => {
  const currentYaml = await fs.readFile("src/scripts/inclusion-bot.yaml", {
    encoding: "utf-8",
  });
  const json = jsYaml.load(currentYaml, { json: true });

  const mdf = await fs.readFile("InclusionBot.md", { encoding: "utf-8" });
  const md = {
    link: json.link,
    message: json.message,
    triggers: mdf
      .match(/\| [^-].+\|/gi)
      .map((v) => v.split("|"))
      .map((v) => v.slice(1, 4))
      .map(([matches, alternatives, why]) => ({
        matches: matches.split(",").map((v) => v.trim().toLowerCase()),
        alternatives: alternatives.split("<br>").map((v) => v.trim()),
        ignore: null,
        why: why
          .trim()
          .replace(/<br>.*/, "")
          .replace(/this term/i, '":TERM:"'),
      }))
      .filter(({ matches }) => !/^instead of/i.test(matches.join(","))),
  };

  const firstNonComment = currentYaml
    .split("\n")
    .findIndex((line) => !line.startsWith("#"));
  const frontmatter = currentYaml
    .split("\n")
    .slice(0, firstNonComment)
    .join("\n");

  for (const trigger of md.triggers) {
    const m = new Set(trigger.matches);
    const existing = json.triggers.find(({ matches }) =>
      matches.some((v) => m.has(v))
    );
    if (existing && existing.ignore) {
      trigger.ignore = existing.ignore;
    } else {
      delete trigger.ignore;
    }
  }
  // console.log(md);
  // return;

  // json.triggers.forEach((trigger) => {
  //   const m = new Set(trigger.matches.map((match) => match.toLowerCase()));
  //   trigger.fromMarkdown = md.find(({ matches }) =>
  //     matches.some((v) => m.has(v))
  //   );
  // });

  // json.triggers = json.triggers.filter(({ fromMarkdown }) => !!fromMarkdown);

  // for (const trigger of json.triggers) {
  //   // Is there a matching item in the markdown?
  //   // const match = md.find(({ matches }) => matches.some((v) => m.has(v)));
  //   // if (match) {
  //   const match = trigger.fromMarkdown;
  //   delete trigger.fromMarkdown;

  //   trigger.matches = Array.from(
  //     new Set(match.matches.map((v) => v.toLowerCase()))
  //   );

  //   trigger.alternatives = Array.from(new Set(match.alternatives));
  //   for (const alternative of trigger.alternatives) {
  //     if (!match.alternatives.includes(alternative)) {
  //       console.log(`remove "${alternative}" from "${trigger.matches[0]}"`);
  //       // throw new Error();
  //     }
  //   }

  //   trigger.why = match.why;
  // } else {
  //   // delete this trigger because it's no longer in the word list
  //   console.log(match);
  // }
  // }

  const yaml = jsYaml
    .dump(md)
    .replace(/\n([a-z]+):/gi, "\n\n$1:")
    .replace(/ {2}- matches/gi, "\n  - matches");

  await fs.writeFile(
    "src/scripts/inclusion-bot.yaml",
    [frontmatter, "", yaml].join("\n"),
    { encoding: "utf-8" }
  );
})();
