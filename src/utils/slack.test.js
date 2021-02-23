const {
  addEmojiReaction,
  getChannelID,
  getSlackUsers,
  getSlackUsersInConversation,
  postEphemeralResponse,
  postMessage,
  sendDirectMessage,
  setClient,
} = require("./slack");

describe("utils / slack", () => {
  const defaultClient = {
    chat: { postMessage: jest.fn() },
    conversations: { list: jest.fn(), open: jest.fn() },
    users: { list: jest.fn() },
  };

  beforeAll(() => {
    setClient(defaultClient);
    process.env.SLACK_TOKEN = "slack token";
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

    const id = await getChannelID("c2");

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
    const id = await getChannelID("c4");

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

    const users = await getSlackUsers();

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

  it("can post an ephemeral response to a message", async () => {
    const msg = {
      client: { chat: { postEphemeral: jest.fn() } },
      event: {
        channel: "channel id",
        thread_ts: "message timestamp",
        user: "user id",
      },
    };

    await postEphemeralResponse(msg, { text: "bob" });

    expect(msg.client.chat.postEphemeral).toHaveBeenCalledWith({
      channel: "channel id",
      text: "bob",
      thread_ts: "message timestamp",
      user: "user id",
    });
  });

  it("can post a message", async () => {
    await postMessage({ text: "moop moop" });

    expect(defaultClient.chat.postMessage).toHaveBeenCalledWith({
      text: "moop moop",
      token: "slack token",
    });
  });

  it("can send a direct message to a single user", async () => {
    defaultClient.conversations.open.mockResolvedValue({
      channel: { id: "direct message id" },
    });

    await sendDirectMessage("user id", { text: "moop moop" });

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

    await sendDirectMessage(["user 1", "user 2"], { text: "moop moop" });

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
});
