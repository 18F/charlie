const brain = require("../brain");

const BRAIN_KEY = "OPT_OUT";

const optOut = (name) => ({
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
          value: name,
        },
      ],
    },
  },
  isOptedOut: (userId) => {
    const optOutList = brain.get(BRAIN_KEY) || {};
    return (optOutList[name] || []).includes(userId);
  },
});

module.exports = optOut;
module.exports.BRAIN_KEY = BRAIN_KEY;
