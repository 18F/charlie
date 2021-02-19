const { cache } = require("./cache");

let defaultClient = {};

const setClient = (client) => {
  defaultClient = client;
};

const addEmojiReaction = async (msg, reaction) => {
  const {
    client,
    event: { channel, ts: timestamp },
  } = msg;

  return client.reactions.add({ name: reaction, channel, timestamp });
};

const getChannelID = (() => {
  const channelIDs = new Map();

  return async (channelName) => {
    if (!channelIDs.get(channelName)) {
      const all = await defaultClient.conversations.list({
        token: process.env.SLACK_TOKEN,
      });

      all.channels.forEach(({ name, id }) => channelIDs.set(name, id));
    }
    return channelIDs.get(channelName);
  };
})();

/**
 * Fetch a list of Slack users in the workspace that this bot is in.
 * @async
 * @returns {Promise<Array<Object>>} A list of Slack users.
 */
const getSlackUsers = async () => {
  return cache("get slack users", 60, async () => {
    const { members } = await defaultClient.users.list({
      token: process.env.SLACK_TOKEN,
    });
    return members;
  });
};

const getSlackUsersInConversation = async ({ client, event: { channel } }) => {
  return cache(`get slack users in conversation ${channel}`, 10, async () => {
    const { members: channelUsers } = await client.conversations.members({
      channel,
    });
    const allUsers = await getSlackUsers();

    return allUsers.filter(({ id }) => channelUsers.includes(id));
  });
};

const postEphemeralMessage = async (message) => {
  await defaultClient.chat.postEphemeral({
    ...message,
    token: process.env.SLACK_TOKEN,
  });
};

const postEphemeralResponse = async (toMsg, message) => {
  const {
    event: { channel, thread_ts: thread, user },
  } = toMsg;
  await postEphemeralMessage({
    ...message,
    user,
    channel,
    thread_ts: thread,
  });
};

const postMessage = async (message) => {
  return defaultClient.chat.postMessage({
    ...message,
    token: process.env.SLACK_TOKEN,
  });
};

const sendDirectMessage = async (to, message) => {
  const {
    channel: { id },
  } = await defaultClient.conversations.open({
    token: process.env.SLACK_TOKEN,
    users: Array.isArray(to) ? to.join(",") : to,
  });

  postMessage({
    ...message,
    channel: id,
  });
};

module.exports = {
  addEmojiReaction,
  getChannelID,
  getSlackUsers,
  getSlackUsersInConversation,
  postEphemeralMessage,
  postEphemeralResponse,
  postMessage,
  sendDirectMessage,
  setClient,
};
