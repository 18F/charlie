const slack = require('@slack/client');

module.exports = {
  setup: robot => {
    const webAPI = new slack.WebClient(robot.adapter.options.token);

    return {
      addEmojiReaction(reaction, channelID, messageID) {
        return new Promise((resolve, reject) => {
          robot.adapter.client.web.reactions.add(
            reaction,
            {
              channel: channelID,
              timestamp: messageID
            },
            (err, response) => {
              if (err) {
                return reject(err);
              }
              if (!response.ok) {
                return reject(new Error('Unknown error with Slack API'));
              }
              return resolve();
            }
          );
        });
      },

      postEphemeralMessage(message) {
        webAPI.chat.postEphemeral(message);
      }
    };
  }
};
