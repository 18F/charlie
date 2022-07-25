const axios = require("axios");
const cheerio = require("cheerio");

const {
  helpMessage: { registerInteractive },
} = require("../utils");

// A US Code citation looks roughly like:
//   [title] USC [section]
//
// It can optionally be more specific by also citing a paragraph, subparagraph,
// clause, and subclause:
//   42 USC 1753 (b)
//   42 USC 1753 (b)(3)(F)(iii)(I)
//
// This bot trigger only listens for title & section. We'll pull out any more
// specific references later.
//
// https://regexper.com/#%2F%28%5Cd%2B%29%5Cs*u%5C.%3Fs%5C.%3Fc%5C.%3F%5Cs*%C2%A7%3F%5Cs*%28%5Cd%2B%29%2Fi
const trigger = /(\d+)\s*?u\.?s\.?c\.?\s*?§?\s*?(\d+)/i;

const parseSubcomponent = (node, dom) => {
  const subsection = {
    id: dom("> .num", node).text().toLowerCase(),
    name: dom("> .num", node).text(),
    content: dom("> .content, > .chapeau", node).text().trim() || false,
    children: [
      ...dom("> .paragraph, > .subparagraph, > .clause, > .subclause", node),
    ].map((c) => parseSubcomponent(c, dom)),
  };

  // If the subcomponent has a heading, tack that on to the component name
  const heading = dom("> .heading", node).text().trim();
  if (heading.length > 0) {
    subsection.name = `${subsection.name} ${heading}`;
  }

  return subsection;
};

const stringifySubcomponent = (subcomponent, depth) => {
  // Slack collapses multiple spaces into one, so we'll use the :blank: emoji
  // to get indentation.
  const indent = [...Array(depth)].map(() => ":blank:").join("");

  const text = [];
  if (subcomponent.content) {
    text.push(`${indent}*${subcomponent.name}* ${subcomponent.content}`);
  } else {
    text.push(`${indent}*${subcomponent.name}*`);
  }

  for (const subComponent of subcomponent.children) {
    text.push(stringifySubcomponent(subComponent, depth + 1));
  }

  return text.join("\n");
};

module.exports = (app) => {
  registerInteractive(
    "US Code bot",
    "[title] USC [section] (<maybe>)(<paragraphs>)(<too>)",
    "If you drop a citation to the US Code, Charlie will attempt to look it up on the <https://www.law.cornell.edu/uscode/text|Cornell LII> website and post the text in a thread. Handy!",
    false
  );

  app.message(
    trigger,
    async ({
      context: { matches },
      event: { thread_ts: thread, ts },
      message: { text: message },
      say,
    }) => {
      const titleNumber = +matches[1];
      const sectionNumber = +matches[2];

      const subcitations = (message.match(
        // This matcher pulls out not just the title & section, but also any
        // deeper references (paragraphs, subparagraphs, etc.), as long as they
        // are in parantheses after the section. We're only going to keep the
        // first match, which is the entire citation.
        //
        // This whole process is kind of convoluted, but it's because the
        // subcitations need to be anchored to the main USC citation. So we NEED
        // to find:
        //   [chapter] USC [section] (maybe subcitations)
        //
        // If we don't anchor the subcitations to the main citation, we could
        // accidentally match parentheticals elsewhere in the message and that
        // could wonk up our parsing further down.
        //
        // For a look at how this regex works, check:
        // https://regexper.com/#%2F%28%5Cd%2B%29%5Cs*u%5C.%3Fs%5C.%3Fc%5C.%3F%5Cs*%C2%A7%3F%5Cs*%28%5Cd%2B%29%28%5Cs*%5C%28%28%5Ba-z%5D%7Ci%2B%7C%5Cd%2B%29%5C%29%29*%2Fi
        //
        /(\d+)\s*u\.?s\.?c\.?\s*§?\s*(\d+)(\s*\(([a-z]|i+|\d+)\))*/i
      ) ?? [""])[0]
        // Reminder that this captures the entire citation, including any
        // subcitations, if there are any. Again, we only keep the first element
        // because that's the full match. Now remove the [title] usc [section]
        // part, because we've already parsed that part out.
        .replace(trigger, "")
        // Our regex allows arbitrary whitespace between the citation components
        // but those make it harder to parse, so we'll just get rid of it all
        .replace(/\s/g, "")
        // Get rid of the opening paren and split on the closing paren to get
        // all the components into an array.
        .replace(/\(/g, "")
        .split(")")
        // Get rid of the last element because it will always be empty since the
        // regex requires that citation components end with a closing paren.
        .slice(0, -1)
        .map((v) => v.toLowerCase());

      // LII has a really easy URL structure. Bless them.
      const url = `https://www.law.cornell.edu/uscode/text/${titleNumber}/${sectionNumber}`;

      const text = [];

      try {
        const { data } = await axios.get(url);
        const dom = cheerio.load(data);

        const section = {
          // Sometimes the formatting on the page is wonky and there are multiple
          // spaces when there should just be one. Anyway, this is the long title of
          // the USC section.
          name: dom("h1#page_title").text().trim().replace(/\s+/g, " "),

          // Sometimes top-level sections have content of their own. If that's the
          // case, record it. Otherwise, mark this false.
          content: dom("div.section > .content").text().trim() || false,

          // If there are any subsections, parse those too.
          children: [...dom("div.section > .subsection")].map((c) =>
            parseSubcomponent(c, dom)
          ),
        };

        text.push(`*${section.name}*`);

        // If there are any subcitations, we should try to find and display those
        // instead of displaying the entire section.
        if (subcitations.length) {
          const indent = [":blank:"];

          let foundIntermediateSubcomponents = true;

          // The last subcitation is the only one we want the text for. Everything
          // before that will be treated differently, so we can pop it off.
          const last = subcitations.pop();

          let child = section;
          for (const cite of subcitations) {
            child = child.children.find(({ id }) => id === `(${cite})`);

            // If the subcitation refers to a child that exists, push that sucker
            // onto the text stack.
            if (child) {
              text.push(`${indent.join("")}*${child.name}*`);
              indent.push(":blank:");
            } else {
              // Otherwise, toss on an error message and bail out.
              text.push(`${indent.join("")}*(${cite}) not found*`);
              foundIntermediateSubcomponents = false;
              break;
            }
          }

          // We only need to process the last subcitation if all the intermediate
          // ones were found.
          if (foundIntermediateSubcomponents) {
            child =
              child?.children?.find(({ id }) => id === `(${last})`) ?? null;

            // In this case, if the child exists, we'll do a full stringification
            // of it instead of just grabbing the name.
            if (child) {
              text.push(stringifySubcomponent(child, indent.length));
            } else {
              text.push(`${indent.join("")}*(${last}) not found*`);
            }
          }
        } else {
          // If there aren't any subcitations, build up the text for the entire
          // honkin' section.
          if (section.content) {
            text.push(section.content);
          }
          for (const subComponent of section.children) {
            text.push(stringifySubcomponent(subComponent, 1));
          }
        }
      } catch (e) {
        if (e.response && e.response.status === 404) {
          text.push(`${titleNumber} U.S. Code § ${sectionNumber} not found`);
        }
      }

      if (text.length) {
        say({ thread_ts: thread ?? ts, text: text.join("\n") });
      }
    }
  );
};
