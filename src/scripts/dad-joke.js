const { directMention } = require("@slack/bolt");
const axios = require("axios");
const {
  cache,
  stats: { incrementStats },
} = require("../utils");

module.exports = (app) => {
  app.message(
    directMention(),
    /dad joke/i,
    async ({ message: { thread_ts: thread }, say }) => {
      incrementStats("dad joke");

      const jokes = await cache("dad jokes", 60, async () => {
        try {
          const { data } = await axios.get(
            "https://fatherhood.gov/jsonapi/node/dad_jokes"
          );

          if (data && data.data) {
            return data.data.map((joke) => ({
              setup: joke.attributes.field_joke_opener,
              punchline: joke.attributes.field_joke_response,
            }));
          }
          return [];
        } catch (e) {
          return [];
        }
      });

      const joke = jokes[Math.floor(Math.random() * jokes.length)];
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
    }
  );
};
