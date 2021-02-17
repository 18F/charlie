const sinon = require("sinon");
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

    let clock;
    let handler;
    beforeEach(() => {
      jest.resetAllMocks();

      message.client.conversations.list.mockResolvedValue({
        channels: [
          { id: "channel id", name: "travel" },
          { id: "wrong channel", name: "not travel" },
        ],
      });

      travel(app);
      handler = app.getHandler();
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
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
        clock.tick(443188800000);

        await handler(message);

        expect(message.say).not.toHaveBeenCalled();
      });

      it("sends a message if the current time is during a federal holiday", async () => {
        // Thursday, July 4, 1996: Hotmail is born.
        clock.tick(836481600000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text:
            "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Friday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("sends a message if the current time is during a Saturday", async () => {
        // Saturday, July 31, 1999: NASA crashes the lunar probe Lunar Prospect
        // into the moon as the final portion of its mission to detect frozen
        // water on the moon's surface.
        clock.tick(933422400000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text:
            "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("sends a message if the current time is during a Sunday", async () => {
        // Sunday, October 19, 2003: Mother Teresa is beatified by Pope John
        // Paul II.
        clock.tick(1066564800000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text:
            "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.",
          thread_ts: "thread id",
          username: "TTS Travel Team",
        });
      });

      it("does not send a message to the same user for at least 3 hours", async () => {
        // Sunday, September 7, 2014: Serena Williams wins her third consecutive
        // US Open title.
        clock.tick(1410091200000);

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":tts:",
          text:
            "Hi <@user id>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.",
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

        // Now move forwar 3 hours and see that we get a new message for the user
        clock.tick(3 * 60 * 60 * 1000);
        await handler(message);

        expect(message.say).toHaveBeenCalled();
      });
    });
  });
});
