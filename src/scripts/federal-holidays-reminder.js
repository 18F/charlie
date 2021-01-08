const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const holidays = require("@18f/us-federal-holidays");
const {
  slack: { postMessage },
} = require("../utils");

const CHANNEL = process.env.HOLIDAY_REMINDER_CHANNEL || "general";
const TIMEZONE = process.env.HOLIDAY_REMINDER_TIMEZONE || "America/New_York";
const reportingTime = moment(
  process.env.HOLIDAY_REMINDER_TIME || "15:00",
  "HH:mm"
);
const SUPPRESS_HERE = process.env.HOLIDAY_REMINDER_SUPPRESS_HERE;

const suppressHere = (() => {
  if (SUPPRESS_HERE) {
    const upper = SUPPRESS_HERE.toUpperCase();
    if (upper === "TRUE" || upper === "YES" || upper === "Y") {
      return true;
    }

    if (!Number.isNaN(+SUPPRESS_HERE) && +SUPPRESS_HERE > 0) {
      return true;
    }
  }
  return false;
})();

const getNextHoliday = () => {
  const now = moment.tz(TIMEZONE);

  return holidays
    .allForYear(now.year())
    .concat(holidays.allForYear(now.year() + 1))
    .map((h) => ({
      ...h,
      date: moment.tz(h.dateString, "YYYY-MM-DD", TIMEZONE),
    }))
    .filter((h) => h.date.isAfter(now))
    .shift();
};

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

const postReminder = (holiday) => {
  postMessage({
    channel: CHANNEL,
    text: `${suppressHere ? "" : "@here "}Remember that *${holiday.date.format(
      "dddd"
    )}* is a federal holiday in observance of *${holiday.name}*!`,
  });
};

const scheduleReminder = () => {
  const nextHoliday = module.exports.getNextHoliday();
  const target = module.exports.previousWeekday(nextHoliday.date);

  target.hour(reportingTime.hour());
  target.minute(reportingTime.minute());

  scheduler.scheduleJob(target.toDate(), () => {
    module.exports.postReminder(nextHoliday);

    // Tomorrow, schedule the next holiday reminder
    scheduler.scheduleJob(target.add(1, "day").toDate(), () => {
      scheduleReminder();
    });
  });
};

module.exports = scheduleReminder;

// Expose for testing
module.exports.getNextHoliday = getNextHoliday;
module.exports.postReminder = postReminder;
module.exports.previousWeekday = previousWeekday;
