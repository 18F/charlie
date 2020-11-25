//  Description:
//    For the giving of praise and thanks to colleagues.
//    Looks for messages like "love @username for [reason]", acknowledges them,
//    and copies them to #love.
//
//  Dependencies:
//    None
//
//  Configuration:
//    None
//
//  Commands:
//    None

const {
  slack: { getChannelID },
} = require("../utils");

module.exports = (robot) => {
  robot.message(
    /^\s*(love|<3|:heart\w*:)\s+((<@[\w-]+>\s*)+)(.*)$/i,
    async ({
      client,
      context: { matches },
      event: { channel, ts: message, thread_ts: thread, user },
      say,
    }) => {
      const lovees = matches[2].trim();

      const { permalink } = await client.chat.getPermalink({
        channel,
        message_ts: message,
      });

      const channelID = await getChannelID("love");

      client.chat.postMessage({
        channel: "love",
        icon_emoji: ":heart:",
        text: `<@${user}> loves ${lovees}! <${permalink}|link>`,
        unfurl_links: true,
      });

      say({
        icon_emoji: ":heart:",
        text: `Yay, more love for <#${channelID}>! Thanks, <@${user}>!`,
        thread_ts: thread,
      });
    }
  );
};
