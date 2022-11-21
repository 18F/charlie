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

const getCurrentWorkWeek = () => {
  // Start with Monday of the current week, and then walk forward if there are
  // holidays to contend with. Zoom forward to ~midnight.
  const start = moment
    .utc() /* .hour(23).minute(59).second(59) */
    .day(1);
  while (holidays.isAHoliday(start.toDate(), { utc: true })) {
    start.add(1, "day");
  }

  // Now add all of the rest of the working days this week. Loop until we hit
  // Saturday, and skip any days that are holidays.
  const days = [start];
  let next = start.clone().add(1, "day");
  do {
    if (!holidays.isAHoliday(next.toDate(), { utc: true })) {
      days.push(next);
    }
    next = next.clone().add(1, "day");
  } while (next.day() < 6);

  return days.map((date) => date.toDate());
};

module.exports = { getCurrentWorkWeek, getNextHoliday, getNextElectionDay };
