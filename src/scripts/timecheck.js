const { directMention } = require("@slack/bolt");

module.exports = async (app) => {
  app.message(
    directMention(),
    /timecheck/i,
    async ({
      event: {
        channel,
        thread_ts: thread,
        user: { tz: timezone },
      },
      say,
    }) => {
      await say(`${channel}, ${thread}, ${timezone}`);
    }
  );
};
