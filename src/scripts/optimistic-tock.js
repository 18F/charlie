const holidays = require("@18f/us-federal-holidays");
const scheduler = require("node-schedule");
const {
  dates: { getNow, getToday, zonedDateTimeToDate, DAYS },
  optOut,
  slack: { sendDirectMessage },
  tock: { get18FTockTruants, get18FTockSlackUsers },
} = require("../utils");

const TOCK_API_URL = process.env.TOCK_API;
const TOCK_TOKEN = process.env.TOCK_TOKEN;

module.exports = async (app) => {
  if (!TOCK_API_URL || !TOCK_TOKEN) {
    app.logger.warn(
      "OptimisticTock disabled: Tock API URL or access token is not set"
    );
    return;
  }

  const optout = optOut("optimistic_tock");

  const reminder = (tz) => async () => {
    const message = {
      username: "Happy Tock",
      icon_emoji: "happytock",
      text: "Don't forget to <https://tock.18f.gov|Tock your time>!",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Don't forget to <https://tock.18f.gov|Tock your time>!",
          },
          ...optout.button,
        },
      ],
    };

    // Get all the folks who have not submitted their current Tock.
    const truants = await get18FTockTruants(getToday(tz), 0);

    // Now get the list of Slacky-Tocky users in the current timezone who
    // have not submitted their Tock. Tsk tsk.
    const tockSlackUsers = await get18FTockSlackUsers();

    const truantTockSlackUsers = tockSlackUsers
      .filter((tockUser) => tockUser.tz === tz)
      .filter((tockUser) => truants.some((t) => t.email === tockUser.email))
      .filter((tockUser) => !optout.isOptedOut(tockUser.slack_id));

    await Promise.all(
      truantTockSlackUsers.map(async ({ slack_id: slackID }) => {
        await sendDirectMessage(slackID, message);
      })
    );
  };

  const scheduleReminders = async () => {
    // Westernmost US timezone. Everyone else in the US should be at this time
    // or later, so this is where we want to begin.
    let day = getNow("Pacific/Samoa");

    // Proceed to the next Friday, then back up if it's a holiday.
    while (day.dayOfWeek !== DAYS.Friday) {
      day = day.add({ days: 1 });
    }
    while (holidays.isAHoliday(zonedDateTimeToDate(day))) {
      day = day.subtract({ days: 1 });
    }

    const reminderString = `${day.toPlainDate().toString()}T16:00:00`;

    const users = await get18FTockSlackUsers();
    const now = getNow();

    // Get a list of unique timezones by putting them into a Set.
    new Set(users.map((u) => u.tz)).forEach((tz) => {
      const tzReminderTime = Temporal.ZonedDateTime.from(
        `${reminderString}[${tz}]`
      );
      if (Temporal.ZonedDateTime.compare(tzReminderTime, now) > 0) {
        // If the reminder time is in the past, don't schedule it. That'd be
        // a really silly thing to do.
        scheduler.scheduleJob(
          zonedDateTimeToDate(tzReminderTime),
          reminder(tz)
        );
      }
    });
  };

  const scheduleNext = () => {
    let nextSunday = getNow();
    while (nextSunday.dayOfWeek !== DAYS.Sunday) {
      nextSunday = nextSunday.add({ days: 1 });
    }
    // "Not after" rather than "before" to handle the edge where these
    // two are identical. So... Sundays. Also the tests.
    if (Temporal.ZonedDateTime.compare(nextSunday, getNow()) <= 0) {
      nextSunday = nextSunday.add({ days: 7 });
    }

    scheduler.scheduleJob(zonedDateTimeToDate(nextSunday), async () => {
      await scheduleReminders();
      await scheduleNext();
    });
  };

  await scheduleReminders();
  await scheduleNext();
};
