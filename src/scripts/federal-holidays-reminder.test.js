const moment = require("moment-timezone");
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

  describe("schedules a reminder on startup", () => {
    describe("reminds on Friday for holidays on Monday", () => {
      it("defaults to 15:00", async () => {
        const bot = await load();

        const nextHoliday = {
          date: moment.tz("2021-08-16T12:00:00", "America/New_York"),
        };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot();
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date).subtract(3, "days").hour(15).toDate(),
          expect.any(Function)
        );
      });

      it("respects HOLIDAY_REMINDER_TIME", async () => {
        process.env.HOLIDAY_REMINDER_TIME = "04:32";
        const bot = await load();

        const nextHoliday = {
          date: moment.tz("2021-08-16T12:00:00", "America/New_York"),
        };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot();
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date)
            .subtract(3, "days")
            .hour(4)
            .minute(32)
            .toDate(),
          expect.any(Function)
        );
      });
    });

    describe("reminds on Wednesday for holidays on Thursday", () => {
      it("defaults to 15:00", async () => {
        const bot = await load();

        const nextHoliday = { date: moment("2021-08-19T12:00:00Z") };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot();
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date).subtract(1, "day").hour(15).toDate(),
          expect.any(Function)
        );
      });

      it("respects HOLIDAY_REMINDER_TIME", async () => {
        process.env.HOLIDAY_REMINDER_TIME = "04:32";
        const bot = await load();

        const nextHoliday = { date: moment("2021-08-19T12:00:00Z") };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot();
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date)
            .subtract(1, "day")
            .hour(4)
            .minute(32)
            .toDate(),
          expect.any(Function)
        );
      });
    });
  });

  describe("posts a reminder", () => {
    const date = moment.tz("2021-08-19T12:00:00", "America/New_York");

    const getReminderFn = async (holiday = "test holiday") => {
      const bot = await load();

      const nextHoliday = {
        date,
        name: holiday,
      };
      getNextHoliday.mockReturnValue(nextHoliday);

      bot();

      return scheduleJob.mock.calls[0][1];
    };

    it("defaults to general channel", async () => {
      const postReminder = await getReminderFn();
      await postReminder();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text: "@here Remember that *Thursday* is a federal holiday in observance of *test holiday*!",
      });

      // Sets up a job for tomorrow to schedule the next reminder. Because the
      // scheduled job above runs the day before the holiday, this upcoming job
      // (1 day later) will be ON the holiday, at 15:00. This logic is the same
      // for the subsequent tests below.
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(date).hour(15).toDate(),
        expect.any(Function)
      );
    });

    it("respects HOLIDAY_REMINDER_CHANNEL", async () => {
      process.env.HOLIDAY_REMINDER_CHANNEL = "test channel";
      const postReminder = await getReminderFn();
      await postReminder();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "test channel",
        text: "@here Remember that *Thursday* is a federal holiday in observance of *test holiday*!",
      });

      // Sets up a job for tomorrow to schedule the next reminder
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(date).hour(15).toDate(),
        expect.any(Function)
      );
    });

    it("includes an emoji for holidays with known emoji", async () => {
      const postReminder = await getReminderFn("Veterans Day");
      await postReminder();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text: "@here Remember that *Thursday* is a federal holiday in observance of *Veterans Day* :salute-you:!",
      });

      // Sets up a job for tomorrow to schedule the next reminder
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(date).hour(15).toDate(),
        expect.any(Function)
      );
    });

    it("waits a day and then schedules the next holiday", async () => {
      const postReminder = await getReminderFn();
      await postReminder();

      const nextSchedule = scheduleJob.mock.calls[1][1];

      const nextHoliday = { date: moment("2021-09-01T12:00:00Z") };
      getNextHoliday.mockReturnValue(nextHoliday);

      nextSchedule();
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(nextHoliday.date).subtract(1, "day").hour(15).toDate(),
        expect.any(Function)
      );
    });
  });
});
