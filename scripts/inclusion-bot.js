const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const utils = require("../utils");

const getMatches = () => {
  // Read in the huge list of bots from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "inclusion-bot.yaml"));
  const yml = yaml.safeLoad(ymlStr, { json: true });
  const bots = yml["inclusion-bot"];

  // Then for each bot, go ahead and map the list of matches and ignores into
  // regexes, so we don't need to do that on each trigger.
  return bots.map(({ ignore, matches, ...rest }) => ({
    ignore: ignore && RegExp(`(${ignore.join("|")})`, "ig"),
    matches: RegExp(`(${matches.join("|")})`, "i"),
    ...rest,
  }));
};

module.exports = async (robot) => {
  const { addEmojiReaction, postEphemeralMessage } = utils.setup(robot);

  // Use the module exported version here, so that it can be stubbed for testing
  const bots = module.exports.getMatches();

  // Combine all the regexes from the map into a single regex, to reduce the
  // matching load on the bot. This way there's just one listener for inclusion
  // bot instead of one per regex in the map. This combined regex also adds
  // case-insensitivity and word boundaries.
  const combinedString = bots
    .map(({ matches }) => `${matches.source}`)
    .join("|");
  const combinedRegex = new RegExp(`\\b${combinedString}\\b`, "i");

  robot.hear(combinedRegex, (msg) => {
    // Find the specific match that triggered this bot. At this point, go ahead
    // and remove things that should be ignored.
    const specificMatch = bots
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

    addEmojiReaction("inclusion-bot", msg.message.room, msg.message.id);

    // Pick a random alternative
    const pretexts = specificMatch.map(({ alternatives, text }) => {
      const alternative =
        alternatives[Math.floor(Math.random() * alternatives.length)];
      return `• Instead of saying "${text}," how about *${alternative}*?`;
    });

    // And say hello.
    postEphemeralMessage({
      attachments: [
        {
          color: "#2eb886",
          pretext: `${pretexts.join(
            "\n"
          )} (_<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|What's this?>_)`,
          text: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of language stemming from racism, sexism, ableism, or other non-inclusive roots, we encourage everyone to try out new phrases. This is a small way we build inclusion into our everyday work lives. (See the <https://docs.google.com/document/d/1MMA7f6uUj-EctzhtYNlUyIeza6R8k4wfo1OKMDAgLog/edit#|inclusion bot document> for more info. *Content warning: offensive language.*)`,
          fallback: `Hello! Our inclusive TTS culture is built one interaction at a time, and inclusive language is the foundation. Instead of language stemming from racism, sexism, ableism, or other non-inclusive roots, we encourage everyone to try out new phrases. This is a small way we build inclusion into our everyday work lives. (See the <https://docs.google.com/document/d/1MMA7f6uUj-EctzhtYNlUyIeza6R8k4wfo1OKMDAgLog/edit#|inclusion bot document> for more info. *Content warning: offensive language.*)`,
        },
      ],
      as_user: false,
      channel: msg.message.room,
      icon_emoji: ":tts:",
      user: msg.message.user.id,
      username: "Inclusion Bot",
      unfurl_links: false,
      unfurl_media: false,
    });
  });
};

module.exports.getMatches = getMatches;
