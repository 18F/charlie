const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  slack: { getChannelID, getSlackUsersInConversation, postMessage },
} = require("../utils");

const CHANNEL = "charlie-testing";

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

const tellSomeoneTheyAreAwesome = async (channel) => {
  const users = await getChannelUsers(channel);

  // Trim down the list of users to just those whose current time is between
  // 9am and 5pm locally.
  const workingHourUsers = users.filter(({ tz }) => {
    const userCurrentHour = moment.tz(tz).hour();
    return userCurrentHour > 9 && userCurrentHour < 17;
  });

  // Now pick someone at random, because everyone deserves it.
  const awesomePerson =
    workingHourUsers[Math.floor(Math.random() * workingHourUsers.length)];

  postMessage({
    channel,
    username: "You're Awesome",
    icon_emoji: ":you:",
    text: `<@${awesomePerson.id}> You are awesome.`,
  });
};

const scheduleAnotherReminder = (app, channel) => {
  const next = moment.tz("America/Puerto_Rico");

  // Tell someone else. Wait at least 2 hours, but not more than 48 hours, and
  // just totally randomize the minutes because that's fun.
  const hoursFromNow = Math.floor(Math.random() * 48 + 2);
  const minutesFromNow = Math.floor(Math.random() * 60);

  next.add(hoursFromNow, "hours");
  next.add(minutesFromNow, "minutes");

  // If the new time is outside of everyone's working hours, advance forward
  // until we get inside working hours. Randomize the hours so we're not always
  // doing an announcement in the 9 o'clock hour on the east coast
  while (next.hour() < 9 || moment.tz(next, "America/Anchorage").hour() >= 17) {
    next.add(Math.floor(Math.random() * 4), "hour");
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
  // those, too. This piece of script is less optimistic because it would fail
  // for certain arrangements of consecutive holidays or holidays on both sides
  // of a weekend. So now we're back to balanced realism.
  while (next.day() === 0 || next.day() === 6) {
    next.add(1, "day");
  }

  app.logger.info(
    `[Encourage Bot] Next encouragement is ${next.format(
      "dddd, MMMM Do YYYY, h:mm:ss a zz"
    )}`
  );

  // Schedule the next announcement, which includes scheduling the one after
  // that. The train never ends! 🚂
  scheduler.scheduleJob(next.toDate(), () => {
    tellSomeoneTheyAreAwesome(channel);
    scheduleAnotherReminder(app, channel);
  });
};

module.exports = async (app) => {
  const channel = await getChannelID(CHANNEL);
  scheduleAnotherReminder(app, channel);
};
