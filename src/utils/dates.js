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

const getNextElectionDayFrom = (from) => {
  // In the US, federal election day is the first Tuesday after the first
  // Monday in November of even-numbered years.

  const date = moment.utc(from);
  date.hour(0);
  date.minute(0);
  date.second(0);
  date.millisecond(0);

  // If it's already after November, shift forward to the next January and
  // compute from there. Months are 0-indexed because of Reasons™.
  if (date.month() > 10) {
    date.month(1);
    date.year(date.year() + 1);
  }

  // If we're in an odd-numbered year, advance one year. Federal elections are
  // only in even-numbered years.
  if (date.year() % 2 === 1) {
    date.year(date.year() + 1);
  }

  date.month(10);
  date.date(1);

  // Election day is the first Tuesday AFTER the first Monday of November. So if
  // the first day of November is Tuesday, we fast-forward a week. Otherwise, we
  // fast-forward to the first Tuesday.
  if (date.day() === 2) {
    date.date(date.date() + 7);
  } else {
    while (date.day() !== 2) {
      date.add(1, "days");
    }
  }

  return date;
};

const getNextElectionDay = () => {
  const date = moment.utc();

  const election = getNextElectionDayFrom(date);

  // If the provided election day is in the past, jump forward a month and then
  // get it again.
  if (election.isBefore(moment.utc())) {
    date.add(1, "month");
    return getNextElectionDayFrom(date);
  }

  return election;
};

module.exports = { getNextHoliday, getNextElectionDay };
