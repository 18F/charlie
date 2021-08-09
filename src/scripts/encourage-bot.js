const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  slack: { getChannelID, getSlackUsersInConversation, postMessage },
} = require("../utils");

const CHANNEL = "charlie-testing";

const messages = [
  "You are awesome.",
  "Your teammates appreciate you.",
  "You're here because you're great at what you do.",
  "You're here because we need you to be here.",
  "You are not here by accident. You deserve to be here.",
  "You make this a better place than it otherwise would have been.",
  "Your perspectives are valuable and valued.",
  "You're braver than you believe, and stronger than you seem, and smarter than you think.", // A. A. Milne
];

const getChannelUsers = async (channel) => {
  const users = await getSlackUsersInConversation({
    event: { channel },
  });

  // We don't want bot users (no offense, Charlie), and we only need users'
  // Slack IDs and configured timezones.
  return users
    .filter(({ is_bot: bot }) => !bot)
    .map(({ id, tz }) => ({ id, tz }));
};

const pickOne = (array) => array[Math.floor(Math.random() * array.length)];

const tellSomeoneTheyAreAwesome = async (channel) => {
  const users = await getChannelUsers(channel);

  // Trim down the list of users to just those whose current time is between
  // 9am and 5pm locally.
  const workingHourUsers = users.filter(({ tz }) => {
    const userCurrentHour = moment.tz(tz).hour();
    return userCurrentHour > 9 && userCurrentHour < 17;
  });

  // This *shouldnt'* happen because we scoped the scheduled time according to
  // the westernmost timezone of users in #random, but they could have all left
  // the channel by the time the message is posted, in which case... oops!
  if (workingHourUsers.length > 0) {
    // Now pick someone at random, because everyone deserves it.
    const awesomePerson = pickOne(workingHourUsers);

    postMessage({
      channel,
      username: "You're Awesome",
      icon_emoji: ":you:",
      text: `<@${awesomePerson.id}> ${pickOne(messages)}`,
    });
  }
};

const tzCompare = "2000-01-01T00:00:00.000";
const scheduleAnotherReminder = async (app, channel) => {
  const users = await getChannelUsers(channel);
  const timezones = Array.from(new Set(users.map(({ tz }) => tz))).sort(
    (a, b) => {
      const aa = moment.tz(tzCompare, a);
      const bb = moment.tz(tzCompare, b);

      if (aa.isBefore(bb)) {
        return -1;
      }
      if (bb.isBefore(aa)) {
        return 1;
      }
      return 0;
    }
  );

  const earliest = timezones[0];
  const latest = timezones.pop();

  const next = moment.tz(earliest);
  const tzSpan = moment
    .tz(tzCompare, latest)
    .diff(moment.tz(tzCompare, earliest), "hours");

  // Tell someone else. Wait at least 2 hours, but not more than 48 hours, and
  // just totally randomize the minutes because that's fun.
  const hoursFromNow = Math.floor(Math.random() * 48 + 2);
  const minutesFromNow = Math.floor(Math.random() * 60);

  next.add(hoursFromNow, "hours");
  next.add(minutesFromNow, "minutes");

  // If the new time is outside of everyone's working hours, advance forward
  // until we get inside working hours. Randomize the hours so we're not always
  // doing an announcement in the 9 o'clock hour on the east coast. Randomize
  // by the number of hours between the earliest and latest timezones, so there
  // is a chance of including everyone.
  while (next.hour() < 9 || moment.tz(next, latest).hour() >= 17) {
    next.add(Math.floor(Math.random() * tzSpan), "hour");
  }
  // Make sure we didn't land on a holiday. If we did, hop forward one day at a
  // time until we're out of the holiday. Strictly speaking, we could just hop
  // forward once since we don't have any consecutive holidays, but this script
  // is optimistic for a future where consecutive holidays are possible.
  while (holidays.isAHoliday(next.toDate())) {
    next.add(1, "day");
  }
  // The new time could also have been on the weekend, or we could have been
  // advanced to the weekend by a Friday holiday, so make sure we bustle out of
  // those, too.
  while (next.day() === 0 || next.day() === 6) {
    next.add(1, "day");
  }
  // Check for holidays again. If, for example, we initially landed on a
  // Saturday and there's a Monday holiday, we need to catch that.
  while (holidays.isAHoliday(next.toDate())) {
    next.add(1, "day");
  }

  app.logger.info(
    `[Encourage Bot] Next encouragement is ${next.format(
      "dddd, MMMM Do YYYY, h:mm:ss a zz"
    )}`
  );

  // Schedule the next announcement, which includes scheduling the one after
  // that. The train never ends! 🚂
  scheduler.scheduleJob(next.toDate(), async () =>
    Promise.all([
      tellSomeoneTheyAreAwesome(channel),
      scheduleAnotherReminder(app, channel),
    ])
  );
};

module.exports = async (app) => {
  const channel = await getChannelID(CHANNEL);
  await scheduleAnotherReminder(app, channel);
};