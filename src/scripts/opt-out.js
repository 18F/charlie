const {
  optOut: { BRAIN_KEY },
} = require("../utils");

module.exports = (app) => {
  app.action(
    "opt_out",
    async ({
      ack,
      action: {
        selected_option: { value },
      },
      body: {
        user: { id: userId },
      },
    }) => {
      ack();

      const optedOut = app.brain.get(BRAIN_KEY) || {};
      if (!optedOut[value]) {
        optedOut[value] = [];
      }

      if (!optedOut[value].includes(userId)) {
        optedOut[value].push(userId);
        app.brain.set(BRAIN_KEY, optedOut);
      }
    },
  );
};
