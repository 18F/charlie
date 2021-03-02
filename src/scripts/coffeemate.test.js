const {
  getApp,
  utils: {
    slack: { addEmojiReaction, postEphemeralResponse, sendDirectMessage },
  },
} = require("../utils/test");

const coffeemate = require("./coffeemate");

describe("coffeemate", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('subscribes to "coffee me" messages', () => {
    coffeemate(app);

    expect(app.message).toHaveBeenCalledWith(
      /coffee me( \S+$)?/i,
      expect.any(Function)
    );
  });

  describe("with an the coffee queue is initially empty", () => {
    let handler;

    const message = {
      context: { matches: [] },
      event: {
        user: "user id 1",
      },
    };

    beforeAll(() => {
      app.brain.clear();
    });

    beforeEach(() => {
      message.context.matches = [];
      coffeemate(app);
      handler = app.getHandler();
    });

    it("sends an ephemeral message the first time a user asks for coffee and adds them to the queue", async () => {
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text:
          "You’re in line for coffee! You’ll be introduced to the next person who wants to meet up.",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message subsequent times a user asks for coffee and does nothing to the queue", async () => {
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text:
          "You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message the first time a user asks for a coffee in a different scope", async () => {
      message.context.matches = [null, " test scope"];
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text:
          "You’re in line for test scope coffee! You’ll be introduced to the next person who wants to meet up.",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message subsequent times a user asks for coffee in the same scope", async () => {
      message.context.matches = [null, " test scope"];
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text:
          "You’re already in the test scope queue. As soon as we find someone else to meet with, we’ll introduce you!",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message subsequent times a user asks for coffee, but does not acknowledge 'please' as a scope", async () => {
      message.context.matches = [null, " please"];
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text:
          "You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message, opens a DM, and resets the queue when a different user asks for coffee", async () => {
      message.event.user = "user id 2";
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text: `You’ve been matched up for coffee with <@user id 1>! `,
        username: "Coffeemate",
      });
      expect(sendDirectMessage).toHaveBeenCalledWith(
        ["user id 1", "user id 2"],
        {
          icon_emoji: ":coffee:",
          text:
            "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:",
          username: "Coffeemate",
        }
      );
    });
  });
});
