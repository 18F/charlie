const { directMention } = require("@slack/bolt");

module.exports = async (app) => {
  app.message(
    directMention(),
    /timecheck/i,
    async ({
      client: {
        users: { info },
      },
      event: { channel, thread_ts: thread, user },
      say,
    }) => {
      const {
        user: { tz: timezone },
      } = await info({ user });
      await say(`${channel}, ${thread}, ${timezone}`);
    }
  );
};
