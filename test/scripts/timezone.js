const expect = require("chai").expect;
const sinon = require("sinon");
const utils = require("../../utils");

const timezone = require("../../scripts/timezone");

describe("Handy Tau-bot timezone conversions", () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    hear: sandbox.stub(),
  };

  let setup;
  const getSlackUsersInConversation = sandbox.stub();
  const postEphemeralMessage = sandbox.stub();

  const baseResponse = {
    as_user: false,
    channel: "room id",
    icon_emoji: ":timebot:",
    user: "user 1",
    username: "Handy Tau-bot",
    text: "That's 1:00 for you!",
    thread_ts: "thread.id",
  };

  before(() => {
    setup = sinon.stub(utils, "setup").returns({
      getSlackUsersInConversation,
      postEphemeralMessage,
    });
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    getSlackUsersInConversation.resolves([
      { id: "user 1", tz: "America/Denver" },
      { id: "user 2", tz: "America/New_York" },
      { id: "user 3", tz: "America/Chicago" },
      { id: "user 4", tz: "America/Anchorage" },
      { id: "user id", tz: "America/Chicago" },
      { id: "bot", is_bot: true },
      { id: "deleted", deleted: true },
    ]);
  });

  after(() => {
    setup.restore();
  });

  it("creates a utility wrapper and sets up a robot listener when initialized", () => {
    timezone(robot);

    expect(setup.calledWith(robot)).to.equal(true);
    expect(
      robot.hear.calledWith(
        /(\d{1,2}:\d{2}\s?(am|pm)?)\s?(((ak|a|c|e|m|p)(s|d)?t)|:(eastern|central|mountain|pacific)-time-zone:)?/i,
        sinon.match.func
      )
    ).to.equal(true);
  });

  describe("handles messages that include timeish text", () => {
    const message = {
      message: {
        rawMessage: {
          text: "03:00 AT",
          thread_ts: "thread.id",
        },
        room: "room id",
        user: {
          id: "user id",
          slack: {
            tz: "America/Chicago",
          },
        },
      },
    };

    let handler;
    before(() => {
      timezone(robot);
      handler = robot.hear.args.pop()[1];
    });

    it("if a timezone is specified, doesn't message people who are in the specified timezone", async () => {
      message.message.rawMessage.text = "03:00 est";
      await handler(message);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 1",
          text: "That's 1:00 for you!",
        })
      ).to.equal(true);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 3",
          text: "That's 2:00 for you!",
        })
      ).to.equal(true);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 4",
          text: "That's 11:00 for you!",
        })
      ).to.equal(true);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user id",
          text: "That's 2:00 for you!",
        })
      ).to.equal(true);

      // Make sure only the above messages were posted.
      expect(postEphemeralMessage.callCount).to.equal(4);
    });

    it("if a timezone is specified via emoji, it doesn't message people who are in the specified timezone", async() => {
      message.message.rawMessage.text = "03:00 :eastern-time-zone:";
      await handler(message);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 1",
          text: "That's 1:00 for you!",
        })
      ).to.equal(true);
      // trusting the last test to verify contents for the other 3 users
      expect(postEphemeralMessage.callCount).to.equal(4);
    });

    it("if a timezone is not specified, it messages everyone except the original author", async () => {
      message.message.rawMessage.text = "03:00";
      await handler(message);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 1",
          text: "That's 2:00 for you!",
        })
      ).to.equal(true);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 2",
          text: "That's 4:00 for you!",
        })
      ).to.equal(true);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 3",
          text: "That's 3:00 for you!",
        })
      ).to.equal(true);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 4",
          text: "That's 12:00 for you!",
        })
      ).to.equal(true);

      // Make sure only the above messages were posted.
      expect(postEphemeralMessage.callCount).to.equal(4);
    });

    it("includes AM/PM in the message if it was included in the original", async () => {
      message.message.rawMessage.text = "03:00 PM";
      await handler(message);

      expect(
        postEphemeralMessage.calledWith({
          ...baseResponse,
          user: "user 1",
          text: "That's 2:00 pm for you!",
        })
      ).to.equal(true);

      // Not testing filtering here, so trust the previous tests.
    });

    it("does not respond at all if the user text is empty (e.g., crossposted messages", async () => {
      message.message.rawMessage.text = "";
      await handler(message);

      expect(postEphemeralMessage.called).to.equal(false);
    });
  });
});
