const { directMention } = require("@slack/bolt");
const {
  helpMessage: {
    getHelp,
    type: { interactive, noninteractive },
  },
  slack: { getSlackUsers },
  stats: { incrementStats },
} = require("../utils");

module.exports = async (app) => {
  incrementStats("help");

  let botName = false;

  app.message(
    directMention(),
    "help",
    async ({
      context: { botUserId },
      event: { thread_ts: thread, ts },
      say,
    }) => {
      if (botName === false) {
        botName = (await getSlackUsers()).find(
          (u) => u.id === botUserId,
        ).real_name;
      }

      const modules = getHelp();

      const interactiveBots = [...modules.get(interactive)].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const noninteractiveBots = [...modules.get(noninteractive)].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const blocks = [
        {
          type: "header",
          text: { type: "plain_text", text: "Interactive bots" },
        },
      ];

      for (const bot of interactiveBots) {
        blocks.push(
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${bot.name}*: ${bot.helpText}${
                bot.directMention ? " (requires @-mentioning Charlie)" : ""
              }\n\`\`\`${bot.directMention ? `@${botName} ` : ""}${
                bot.trigger
              }\`\`\``,
            },
          },
          { type: "divider" },
        );
      }
      // get rid of the last divider
      blocks.pop();

      blocks.push({
        type: "header",
        text: { type: "plain_text", text: "Non-interactive bots" },
      });

      for (const bot of noninteractiveBots) {
        blocks.push(
          {
            type: "section",
            text: { type: "mrkdwn", text: `*${bot.name}*: ${bot.helpText}` },
          },
          { type: "divider" },
        );
      }
      // get rid of the last divider
      blocks.pop();

      const messages = [];

      // The Slack API only allows up to 50 blocks per message. If we have more
      // than 50 blocks, then, we need to break them up into multiple messages.
      do {
        const subset = blocks.splice(0, 50);

        // After removing the subset, if the first remaining block is a divider,
        // throw it out. We don't need to start messages with a divider.
        if (blocks.length > 0 && blocks[0].type === "divider") {
          blocks.shift();
        }

        // If the first or last block of the subset is a divider, toss it.
        if (subset[0].type === "divider") {
          subset.shift();
        }
        if (subset[subset.length - 1].type === "divider") {
          subset.pop();
        }

        // Add this subset to the list of messages to send.
        messages.push({
          blocks: subset,
          text: "Charlie help",
          thread_ts: thread ?? ts,
        });

        // Because the subset is spliced from the original blocks, we can just
        // keep iterating until there aren't any blocks left.
      } while (blocks.length > 0);

      // Send all the messages
      for await (const message of messages) {
        await say(message);
      }
    },
  );
};
