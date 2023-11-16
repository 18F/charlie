const moment = require("moment");

const {
  utils: {
    homepage: { getDidYouKnow, getInteractive },
    optOut: { BRAIN_KEY },
  },
} = require("../utils/test");

const {
  getApp,
  utils: { dates, optOut },
} = require("../utils/test");

const homeModule = require("./home");

describe("Charlie's home app", () => {
  const app = getApp();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(0);
    jest.resetAllMocks();

    app.brain.clear();
    optOut.options.length = 0;
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("has a handler for option-saving events", () => {
    it("waits before connecting the handler", async () => {
      const home = homeModule(app);
      expect(app.action).not.toHaveBeenCalled();
      jest.runAllTimers();
      await home;
      expect(app.action).toHaveBeenCalled();
    });

    it("connects the expected handler", async () => {
      const home = homeModule(app);
      jest.runAllTimers();
      await home;

      expect(app.action).toHaveBeenCalledWith(
        "set_options",
        expect.any(Function),
      );
    });

    describe("that handles user actions", () => {
      const ack = jest.fn();

      const message = {
        ack,
        action: { selected_options: [] },
        body: { user: { id: "user id" } },
      };

      let action;
      beforeAll(async () => {
        const home = homeModule(app);
        jest.runAllTimers();
        await home;
        action = app.getActionHandler();
      });

      beforeEach(() => {
        ack.mockResolvedValue();
        message.action.selected_options.length = 0;
      });

      describe("if a user is opting into something", () => {
        it("opts them in if they are not already opted in", async () => {
          message.action.selected_options.push({ value: "key" });
          app.brain.set(BRAIN_KEY, { key: ["user id"] });

          await action(message);

          expect(ack).toHaveBeenCalled();
          expect(app.brain.get(BRAIN_KEY)).toEqual({ key: [] });
        });

        it("does nothing in if they are already opted in", async () => {
          message.action.selected_options.push({ value: "key" });
          app.brain.set(BRAIN_KEY, { key: [] });

          await action(message);

          expect(ack).toHaveBeenCalled();
          expect(app.brain.get(BRAIN_KEY)).toEqual({ key: [] });
        });
      });

      describe("if a user is opting out of something", () => {
        it("opts them out if they are currented opted in", async () => {
          app.brain.set(BRAIN_KEY, { key: [] });

          await action(message);

          expect(ack).toHaveBeenCalled();
          expect(app.brain.get(BRAIN_KEY)).toEqual({ key: ["user id"] });
        });
      });

      describe("if the action references an unknown thing", () => {
        beforeEach(() => {
          app.brain.set(BRAIN_KEY, {});
          message.action.selected_options.push({ value: "key" });
        });

        it("does not opt users in", async () => {
          await action(message);

          expect(ack).toHaveBeenCalled();
          expect(app.brain.get(BRAIN_KEY)).toEqual({});
        });

        it("does not opt users out", async () => {
          await action(message);

          expect(ack).toHaveBeenCalled();
          expect(app.brain.get(BRAIN_KEY)).toEqual({});
        });
      });
    });
  });

  describe("has a handler for creating the home view", () => {
    const publish = jest.fn();
    const message = {
      event: { user: "user 1" },
      client: { views: { publish } },
    };

    it("connects the expected handler", async () => {
      const home = homeModule(app);
      expect(app.event).not.toHaveBeenCalled();
      jest.runAllTimers();
      await home;
      expect(app.event).toHaveBeenCalledWith(
        "app_home_opened",
        expect.any(Function),
      );
    });

    it("sends back an expected home view", async () => {
      const home = homeModule(app);
      expect(app.event).not.toHaveBeenCalled();
      jest.runAllTimers();
      await home;
      const event = app.getEventHandler();

      getDidYouKnow.mockReturnValue(["first", "second"]);
      getInteractive.mockReturnValue(["aaa", "bbb"]);

      const date = moment("1998-01-09");

      // Set the current time to one day before the holiday
      jest.setSystemTime(date.toDate() - 86_400_000);
      dates.getNextHoliday.mockReturnValue({
        date: date.toDate(),
        name: "Wayne Gretzky Day",
        emoji: ":hockey:",
      });

      optOut.options.push(
        { key: "thing 1", name: "Thing One", description: "The first thing" },
        { key: "thing 2", name: "Thing Two", description: "The 2nd thing" },
        { key: "thing 3", name: "Thing Three", description: "The 3rd thing" },
        { key: "thing 4", name: "Thing Four", description: "The fourth thing" },
        { key: "thing 5", name: "Thing Five", description: "The fifth thing" },
      );

      app.brain.set(BRAIN_KEY, {
        "thing 1": ["user 2"],
        "thing 2": ["user 1", "user 2"],
        "thing 3": ["user 1"],
        "thing 4": [],
        "thing 5": [],
      });

      event(message);

      expect(getDidYouKnow).toHaveBeenCalledWith("user 1");
      expect(getInteractive).toHaveBeenCalledWith("user 1");

      expect(publish).toHaveBeenCalledWith({
        user_id: "user 1",
        view: {
          type: "home",
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: expect.any(String) },
            },
            "first",
            "second",
            { type: "divider" },
            {
              type: "header",
              text: { type: "plain_text", text: expect.any(String) },
            },
            "aaa",
            "bbb",
            { type: "divider" },
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "Personalized Charlie options",
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "checkboxes",
                  initial_options: [
                    {
                      text: { type: "plain_text", text: "Thing One" },
                      description: {
                        type: "plain_text",
                        text: "The first thing",
                      },
                      value: "thing 1",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Four" },
                      description: {
                        type: "plain_text",
                        text: "The fourth thing",
                      },
                      value: "thing 4",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Five" },
                      description: {
                        type: "plain_text",
                        text: "The fifth thing",
                      },
                      value: "thing 5",
                    },
                  ],
                  options: [
                    {
                      text: { type: "plain_text", text: "Thing One" },
                      description: {
                        type: "plain_text",
                        text: "The first thing",
                      },
                      value: "thing 1",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Two" },
                      description: {
                        type: "plain_text",
                        text: "The 2nd thing",
                      },
                      value: "thing 2",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Three" },
                      description: {
                        type: "plain_text",
                        text: "The 3rd thing",
                      },
                      value: "thing 3",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Four" },
                      description: {
                        type: "plain_text",
                        text: "The fourth thing",
                      },
                      value: "thing 4",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Five" },
                      description: {
                        type: "plain_text",
                        text: "The fifth thing",
                      },
                      value: "thing 5",
                    },
                  ],
                  action_id: "set_options",
                },
              ],
            },
          ],
        },
      });
    });

    it("removes the initial options if they're all empty", async () => {
      const home = homeModule(app);
      expect(app.event).not.toHaveBeenCalled();
      jest.runAllTimers();
      await home;
      const event = app.getEventHandler();

      getDidYouKnow.mockReturnValue(["third", "fifth"]);
      getInteractive.mockReturnValue(["ccc", "ddd"]);

      const date = moment("1998-01-09");

      // Set the current time to one day before the holiday
      jest.setSystemTime(date.toDate() - 86_400_000);
      dates.getNextHoliday.mockReturnValue({
        date: date.toDate(),
        name: "Wayne Gretzky Day",
        emoji: ":hockey:",
      });

      optOut.options.push(
        { key: "thing 1", name: "Thing One", description: "The first thing" },
        { key: "thing 2", name: "Thing Two", description: "The 2nd thing" },
        { key: "thing 3", name: "Thing Three", description: "The 3rd thing" },
        { key: "thing 4", name: "Thing Four", description: "The fourth thing" },
        { key: "thing 5", name: "Thing Five", description: "The fifth thing" },
      );

      app.brain.set(BRAIN_KEY, {
        "thing 1": ["user 1"],
        "thing 2": ["user 1", "user 2"],
        "thing 3": ["user 1"],
        "thing 4": ["user 1"],
        "thing 5": ["user 1"],
      });

      event(message);

      expect(getDidYouKnow).toHaveBeenCalledWith("user 1");
      expect(getInteractive).toHaveBeenCalledWith("user 1");

      expect(publish).toHaveBeenCalledWith({
        user_id: "user 1",
        view: {
          type: "home",
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: expect.any(String) },
            },
            "third",
            "fifth",
            { type: "divider" },
            {
              type: "header",
              text: { type: "plain_text", text: expect.any(String) },
            },
            "ccc",
            "ddd",
            { type: "divider" },
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "Personalized Charlie options",
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "checkboxes",
                  options: [
                    {
                      text: { type: "plain_text", text: "Thing One" },
                      description: {
                        type: "plain_text",
                        text: "The first thing",
                      },
                      value: "thing 1",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Two" },
                      description: {
                        type: "plain_text",
                        text: "The 2nd thing",
                      },
                      value: "thing 2",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Three" },
                      description: {
                        type: "plain_text",
                        text: "The 3rd thing",
                      },
                      value: "thing 3",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Four" },
                      description: {
                        type: "plain_text",
                        text: "The fourth thing",
                      },
                      value: "thing 4",
                    },
                    {
                      text: { type: "plain_text", text: "Thing Five" },
                      description: {
                        type: "plain_text",
                        text: "The fifth thing",
                      },
                      value: "thing 5",
                    },
                  ],
                  action_id: "set_options",
                },
              ],
            },
          ],
        },
      });
    });
  });
});
