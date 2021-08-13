const sinon = require("sinon");
const { getNextHoliday } = require("./dates");

const midnight = ({ year, month, day }) =>
  Temporal.ZonedDateTime.from({
    year,
    month,
    day,
    timeZone: "America/New_York",
  }).epochMilliseconds;

describe("gets the next holiday", () => {
  it("defaults to America/New_York time", async () => {
    // Midnight on May 28 in eastern timezone
    const clock = sinon.useFakeTimers(
      midnight({ year: 2012, month: 5, day: 28 })
    );

    const nextHoliday = getNextHoliday();

    // remove this from the object match, because jest doesn't currently have
    // Temporal type matchers
    delete nextHoliday.date;

    expect(nextHoliday).toEqual({
      name: "Independence Day",
      dateString: "2012-7-4",
    });

    clock.restore();
  });

  it("respects the configured timezone", async () => {
    // Midnight on May 28 in US eastern timezone.  Because our reminder
    // timezone is US central timezone, "now" is still May 27, so the
    // "next" holiday should be May 28 - Memorial Day
    const clock = sinon.useFakeTimers(
      midnight({ year: 2012, month: 5, day: 28 })
    );

    const nextHoliday = getNextHoliday("America/Chicago");

    // remove this from the object match, because jest doesn't currently have
    // Temporal type matchers
    delete nextHoliday.date;

    expect(nextHoliday).toEqual({
      name: "Memorial Day",
      dateString: "2012-5-28",
    });
    clock.restore();
  });
});
