// Periodically posts a message to #random telling someone they're awesome. The
// bot picks from the list of users in #random who are currently within nominal
// working hours of 9am to 5pm in their local time. After posting, schedules the
// next one for 2-48 hours in the future, skipping weekends and holidays, and
// making sure the schedule time is within working hours for at least one person
// in the #random channel.

const holidays = require("@18f/us-federal-holidays");
const { directMention } = require("@slack/bolt");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  slack: { getChannelID, getSlackUsersInConversation, postMessage },
} = require("../utils");

const BRAIN_KEY = "encourage-bot-schedule";
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
    .filter(({ deleted, is_bot: bot }) => !deleted && !bot)
    .map(({ id, tz }) => ({ id, tz }));
};

const pickOne = (array) => array[Math.floor(Math.random() * array.length)];

const tellSomeoneTheyAreAwesome = async (channel, context = {}) => {
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
      ...context,
    });
  }
};

const tzCompare = "2000-01-01T00:00:00.000";
const scheduleAnotherReminder = async (app, channel, time) => {
  // The incoming time is an ISO8601 string, so we can safely load that as the
  // US eastern timezone.
  let next = moment.tz(time, "America/New_York");

  // If there is *NOT* an incoming time OR if it is in the past, then we  need
  // to pick a new time. If there is an incoming time in the future, we will
  // trust that it is valid according to the rules below rather than checking
  // them all again.
  //
  // Use "not after" because we also want to exclude the case where the stored
  // time is exactly now. The reason is that if we schedule a future event for
  // now, it may never fire (it becomes a race condition), in which case it will
  // also never schedule subsequent events and the bot just won't ever do
  // anything. So... if the saved time is now, just do a new one.
  if (!time || !next.isAfter(moment())) {
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

    next = moment.tz(earliest);

    // Add 7-28 days. We don't want the bot to fire so often that it becomes a
    // nuissance or anticipated. We want it to feel a little like a happy
    // surprise every time it happens.
    next.add(Math.round(Math.random() * 21 + 7), "days");

    // Make sure we didn't land on a holiday. If we did, hop forward one day at a
    // time until we're out of the holiday. Strictly speaking, we could just hop
    // forward once since we don't have any consecutive holidays, but this script
    // is optimistic for a future where consecutive holidays are possible.
    while (holidays.isAHoliday(next.toDate())) {
      next.add(1, "day");
    }
    q;
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

    // Use the scheduled date for this comparison, to make sure we account for
    // daylight savings time, etc., on the scheduled date. Set the hour to noon
    // in both timezones so if DST is happening, it will have already happened.
    const tzSpan = moment
      .tz(next.format("YYYY-MM-DDT12:00:00"), latest)
      .diff(moment.tz(next.format("YYYY-MM-DDT12:00:00"), earliest), "hours");

    // Set the next hour when the encouragement will happen. This works from the
    // following basic algorithm:
    //   (rand * range) + minimum
    // The range is the number of hours that are acceptable, which is 8 hours
    // for a standard workday PLUS the number of hours difference between
    // eastern and westernmost timezones. The minimum is 9am ET.
    //
    // E.g., for EST and PST:
    //  (rand * (8 + 3)) + 9
    //  (rand * 11) + 9
    //
    // gurantees that all hours will be between 9am ET and 8pm ET (5pm PT),
    // which should account for the entire spectrum of working hours for
    // everyone in the channel (except using the actual easternmost and
    // westermost timezones of users in the channel). Also set the minutes at
    // some random point for funsies.
    next.hour(Math.floor(Math.random() * (8 + tzSpan) + 9));
    next.minute(Math.floor(Math.random() * 60));
  }

  app.logger.info(
    `[Encourage Bot] Next encouragement is ${next.format(
      "dddd, MMMM Do YYYY, h:mm:ss a zz"
    )}`
  );

  // Save the scheduled time so we can pick it up again when the bot restarts.
  app.brain.set(BRAIN_KEY, next.toISOString());

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
  const time = app.brain.get(BRAIN_KEY);

  const defaultChannel = await getChannelID(CHANNEL);
  await scheduleAnotherReminder(app, defaultChannel, time);

  app.message(
    directMention(),
    /^<@[^>]+> encourage/i,
    async ({ event: { channel, thread_ts: thread } }) => {
      await tellSomeoneTheyAreAwesome(channel, { thread_ts: thread });
    }
  );
};
