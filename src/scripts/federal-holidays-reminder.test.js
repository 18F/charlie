const moment = require("moment-timezone");

const {
  utils: {
    dates: { getNextHoliday },
    slack: { postMessage },
  },
} = require("../utils/test");

describe("holiday reminder", () => {
  const scheduleJob = jest.fn();
  jest.doMock("node-schedule", () => ({ scheduleJob }));

  // Load this module *after* everything gets mocked. Otherwise the module will
  // load the unmocked stuff and the tests won't work.
  // eslint-disable-next-line global-require
  const bot = require("./federal-holidays-reminder");

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("schedules a reminder on startup", () => {
    describe("reminds on Friday for holidays on Monday", () => {
      it("defaults to 15:00", () => {
        const nextHoliday = {
          date: moment.tz("2021-08-16T12:00:00", "America/New_York"),
        };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot(null, {});
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date).subtract(3, "days").hour(15).toDate(),
          expect.any(Function),
        );
      });

      it("respects HOLIDAY_REMINDER_TIME", () => {
        const nextHoliday = {
          date: moment.tz("2021-08-16T12:00:00", "America/New_York"),
        };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot(null, { HOLIDAY_REMINDER_TIME: "04:32" });
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date)
            .subtract(3, "days")
            .hour(4)
            .minute(32)
            .toDate(),
          expect.any(Function),
        );
      });
    });

    describe("reminds on Wednesday for holidays on Thursday", () => {
      it("defaults to 15:00", () => {
        const nextHoliday = { date: moment("2021-08-19T12:00:00Z") };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot(null);
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date).subtract(1, "day").hour(15).toDate(),
          expect.any(Function),
        );
      });

      it("respects HOLIDAY_REMINDER_TIME", () => {
        const nextHoliday = { date: moment("2021-08-19T12:00:00Z") };
        getNextHoliday.mockReturnValue(nextHoliday);

        bot(null, { HOLIDAY_REMINDER_TIME: "04:32" });
        expect(scheduleJob).toHaveBeenCalledWith(
          moment(nextHoliday.date)
            .subtract(1, "day")
            .hour(4)
            .minute(32)
            .toDate(),
          expect.any(Function),
        );
      });
    });
  });

  describe("posts a reminder", () => {
    const date = moment.tz("2021-08-19T12:00:00", "America/New_York");

    const getReminderFn = (holiday, config = {}) => {
      const nextHoliday = {
        date,
        name: holiday,
      };
      getNextHoliday.mockReturnValue(nextHoliday);

      bot(null, config);

      return scheduleJob.mock.calls[0][1];
    };

    it("defaults to general channel", async () => {
      const postReminder = getReminderFn("test holiday");
      await postReminder();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text: expect.stringMatching(
          /^<!here> Remember that \*Thursday\* is a federal holiday in observance of \*test holiday\*! .+$/,
        ),
      });

      // Sets up a job for tomorrow to schedule the next reminder. Because the
      // scheduled job above runs the day before the holiday, this upcoming job
      // (1 day later) will be ON the holiday, at 15:00. This logic is the same
      // for the subsequent tests below.
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(date).hour(15).toDate(),
        expect.any(Function),
      );
    });

    it("respects HOLIDAY_REMINDER_CHANNEL", async () => {
      const postReminder = getReminderFn("test holiday", {
        HOLIDAY_REMINDER_CHANNEL: "test channel",
      });
      await postReminder();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "test channel",
        text: expect.stringMatching(
          /^<!here> Remember that \*Thursday\* is a federal holiday in observance of \*test holiday\*! .+$/,
        ),
      });

      // Sets up a job for tomorrow to schedule the next reminder
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(date).hour(15).toDate(),
        expect.any(Function),
      );
    });

    it("includes an emoji for holidays with known emoji", async () => {
      const postReminder = getReminderFn("Veterans Day");
      await postReminder();

      expect(postMessage).toHaveBeenCalledWith({
        channel: "general",
        text: expect.stringMatching(
          /^<!here> Remember that \*Thursday\* is a federal holiday in observance of \*Veterans Day\* :salute-you:! .+$/,
        ),
      });

      // Sets up a job for tomorrow to schedule the next reminder
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(date).hour(15).toDate(),
        expect.any(Function),
      );
    });

    it("waits a day and then schedules the next holiday", async () => {
      const postReminder = getReminderFn("test holiday");
      await postReminder();

      const nextSchedule = scheduleJob.mock.calls[1][1];

      const nextHoliday = { date: moment("2021-09-01T12:00:00Z") };
      getNextHoliday.mockReturnValue(nextHoliday);

      nextSchedule();
      expect(scheduleJob).toHaveBeenCalledWith(
        moment(nextHoliday.date).subtract(1, "day").hour(15).toDate(),
        expect.any(Function),
      );
    });
  });
});
