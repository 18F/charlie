module.exports = async (app) => {
  app.command(
    "/roll",
    async ({ command, ack, /* message: { thread_ts: threadId }, */ say }) => {
      await ack();

      const dieRoll = (number) => Math.floor(Math.random() * number) + 1;

      // command.text; // the user typed this maybe?

      await say({
        // icon_emoji: "",
        // username: "",
        text: `You rolled a dieRoll(20)`,
        // thread_ts: threadId,
      });
    }
  );
};
