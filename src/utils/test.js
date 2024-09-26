const axios = require("axios");
const brain = require("../brain");
const {
  cache,
  dates,
  helpMessage,
  homepage,
  optOut,
  sample,
  slack,
  stats,
  tock,
} = require("./index");

// Mock axios and the utility functions, to make it easier for tests to use.
jest.mock("axios");
jest.mock("../brain");
jest.mock("./index");

module.exports = {
  getApp: () => {
    const action = jest.fn();
    const event = jest.fn();
    const message = jest.fn();

    return {
      action,
      brain: new Map(),
      event,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        getLevel: jest.fn(),
        info: jest.fn(),
        setLevel: jest.fn(),
        setName: jest.fn(),
        warn: jest.fn(),
      },
      message,

      /**
       * Get the action handler that the bot registers.
       * @param {Number} index Optional. The index of the handler to fetch. For
       *    Bots that register multiple handlers. This is in the order that the
       *    handlers are registered. Defaults to 0, the first handler.
       */
      getActionHandler: (index = 0) => {
        if (typeof index === "string") {
          return action.mock.calls
            .filter(([actionName]) => actionName === index)
            .pop()
            .slice(-1)
            .pop();
        }

        if (action.mock.calls.length > index) {
          return action.mock.calls[index].slice(-1).pop();
        }
        return null;
      },

      /**
       * Get the event handler that the bot registers.
       * @param {Number} index Optional. The index of the handler to fetch. For
       *    Bots that register multiple handlers. This is in the order that the
       *    handlers are registered. Defaults to 0, the first handler.
       */
      getEventHandler: (index = 0) => {
        if (event.mock.calls.length > index) {
          return event.mock.calls[index].slice(-1).pop();
        }
        return null;
      },

      /**
       * Get the handler that the bot registers.
       * @param {Number} index Optional. The index of the handler to fetch. For
       *    Bots that register multiple handlers. This is in the order that the
       *    handlers are registered. Defaults to 0, the first handler.
       */
      getHandler: (index = 0) => {
        if (message.mock.calls.length > index) {
          return message.mock.calls[index].slice(-1).pop();
        }
        return null;
      },
    };
  },
  axios,
  brain,
  utils: {
    cache,
    dates,
    helpMessage,
    homepage,
    optOut,
    sample,
    slack,
    stats,
    tock,
  },
};
