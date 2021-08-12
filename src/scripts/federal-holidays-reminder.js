const scheduler = require("node-schedule");
const {
  dates: { getNextHoliday, zonedDateTimeToDate, DAYS },
  holidays: { emojis },
  slack: { postMessage },
} = require("../utils");

const CHANNEL = process.env.HOLIDAY_REMINDER_CHANNEL || "general";
const TIMEZONE = process.env.HOLIDAY_REMINDER_TIMEZONE || "America/New_York";
const reportingTime = Temporal.PlainTime.from(
  process.env.HOLIDAY_REMINDER_TIME || "15:00"
);

const dows = [
  undefined,
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const previousWeekday = (date) => {
  let source = date.subtract({ days: 1 });

  while (
    source.dayOfWeek === DAYS.Saturday ||
    source.dayOfWeek === DAYS.Sunday
  ) {
    source = source.subtract({ days: 1 });
  }

  return source;
};

const postReminder = (holiday) => {
  const emoji = emojis.get(holiday.name);

  postMessage({
    channel: CHANNEL,
    text: `@here Remember that *${
      dows[holiday.date.dayOfWeek]
    }* is a federal holiday in observance of *${holiday.name}*${
      emoji ? ` ${emoji}` : ""
    }!`,
  });
};

const scheduleReminder = () => {
  const nextHoliday = getNextHoliday(TIMEZONE);
  const target = module.exports.previousWeekday(nextHoliday.date);

  const when = Temporal.ZonedDateTime.from({
    year: target.year,
    month: target.month,
    day: target.day,
    hour: reportingTime.hour,
    minute: reportingTime.minute,
    timeZone: TIMEZONE,
  });

  scheduler.scheduleJob(zonedDateTimeToDate(when), () => {
    module.exports.postReminder(nextHoliday);

    // Tomorrow, schedule the next holiday reminder
    scheduler.scheduleJob(zonedDateTimeToDate(when.add({ days: 1 })), () => {
      scheduleReminder();
    });
  });
};

module.exports = scheduleReminder;

// Expose for testing
module.exports.postReminder = postReminder;
module.exports.previousWeekday = previousWeekday;
