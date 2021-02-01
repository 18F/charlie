const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const getERGs = () => {
  // Read in the huge list of bots from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "erg-inviter.yaml"));
  const { ergs } = yaml.safeLoad(ymlStr, { json: true });

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
  const ergs = await getERGs();

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
        const match = text.match(/• \*([^*]+)\*/);
        if (match && ergs[match[1]]) {
          const { channel } = ergs[match[1]];
          robot.messageRoom(
            channel,
            `<@${userID}> has requested to join this channel. Add an emoji reaction to this message to invite them.`
          );
          console.log(userID);
        }
      }
    }
  );
};
