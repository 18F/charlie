const slack = require("./slack");

const {
  addEmojiReaction,
  getChannelID,
  getSlackUsers,
  getSlackUsersInConversation,
  getSlackUserStatusText,
  postEphemeralMessage,
  postEphemeralResponse,
  postMessage,
  sendDirectMessage,
  setClient,
  slackUserIsOOO,
} = slack;

describe("utils / slack", () => {
  const defaultClient = {
    chat: { postEphemeral: jest.fn(), postMessage: jest.fn() },
    conversations: { list: jest.fn(), open: jest.fn() },
    users: { list: jest.fn(), profile: { get: jest.fn() } },
  };
  const config = { SLACK_TOKEN: "slack token" };

  beforeAll(() => {
    setClient(defaultClient);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("adds an emoji reaction to a message", async () => {
    const msg = {
      client: {
        reactions: {
          add: jest.fn(),
        },
      },
      event: {
        channel: "channel id",
        ts: "message timestamp",
      },
    };

    await addEmojiReaction(msg, ":bob:");

    expect(msg.client.reactions.add).toHaveBeenCalledWith({
      name: ":bob:",
      channel: "channel id",
      timestamp: "message timestamp",
    });
  });

  it("can get a channel ID from a channel name", async () => {
    defaultClient.conversations.list.mockResolvedValue({
      channels: [
        { name: "c1", id: "id1" },
        { name: "c2", id: "id2" },
        { name: "c3", id: "id3" },
      ],
      response_metadata: {},
    });

    const id = await getChannelID("c2", config);

    expect(defaultClient.conversations.list).toHaveBeenCalledWith({
      token: "slack token",
    });
    expect(id).toEqual("id2");
  });

  it("can get a channel ID from a channel name when channels are paginated", async () => {
    defaultClient.conversations.list.mockResolvedValueOnce({
      channels: [
        { name: "c1", id: "id1" },
        { name: "c2", id: "id2" },
        { name: "c3", id: "id3" },
      ],
      response_metadata: { next_cursor: "page 2" },
    });
    defaultClient.conversations.list.mockResolvedValueOnce({
      channels: [{ name: "c4", id: "id4" }],
      response_metadata: {},
    });

    // Use an ID that wasn't in the previous test. This will bypass the internal
    // cache-map.
    const id = await getChannelID("c4", config);

    expect(defaultClient.conversations.list).toHaveBeenCalledWith({
      token: "slack token",
    });
    expect(defaultClient.conversations.list).toHaveBeenCalledWith({
      cursor: "page 2",
      token: "slack token",
    });
    expect(id).toEqual("id4");
  });

  it("can get a list of all Slack users", async () => {
    defaultClient.users.list.mockResolvedValueOnce({
      members: [
        { id: 1, name: "one" },
        { id: 2, name: "two" },
        { id: 3, name: "three" },
      ],
      response_metadata: { next_cursor: "page 2" },
    });
    defaultClient.users.list.mockResolvedValueOnce({
      members: [{ id: 4, name: "four" }],
      response_metadata: {},
    });

    const users = await getSlackUsers(config);

    expect(defaultClient.users.list).toHaveBeenCalledWith({
      token: "slack token",
    });
    expect(users).toEqual([
      { id: 1, name: "one" },
      { id: 2, name: "two" },
      { id: 3, name: "three" },
      { id: 4, name: "four" },
    ]);
  });

  it("can get a list of Slack users in a message channel", async () => {
    defaultClient.users.list.mockResolvedValue({
      members: [
        { id: 1, name: "one" },
        { id: 2, name: "two" },
        { id: 3, name: "three" },
      ],
      response_metadata: {},
    });

    const msg = {
      client: { conversations: { members: jest.fn() } },
      event: { channel: "channel id" },
    };
    msg.client.conversations.members.mockResolvedValue({ members: [1, 3] });

    const users = await getSlackUsersInConversation(msg);

    expect(msg.client.conversations.members).toHaveBeenCalledWith({
      channel: "channel id",
    });
    expect(users).toEqual([
      { id: 1, name: "one" },
      { id: 3, name: "three" },
    ]);
  });

  it("gets a Slack user's status text", async () => {
    defaultClient.users.profile.get.mockResolvedValue({
      profile: { status_text: "text" },
    });

    const status = await getSlackUserStatusText("slack id");

    expect(defaultClient.users.profile.get).toHaveBeenCalledWith({
      user: "slack id",
    });
    expect(status).toEqual("text");
  });

  it("can post an ephemeral message", async () => {
    const msg = { this: "is", my: "message" };

    await postEphemeralMessage(msg, config);

    expect(defaultClient.chat.postEphemeral).toHaveBeenCalledWith({
      this: "is",
      my: "message",
      token: "slack token",
    });
  });

  it("can post an ephemeral response to a message", async () => {
    const msg = {
      event: {
        channel: "channel id",
        thread_ts: "message timestamp",
        user: "user id",
      },
    };

    await postEphemeralResponse(msg, { text: "bob" }, config);

    expect(defaultClient.chat.postEphemeral).toHaveBeenCalledWith({
      channel: "channel id",
      text: "bob",
      thread_ts: "message timestamp",
      token: "slack token",
      user: "user id",
    });
  });

  it("can post a message", async () => {
    await postMessage({ text: "moop moop" }, config);

    expect(defaultClient.chat.postMessage).toHaveBeenCalledWith({
      text: "moop moop",
      token: "slack token",
    });
  });

  it("can send a direct message to a single user", async () => {
    defaultClient.conversations.open.mockResolvedValue({
      channel: { id: "direct message id" },
    });

    await sendDirectMessage("user id", { text: "moop moop" }, config);

    expect(defaultClient.conversations.open).toHaveBeenCalledWith({
      token: "slack token",
      users: "user id",
    });
    expect(defaultClient.chat.postMessage).toHaveBeenCalledWith({
      channel: "direct message id",
      text: "moop moop",
      token: "slack token",
    });
  });

  it("can send a direct message to multiple users", async () => {
    defaultClient.conversations.open.mockResolvedValue({
      channel: { id: "direct message id" },
    });

    await sendDirectMessage(
      ["user 1", "user 2"],
      { text: "moop moop" },
      config
    );

    expect(defaultClient.conversations.open).toHaveBeenCalledWith({
      token: "slack token",
      users: "user 1,user 2",
    });
    expect(defaultClient.chat.postMessage).toHaveBeenCalledWith({
      channel: "direct message id",
      text: "moop moop",
      token: "slack token",
    });
  });

  describe("tells you if a user is OOO", () => {
    slack.getSlackUserStatusText = jest.fn();

    it("says no if their status is empty", async () => {
      slack.getSlackUserStatusText.mockResolvedValue("");
      const isOOO = await slackUserIsOOO("bob");

      expect(isOOO).toEqual(false);
    });

    describe("says yes if...", () => {
      it("their status is OOO, but with mixed caps (case-insensitive check)", async () => {
        slack.getSlackUserStatusText.mockResolvedValue("I am OoO for a while");
        const isOOO = await slackUserIsOOO("bob");

        expect(isOOO).toEqual(true);
      });

      it("their status is 'out of office'", async () => {
        slack.getSlackUserStatusText.mockResolvedValue("out of office");
        const isOOO = await slackUserIsOOO("bob");

        expect(isOOO).toEqual(true);
      });

      it("their status is 'out of the office'", async () => {
        slack.getSlackUserStatusText.mockResolvedValue(
          "I will be out of the office until I am not"
        );
        const isOOO = await slackUserIsOOO("bob");

        expect(isOOO).toEqual(true);
      });

      it("their status mentions vacation", async () => {
        slack.getSlackUserStatusText.mockResolvedValue("On vacation, friends!");
        const isOOO = await slackUserIsOOO("bob");

        expect(isOOO).toEqual(true);
      });
    });
  });
});
