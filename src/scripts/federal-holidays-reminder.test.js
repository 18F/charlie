const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const sinon = require("sinon");

const {
  utils: {
    slack: { postMessage },
  },
} = require("../utils/test");

expect.extend({
  toMatchMoment: (received, expected) => ({
    message: () => `expected ${expected} to be ${received}`,
    pass: moment(expected).isSame(received),
  }),
});

describe("holiday reminder", () => {
  const scheduleJob = jest.spyOn(scheduler, "scheduleJob");

  const load = async () =>
    new Promise((resolve) => {
      jest.isolateModules(() => {
        const module = require("./federal-holidays-reminder"); // eslint-disable-line global-require
        resolve(module);
      });
    });

  beforeEach(() => {
    delete process.env.HOLIDAY_REMINDER_CHANNEL;
    delete process.env.HOLIDAY_REMINDER_SUPPRESS_HERE;
    delete process.env.HOLIDAY_REMINDER_TIME;
    delete process.env.HOLIDAY_REMINDER_TIMEZONE;

    jest.resetAllMocks();
  });

  describe("gets the next holiday", () => {
    it("defaults to America/New_York time", async () => {
      // Midnight on May 28 in eastern timezone
      const clock = sinon.useFakeTimers(
        +moment.tz("2012-05-28", "YYYY-MM-DD", "America/New_York").format("x")
      );

      const bot = await load();
      const nextHoliday = bot.getNextHoliday();

      expect(moment(nextHoliday.date).isValid()).toBe(true);

      // remove this from the object match, otherwise
      // it becomes a whole big thing, dependent on
      // moment not changing its internal object structure
      delete nextHoliday.date;

      expect(nextHoliday).toEqual({
        name: "Independence Day",
        dateString: "2012-7-4",
      });

      clock.restore();
    });

    it("respects the configured timezone", async () => {
      process.env.HOLIDAY_REMINDER_TIMEZONE = "America/Chicago";

      // Midnight on May 28 in US eastern timezone.  Because our reminder
      // timezone is US central timezone, "now" is still May 27, so the
      // "next" holiday should be May 28 - Memorial Day
      const clock = sinon.useFakeTimers(
        +moment.tz("2012-05-28", "YYYY-MM-DD", "America/New_York").format("x")
      );

      const bot = await load();
      const nextHoliday = bot.getNextHoliday();

      expect(moment(nextHoliday.date).isValid()).toBe(true);

      // remove this from the object match, otherwise
      // it becomes a whole big thing, dependent on
      // moment not changing its internal object structure
      delete nextHoliday.date;

      expect(nextHoliday).toEqual({
        name: "Memorial Day",
        dateString: "2012-5-28",
      });
      clock.restore();
    });
  });

  describe("gets the previous weekday", () => {
    [
      {
        title: "gets Friday from Saturday",
        start: new Date(2018, 10, 10),
        end: "2018-11-09",
      },
      {
        title: "gets Friday from Sunday",
        start: new Date(2018, 10, 11),
        end: "2018-11-09",
      },
      {
        title: "gets Friday from Monday",
        start: new Date(2018, 10, 12),
        end: "2018-11-09",
      },
      {
        title: "gets Monday from Tuesday",
        start: new Date(2018, 10, 13),
        end: "2018-11-12",
      },
      {
        title: "gets Tuesday from Wednesday",
        start: new Date(2018, 10, 14),
        end: "2018-11-13",
      },
      {
        title: "gets Wednesday from Thursday",
        start: new Date(2018, 10, 15),
        end: "2018-11-14",
      },
      {
        title: "gets Thursday from Friday",
        start: new Date(2018, 10, 16),
        end: "2018-11-15",
      },
    ].forEach(({ title, start, end }) => {
      it(title, async () => {
        const bot = await load();
        const out = bot.previousWeekday(start).format("YYYY-MM-DD");
        expect(out).toEqual(end);
      });
    });
  });

  describe("posts a reminder", () => {
    it("defaults to #general", async () => {
      const bot = await load();
      bot.postReminder({
        date: moment("2018-11-12", "YYYY-MM-DD"),
        name: "Test Holiday",
      });

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text:
          "@here Remember that *Monday* is a federal holiday in observance of *Test Holiday*!",
      });
    });

    it("honors the HOLIDAY_REMINDER_CHANNEL env var", async () => {
      process.env.HOLIDAY_REMINDER_CHANNEL = "fred";
      const bot = await load();

      bot.postReminder({
        date: moment("2018-11-12", "YYYY-MM-DD"),
        name: "Test Holiday",
      });

      expect(postMessage).toHaveBeenCalledWith({
        channel: "fred",
        text:
          "@here Remember that *Monday* is a federal holiday in observance of *Test Holiday*!",
      });
    });

    describe("honors the HOLIDAY_REMINDER_SUPPRESS_HERE env var", () => {
      ["true", "yes", "y", "1", "100"].forEach((flag) => {
        it(`suppresses if the env var is set to "${flag}"`, async () => {
          process.env.HOLIDAY_REMINDER_SUPPRESS_HERE = flag;
          const bot = await load();

          bot.postReminder({
            date: moment("2018-11-12", "YYYY-MM-DD"),
            name: "Test Holiday",
          });

          expect(postMessage).toHaveBeenCalledWith({
            channel: "general",
            text:
              "Remember that *Monday* is a federal holiday in observance of *Test Holiday*!",
          });
        });
      });

      ["false", "no", "n", "0", ""].forEach((flag) => {
        it(`does not suppress if the env var is set to "${flag}"`, async () => {
          process.env.HOLIDAY_REMINDER_SUPPRESS_HERE = flag;
          const bot = await load();

          bot.postReminder({
            date: moment("2018-11-12", "YYYY-MM-DD"),
            name: "Test Holiday",
          });

          expect(postMessage).toHaveBeenCalledWith({
            channel: "general",
            text:
              "@here Remember that *Monday* is a federal holiday in observance of *Test Holiday*!",
          });
        });
      });
    });
  });

  describe("schedules a reminder", () => {
    it("defaults to 15:00", async () => {
      const bot = await load();

      const nextHoliday = { date: "in the future" };
      jest.spyOn(bot, "getNextHoliday").mockReturnValue(nextHoliday);

      const weekdayBefore = moment("2000-01-01", "YYYY-MM-DD");
      jest.spyOn(bot, "previousWeekday").mockReturnValue(weekdayBefore);

      jest.spyOn(bot, "postReminder").mockReturnValue();

      bot();

      expect(weekdayBefore.hour()).toBe(15);
      expect(weekdayBefore.minute()).toBe(0);

      expect(scheduleJob).toHaveBeenCalledWith(
        expect.toMatchMoment(weekdayBefore),
        expect.any(Function)
      );

      // call the scheduled job
      scheduleJob.mock.calls[0][1]();

      expect(bot.postReminder).toHaveBeenCalledWith(nextHoliday);

      expect(scheduleJob).toHaveBeenCalledWith(
        expect.toMatchMoment(weekdayBefore),
        expect.any(Function)
      );

      expect(scheduleJob.mock.calls.length).toBe(2);
    });

    it("respects HOLIDAY_REMINDER_TIME", async () => {
      process.env.HOLIDAY_REMINDER_TIME = "04:32";
      const bot = await load();

      const nextHoliday = { date: "in the future" };
      jest.spyOn(bot, "getNextHoliday").mockReturnValue(nextHoliday);

      const weekdayBefore = moment("2000-01-01", "YYYY-MM-DD");
      jest.spyOn(bot, "previousWeekday").mockReturnValue(weekdayBefore);

      jest.spyOn(bot, "postReminder").mockReturnValue();

      bot();

      expect(bot.previousWeekday).toHaveBeenCalledWith("in the future");

      expect(weekdayBefore.hour()).toBe(4);
      expect(weekdayBefore.minute()).toBe(32);

      expect(scheduleJob).toHaveBeenCalledWith(
        expect.toMatchMoment(weekdayBefore),
        expect.any(Function)
      );

      // call the scheduled job
      scheduleJob.mock.calls[0][1]();

      expect(bot.postReminder).toHaveBeenCalledWith(nextHoliday);

      expect(scheduleJob).toHaveBeenCalledWith(
        expect.toMatchMoment(weekdayBefore),
        expect.any(Function)
      );

      expect(scheduleJob.mock.calls.length).toBe(2);
    });
  });
});
