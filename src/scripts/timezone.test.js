const {
  getApp,
  utils: { optOut, slack },
} = require("../utils/test");

const timezone = require("./timezone");

describe("Handy Tau-bot timezone conversions", () => {
  const app = getApp();

  const postEphemeral = jest.fn();

  const isOptedOut = jest.fn();

  const message = {
    client: {
      chat: {
        postEphemeral,
      },
      users: {
        info: jest.fn(),
      },
    },
    event: {
      channel: "channel id",
      text: "03:00 AT",
      thread_ts: "thread id",
      user: "user id",
    },
  };

  const responseFor = (user, time) => ({
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `That's ${time} for you!` },
        button: "goes here",
      },
    ],
    channel: "channel id",
    icon_emoji: ":timebot:",
    text: `That's ${time} for you!`,
    thread_ts: "thread id",
    user,
    username: "Handy Tau-bot",
  });

  beforeEach(() => {
    jest.resetAllMocks();

    message.client.users.info.mockResolvedValue({
      user: { tz: "America/Chicago" },
    });

    isOptedOut.mockReturnValue(false);

    optOut.mockReturnValue({
      button: { button: "goes here" },
      isOptedOut,
    });

    slack.getSlackUsersInConversation.mockResolvedValue([
      { id: "user 1", tz: "America/Denver" },
      { id: "user 2", tz: "America/New_York" },
      { id: "user 3", tz: "America/Chicago" },
      { id: "user 4", tz: "America/Anchorage" },
      { id: "user id", tz: "America/Chicago" },
      { id: "bot", is_bot: true },
      { id: "deleted", deleted: true },
    ]);
  });

  it("creates a utility wrapper and sets up a robot listener when initialized", () => {
    timezone(app);

    expect(app.message).toHaveBeenCalledWith(
      /(\d{1,2}:\d{2}\s?(am|pm)?)\s?(((ak|a|c|e|m|p)(s|d)?t)|:(eastern|central|mountain|pacific)-time-zone:)?/i,
      expect.any(Function)
    );
  });

  describe("handles messages that include timeish text", () => {
    let handler;
    beforeAll(() => {
      timezone(app);
      handler = app.getHandler();
    });

    it("if a timezone is specified, doesn't message people who are in the specified timezone", async () => {
      message.event.text = "03:00 est";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "1:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 3", "2:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 4", "11:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user id", "2:00")
      );

      // Make sure only the above messages were posted.
      expect(slack.postEphemeralMessage.mock.calls.length).toEqual(4);
    });

    it("if a timezone is specified via emoji, it doesn't message people who are in the specified timezone", async () => {
      message.event.text = "03:00 :eastern-time-zone:";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "1:00")
      );
      // trusting the last test to verify contents for the other 3 users
      expect(slack.postEphemeralMessage.mock.calls.length).toEqual(4);
    });

    it("if multiple timezones are specified, it only messages people in a different timezone", async () => {
      message.event.text =
        "03:00 :eastern-time-zone: | 02:00 :central-time-zone:";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "1:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 4", "11:00")
      );

      expect(slack.postEphemeralMessage.mock.calls.length).toEqual(2);
    });

    it("if a timezone is not specified, it messages everyone except the original author", async () => {
      message.event.text = "03:00";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "2:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 2", "4:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 3", "3:00")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 4", "12:00")
      );

      // Make sure only the above messages were posted.
      expect(slack.postEphemeralMessage.mock.calls.length).toEqual(4);
    });

    it("includes AM/PM in the message if it was included in the original", async () => {
      message.event.text = "03:00 PM";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "2:00 pm")
      );

      // Not testing filtering here, so trust the previous tests.
    });

    it("correctly includes AM/PM when crossing noon", async () => {
      message.event.text = "12:15 pm";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "11:15 am")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 2", "1:15 pm")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 4", "9:15 am")
      );
    });

    it("correctly includes AM/PM when crossing midnight", async () => {
      message.event.text = "12:15 am";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 1", "11:15 pm")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 2", "1:15 am")
      );

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 4", "9:15 pm")
      );
    });

    it("does not message users who have opted-out", async () => {
      isOptedOut.mockImplementation((userId) => userId === "user 1");

      message.event.text = "3:00";
      await handler(message);

      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 2", "4:00")
      );
      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 3", "3:00")
      );
      expect(slack.postEphemeralMessage).toHaveBeenCalledWith(
        responseFor("user 4", "12:00")
      );
      expect(slack.postEphemeralMessage.mock.calls.length).toEqual(3);
    });

    it("does not respond at all if the user text is empty (e.g., crossposted messages", async () => {
      message.event.text = "";
      await handler(message);

      expect(slack.postEphemeralMessage).not.toHaveBeenCalled();
    });
  });
});
