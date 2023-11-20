const axios = require("axios");
const {
  helpMessage,
  slack: { postEphemeralResponse },
  stats: { incrementStats },
} = require("../utils");

const baseUrl =
  "https://search.usa.gov/search/?utf8=no&affiliate=tts-handbook&format=json&query=";

const identity = { icon_emoji: ":tts:", username: "TTS Handbook" };

const getBlocksFromResults = (results) =>
  results.reduce((blocks, result) => {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${result.link}|${result.title.replace(
          /[^ -~]+/g,
          "",
        )}>\n${result.body.replace(/[^ -~]+/g, "")}`,
      },
    });
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: result.link }],
    });
    return blocks;
  }, []);

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Handbook search",
    "@handbook <terms>",
    "Wondering if the TTS Handbook has useful information but don't want to open your browser? Charlie can search for you! If it finds anything, it'll post links in a threaded response.",
  );

  app.message(/^@?handbook (.+)$/i, async (msg) => {
    incrementStats("handbook search");

    const {
      context: {
        matches: [, , search],
      },
      event: { thread_ts: thread, ts },
      say,
    } = msg;

    const searchString = search
      .replace(/[”“]/g, '"') // replace smart quotes
      .replace(/[’‘]/g, "'"); // more smart quotes
    const url = `${baseUrl}${encodeURIComponent(searchString)}`;

    try {
      const { data } = await axios.get(url);
      const results = data.results.slice(0, 3);

      if (results.length === 0) {
        say({
          ...identity,
          thread_ts: thread || ts,
          text: `I couldn't find any results for "${searchString}"`,
        });
      } else {
        say({
          ...identity,
          thread_ts: thread || ts,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `Handbook search results for "${searchString}"`,
              },
            },
            ...getBlocksFromResults(results),
          ],
        });
      }
    } catch (e) {
      postEphemeralResponse(msg, {
        ...identity,
        text: "Something went wrong trying to search the Handbook. Please try later!",
      });
    }
  });
};
