const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  slack: { sendDirectMessage },
  tock: { get18FTockTruants, get18FTockSlackUsers },
} = require("../utils");

const TOCK_API_URL = process.env.TOCK_API;
const TOCK_TOKEN = process.env.TOCK_TOKEN;

const reminder = (tz) => async () => {
  const message = {
    username: "Happy Tock",
    icon_emoji: "happytock",
    text: "Don't forget to <https://tock.18f.gov|Tock your time>!",
  };

  console.log("running optimistic tock reminders");
  // Get all the folks who have not submitted their current Tock.
  const truants = await get18FTockTruants(moment.tz(tz), 0);

  // Now get the list of Slacky-Tocky users in the current timezone who
  // have not submitted their Tock. Tsk tsk.
  const tockSlackUsers = await get18FTockSlackUsers();

  const truantTockSlackUsers = tockSlackUsers
    .filter((tockUser) => tockUser.tz === tz)
    .filter((tockUser) => truants.some((t) => t.email === tockUser.email));

  await Promise.all(
    truantTockSlackUsers.map(async ({ slack_id: slackID }) => {
      await sendDirectMessage(slackID, message);
    })
  );
};

const scheduleReminders = async () => {
  // Westernmost US timezone. Everyone else in the US should be at this time
  // or later, so this is where we want to begin.
  const day = moment.tz("Pacific/Samoa");

  // Proceed to the next Friday, then back up if it's a holiday.
  while (day.format("dddd") !== "Friday") {
    day.add(1, "day");
  }
  while (holidays.isAHoliday(day.toDate())) {
    day.subtract(1, "day");
  }

  const reminderString = day.format("YYYY-MM-DDT16:00:00");

  const users = await get18FTockSlackUsers();
  const now = moment();

  // Get a list of unique timezones by putting them into a Set.
  new Set(users.map((u) => u.tz)).forEach((tz) => {
    const tzReminderTime = moment.tz(reminderString, tz);
    if (tzReminderTime.isAfter(now)) {
      // If the reminder time is in the past, don't schedule it. That'd be
      // a really silly thing to do.
      scheduler.scheduleJob(tzReminderTime.toDate(), reminder(tz));
    }
  });
};

const scheduleNext = () => {
  const nextSunday = moment().day("Sunday");
  // "Not after" rather than "before" to handle the edge where these
  // two are identical. So... Sundays. Also the tests.
  if (!nextSunday.isAfter(moment())) {
    nextSunday.add(7, "days");
  }

  scheduler.scheduleJob(nextSunday.toDate(), async () => {
    await scheduleReminders();
    await scheduleNext();
  });
};

module.exports = async (app) => {
  if (!TOCK_API_URL || !TOCK_TOKEN) {
    app.logger.warn(
      "OptimisticTock disabled: Tock API URL or access token is not set"
    );
    return;
  }

  await scheduleReminders();
  await scheduleNext();
};
