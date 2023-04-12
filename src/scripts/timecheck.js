const { directMention } = require("@slack/bolt");
const moment = require("moment-timezone");

module.exports = async (app) => {
  app.message(
    directMention(),
    /timecheck (\d{1,2}:\d{2})/i,
    async ({
      client: {
        users: { info },
      },
      context: {
        matches: [time],
      },
      event: { channel, thread_ts: thread, user },
      say,
    }) => {
      const {
        user: { tz: timezone },
      } = await info({ user });

      const now = moment();
      const then = moment.tz(timezone);

      const [hh, mm] = time.split(":");
      then.hour(hh);
      then.minute(mm);

      if (then.isBefore(now)) {
        then.add(12, "hours");
      }

      await say({
        channel,
        thread_ts: thread,
        text: `${time} | ${hh}:${mm} | ${then.format("h:mm a z")}`,
      });
    }
  );
};
