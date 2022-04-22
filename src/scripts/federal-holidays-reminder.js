const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  dates: { getNextHoliday },
  holidays: { emojis },
  slack: { postMessage },
} = require("../utils");

const scheduleReminder = (config = process.env) => {
  const CHANNEL = config.HOLIDAY_REMINDER_CHANNEL || "general";
  const TIMEZONE = config.HOLIDAY_REMINDER_TIMEZONE || "America/New_York";
  const reportingTime = moment(
    config.HOLIDAY_REMINDER_TIME || "15:00",
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
      text: `<!here|here> Remember that *${holiday.date.format(
        "dddd"
      )}* is a federal holiday in observance of *${
        holiday.alsoObservedAs ?? holiday.name
      }*${emoji ? ` ${emoji}` : ""}!`,
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
