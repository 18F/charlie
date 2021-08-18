const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  dates: { getNextHoliday },
  holidays: { emojis },
  slack: { postMessage },
} = require("../utils");

const CHANNEL = process.env.HOLIDAY_REMINDER_CHANNEL || "general";
const TIMEZONE = process.env.HOLIDAY_REMINDER_TIMEZONE || "America/New_York";
const reportingTime = moment(
  process.env.HOLIDAY_REMINDER_TIME || "15:00",
  "HH:mm"
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
    text: `@here Remember that *${holiday.date.format(
      "dddd"
    )}* is a federal holiday in observance of *${holiday.name}*${
      emoji ? ` ${emoji}` : ""
    }!`,
  });
};

const scheduleReminder = () => {
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
