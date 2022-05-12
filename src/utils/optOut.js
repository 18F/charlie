const brain = require("../brain");

const BRAIN_KEY = "OPT_OUT";

const optOutOptions = [];

const optOut = (key, name, description) => {
  const optOuts = brain.get(BRAIN_KEY) || {};
  if (!optOuts[key]) {
    optOuts[key] = [];
    brain.set(BRAIN_KEY, optOuts);
  }
  optOutOptions.push({ key, name, description });

  return {
    button: {
      accessory: {
        action_id: "opt_out",
        type: "overflow",
        options: [
          {
            text: {
              type: "plain_text",
              text: "Don't show me this anymore",
            },
            value: key,
          },
        ],
      },
    },
    isOptedOut: (userId) => {
      const optOutList = brain.get(BRAIN_KEY) || {};
      return (optOutList[key] || []).includes(userId);
    },
  };
};

module.exports = optOut;
module.exports.BRAIN_KEY = BRAIN_KEY;
module.exports.options = optOutOptions;
