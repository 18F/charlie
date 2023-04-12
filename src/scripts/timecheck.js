const { directMention } = require("@slack/bolt");
const moment = require("moment-timezone");

module.exports = async (app) => {
  app.message(
    directMention(),
    /timecheck (\d{1,2}:\d{2})/i,
    async ({
      client,
      context: {
        matches: [, time],
      },
      event: { channel, thread_ts: thread, user },
      say,
    }) => {
      const {
        user: { tz: timezone },
      } = await client.users.info({ user });

      const now = moment();
      const then = moment.tz(timezone);

      const [hh, mm] = time.split(":").map((v) => +v);
      then.hour(hh);
      then.minute(mm);

      if (then.isBefore(now)) {
        then.add(12, "hours");
      }

      const durationUntilThen = moment.duration(then.diff(now));

      const thirtyMinutes = durationUntilThen
        .clone()
        .subtract(30, "minutes")
        .as("milliseconds");
      if (thirtyMinutes > 0) {
        setTimeout(() => {
          say({
            channel,
            thread_ts: thread,
            text: `:bell: 30 minutes remaining`,
          });
        }, thirtyMinutes);
      }

      const fifteenMinutes = durationUntilThen
        .clone()
        .subtract(15, "minutes")
        .as("milliseconds");
      if (fifteenMinutes > 0) {
        setTimeout(() => {
          say({
            channel,
            thread_ts: thread,
            text: `:bell: 15 minutes remaining`,
          });
        }, thirtyMinutes);
      }

      const fiveMinutes = durationUntilThen
        .clone()
        .subtract(5, "minutes")
        .as("milliseconds");
      if (fiveMinutes > 0) {
        setTimeout(() => {
          say({
            channel,
            thread_ts: thread,
            text: `:bell: 5 minutes remaining`,
          });
        }, thirtyMinutes);
      }

      await say({
        channel,
        thread_ts: thread,
        text: `${time} | ${hh}:${mm} | ${then.format("h:mm a z")}`,
      });
    }
  );
};
