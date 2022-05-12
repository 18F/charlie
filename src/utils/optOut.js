const brain = require("../brain");

const BRAIN_KEY = "OPT_OUT";

const optOutOptions = [];

const optOut = (key, name, description) => {
  const optOuts = brain.get(BRAIN_KEY) || {};

  // If the brain hasn't seen this key before, initialize it and save it. There
  // is no good reason all the other things that use opt-outs should have to
  // think about whether or not these are initialized. They are!
  if (!optOuts[key]) {
    optOuts[key] = [];
    brain.set(BRAIN_KEY, optOuts);
  }

  // Keep a list of all the options we've registered so they can be queried by
  // other scripts, such as the handy options view on Charlie's home page
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
