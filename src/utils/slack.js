const { cache } = require("./cache");

let defaultClient = {};

const setClient = (client) => {
  defaultClient = client;
};

const paginate = async (apiMethod, apiArgs, handlerCallback) => {
  let cursor;

  do {
    /* eslint-disable no-await-in-loop */
    // The no-await-in-loop rule is there to encourage parallelization and
    // using Promise.all to collect the waiting promises. However, in this
    // case, the iterations of the loop are dependent on each other and
    // cannot be parallelized, so just disable the rule.
    const {
      response_metadata: { next_cursor: nextCursor },
      ...rest
    } = await apiMethod({ ...apiArgs, cursor });
    cursor = nextCursor;

    handlerCallback(rest);

    /* eslint-enable no-await-in-loop */
    // But be sure to turn the rule back on.
  } while (cursor);
};

const addEmojiReaction = async (msg, reaction) => {
  const {
    client,
    event: { channel, ts: timestamp },
  } = msg;

  return client.reactions.add({ name: reaction, channel, timestamp });
};

const getChannels = () =>
  cache("get channels", 60, async () => {
    const all = [];

    await paginate(
      defaultClient.conversations.list,
      { token: process.env.SLACK_TOKEN },
      ({ channels }) => {
        all.push(...channels);
      }
    );

    return all;
  });

const getChannelID = (() => {
  const channelIDs = new Map();

  return async (channelName) => {
    if (!channelIDs.get(channelName)) {
      const all = await getChannels();

      all.forEach(({ name, id }) => channelIDs.set(name, id));
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
  return cache("get slack users", 1440, async () => {
    const all = [];

    await paginate(
      defaultClient.users.list,
      { token: process.env.SLACK_TOKEN },
      ({ members }) => {
        all.push(...members);
      }
    );

    return all;
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
  getChannels,
  getChannelID,
  getSlackUsers,
  getSlackUsersInConversation,
  paginate,
  postEphemeralMessage,
  postEphemeralResponse,
  postMessage,
  sendDirectMessage,
  setClient,
};
