const fs = require('fs');
const configs = JSON.parse(
  fs.readFileSync('config/slack-random-response.json')
);

const cachedRequests = {};

const getResponses = async (robot, config) => {
  if (config.responseList) {
    return config.responseList;
  }

  if (config.responseUrl) {
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
        cachedRequests[config.responseUrl] = {
          expiry: Date.now() + 60000, // five minutes
          value: JSON.parse(body)
        };
        resolve(JSON.parse(body));
      });
    });
  }
};

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
    const match = response.match(/^(:[^:]+:)(.*)$/);
    if (match) {
      message.icon_emoji = match[1];
      message.text = match[2].trim();
    }
  }

  if (message.icon_emoji || message.username) {
    message.as_user = false;
  }

  res.send(message);
};

const attachTrigger = (robot, trigger, config) => {
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
      attachTrigger(robot, config.trigger, config);
    });
  }
};

module.exports.attachTrigger = attachTrigger;
module.exports.getResponses = getResponses;
module.exports.responseFrom = responseFrom;
