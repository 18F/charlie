const axios = require("axios");
const { cache, slack, tock } = require("./index");

// Mock axios and the utility functions, to make it easier for tests to use.
jest.mock("axios");
jest.mock("./index");

module.exports = {
  getApp: () => {
    const message = jest.fn();
    return {
      brain: new Map(),
      message,

      /**
       * Get the handler that the bot registers.
       * @param {Number} index Optional. The index of the handler to fetch. For
       *    Bots that register multiple handlers. This is in the order that the
       *    handlers are registered. Defaults to 0, the first handler.
       */
      getHandler: (index = 0) => {
        if (message.mock.calls.length > 0) {
          return message.mock.calls[index][
            message.mock.calls[index].length - 1
          ];
        }
        return null;
      },
    };
  },
  axios,
  utils: {
    cache,
    slack,
    tock,
  },
};
