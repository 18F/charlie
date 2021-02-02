const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const getAllChannels = async (robot, cursor) =>
  new Promise((resolve, reject) => {
    const options = {
      exclude_archived: true,
      types: "public_channel,private_channel",
    };
    if (cursor) {
      options.cursor = cursor;
    }

    robot.adapter.client.web.conversations.list(
      options,
      async (err, conversations) => {
        if (err || !conversations.ok) {
          return reject();
        }

        const list = conversations.channels.reduce(
          (all, { id, name }) => ({
            ...all,
            [name]: id,
          }),
          {}
        );

        if (
          conversations.response_metadata &&
          conversations.response_metadata.next_cursor
        ) {
          const nextPage = await getAllChannels(
            robot,
            conversations.response_metadata.next_cursor
          );
          Object.assign(list, nextPage);
        }

        return resolve(list);
      }
    );
  });

const getERGs = async (robot) => {
  // Read in the huge list of bots from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "erg-inviter.yaml"));
  const { ergs } = yaml.safeLoad(ymlStr, { json: true });

  const channels = await getAllChannels(robot);
  Object.values(ergs).forEach((erg) => {
    erg.channelId = channels[erg.channel]; // eslint-disable-line no-param-reassign
  });

  return ergs;
};

const getMessageText = async (robot, room, timestamp) =>
  new Promise((resolve, reject) => {
    robot.adapter.client.web.conversations.history(
      room,
      { latest: timestamp, limit: 1, inclusive: true },
      (err, response) => {
        if (err || !response.ok) {
          return reject();
        }
        return resolve(response.messages[0].text);
      }
    );
  });

module.exports = async (robot) => {
  const ergs = await getERGs(robot);

  const messages = Object.entries(ergs).map(
    ([name, { description }]) => `• *${name}*: ${description}`
  );

  robot.respond("ergs", (msg) => {
    msg.reply(
      "Here are the available employee afinity group channels. Add an emoji reaction to the one(s) you'd like to be invited into, and the appropriate channel will get a notification!"
    );
    messages.forEach((message) => msg.reply(message));
  });

  robot.react(
    async ({
      message: {
        event_ts: ts,
        item_user: {
          slack: {
            profile: { bot_id: isReactionToBot },
          },
        },
        room,
        type,
        user: { id: userID },
      },
    }) => {
      if (type === "added" && !!isReactionToBot) {
        const text = await getMessageText(robot, room, ts);
        const requestMatch = text.match(/^• \*([^*]+)\*/);

        if (requestMatch && ergs[requestMatch[1]]) {
          const { channelId } = ergs[requestMatch[1]];
          robot.messageRoom(
            channelId,
            `<@${userID}> has requested to join this channel. Add an emoji reaction to this message to invite them.`
          );
          return;
        }

        console.log(text);

        const inviteMatch = text.match(
          /^<@([^>]+)> has requested to join this channel\./
        );
        console.log(inviteMatch);

        if (inviteMatch) {
          const known = Object.values(ergs).some(
            ({ channelId }) => channelId === room
          );
          if (known) {
            const [, userId] = inviteMatch;

            robot.adapter.client.web.conversations.invite(room, userId);
          }
        }
      }
    }
  );
};
