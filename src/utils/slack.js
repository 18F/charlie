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

  return async (channelName, { SLACK_TOKEN } = process.env) => {
    if (!channelIDs.get(channelName)) {
      const all = [];
      let cursor;

      do {
        /* eslint-disable no-await-in-loop */
        // The no-await-in-loop rule is there to encourage parallelization and
        // using Promise.all to collect the waiting promises. However, in this
        // case, the iterations of the loop are dependent on each other and
        // cannot be parallelized, so just disable the rule.

        const {
          channels,
          response_metadata: { next_cursor: nextCursor },
        } = await defaultClient.conversations.list({
          cursor,
          token: SLACK_TOKEN,
        });

        cursor = nextCursor;
        all.push(...channels);

        /* eslint-enable no-await-in-loop */
        // But be sure to turn the rule back on.
      } while (cursor);

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
const getSlackUsers = async ({ SLACK_TOKEN } = process.env) =>
  cache("get slack users", 1440, async () => {
    const all = [];
    let cursor;

    do {
      /* eslint-disable no-await-in-loop */
      // The no-await-in-loop rule is there to encourage parallelization and
      // using Promise.all to collect the waiting promises. However, in this
      // case, the iterations of the loop are dependent on each other and
      // cannot be parallelized, so just disable the rule.
      const {
        members,
        response_metadata: { next_cursor: nextCursor },
      } = await defaultClient.users.list({
        cursor,
        token: SLACK_TOKEN,
      });

      cursor = nextCursor;
      all.push(...members);

      /* eslint-enable no-await-in-loop */
      // But be sure to turn the rule back on.
    } while (cursor);

    return all;
  });

const getSlackUsersInConversation = async ({
  client = defaultClient,
  event: { channel },
}) =>
  cache(`get slack users in conversation ${channel}`, 10, async () => {
    const { members: channelUsers } = await client.conversations.members({
      channel,
    });
    const allUsers = await getSlackUsers();

    return allUsers.filter(({ id }) => channelUsers.includes(id));
  });

const getSlackUserStatusText = async (userId) =>
  cache(`get status for user ${userId}`, 10, async () => {
    const {
      profile: { status_text: status },
    } = await defaultClient.users.profile.get({ user: userId });
    return status;
  });

const postEphemeralMessage = async (message, { SLACK_TOKEN } = process.env) => {
  await defaultClient.chat.postEphemeral({
    ...message,
    token: SLACK_TOKEN,
  });
};

const postEphemeralResponse = async (toMsg, message, config = process.env) => {
  const {
    event: { channel, thread_ts: thread, user },
  } = toMsg;
  await postEphemeralMessage(
    {
      ...message,
      user,
      channel,
      thread_ts: thread,
    },
    config
  );
};

const postMessage = async (message, { SLACK_TOKEN } = process.env) =>
  defaultClient.chat.postMessage({
    ...message,
    token: SLACK_TOKEN,
  });

const sendDirectMessage = async (
  to,
  message,
  { SLACK_TOKEN } = process.env
) => {
  const {
    channel: { id },
  } = await defaultClient.conversations.open({
    token: SLACK_TOKEN,
    users: Array.isArray(to) ? to.join(",") : to,
  });

  postMessage(
    {
      ...message,
      channel: id,
    },
    { SLACK_TOKEN }
  );
};

const slackUserIsOOO = async (userId) => {
  const statusText = await module.exports.getSlackUserStatusText(userId);
  return /\b(ooo|out of( the)? office|vacation)\b/i.test(statusText);
};

module.exports = {
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
};
