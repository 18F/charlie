const holidays = require("@18f/us-federal-holidays");

const calendar = "iso8601";

const DAYS = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const getNow = (timeZone = "America/New_York") =>
  Temporal.Now.instant().toZonedDateTime({ calendar, timeZone });

const getToday = (timeZone = "America/New_York") =>
  getNow(timeZone).toPlainDate();

const zonedDateTimeToDate = (zdt) =>
  new Date(zdt.toInstant().epochMilliseconds);

const getNextHoliday = (timeZone = "America/New_York") => {
  const now = getToday(timeZone);

  return (
    holidays
      .allForYear(now.year)
      .concat(holidays.allForYear(now.year + 1))
      .map((h) => {
        const [year, m, d] = h.dateString.split("-");
        const month = String(m).padStart(2, "0");
        const day = String(d).padStart(2, "0");

        return {
          ...h,
          date: Temporal.PlainDate.from(`${[year, month, day].join("-")}`),
        };
      })
      .filter(({ date }) => Temporal.PlainDate.compare(date, now) > 0)
      // Eventually this could just return Temporal.PlainDate objects, but not yet
      // because downstream code expects this to return legacy Date objects
      // .map((h) => ({ ...h, date: new Date(Date.parse(h.date.toInstant())) }))
      .shift()
  );
};

module.exports = {
  getNextHoliday,
  getNow,
  getToday,
  zonedDateTimeToDate,
  DAYS,
};
