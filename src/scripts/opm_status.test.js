const { getApp } = require("../utils/test");
const opm = require("./opm_status");

describe("OPM status for DC-area offices", () => {
  const app = getApp();

  const message = {
    event: { thread_ts: "thread id" },
    say: jest.fn(),
  };

  const json = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    fetch.mockResolvedValue({ json });
  });

  it("registers a listener", () => {
    opm(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /opm status/i,
      expect.any(Function),
    );
  });

  it("handles the case where it doesn't get a response", async () => {
    opm(app);
    const handler = app.getHandler();

    fetch.mockRejectedValue("error");

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      text: "I didn't get a response from OPM, so... what does <https://www.washingtonpost.com/local/weather/|Capital Weather Gang> say?",
      thread_ts: "thread id",
      unfurl_links: false,
      unfurl_media: false,
    });
  });

  it("handles a successful response", async () => {
    opm(app);
    const handler = app.getHandler();

    json.mockResolvedValue({
      AppliesTo: "applies to",
      Icon: "Open",
      StatusSummary: "summary",
      Url: "http://url",
    });

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":greenlight:",
      text: "summary for applies to. (<http://url|Read more>)",
      thread_ts: "thread id",
      unfurl_links: false,
      unfurl_media: false,
    });
  });
});
