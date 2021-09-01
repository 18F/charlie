const { directMention } = require("@slack/bolt");
const axios = require("axios");
const { cache } = require("../utils");

module.exports = (app) => {
  app.message(directMention(), /dad joke/i, async ({ say }) => {
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
        username: "Jed Bartlett",
      });

      setTimeout(() => {
        say({
          icon_emoji: ":dog-joke:",
          text: joke.punchline,
          username: "Jed Bartlett",
        });
      }, 5000);
    }
  });
};
