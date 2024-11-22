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
    // Go very slightly ahead of midnight because at exactly midnight, the diff
    // rounds to exactly one day, so the ceil() logic doesn't yet count it as an
    // extra day. But a millisecond later, it will. This seems fine. Millisecond
    // precision is plenty.
    jest.setSystemTime(Date.parse("2020-03-02T00:00:01Z"));

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

  it("is correct in the further future from March 1, 2020", () => {
    // Go very slightly ahead of midnight because at exactly midnight, the diff
    // rounds to exactly one day, so the ceil() logic doesn't yet count it as an
    // extra day. But a millisecond later, it will. This seems fine. Millisecond
    // precision is plenty.
    jest.setSystemTime(Date.parse("2024-10-15T00:00:01Z"));

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
    jest.setSystemTime(Date.parse("2025-09-10T12:00:00Z"));

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
