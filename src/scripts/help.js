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
          (u) => u.id === botUserId
        ).real_name;
      }

      const modules = getHelp();

      const interactiveBots = [...modules.get(interactive)].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const noninteractiveBots = [...modules.get(noninteractive)].sort((a, b) =>
        a.name.localeCompare(b.name)
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
          { type: "divider" }
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
          { type: "divider" }
        );
      }
      // get rid of the last divider
      blocks.pop();

      say({
        blocks,
        text: "Charlie help",
        thread_ts: thread ?? ts,
      });
    }
  );
};
