const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const {
  slack: { addEmojiReaction, postEphemeralResponse },
} = require("../utils");

const capitalize = (str) => `${str[0].toUpperCase()}${str.slice(1)}`;

const getTriggers = () => {
  // Read in the huge list of bots from the Yaml file
  const ymlStr = fs.readFileSync(path.join(__dirname, "inclusion-bot.yaml"));
  const yml = yaml.load(ymlStr, { json: true });
  const { link, message, triggers } = yml;

  // Then for each bot, go ahead and map the list of matches and ignores into
  // regexes, so we don't need to do that on each trigger.
  return {
    link,
    message,
    triggers: triggers.map(({ ignore, matches, ...rest }) => ({
      ignore: ignore && RegExp(`(${ignore.join("|")})`, "ig"),
      matches: RegExp(
        // The backend of this regex (starting at "(?=") is using a positive
        // lookahead to un-match things that are inside quotes (regular double
        // quotes, single quote, or smart quotes). You can play around with the
        // regex here: https://regexr.com/61eiq
        `(${matches.join("|")})(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)`,
        "i"
      ),
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
        const matchRegex = new RegExp(`\\b${matches.source}\\b`, "i");
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
          blocks: pretexts.map((text, i) => {
            const block = {
              type: "section",
              text: { type: "mrkdwn", text },
            };

            if (i === 0) {
              block.accessory = {
                type: "button",
                text: { type: "plain_text", text: "What's this?" },
                value: specificMatch.map(({ text: t }) => t).join("|"),
                action_id: "inclusion_modal",
              };
            }
            return block;
          }),
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

  app.action(
    "inclusion_modal",
    async ({
      ack,
      action: { value },
      body: { trigger_id: trigger },
      client,
    }) => {
      ack();

      const matchWords = value.split("|");

      const blocks = matchWords.map((word) => {
        const match = triggers
          .filter(({ matches }) => {
            matches.test(word);
            return matches.test(word);
          })
          .pop();

        const text = match?.why
          ? match.why.replace(/:term:/gi, capitalize(word))
          : `We haven't finished building an explanation for "*${word.toLowerCase()}*." Please ask in #g-diversity!`;

        return {
          type: "section",
          text: { type: "mrkdwn", text },
        };
      });

      for (let i = 0; i < blocks.length; i += 1) {
        blocks.splice(i + 1, 0, {
          type: "divider",
        });
        i += 1;
      }
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `See our <${link}|blog post> for more information about this bot.`,
          },
        ],
      });

      client.views.open({
        trigger_id: trigger,
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Inclusion Bot" },
          blocks,
        },
      });
    }
  );
};

module.exports.getTriggers = getTriggers;
