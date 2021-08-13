const { isAHoliday } = require("@18f/us-federal-holidays");
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
        when: Temporal.ZonedDateTime.from("2021-08-06T17:00[America/New_York]"),
      },
      {
        // Guarantees that we will advance through the second holiday check.
        desc: "on a Friday afternoon before a holiday",
        when: Temporal.ZonedDateTime.from("2021-09-03T17:00[America/New_York]"),
      },
      // I would love to figure out how to guarantee all the date checks will
      // run, ideally in isolation.
    ].forEach(({ desc, when }) => {
      it(desc, async () => {
        jest.setSystemTime(when.epochMilliseconds);

        await bot(app);
        expect(scheduleJob).toHaveBeenCalled();

        const early = Temporal.Instant.fromEpochMilliseconds(
          scheduleJob.mock.calls[0][0]
        ).toZonedDateTime({
          calendar: "iso8601",
          timeZone: "America/New_York",
        });

        const late = Temporal.Instant.fromEpochMilliseconds(
          scheduleJob.mock.calls[0][0]
        ).toZonedDateTime({
          calendar: "iso8601",
          timeZone: "America/Los_Angeles",
        });

        expect(early.dayOfWeek).not.toBe(7);
        expect(early.dayOfWeek).not.toBe(6);
        expect(early.hour).toBeGreaterThanOrEqual(9);
        expect(late.hour).toBeLessThan(17);
        expect(isAHoliday(new Date(early.epochMilliseconds))).toBe(
          false
        );
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
