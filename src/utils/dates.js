const { Temporal } = require("@js-temporal/polyfill");
const holidays = require("@18f/us-federal-holidays");

const getNextHoliday = (timeZone = "America/New_York") => {
  const now = Temporal.Now.instant().toZonedDateTime({
    calendar: "iso8601",
    timeZone,
  });

  return (
    holidays
      .allForYear(now.year)
      .concat(holidays.allForYear(now.year + 1))
      .map((h) => {
        const [year, m, d] = h.dateString.split("-");
        const month = m < 10 ? `0${m}` : m;
        const day = d < 10 ? `0${d}` : d;

        return {
          ...h,
          date: Temporal.ZonedDateTime.from(
            `${[year, month, day].join("-")}[${timeZone}]`
          ),
        };
      })
      .filter(({ date }) => Temporal.ZonedDateTime.compare(date, now) > 0)
      // Eventually this could just return Temporal.PlainDate objects, but not yet
      // because downstream code expects this to return legacy Date objects
      .map((h) => ({ ...h, date: new Date(Date.parse(h.date.toInstant())) }))
      .shift()
  );
};

module.exports = { getNextHoliday };
