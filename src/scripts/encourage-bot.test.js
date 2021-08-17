const { isAHoliday } = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");

const {
  getApp,
  utils: {
    slack: { getChannelID, getSlackUsersInConversation, postMessage },
  },
} = require("../utils/test");

const bot = require("./encourage-bot");

describe("Encouragement bot", () => {
  const app = getApp();
  const scheduleJob = jest.spyOn(scheduler, "scheduleJob");

  beforeEach(() => {
    app.brain.clear();
    jest.resetAllMocks();
    jest.useFakeTimers("modern");
    jest.setSystemTime(0);

    getChannelID.mockResolvedValue("channel-id");
    getSlackUsersInConversation.mockResolvedValue([
      { id: "one", tz: "America/Chicago" },
      { id: "two", tz: "America/Los_Angeles" },
      { id: "three", tz: "America/New_York" },
      { id: "four", tz: "America/Denver" },
    ]);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("schedules an encouragement when starting...", () => {
    describe("when the brain contains a previously-scheduled encouragement", () => {
      it("uses the time if it is in the future", async () => {
        // The television show Night Court premiers on NBC
        const time = moment.tz("1984-01-04T12:34:56-0500", "America/New_York");
        app.brain.set("encourage-bot-schedule", time.toISOString());
        jest.setSystemTime(moment(time).subtract(1, "minute").toDate());

        await bot(app);
        expect(scheduleJob).toHaveBeenCalledWith(
          time.toDate(),
          expect.any(Function)
        );
      });

      it("uses a random time if the stored time is right now", async () => {
        // Jay Leno takes over as the host of The Tonight Show
        const time = moment.tz("1992-05-25T20:00:00-0500", "America/New_York");
        app.brain.set("encourage-bot-schedule", time.toISOString());
        jest.setSystemTime(time.toDate());

        await bot(app);
        expect(scheduleJob).not.toHaveBeenCalledWith(
          time.toDate(),
          expect.any(Function)
        );
      });

      it("uses a random time if the stored time is in the past", async () => {
        // The television show NCIS LA premiers on CBS
        const time = moment.tz("2009-09-22T18:00:00-0500", "America/New_York");
        app.brain.set("encourage-bot-schedule", time.toISOString());
        jest.setSystemTime(moment(time).add(1, "minute").toDate());

        await bot(app);
        expect(scheduleJob).not.toHaveBeenCalledWith(
          time.toDate(),
          expect.any(Function)
        );
      });
    });

    [
      {
        // Guarantees that we will advance either hours or weekends, but there's
        // no guarantee we'll do both.
        desc: "on a Friday afternoon",
        when: "2021-08-06 17:00",
      },
      {
        // Guarantees that we will advance through the second holiday check.
        desc: "on a Friday afternoon before a holiday",
        when: "2021-09-03 17:00",
      },
      // I would love to figure out how to guarantee all the date checks will
      // run, ideally in isolation.
    ].forEach(({ desc, when }) => {
      it(desc, async () => {
        const time = moment.tz(when, "America/New_York");
        jest.setSystemTime(time.toDate());

        await bot(app);
        expect(scheduleJob).toHaveBeenCalled();

        const early = moment.tz(
          scheduleJob.mock.calls[0][0],
          "America/New_York"
        );
        const late = moment.tz(
          scheduleJob.mock.calls[0][0],
          "America/Los_Angeles"
        );

        expect(early.day()).not.toBe(0);
        expect(early.day()).not.toBe(6);
        expect(early.hour()).toBeGreaterThanOrEqual(9);
        expect(late.hour()).toBeLessThan(17);
        expect(isAHoliday(early.toDate())).toBe(false);
      });
    });
  });

  it("encourages people", async () => {
    await bot(app);
    const encourager = scheduleJob.mock.calls[0][1];
    await encourager();

    expect(scheduleJob).toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({
      channel: "channel-id",
      icon_emoji: ":you:",
      text: expect.stringMatching(/.*/),
      username: "You're Awesome",
    });

    const { text } = postMessage.mock.calls[0][0];
    const [, userId] = text.match(/^<@([^>]+)> (.+)$/);

    // Ensure it was sent to one of the users in the channel.
    expect(["one", "two", "three", "four"].includes(userId)).toBe(true);
  });
});
