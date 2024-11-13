const { directMention } = require("@slack/bolt");
const axios = require("axios");
const {
  cache,
  helpMessage,
  stats: { incrementStats },
} = require("../utils");
const sample = require("../utils/sample");

module.exports = (app) => {
  helpMessage.registerInteractive(
    "Dad Jokes",
    "dad joke",
    "Fetches a joke from Fatherhood.gov. Charlie will first set up the joke, then it'll provide the punchline!",
    true,
  );

  app.message(
    directMention(),
    /dad joke/i,
    async ({ message: { thread_ts: thread }, say }) => {
      incrementStats("dad joke");

      const jokes = await cache("dad jokes", 60, async () => {
        try {
          const { data } = await axios.get(
            "https://fatherhood.gov/jsonapi/node/dad_jokes?filter[status][value]=1",
          );

          if (data && data.data) {
            return data.data.map((joke) => ({
              setup: joke.attributes.field_joke_opener,
              punchline: joke.attributes.field_joke_response,
            }));
          }
          console.log("got nothing from the API");
          return [];
        } catch (e) {
          console.log(e);
          return [];
        }
      });

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
