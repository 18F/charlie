module.exports = async (app) => {
  app.command(
    "/roll",
    async ({ command, ack, /*message: { thread_ts: threadId }*/, say }) => {
      await ack();

      // command.text; // the user typed this maybe?

      await say({
        // icon_emoji: "",
        // username: "",
        text: "You rolled a 3",
        // thread_ts: threadId,
      });
    }
  );
};
