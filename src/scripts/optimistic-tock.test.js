const moment = require("moment-timezone");
const sinon = require("sinon");
const scheduler = require("node-schedule");

const {
  getApp,
  utils: {
    slack: { sendDirectMessage },
    tock: { get18FTockSlackUsers, get18FTockTruants },
  },
} = require("../utils/test");

describe("Optimistic Tock", () => {
  const load = async () =>
    new Promise((resolve) => {
      jest.isolateModules(() => {
        const module = require("./optimistic-tock"); // eslint-disable-line global-require
        resolve(module);
      });
    });

  const scheduleJob = jest.spyOn(scheduler, "scheduleJob");

  const sandbox = sinon.createSandbox();

  const app = getApp();

  let clock;
  beforeAll(() => {
    clock = sinon.useFakeTimers();
    sandbox.spy(scheduler, "scheduleJob");
  });

  beforeEach(() => {
    jest.resetAllMocks();

    process.env.TOCK_API = "tock url";
    process.env.TOCK_TOKEN = "tock token";

    get18FTockTruants.mockResolvedValue([
      {
        id: "tock1",
        email: "user@one",
        first_name: "User",
        last_name: "One",
        username: "employee1",
      },
      {
        id: "tock2",
        email: "user@two",
        first_name: "User",
        last_name: "Two",
        username: "employee2",
      },
    ]);

    get18FTockSlackUsers.mockResolvedValue([
      {
        email: "user@one",
        id: "tock1",
        name: "User 1",
        slack_id: "slack 1",
        user: "employee1",
        tz: "America/New_York",
      },
      {
        email: "user@two",
        id: "tock2",
        name: "User 2",
        slack_id: "slack 2",
        user: "employee2",
        tz: "America/Chicago",
      },
      {
        email: "user@three",
        id: "tock3",
        name: "User 3",
        slack_id: "slack 3",
        user: "employee3",
        tz: "America/Los_Angeles",
      },
      {
        email: "user@five",
        id: "tock5",
        name: "User 5",
        slack_id: "slack 5",
        user: "employee5",
        tz: "America/New_York",
      },
    ]);
  });

  afterEach(() => {
    clock.reset();
    sandbox.resetHistory();
  });

  afterAll(() => {
    clock.restore();
    sandbox.restore();
  });

  it("issues a warning and does not schedule a shouting match if un/mis-configured", async () => {
    process.env.TOCK_API = "";
    process.env.TOCK_TOKEN = "";
    let optimisticTock = await load();
    optimisticTock(app);
    expect(app.logger.warn).toHaveBeenCalled();
    expect(scheduleJob).not.toHaveBeenCalled();

    process.env.TOCK_API = "set";
    process.env.TOCK_TOKEN = "";
    optimisticTock = await load();
    optimisticTock(app);
    expect(app.logger.warn).toHaveBeenCalled();
    expect(scheduleJob).not.toHaveBeenCalled();

    process.env.TOCK_API = "";
    process.env.TOCK_TOKEN = "set";
    optimisticTock = await load();
    optimisticTock(app);
    expect(app.logger.warn).toHaveBeenCalled();
    expect(scheduleJob).not.toHaveBeenCalled();
  });

  describe("it schedules future reminders", () => {
    it("for the next Friday if it is not a holiday", async () => {
      // The Bell System is broken up by antitrust action.
      const time = moment.tz("1984-01-01T12:32:18", "America/New_York");
      clock.tick(time.toDate().getTime());

      const times = [
        moment.tz("1984-01-06T16:00:00", "America/New_York").toDate(),
        moment.tz("1984-01-06T16:00:00", "America/Chicago").toDate(),
        moment.tz("1984-01-06T16:00:00", "America/Los_Angeles").toDate(),
      ];

      const optimisticTock = await load();
      await optimisticTock(app);

      // There are 5 users. One is deleted. Of the remaining 4 users, there are
      // only three distinct timezones, so there should only be three scheduled
      // reminders. Plus one for scheduling next week's reminders, for a total
      // of 4.
      expect(scheduleJob.mock.calls.length).toBe(4);

      times.forEach((scheduledTime) => {
        expect(scheduleJob).toHaveBeenCalledWith(
          scheduledTime,
          expect.any(Function)
        );
      });

      // The following week's reminders should be for the next Sunday, at the
      // same time of day as when the bot started.
      expect(scheduleJob).toHaveBeenCalledWith(
        moment.tz("1984-01-08T12:32:18", "America/New_York").toDate(),
        expect.any(Function)
      );
    });

    it("for the next Thursday if Friday is a holiday", async () => {
      // I don't know if this is a significant date, but July 4 was a Friday
      // in 1986, so it meets our test criteria.
      const time = moment.tz("1986-07-01T12:43:44", "America/New_York");
      clock.tick(time.toDate().getTime());

      const times = [
        moment.tz("1986-07-03T16:00:00", "America/New_York").toDate(),
        moment.tz("1986-07-03T16:00:00", "America/Chicago").toDate(),
        moment.tz("1986-07-03T16:00:00", "America/Los_Angeles").toDate(),
      ];

      const optimisticTock = await load();
      await optimisticTock(app);

      // There are 5 users. One is deleted. Of the remaining 4 users, there are
      // only three distinct timezones, so there should only be three scheduled
      // reminders. Plus one for scheduling next week's reminders, for a total
      // of 4.
      expect(scheduleJob.mock.calls.length).toBe(4);

      times.forEach((scheduledTime) => {
        expect(scheduleJob).toHaveBeenCalledWith(
          scheduledTime,
          expect.any(Function)
        );
      });

      // The following week's reminders should be for the next Sunday, at the
      // same time of day as when the bot started.
      expect(scheduleJob).toHaveBeenCalledWith(
        moment.tz("1986-07-06T12:43:44", "America/New_York").toDate(),
        expect.any(Function)
      );
    });

    it("schedules more reminders for following weeks", async () => {
      // The wreck of the Titanic is found. A Monday. We all feel a little like
      // wrecks on Mondays, don't we?
      const time = moment.tz("1985-09-02T09:45:00", "America/New_York");
      clock.tick(time.toDate().getTime());

      const optimisticTock = await load();
      await optimisticTock(app);

      // The last thing that should get scheduled is the the re-schedule.
      const rescheduler = scheduleJob.mock.calls.pop()[1];

      // Before we call the re-scheduler, reset the mock to clear out the set of
      // scheduled jobs from start-up.. Also fast-forward in time by a week.
      scheduleJob.mockClear();
      clock.tick(moment.duration(7, "days").asMilliseconds());

      // Now let's see what happens!
      await rescheduler();

      // There are 5 users. One is deleted. Of the remaining 4 users, there are
      // only three distinct timezones, so there should only be three scheduled
      // reminders. Plus one for scheduling next week's reminders, for a total
      // of 4.
      expect(scheduleJob.mock.calls.length).toBe(4);

      [
        moment.tz("1985-09-13T16:00:00", "America/New_York").toDate(),
        moment.tz("1985-09-13T16:00:00", "America/Chicago").toDate(),
        moment.tz("1985-09-13T16:00:00", "America/Los_Angeles").toDate(),
      ].forEach((scheduledTime) => {
        expect(scheduleJob).toHaveBeenCalledWith(
          scheduledTime,
          expect.any(Function)
        );
      });

      // The following week's reminders should be for the next Sunday, at the
      // same time of day as when the bot started.
      expect(scheduleJob).toHaveBeenCalledWith(
        moment.tz("1985-09-15T09:45:00", "America/New_York").toDate(),
        expect.any(Function)
      );
    });
  });

  it("sends a friendly reminder when it's time to tock", async () => {
    // The Bell System is broken up by antitrust action.
    const time = moment.tz("1984-01-01T12:00:00", "America/New_York");
    clock.tick(time.toDate().getTime());

    const optimisticTock = await load();
    await optimisticTock(app);

    // Don't fiddle with the clock. That's node-schedule's job. Instead, grab
    // the first scheduled job and check that it behaves as expected.
    const reminderFunction = scheduleJob.mock.calls[0][1];
    await reminderFunction();

    // It should remind our New_York timezone users who have not yet tocked.
    // There's just one of those.
    expect(sendDirectMessage).toHaveBeenCalledWith("slack 1", {
      icon_emoji: "happytock",
      text: "Don't forget to <https://tock.18f.gov|Tock your time>!",
      username: "Happy Tock",
    });

    expect(sendDirectMessage.mock.calls.length).toBe(1);
  });
});
