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
  // Read in the list of ERGs from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "erg-inviter.yaml"));
  const { ergs } = yaml.safeLoad(ymlStr, { json: true });

  const channels = await getAllChannels(robot);
  Object.values(ergs).forEach((erg) => {
    erg.channelId = channels[erg.channel]; // eslint-disable-line no-param-reassign
  });

  return ergs;
};

module.exports = async (robot) => {
  const ergs = await getERGs(robot);
  const messageMap = new Map();

  robot.respond(
    "ergs",
    ({
      message: {
        user: { id: userId },
      },
    }) => {
      robot.messageRoom(userId, {
        as_user: true,
        icon_emoji: ":tts:",
        text:
          "Here are the available employee afinity group channels. Add an emoji reaction to the one(s) you'd like to be invited into, and the appropriate channel will get a notification!",
        username: "Inclusion Bot",
      });

      Object.entries(ergs).forEach(
        ([name, { channelId: targetChannelId, description }]) => {
          console.log(name);
          robot.messageRoom(
            userId,
            {
              as_user: true,
              icon_emoji: ":tts:",
              text: `• *${name}:* ${description}`,
              username: "Inclusion Bot",
            },
            (err, [{ channel: dmChannelId, ok, ts }]) => {
              if (ok) {
                console.log(`${dmChannelId} | ${ts}`, targetChannelId);
                messageMap.set(`${dmChannelId} | ${ts}`, targetChannelId);
              }
            }
          );
        }
      );
    }
  );

  robot.react(
    async ({
      message: {
        item: { ts },
        room,
        type,
        user: { id: userID },
      },
    }) => {
      const messageId = `${room} | ${ts}`;

      if (type === "added" && messageMap.has(messageId)) {
        const channel = messageMap.get(messageId);
        console.log(`${userID} -> ${channel}`);

        robot.messageRoom(channel, {
          as_user: false,
          icon_emoji: ":tts:",
          text: `<@${userID}> has requested to join this channel.`,
          username: "Inclusion Bot",
        });
      }
    }
  );
};
