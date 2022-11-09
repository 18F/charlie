const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  dates: { getNextHoliday },
  holidays: { emojis },
  slack: { postMessage },
  helpMessage,
} = require("../utils");

const workLessMessages = [
  "Only do 32 hours worth of work since there are only 32 hours to do them in!",
  "This is your permission to cancel some meetings and only do 32 hours of work for the holiday week!",
  "Don't try to fit 40 hours of work into the holiday week 32-hour week!",
  "Observe it the way that is most appropriate to you, and claim that 8 hours for yourself.",
  "Work at your normal pace for the week and only do 32 hours worth!",
  "Time is not compressed; it's just gone! So you can also get rid of 8 hours worth of work.",
  "32 high-quality work hours are preferable to 40 hours worth of exhausted work crammed into 32 hours!",
];

// The first argument is always the bot object. We don't actually need it for
// this script, so capture and toss it out.
const scheduleReminder = (_, config = process.env) => {
  const CHANNEL = config.HOLIDAY_REMINDER_CHANNEL || "general";
  const TIMEZONE = config.HOLIDAY_REMINDER_TIMEZONE || "America/New_York";
  const reportingTime = moment(
    config.HOLIDAY_REMINDER_TIME || "15:00",
    "HH:mm"
  );

  helpMessage.registerNonInteractive(
    "Holiday reminders",
    `On the business day before a federal holiday, Charlie will post a reminder in #${CHANNEL}. Take the day off, don't do work for the government, and observe it in the way that is most suitable to you!`
  );

  const previousWeekday = (date) => {
    const source = moment(date);
    source.subtract(1, "day");

    let dow = source.format("dddd");
    while (dow === "Saturday" || dow === "Sunday") {
      source.subtract(1, "day");
      dow = source.format("dddd");
    }

    return source;
  };

  const postReminder = async (holiday) => {
    const emoji = emojis.get(holiday.name);

    await postMessage({
      channel: CHANNEL,
      text: `<!here|here> Remember that *${holiday.date.format(
        "dddd"
      )}* is a federal holiday in observance of *${
        holiday.alsoObservedAs ?? holiday.name
      }*${emoji ? ` ${emoji}` : ""}! ${
        workLessMessages[Math.floor(Math.random() * workLessMessages.length)]
      }`,
    });
  };

  const nextHoliday = getNextHoliday(TIMEZONE);
  const target = previousWeekday(nextHoliday.date);

  target.hour(reportingTime.hour());
  target.minute(reportingTime.minute());

  scheduler.scheduleJob(target.toDate(), async () => {
    await postReminder(nextHoliday);

    // Tomorrow, schedule the next holiday reminder
    scheduler.scheduleJob(target.add(1, "day").toDate(), () => {
      scheduleReminder();
    });
  });
};

module.exports = scheduleReminder;
