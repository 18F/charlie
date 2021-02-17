const { directMention } = require("@slack/bolt");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const {
  slack: { postMessage, sendDirectMessage },
} = require("../utils");

const actionId = "erg_invite_request";

const getERGs = () => {
  // Read in the list of ERGs from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "erg-inviter.yaml"));
  const { ergs } = yaml.load(ymlStr, { json: true });

  return ergs;
};

module.exports = async (app) => {
  const ergs = module.exports.getERGs();

  app.action(
    actionId,
    async ({
      action: { value: channel },
      ack,
      body: {
        user: { id: userId },
      },
    }) => {
      await ack();

      postMessage({
        channel,
        icon_emoji: ":tts:",
        text: `:wave: <@${userId}> has requested an invitation to this channel.`,
        username: "Inclusion Bot",
      });
    }
  );

  app.message(directMention(), /ergs/i, ({ event: { user } }) => {
    sendDirectMessage(user, {
      icon_emoji: ":tts:",
      username: "Inclusion Bot",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "Here are the available employee afinity group channels. Add an emoji reaction to the one(s) you'd like to be invited into, and the appropriate channel will get a notification!",
          },
        },
        ...Object.entries(ergs).map(([name, { channel, description }]) => ({
          type: "section",
          text: { type: "mrkdwn", text: `• *${name}*: ${description}` },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "Request invitation" },
            value: `${channel}`,
            action_id: actionId,
          },
        })),
      ],
    });
  });
};

module.exports.actionId = actionId;
module.exports.getERGs = getERGs;
