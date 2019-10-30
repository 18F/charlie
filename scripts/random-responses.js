const fs = require('fs');

const configs = JSON.parse(
  fs.readFileSync('config/slack-random-response.json')
);

const cachedRequests = {};

/**
 * Given a configuration, get a list of responses for it.
 * @param {*} robot The Hubot instance being used.  Required for HTTP requests
 * @param {*} config The configuration to fetch responses for.
 * @returns {Promise<Array>} Resolves an array of responses
 */
const getResponses = async (robot, config) => {
  // If the config has a list of responses, use it
  // and bail out.
  if (config.responseList) {
    return config.responseList;
  }

  if (config.responseUrl) {
    // If we've hit this URL within the past five minutes, return the cached
    // result rather than taking the network hit again so quickly
    if (cachedRequests[config.responseUrl]) {
      const cached = cachedRequests[config.responseUrl];
      if (Date.now() < cached.expiry) {
        return cached.value;
      }
    }

    return new Promise(resolve => {
      robot
        .http(config.responseUrl)
        .header('User-Agent', '18F-bot')
        .get()((err, res, body) => {
        // Cache off this data and set an expiration time so we know when to
        // go back to the network
        cachedRequests[config.responseUrl] = {
          expiry: Date.now() + 60000, // five minutes
          value: JSON.parse(body)
        };
        resolve(JSON.parse(body));
      });
    });
  }

  return [];
};

/**
 * Given a config, returns a Hubot message handler
 * @param {*} robot The Hubot instance being used
 * @param {Object} params
 * @param {*} params.botName The name to use for the bot when responding
 * @param {*} params.defaultEmoji The default emoji to use for the bot
 *                                avatar when responding
 * @param {*} params.config All other params properties are rolled into this
 * @returns {Function} A Hubot message handler
 */
const responseFrom = (
  robot,
  { botName = null, defaultEmoji = null, ...config } = {}
) => async res => {
  const message = {};
  if (defaultEmoji) {
    message.icon_emoji = defaultEmoji;
  }
  if (botName) {
    message.username = botName;
  }

  const responses = await getResponses(robot, config);
  const response = res.random(responses);

  if (typeof response === 'object') {
    message.text = response.text;
    if (response.name) {
      message.username = response.name + (botName ? ` (${botName})` : '');
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

  // If we've set the message icon or username, we need to set as_user to false
  if (message.icon_emoji || message.username) {
    message.as_user = false;
  }

  res.send(message);
};

/**
 * Attach listener(s) for a given config
 * @param {*} robot The Hubot instance being used
 * @param {Object} props
 * @param {*} props.trigger The trigger property of the config
 * @param {*} props.config The rest of the config object
 */
const attachTrigger = (robot, { trigger, ...config }) => {
  if (Array.isArray(trigger)) {
    trigger.forEach(t =>
      robot.hear(new RegExp(t, 'i'), responseFrom(robot, config))
    );
  } else {
    robot.hear(new RegExp(trigger, 'i'), responseFrom(robot, config));
  }
};

module.exports = robot => {
  if (Array.isArray(configs)) {
    configs.forEach(async config => {
      attachTrigger(robot, config);
    });
  }
};

module.exports.attachTrigger = attachTrigger;
module.exports.getResponses = getResponses;
module.exports.responseFrom = responseFrom;
