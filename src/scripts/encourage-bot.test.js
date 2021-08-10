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
