// Periodically posts a message to #random telling someone they're awesome. The
// bot picks from the list of users in #random who are currently within nominal
// working hours of 9am to 5pm in their local time. After posting, schedules the
// next one for 2-48 hours in the future, skipping weekends and holidays, and
// making sure the schedule time is within working hours for at least one person
// in the #random channel.

const holidays = require("@18f/us-federal-holidays");
const scheduler = require("node-schedule");
const {
  dates: { getNow },
  slack: { getChannelID, getSlackUsersInConversation, postMessage },
} = require("../utils");
const { DAYS, zonedDateTimeToDate } = require("../utils/dates");

const CHANNEL = "random";

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
    const userCurrentHour = getNow(tz).hour;
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
    (a, b) =>
      Temporal.ZonedDateTime.compare(
        Temporal.ZonedDateTime.from(`${tzCompare}[${a}]`),
        Temporal.ZonedDateTime.from(`${tzCompare}[${b}]`)
      )
  );

  const earliest = timezones[0];
  const latest = timezones.pop();

  const { hours: tzSpan } = Temporal.ZonedDateTime.from(
    `${tzCompare}[${earliest}]`
  ).until(
    Temporal.ZonedDateTime.from(`${tzCompare}[${latest}]`, {
      largestUnit: "hour",
      smallestUnit: "hour",
    })
  );

  // Tell someone else. Wait at least 2 hours, but not more than 48 hours, and
  // just totally randomize the minutes because that's fun.
  let next = getNow(earliest).add({
    hours: Math.floor(Math.random() * 48 + 2),
    minutes: Math.floor(Math.random() * 60),
  });

  // If the new time is outside of everyone's working hours, advance forward
  // until we get inside working hours. Randomize the hours so we're not always
  // doing an announcement in the 9 o'clock hour on the east coast. Randomize
  // by the number of hours between the earliest and latest timezones, so there
  // is a chance of including everyone.
  while (next.hour < 9 || next.withTimeZone(latest).hour >= 17) {
    next = next.add({ hours: Math.floor(Math.random() * tzSpan) });
  }
  // Make sure we didn't land on a holiday. If we did, hop forward one day at a
  // time until we're out of the holiday. Strictly speaking, we could just hop
  // forward once since we don't have any consecutive holidays, but this script
  // is optimistic for a future where consecutive holidays are possible.
  while (holidays.isAHoliday(zonedDateTimeToDate(next))) {
    next = next.add({ days: 1 });
  }
  // The new time could also have been on the weekend, or we could have been
  // advanced to the weekend by a Friday holiday, so make sure we bustle out of
  // those, too.
  while (next.dayOfWeek === DAYS.Sunday || next.dayOfWeek === DAYS.Saturday) {
    next = next.add({ days: 1 });
  }
  // Check for holidays again. If, for example, we initially landed on a
  // Saturday and there's a Monday holiday, we need to catch that.
  while (holidays.isAHoliday(zonedDateTimeToDate(next))) {
    next = next.add({ days: 1 });
  }

  app.logger.info(
    `[Encourage Bot] Next encouragement is ${next.toLocaleString()}`
  );

  // Schedule the next announcement, which includes scheduling the one after
  // that. The train never ends! 🚂
  scheduler.scheduleJob(zonedDateTimeToDate(next), async () =>
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
