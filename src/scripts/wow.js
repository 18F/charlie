const axios = require("axios");

module.exports = (app) => {
  app.message(/wow bot/i, async ({ say }) => {
    try {
      const {
        data: [wow],
      } = await axios.get(
        "https://owen-wilson-wow-api.herokuapp.com/wows/random"
      );

      const response = {
        text: `> *${wow.character}:* ${wow.full_line}\n${wow.movie} (${wow.year}), <${wow.video["720p"]}|:movie_camera: video>`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `> *${wow.character}:* ${wow.full_line}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `${wow.movie} (${wow.year}), <${wow.video["720p"]}|:movie_camera: video>`,
              },
            ],
          },
        ],
      };

      say({
        username: "Owen Wilson",
        icon_emoji: ":owen-wilson-wow:",
        ...response,
      });
    } catch (e) {
      // Ideally we should do something if there's an error, but... for now we
      // can just ignore it and not do anything.
    }
  });
};
