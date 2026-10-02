const { getApp } = require("../utils/test");
const travel = require("./travel-team");

describe("Travel team weekend/holiday notice", () => {
  const app = getApp();

  it("hooks up the right listener", () => {
    travel(app);

    expect(app.message).toHaveBeenCalledWith(/.*/, expect.any(Function));
  });

  describe("handles messages in the Travel team channel", () => {
    const message = {
      client: { conversations: { list: jest.fn() } },
      event: { channel: "channel id", thread_ts: "thread id", user: "user id" },
      say: jest.fn(),
    };

    let handler;

    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      jest.setSystemTime(0);
      jest.resetAllMocks();

      message.client.conversations.list.mockResolvedValue({
        channels: [
          { id: "channel id", name: "travel" },
          { id: "wrong channel", name: "not travel" },
        ],
      });

      travel(app);
      handler = app.getHandler();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it("ignores messages that are not in the Travel channel", async () => {
      message.event.channel = "wrong channel";
      await handler(message);

      expect(message.say).not.toHaveBeenCalled();
      message.event.channel = "channel id";
    });

    describe("handles messages that ARE in the Travel channel", () => {
      beforeEach(() => {
        message.client.conversations.list.mockResolvedValue({
          channels: [{ id: "channel id", name: "travel" }],
        });
      });

      it("does nothing if the current time is during the work week", async () => {
        // Tuesday, Jnuary 17, 1984: US Supreme Court rules that recording on VHS
        // tapes for later playback does not violate federal copyright laws.
        jest.setSystemTime(443188800000);

        await handler(message);

        expect(message.say).not.toHaveBeenCalled();
      });

      it("sends a message if the current time is during a federal holiday", async () => {
        // Thursday, July 4, 1996: Hotmail is born.
        jest.setSystemTime(836481600000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text: "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Friday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("sends a message if the current time is during a Saturday", async () => {
        // Saturday, July 31, 1999: NASA crashes the lunar probe Lunar Prospect
        // into the moon as the final portion of its mission to detect frozen
        // water on the moon's surface.
        jest.setSystemTime(933422400000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text: "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("sends a message if the current time is during a Sunday", async () => {
        // Sunday, October 19, 2003: Mother Teresa is beatified by Pope John
        // Paul II.
        jest.setSystemTime(1066564800000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text: "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("does not send a message to the same user for at least 3 hours", async () => {
        // Sunday, September 7, 2014: Serena Williams wins her third consecutive
        // US Open title.
        jest.setSystemTime(1410091200000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text: "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });

        message.say.mockClear();

        // Switch users, make sure it does send a message to the new user
        message.event.user = "different user";
        await handler(message);
        expect(message.say).toHaveBeenCalled();

        message.say.mockClear();

        // Switch back to the repeat user
        message.event.user = "user id";
        await handler(message);
        expect(message.say).not.toHaveBeenCalled();

        message.say.mockClear();

        // Now move forward 3 hours and see that we get a new message for the user
        jest.advanceTimersByTime(3 * 60 * 60 * 1000);
        await handler(message);

        expect(message.say).toHaveBeenCalled();
      });
    });

    // Every timestamp in here is an evening in eastern time, which is already
    // the next calendar day in UTC. Production runs in UTC, so this is the
    // window where reading the day out of the host timezone gives the wrong
    // answer. Keep these timestamps in ascending order and after the ones
    // above: pastResponses lives at module scope and is only pruned by moving
    // the clock forward, so an out-of-order timestamp will fail for reasons
    // that have nothing to do with timezones.
    describe("answers for eastern time, not the host timezone", () => {
      it("sends a message in the evening of a holiday", async () => {
        // Thursday, July 4, 2024, 8pm eastern. Already July 5 in UTC.
        jest.setSystemTime(Date.parse("2024-07-05T00:00:00Z"));

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text: "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Friday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("does not offer a holiday as the next workday", async () => {
        // Sunday, January 19, 2025, 8pm eastern. Monday is MLK Day, so the next
        // workday is Tuesday.
        jest.setSystemTime(Date.parse("2025-01-20T01:00:00Z"));

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text: "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Tuesday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("stays quiet in the evening before a holiday", async () => {
        // Wednesday, December 24, 2025, 8pm eastern. Christmas is tomorrow, but
        // the travel team is still open today.
        jest.setSystemTime(Date.parse("2025-12-25T01:00:00Z"));

        await handler(message);

        expect(message.say).not.toHaveBeenCalled();
      });
    });
  });
});
