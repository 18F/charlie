const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const {
  slack: { addEmojiReaction, postEphemeralResponse },
} = require("../utils");

const getTriggers = () => {
  // Read in the huge list of bots from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "inclusion-bot.yaml"));
  const yml = yaml.safeLoad(ymlStr, { json: true });
  const { link, message, triggers } = yml;

  // Then for each bot, go ahead and map the list of matches and ignores into
  // regexes, so we don't need to do that on each trigger.
  return {
    link,
    message,
    triggers: triggers.map(({ ignore, matches, ...rest }) => ({
      ignore: ignore && RegExp(`(${ignore.join("|")})`, "ig"),
      matches: RegExp(`(${matches.join("|")})`, "i"),
      ...rest,
    })),
  };
};

module.exports = async (app) => {
  // Use the module exported version here, so that it can be stubbed for testing
  const { link, message, triggers } = module.exports.getTriggers();

  // Combine all the regexes from the map into a single regex, to reduce the
  // matching load on the bot. This way there's just one listener for inclusion
  // bot instead of one per regex in the map. This combined regex also adds
  // case-insensitivity and word boundaries.
  const combinedString = triggers
    .map(({ matches }) => `${matches.source}`)
    .join("|");
  const combinedRegex = new RegExp(`\\b${combinedString}\\b`, "i");

  app.message(combinedRegex, (msg) => {
    // Find the specific match that triggered this bot. At this point, go ahead
    // and remove things that should be ignored.
    const specificMatch = triggers
      .map(({ alternatives, ignore, matches }) => {
        const { text } = msg.message;

        // Wrap the match in word boundaries, so we don't match something that's
        // in the middle of a block of text. This is especially important for
        // things like Google Docs links, which might contain any variety of
        // unfortunate randomish-letter combinations.
        const matchRegex = new RegExp(`\\b${matches.source}\\b`);
        const ignoreRegex = ignore || "";

        // Remove things that should be removed before testing for matches. This
        // makes the regexes a lot simpler.
        return {
          alternatives,
          text: text.replace(ignoreRegex, "").match(matchRegex),
        };
      })
      .filter(({ text }) => !!text)
      .map(({ text: [match], ...rest }) => ({ text: match, ...rest }));

    // If there aren't any specific matches, it means the bot was triggered only
    // by ignored terms, so we can just bail out now.
    if (specificMatch.length === 0) {
      return;
    }

    addEmojiReaction(msg, "inclusion-bot");

    // Pick a random alternative
    const pretexts = specificMatch.map(({ alternatives, text }) => {
      const alternative =
        alternatives[Math.floor(Math.random() * alternatives.length)];
      return `• Instead of saying "${text}," how about *${alternative}*?`;
    });

    // And say hello.
    postEphemeralResponse(msg, {
      attachments: [
        {
          color: "#ffbe2e",
          text: `${pretexts.join("\n")} (_<${link}|What's this?>_)`,
          fallback: "fallback",
        },
        {
          color: "#2eb886",
          text: message,
          fallback: message,
        },
      ],
      icon_emoji: ":tts:",
      user: msg.message.user.id,
      username: "Inclusion Bot",
      unfurl_links: false,
      unfurl_media: false,
    });
  });
};

module.exports.getTriggers = getTriggers;
