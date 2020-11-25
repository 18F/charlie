const axios = require("axios");
const fs = require("fs");
const { cache } = require("../utils");

const configs = JSON.parse(
  fs.readFileSync("config/slack-random-response.json")
);

/**
 * Given a configuration, get a list of responses for it.
 * @param {*} config The configuration to fetch responses for.
 * @returns {Promise<Array>} Resolves an array of responses
 */
const getResponses = async (config) => {
  // If the config has a list of responses, use it
  // and bail out.
  if (config.responseList) {
    return config.responseList;
  }

  if (config.responseUrl) {
    // If we've hit this URL within the past five minutes, return the cached
    // result rather than taking the network hit again so quickly
    return cache(`random response from ${config.responseUrl}`, 5, async () => {
      const { data } = await axios.get(config.responseUrl);
      return data;
    });
  }

  return [];
};

/**
 * Given a config, returns a Slack/bolt message handler
 * @param {Object} params
 * @param {*} params.botName The name to use for the bot when responding
 * @param {*} params.defaultEmoji The default emoji to use for the bot
 *                                avatar when responding
 * @param {*} params.config All other params properties are rolled into this
 * @returns {Function} A Slack/bolt message handler
 */
const responseFrom = ({
  botName = null,
  defaultEmoji = null,
  ...config
} = {}) => async ({ event: { thread_ts: thread }, say }) => {
  const message = { thread_ts: thread };
  if (defaultEmoji) {
    message.icon_emoji = defaultEmoji;
  }
  if (botName) {
    message.username = botName;
  }

  const responses = await getResponses(config);
  const response = responses[Math.floor(Math.random() * responses.length)];

  if (typeof response === "object") {
    message.text = response.text;
    if (response.name) {
      message.username = response.name + (botName ? ` (${botName})` : "");
    }
    if (response.emoji) {
      message.icon_emoji = response.emoji;
    }
  } else {
    message.text = response;

    // If the message begins with ":<value>:", use the "<value>" as an emoji
    // for the bot's avatar.
    const match = response.match(/^(:[^:]+:)(.*)$/);
    if (match) {
      message.icon_emoji = match[1];
      message.text = match[2].trim();
    }
  }

  say(message);
};

/**
 * Attach listener(s) for a given config
 * @param {*} app The Slack/bolt app instance being used
 * @param {Object} props
 * @param {*} props.trigger The trigger property of the config
 * @param {*} props.config The rest of the config object
 */
const attachTrigger = (app, { trigger, ...config }) => {
  if (Array.isArray(trigger)) {
    trigger.forEach((t) =>
      app.message(new RegExp(t, "i"), responseFrom(config))
    );
  } else {
    app.message(new RegExp(trigger, "i"), responseFrom(config));
  }
};

module.exports = (app) => {
  if (Array.isArray(configs)) {
    configs.forEach(async (config) => {
      attachTrigger(app, config);
    });

    app.message(/fact of facts/i, async (res) => {
      // Pick a random fact config
      const factConfig = configs[Math.floor(Math.random() * configs.length)];

      // Get a message handler for the chosen configuration and then run it!
      responseFrom(factConfig)(res);
    });
  }
};

module.exports.attachTrigger = attachTrigger;
module.exports.getResponses = getResponses;
module.exports.responseFrom = responseFrom;
