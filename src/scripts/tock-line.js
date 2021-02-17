//  Description:
//    Inspect the data in redis easily
//
//  Commands:
//    @bot set tock line <line> - Associates a tock line with the current channel
//    @bot tock line - Display the tock line associated with the current channel, if any

const { directMention } = require("@slack/bolt");

const getTockLines = (app) => {
  let tockLines = app.brain.get("tockLines");
  if (!tockLines) {
    tockLines = {};
  }
  return tockLines;
};

module.exports = (app) => {
  app.message(
    directMention(),
    /tock( line)?$/i,
    ({ event: { channel, text, thread_ts: thread }, say }) => {
      const tockLines = getTockLines(app);
      if (tockLines[channel]) {
        say({
          icon_emoji: ":happytock:",
          text: `The tock line for <#${channel}> is \`${tockLines[channel]}\``,
          thread_ts: thread,
        });
      } else {
        const botUserIDMatch = text.match(/^<@([^>]+)>/);
        const botUserID = botUserIDMatch[1];

        say({
          icon_emoji: ":happytock:",
          text: `I don't know a tock line for this room. To set one, say \`<@${botUserID}> set tock line <line>\``,
          thread_ts: thread,
        });
      }
    }
  );

  app.message(
    directMention(),
    /set tock( line)? (.*)$/i,
    ({ context: { matches }, event: { channel, thread_ts: thread }, say }) => {
      const tockLines = getTockLines(app);
      tockLines[channel] = matches[2];
      app.brain.set("tockLines", tockLines);
      say({
        icon_emoji: ":happytock:",
        text: "Okay, I set the tock line for this room",
        thread_ts: thread,
      });
    }
  );
};
