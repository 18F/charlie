const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  dates: { getNextElectionDay },
  helpMessage,
  homepage: { registerDidYouKnow },
  slack: { postMessage },
} = require("../utils");

const postElectionDayReminder = async (config = process.env) => {
  const CHANNEL = config.VOTING_REMINDER_CHANNEL || "general-talk";

  await postMessage({
    channel: CHANNEL,
    text: `It's :vote-gov: Election Day! Want to celebrate voting, the cornerstone of democracy? Drop by #i-voted, tell us about your voting experience, and share pictures of your stickers! Is your sticker even better than :justice-schooner: Justice Schooner? Let's see it!`,
  });
};

const scheduleReminder = (config = process.env) => {
  const REPORT_TIME = moment(config.VOTING_REMINDER_TIME || "10:00", "HH:mm");

  // For our target time, we use US Eastern time. If we do a straight-up
  // timezone conversion, we'll actually go backwards a day because the date
  // utility returns dates at midnight UTC. So we do this silly dance to get the
  // date in eastern timezone instead.
  const targetTime = moment.tz(
    getNextElectionDay().format("YYYY-MM-DD"),
    "America/New_York",
  );

  // Then adjust it to the correct time.
  targetTime.hour(REPORT_TIME.hour());
  targetTime.minute(REPORT_TIME.minute());

  scheduler.scheduleJob(targetTime.toDate(), async () => {
    postElectionDayReminder(config);
    setTimeout(
      () => {
        scheduleReminder(config);
      },
      48 * 60 * 60 * 1000,
    );
  });
};

module.exports = (_, config = process.env) => {
  const CHANNEL = config.VOTING_REMINDER_CHANNEL || "general-talk";

  helpMessage.registerNonInteractive(
    "Election Day",
    `On Election Day in the United States, Charlie will post a reminder in #${CHANNEL} to celebrate the cornerstorn of democracy in #i-voted!`,
  );

  registerDidYouKnow(() => {
    const nextElectionDay = getNextElectionDay();

    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `The next federal :vote-gov: Election Day is ${nextElectionDay.format(
          "MMMM Do, YYYY",
        )}`,
      },
    };
  });

  scheduleReminder(config);
};
