const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const utils = require("../utils");

const TOCK_API_URL = process.env.HUBOT_TOCK_API;
const TOCK_TOKEN = process.env.HUBOT_TOCK_TOKEN;

let util;

let reminder = (robot) => {
  const message = {
    username: "Happy Tock",
    icon_emoji: "happytock",
    text: "Don't forget to <https://tock.18f.gov|Tock your time>!",
    as_user: false,
  };

  reminder = (tz) => async () => {
    // Get all the folks who have not submitted their current Tock.
    const truants = await util.tock.get18FTockTruants(moment.tz(tz), 0);

    // Now get the list of Slacky-Tocky users in the current timezone who
    // have not submitted their Tock. Tsk tsk.
    const tockSlackUsers = (await util.tock.get18FTockSlackUsers())
      .filter((tockUser) => tockUser.tz === tz)
      .filter((tockUser) => truants.some((t) => t.email === tockUser.email));

    tockSlackUsers.forEach(({ slack_id: slackID }) => {
      robot.messageRoom(slackID, message);
    });
  };
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

  const reminderString = day.format("YYYY-MM-DDT15:30:00");

  const users = await util.tock.get18FTockSlackUsers();
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

module.exports = async (robot) => {
  if (!TOCK_API_URL || !TOCK_TOKEN) {
    robot.logger.warning(
      "OptimisticTock disabled: Tock API URL or access token is not set"
    );
    return;
  }
  reminder(robot);

  util = utils.setup(robot);

  await scheduleReminders();
};
