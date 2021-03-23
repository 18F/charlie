const {
  cache,
  slack: { getChannels, paginate },
} = require("../utils");

const getOwnConversations = (client) =>
  cache("get own conversations", 60, async () => {
    const all = [];
    await paginate(
      client.users.conversations,
      { token: process.env.SLACK_TOKEN },
      ({ channels }) => {
        all.push(...channels.map((c) => c.id));
      }
    );
    return all;
  });

module.exports = (app) => {
  const joinPublicChannels = async () => {
    try {
      const memberOf = await getOwnConversations(app.client);

      const all = (await getChannels())
        .filter(
          (c) =>
            // Slack calls channels, DMs, MPIMs, and other stuff "conversations"
            // We only care about unarchived public channels here.
            c.is_channel &&
            !c.is_archived &&
            !c.is_private &&
            // And specifically any that the bot is not already in. This check
            // reduces the number of API calls. After the initial mass-join,
            // the number of new channels to join should be pretty low.
            !memberOf.includes(c.id)
        )
        .map((c) => c.id);

      await Promise.all(
        all.map((channel) =>
          app.client.conversations.join({
            channel,
            token: process.env.SLACK_TOKEN,
          })
        )
      );
    } catch (e) {
      console.log(e);
    }
  };

  joinPublicChannels();
};
