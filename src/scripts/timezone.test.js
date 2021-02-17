const {
  getApp,
  utils: { slack },
} = require("../utils/test");

const timezone = require("./timezone");

describe("Handy Tau-bot timezone conversions", () => {
  const app = getApp();

  const postEphemeral = jest.fn();

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

  const baseResponse = {
    channel: "channel id",
    icon_emoji: ":timebot:",
    user: "user 1",
    username: "Handy Tau-bot",
    text: "That's 1:00 for you!",
    thread_ts: "thread id",
  };

  beforeEach(() => {
    jest.resetAllMocks();

    message.client.users.info.mockResolvedValue({
      user: { tz: "America/Chicago" },
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

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 1",
        text: "That's 1:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 3",
        text: "That's 2:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 4",
        text: "That's 11:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user id",
        text: "That's 2:00 for you!",
      });

      // Make sure only the above messages were posted.
      expect(postEphemeral.mock.calls.length).toEqual(4);
    });

    it("if a timezone is specified via emoji, it doesn't message people who are in the specified timezone", async () => {
      message.event.text = "03:00 :eastern-time-zone:";
      await handler(message);

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 1",
        text: "That's 1:00 for you!",
      });
      // trusting the last test to verify contents for the other 3 users
      expect(postEphemeral.mock.calls.length).toEqual(4);
    });

    it("if multiple timezones are specified, it only messages people in a different timezone", async () => {
      message.event.text =
        "03:00 :eastern-time-zone: | 02:00 :central-time-zone:";
      await handler(message);

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 1",
        text: "That's 1:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 4",
        text: "That's 11:00 for you!",
      });

      expect(postEphemeral.mock.calls.length).toEqual(2);
    });

    it("if a timezone is not specified, it messages everyone except the original author", async () => {
      message.event.text = "03:00";
      await handler(message);

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 1",
        text: "That's 2:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 2",
        text: "That's 4:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 3",
        text: "That's 3:00 for you!",
      });

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 4",
        text: "That's 12:00 for you!",
      });

      // Make sure only the above messages were posted.
      expect(postEphemeral.mock.calls.length).toEqual(4);
    });

    it("includes AM/PM in the message if it was included in the original", async () => {
      message.event.text = "03:00 PM";
      await handler(message);

      expect(postEphemeral).toHaveBeenCalledWith({
        ...baseResponse,
        user: "user 1",
        text: "That's 2:00 pm for you!",
      });

      // Not testing filtering here, so trust the previous tests.
    });

    it("does not respond at all if the user text is empty (e.g., crossposted messages", async () => {
      message.event.text = "";
      await handler(message);

      expect(postEphemeral).not.toHaveBeenCalled();
    });
  });
});
