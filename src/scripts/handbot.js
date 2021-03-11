const axios = require("axios");
const {
  slack: { postEphemeralResponse },
} = require("../utils");

const baseUrl =
  "https://search.usa.gov/search/?utf8=no&affiliate=tts-handbook&format=json&query=";

module.exports = (app) => {
  app.message(/@?handbo(ok|t) (.+)$/i, async (msg) => {
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
          icon_emoji: ":tts:",
          username: "TTS Handbot",
          thread_ts: thread || ts,
          text: `I couldn't find any results for "${searchString}"`,
        });
      } else {
        say({
          icon_emoji: ":tts:",
          username: "TTS Handbot",
          thread_ts: thread || ts,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `Handbook search results for "${searchString}"`,
              },
            },
            ...results.reduce((blocks, result) => {
              blocks.push({ type: "divider" });
              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `<${result.link}|${result.title.replace(
                    /[^ -~]+/g,
                    ""
                  )}>\n${result.body.replace(/[^ -~]+/g, "")}`,
                },
              });
              blocks.push({
                type: "context",
                elements: [{ type: "mrkdwn", text: result.link }],
              });
              return blocks;
            }, []),
          ],
        });
      }
    } catch (e) {
      postEphemeralResponse(msg, {
        icon_emoji: ":tts:",
        username: "TTS Handbot",
        text:
          "Something went wrong trying to search the Handbook. Please try later!",
      });
    }
  });
};
