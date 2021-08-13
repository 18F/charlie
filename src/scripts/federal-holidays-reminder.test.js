const scheduler = require("node-schedule");

const {
  utils: {
    dates: { getNextHoliday },
    slack: { postMessage },
  },
} = require("../utils/test");

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
    delete process.env.HOLIDAY_REMINDER_TIME;
    delete process.env.HOLIDAY_REMINDER_TIMEZONE;

    jest.resetAllMocks();
  });

  describe("gets the previous weekday", () => {
    [
      {
        title: "gets Friday from Saturday",
        start: Temporal.PlainDate.from("2018-11-10"),
        end: "2018-11-09",
      },
      {
        title: "gets Friday from Sunday",
        start: Temporal.PlainDate.from("2018-11-11"),
        end: "2018-11-09",
      },
      {
        title: "gets Friday from Monday",
        start: Temporal.PlainDate.from("2018-11-12"),
        end: "2018-11-09",
      },
      {
        title: "gets Monday from Tuesday",
        start: Temporal.PlainDate.from("2018-11-13"),
        end: "2018-11-12",
      },
      {
        title: "gets Tuesday from Wednesday",
        start: Temporal.PlainDate.from("2018-11-14"),
        end: "2018-11-13",
      },
      {
        title: "gets Wednesday from Thursday",
        start: Temporal.PlainDate.from("2018-11-15"),
        end: "2018-11-14",
      },
      {
        title: "gets Thursday from Friday",
        start: Temporal.PlainDate.from("2018-11-16"),
        end: "2018-11-15",
      },
    ].forEach(({ title, start, end }) => {
      it(title, async () => {
        const bot = await load();
        const out = bot.previousWeekday(start).toString();
        expect(out).toEqual(end);
      });
    });
  });

  describe("posts a reminder", () => {
    it("defaults to #general", async () => {
      const bot = await load();
      bot.postReminder({
        date: Temporal.PlainDate.from("2018-11-12"),
        name: "Test Holiday",
      });

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text: "@here Remember that *Monday* is a federal holiday in observance of *Test Holiday*!",
      });
    });

    it("honors the HOLIDAY_REMINDER_CHANNEL env var", async () => {
      process.env.HOLIDAY_REMINDER_CHANNEL = "fred";
      const bot = await load();

      bot.postReminder({
        date: Temporal.PlainDate.from("2018-11-12"),
        name: "Test Holiday",
      });

      expect(postMessage).toHaveBeenCalledWith({
        channel: "fred",
        text: "@here Remember that *Monday* is a federal holiday in observance of *Test Holiday*!",
      });
    });

    it("includes an emoji for holidays with known emoji mappings", async () => {
      const bot = await load();
      bot.postReminder({
        date: Temporal.PlainDate.from("2018-11-12"),
        name: "Veterans Day",
      });

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text: "@here Remember that *Monday* is a federal holiday in observance of *Veterans Day* :salute-you:!",
      });
    });
  });

  describe("schedules a reminder", () => {
    it("defaults to 15:00", async () => {
      const bot = await load();

      const nextHoliday = { date: "in the future" };
      getNextHoliday.mockReturnValue(nextHoliday);

      const weekdayBefore = Temporal.PlainDate.from("2000-01-01");
      jest.spyOn(bot, "previousWeekday").mockReturnValue(weekdayBefore);

      jest.spyOn(bot, "postReminder").mockReturnValue();

      bot();

      expect(scheduleJob).toHaveBeenCalledWith(
        new Date(
          Temporal.ZonedDateTime.from(
            "2000-01-01T15:00:00[America/New_York]"
          ).epochMilliseconds
        ),
        expect.any(Function)
      );

      // call the scheduled job
      scheduleJob.mock.calls[0][1]();

      expect(bot.postReminder).toHaveBeenCalledWith(nextHoliday);

      // The scheduled job should setup a future job to schedule the *next*
      // reminder. The future job should run one day after the current one. The
      // test here is sublte, but note that it checks for January SECOND instead
      // of January first like the previous expect.
      expect(scheduleJob).toHaveBeenCalledWith(
        new Date(
          Temporal.ZonedDateTime.from(
            "2000-01-02T15:00:00[America/New_York]"
          ).epochMilliseconds
        ),
        expect.any(Function)
      );

      expect(scheduleJob.mock.calls.length).toBe(2);
    });

    it("respects HOLIDAY_REMINDER_TIME", async () => {
      process.env.HOLIDAY_REMINDER_TIME = "04:32";
      const bot = await load();

      const nextHoliday = { date: "in the future" };
      getNextHoliday.mockReturnValue(nextHoliday);

      const weekdayBefore = Temporal.PlainDate.from("2000-01-01");
      jest.spyOn(bot, "previousWeekday").mockReturnValue(weekdayBefore);

      jest.spyOn(bot, "postReminder").mockReturnValue();

      bot();

      expect(bot.previousWeekday).toHaveBeenCalledWith("in the future");

      expect(scheduleJob).toHaveBeenCalledWith(
        new Date(
          Temporal.ZonedDateTime.from(
            "2000-01-01T04:32:00[America/New_York]"
          ).epochMilliseconds
        ),
        expect.any(Function)
      );

      // The scheduled job should setup a future job to schedule the *next*
      // reminder. The future job should run one day after the current one. The
      // test here is sublte, but note that it checks for January SECOND instead
      // of January first like the previous expect.
      scheduleJob.mock.calls[0][1]();

      expect(bot.postReminder).toHaveBeenCalledWith(nextHoliday);

      expect(scheduleJob).toHaveBeenCalledWith(
        new Date(
          Temporal.ZonedDateTime.from(
            "2000-01-02T04:32:00[America/New_York]"
          ).epochMilliseconds
        ),
        expect.any(Function)
      );

      expect(scheduleJob.mock.calls.length).toBe(2);
    });
  });
});
