const { directMention } = require("@slack/bolt");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const {
  homepage: { registerInteractive },
  slack: { postMessage, sendDirectMessage },
} = require("../utils");

const requestERGInvitationActionId = "erg_invite_request";
const showGroupsModalActionId = "show_erg_modal";

const getERGs = () => {
  // Read in the list of ERGs from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "erg-inviter.yaml"));
  const { ergs } = yaml.load(ymlStr, { json: true });

  return ergs;
};

module.exports = async (app) => {
  const ergs = module.exports.getERGs();

  const getButtons = () =>
    Object.entries(ergs).map(([name, { channel, description }]) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `• *${name}*: ${description}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: `Request invitation to ${name}` },
        value: channel,
        action_id: requestERGInvitationActionId,
      },
    }));

  registerInteractive(() => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: ":inclusion-bot: Request an invitation to TTS employee affinity group Slack channels:.",
    },
    accessory: {
      type: "button",
      text: { type: "plain_text", text: "See a list of groups" },
      action_id: showGroupsModalActionId,
    },
  }));

  app.action(
    showGroupsModalActionId,
    async ({ ack, body: { trigger_id: trigger }, client }) => {
      await ack();

      client.views.open({
        trigger_id: trigger,
        view: {
          type: "modal",
          title: { type: "plain_text", text: "TTS affinity groups" },
          blocks: [...getButtons()],
        },
      });
    }
  );

  app.action(
    requestERGInvitationActionId,
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

      sendDirectMessage(userId, {
        icon_emoji: ":tts:",
        text: "Okay, I've sent your request to join that channel.",
        username: "Inclusion Bot",
      });
    }
  );

  app.message(directMention(), /ergs/i, ({ event: { user } }) => {
    sendDirectMessage(user, {
      icon_emoji: ":tts:",
      text: "Here are the available employee afinity group channels.",
      username: "Inclusion Bot",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Here are the available employee afinity group channels.",
          },
        },
        ...getButtons(),
      ],
    });
  });
};

module.exports.REQUEST_ERG_INVITATION_ACTION_ID = requestERGInvitationActionId;
module.exports.SHOW_ERG_MODAL_ACTION_ID = showGroupsModalActionId;
module.exports.getERGs = getERGs;
