const { directMention } = require("@slack/bolt");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
  helpMessage,
  stats: { incrementStats },
} = require("../utils");
const sample = require("../utils/sample");

module.exports = async (app) => {
  helpMessage.registerInteractive(
    "Dad Jokes",
    "dad joke",
    "Fetches a joke from Fatherhood.gov. Charlie will first set up the joke, then it'll provide the punchline!",
    true,
  );

  const jokes = JSON.parse(
    await fs.readFile(path.join(__dirname, "dad-joke.json"), {
      encoding: "utf-8",
    }),
  );

  app.message(
    directMention,
    /dad joke/i,
    async ({ message: { thread_ts: thread }, say }) => {
      incrementStats("dad joke");

      const joke = sample(jokes);
      if (joke) {
        say({
          icon_emoji: ":dog-joke-setup:",
          text: joke.setup,
          thread_ts: thread,
          username: "Jed Bartlett",
        });

        setTimeout(() => {
          say({
            icon_emoji: ":dog-joke:",
            text: joke.punchline,
            thread_ts: thread,
            username: "Jed \u200bBartlett",
          });
        }, 5000);
      }
    },
  );
};
