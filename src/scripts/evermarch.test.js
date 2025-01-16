const moment = require("moment-timezone");
const { getApp } = require("../utils/test");
const evermarch = require("./evermarch");

describe("The Evermarch", () => {
  const app = getApp();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(0);
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('subscribes to "evermarch" messages', () => {
    evermarch(app);
    expect(app.message).toHaveBeenCalledWith(
      /evermarch/i,
      expect.any(Function),
    );
  });

  it("is correct starting March 2, 2020", () => {
    jest.setSystemTime(
      moment.tz("2020-03-02T00:00:00", "America/New_York").toDate(),
    );

    const message = {
      message: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    evermarch(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":calendar-this-is-fine:",
      text: "Today is March 2, 2020, in the Evermarch reckoning.",
      thread_ts: "thread timestamp",
    });
  });

  it("is correct at the very end of March 2, 2020", () => {
    jest.setSystemTime(
      moment.tz("2020-03-02T23:59:59", "America/New_York").toDate(),
    );

    const message = {
      message: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    evermarch(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":calendar-this-is-fine:",
      text: "Today is March 2, 2020, in the Evermarch reckoning.",
      thread_ts: "thread timestamp",
    });
  });

  it("is correct at the very start of March 3, 2020", () => {
    jest.setSystemTime(
      moment.tz("2020-03-03T00:00:00", "America/New_York").toDate(),
    );

    const message = {
      message: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    evermarch(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":calendar-this-is-fine:",
      text: "Today is March 3, 2020, in the Evermarch reckoning.",
      thread_ts: "thread timestamp",
    });
  });

  it("is correct in the further future from March 1, 2020", () => {
    jest.setSystemTime(
      moment.tz("2024-10-15T01:00:00", "America/New_York").toDate(),
    );

    const message = {
      message: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    evermarch(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":calendar-this-is-fine:",
      text: "Today is March 1690, 2020, in the Evermarch reckoning.",
      thread_ts: "thread timestamp",
    });
  });

  it("is gets to March 2020, 2020, on the expected date", () => {
    jest.setSystemTime(
      moment.tz("2025-09-10T00:00:00", "America/New_York").toDate(),
    );

    const message = {
      message: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    evermarch(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":calendar-this-is-fine:",
      text: "Today is March 2020, 2020, in the Evermarch reckoning.",
      thread_ts: "thread timestamp",
    });
  });
});
