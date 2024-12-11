module.exports = async (app) => {
  app.event("reaction_added", async ({ item: { channel, ts } }) => {
    const link = await app.client.chat.getPermalink({
      channel,
      message_ts: ts,
    });
    console.log(link);
  });
};
