const moment = require("moment-timezone");
const holidays = require("@18f/us-federal-holidays");

const getNextHoliday = (timezone = "America/New_York") => {
  const now = moment.tz(timezone);

  return holidays
    .allForYear(now.year())
    .concat(holidays.allForYear(now.year() + 1))
    .map((h) => ({
      ...h,
      date: moment.tz(h.dateString, "YYYY-MM-DD", timezone),
    }))
    .filter((h) => h.date.isAfter(now))
    .shift();
};

module.exports = { getNextHoliday };
