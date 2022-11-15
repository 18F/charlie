const moment = require("moment-timezone");
const { getNextElectionDay, getNextHoliday } = require("./dates");

describe("gets the next holiday", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("defaults to America/New_York time", async () => {
    // Midnight on May 28 in eastern timezone
    jest.setSystemTime(
      +moment.tz("2012-05-28", "YYYY-MM-DD", "America/New_York").format("x")
    );

    const nextHoliday = getNextHoliday();

    expect(moment(nextHoliday.date).isValid()).toBe(true);

    // remove this from the object match, otherwise
    // it becomes a whole big thing, dependent on
    // moment not changing its internal object structure
    delete nextHoliday.date;

    expect(nextHoliday).toEqual({
      name: "Independence Day",
      dateString: "2012-07-04",
    });
  });

  it("respects the configured timezone", async () => {
    // Midnight on May 28 in US eastern timezone.  Because our reminder
    // timezone is US central timezone, "now" is still May 27, so the
    // "next" holiday should be May 28 - Memorial Day
    jest.setSystemTime(
      +moment.tz("2012-05-28", "YYYY-MM-DD", "America/New_York").format("x")
    );

    const nextHoliday = getNextHoliday("America/Chicago");

    expect(moment(nextHoliday.date).isValid()).toBe(true);

    // remove this from the object match, otherwise
    // it becomes a whole big thing, dependent on
    // moment not changing its internal object structure
    delete nextHoliday.date;

    expect(nextHoliday).toEqual({
      name: "Memorial Day",
      dateString: "2012-05-28",
    });
  });
});

describe("date utility library", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("gets the next federal election day", () => {
    describe("if election day for this year has already passed", () => {
      it("because it is November but after election day", () => {
        jest.setSystemTime(+moment.utc("2022-11-09", "YYYY-MM-DD").format("x"));

        const electionDay = getNextElectionDay();

        expect(electionDay.isSame(moment.utc("2024-11-05"))).toBe(true);
      });

      it("because it is now December", () => {
        jest.setSystemTime(+moment.utc("2022-12-03", "YYYY-MM-DD").format("x"));

        const electionDay = getNextElectionDay();

        expect(electionDay.isSame(moment.utc("2024-11-05"))).toBe(true);
      });
    });

    it("skips odd-numbered years", () => {
      jest.setSystemTime(+moment.utc("2021-03-01", "YYYY-MM-DD").format("x"));

      const electionDay = getNextElectionDay();

      expect(electionDay.isSame(moment.utc("2022-11-08"))).toBe(true);
    });

    it("goes the second Tuesday of November if the first Tuesday is before the first Monday", () => {
      jest.setSystemTime(+moment.utc("2022-10-01", "YYYY-MM-DD").format("x"));

      const electionDay = getNextElectionDay();

      expect(electionDay.isSame(moment.utc("2022-11-08"))).toBe(true);
    });
  });
});
