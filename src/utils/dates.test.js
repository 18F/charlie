const moment = require("moment-timezone");
const {
  getCurrentWorkWeek,
  getNextElectionDay,
  getNextHoliday,
} = require("./dates");

describe("date utility library", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("gets the next holiday", () => {
    it("defaults to America/New_York time", async () => {
      // Midnight on May 28 in eastern timezone
      jest.setSystemTime(
        +moment.tz("2012-05-28", "YYYY-MM-DD", "America/New_York").format("x"),
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
        +moment.tz("2012-05-28", "YYYY-MM-DD", "America/New_York").format("x"),
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

  describe("gets the current working week, accounting for holidays", () => {
    it("correctly handles a week with no holidays", () => {
      // Non-holiday week
      jest.setSystemTime(
        +moment.tz("2022-11-17", "America/New_York").format("x"),
      );

      const dates = getCurrentWorkWeek();

      expect(dates).toEqual([
        "2022-11-14",
        "2022-11-15",
        "2022-11-16",
        "2022-11-17",
        "2022-11-18",
      ]);
    });

    it("correctly handles a week with a Monday holiday", () => {
      // Christmas 2022, falls on a Sunday, but is observed on Monday
      jest.setSystemTime(
        +moment.tz("2022-12-26", "America/New_York").format("x"),
      );

      const dates = getCurrentWorkWeek();

      expect(dates).toEqual([
        "2022-12-27",
        "2022-12-28",
        "2022-12-29",
        "2022-12-30",
      ]);
    });

    it("correctly handles a week with a Friday holiday", () => {
      // Veterans Day 2022, falls on a Friday
      jest.setSystemTime(
        +moment.tz("2022-11-08", "America/New_York").format("x"),
      );

      const dates = getCurrentWorkWeek();

      expect(dates).toEqual([
        "2022-11-07",
        "2022-11-08",
        "2022-11-09",
        "2022-11-10",
      ]);
    });

    it("correctly handles a week with a midweek holiday", () => {
      // Thanksgiving 2022, falls on a Thursday
      jest.setSystemTime(
        +moment.tz("2022-11-24", "America/New_York").format("x"),
      );

      const dates = getCurrentWorkWeek();

      expect(dates).toEqual([
        "2022-11-21",
        "2022-11-22",
        "2022-11-23",
        "2022-11-25",
      ]);
    });
  });
});
