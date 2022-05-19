const {
  getApp,
  utils: {
    homepage,
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
      /\bcoffee me\b/i,
      expect.any(Function)
    );
  });

  it("doesn't do anything with messages from slackbot", async () => {
    coffeemate(app);
    const handler = app.getHandler();

    await handler({ context: { matches: [] }, event: { user: "USLACKBOT" } });

    expect(addEmojiReaction).not.toHaveBeenCalled();
    expect(postEphemeralResponse).not.toHaveBeenCalled();
    expect(sendDirectMessage).not.toHaveBeenCalled();
  });

  describe("when the coffee queue is initially empty", () => {
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
        text: "You’re in line for coffee! You’ll be introduced to the next person who wants to meet up.",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message subsequent times a user asks for coffee and does nothing to the queue", async () => {
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text: "You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message the first time a user asks for a coffee in a different scope", async () => {
      message.context.matches = [null, " test scope"];
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text: "You’re in line for test scope coffee! You’ll be introduced to the next person who wants to meet up.",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message subsequent times a user asks for coffee in the same scope", async () => {
      message.context.matches = [null, " test scope"];
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text: "You’re already in the test scope queue. As soon as we find someone else to meet with, we’ll introduce you!",
        username: "Coffeemate",
      });
    });

    it("sends an ephemeral message subsequent times a user asks for coffee, but does not acknowledge 'please' as a scope", async () => {
      message.context.matches = [null, " please"];
      await handler(message);

      expect(addEmojiReaction).toHaveBeenCalledWith(message, "coffee");
      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":coffee:",
        text: "You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!",
        username: "Coffeemate",
      });
    });

    describe("sends an ephemeral message, opens a DM, and resets the queue when a different user asks for coffee", () => {
      beforeEach(() => {
        app.brain.set(coffeemate.BRAIN_KEY, ["user id 1"]);
      });

      it("when everything works as expected", async () => {
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
            text: "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:",
            username: "Coffeemate",
          }
        );
        expect(app.brain.get(coffeemate.BRAIN_KEY)).toEqual([]);
      });

      it("still clears the queue if anything throws an exception", async () => {
        message.event.user = "user id 2";
        sendDirectMessage.mockRejectedValue(new Error("manufactured error"));
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
            text: "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:",
            username: "Coffeemate",
          }
        );
        expect(app.brain.get(coffeemate.BRAIN_KEY)).toEqual([]);
      });
    });
  });

  describe("handles queue actions", () => {
    const message = {
      ack: jest.fn(),
      body: { user: { id: "user id" } },
      client: {},
    };

    beforeEach(() => {
      coffeemate(app);
      app.brain.clear();
    });

    it("subscribes to an action for being added to the coffee queue", () => {
      coffeemate(app);

      expect(app.action).toHaveBeenCalledWith(
        coffeemate.COFFEE_ACTION_ID,
        expect.any(Function)
      );
    });

    it("subscribes to an action for being removed from the coffee queue", () => {
      coffeemate(app);

      expect(app.action).toHaveBeenCalledWith(
        coffeemate.UNCOFFEE_ACTION_ID,
        expect.any(Function)
      );
    });

    describe("the coffee action", () => {
      it("adds the user if they are not already in the queue", async () => {
        const handler = app.getActionHandler(coffeemate.COFFEE_ACTION_ID);

        await handler(message);

        expect(app.brain.get(coffeemate.BRAIN_KEY)).toEqual(["user id"]);
        expect(message.ack).toHaveBeenCalled();
        expect(homepage.refresh).toHaveBeenCalledWith(
          message.body.user.id,
          message.client
        );
      });

      it("does not add the user again if they are already in the queue", async () => {
        app.brain.set(coffeemate.BRAIN_KEY, ["user id"]);
        const handler = app.getActionHandler(coffeemate.COFFEE_ACTION_ID);

        await handler(message);

        expect(app.brain.get(coffeemate.BRAIN_KEY)).toEqual(["user id"]);
        expect(message.ack).toHaveBeenCalled();
        expect(homepage.refresh).toHaveBeenCalledWith(
          message.body.user.id,
          message.client
        );
      });
    });

    describe("the un-coffee action", () => {
      it("removes the user if they are in the queue", async () => {
        app.brain.set(coffeemate.BRAIN_KEY, ["user id"]);
        const handler = app.getActionHandler(coffeemate.UNCOFFEE_ACTION_ID);

        await handler(message);

        expect(app.brain.get(coffeemate.BRAIN_KEY)).toEqual([]);
        expect(message.ack).toHaveBeenCalled();
        expect(homepage.refresh).toHaveBeenCalledWith(
          message.body.user.id,
          message.client
        );
      });

      it("doesn't break if the user is not in the queue", async () => {
        app.brain.set(coffeemate.BRAIN_KEY, ["user 2"]);
        const handler = app.getActionHandler(coffeemate.UNCOFFEE_ACTION_ID);

        await handler(message);

        expect(app.brain.get(coffeemate.BRAIN_KEY)).toEqual(["user 2"]);
        expect(message.ack).toHaveBeenCalled();

        // Special case! If the user was not in the queue, there's no reason to
        // update the homepage.
        expect(homepage.refresh).not.toHaveBeenCalledWith(
          message.body.user.id,
          message.client
        );
      });
    });
  });

  describe("sets up a homepage interaction", () => {
    it("registers a homepage interaction", () => {
      coffeemate(app);

      expect(homepage.registerInteractive).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    describe("sends back a UI for the homepage", () => {
      let getInteractive;
      beforeEach(() => {
        app.brain.clear();
        coffeemate(app);

        getInteractive = homepage.registerInteractive.mock.calls[0][0];
      });

      it("when the user is not in the coffee queue", () => {
        const ui = getInteractive("user id");

        expect(ui).toEqual({
          type: "section",
          text: {
            type: "mrkdwn",
            text: ":coffee: Sign up for a virtual coffee",
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Coffee Me!",
            },
            action_id: coffeemate.COFFEE_ACTION_ID,
          },
        });
      });

      it("when the user is already in the coffee queue", () => {
        app.brain.set(coffeemate.BRAIN_KEY, ["user id"]);
        const ui = getInteractive("user id");

        expect(ui).toEqual({
          type: "section",
          text: {
            type: "mrkdwn",
            text: ":coffee: You’re in the coffee queue! As soon as we find someone else to meet with, we’ll introduce you.",
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Leave queue",
            },
            action_id: coffeemate.UNCOFFEE_ACTION_ID,
          },
        });
      });
    });
  });
});
