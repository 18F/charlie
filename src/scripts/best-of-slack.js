module.exports = async (app) => {
  app.event(
    "reaction_added",
    async ({
      event: {
        item: { channel, ts },
      },
      client,
    }) => {
      const link = await client.chat.getPermalink({
        channel,
        message_ts: ts,
      });
      console.log(link);
    },
  );
};
