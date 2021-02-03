const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const getERGs = () => {
  // Read in the list of ERGs from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "erg-inviter.yaml"));
  const { ergs } = yaml.safeLoad(ymlStr, { json: true });

  return ergs;
};

module.exports = async (robot) => {
  const ergs = getERGs();
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
        ([name, { channel: targetChannel, description }]) => {
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
                messageMap.set(`${dmChannelId} | ${ts}`, targetChannel);
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
