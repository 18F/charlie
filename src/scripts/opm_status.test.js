const { axios, getApp } = require("../utils/test");
const opm = require("./opm_status");

describe("OPM status for DC-area offices", () => {
  const app = getApp();

  const message = {
    event: { thread_ts: "thread id" },
    say: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers a listener", () => {
    opm(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /opm status/i,
      expect.any(Function)
    );
  });

  it(`handles the case where it doesn't get a response`, async () => {
    opm(app);
    const handler = app.getHandler();

    axios.get.mockRejectedValue("error");

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      text:
        "I didn't get a response from OPM, so... what does Capital Weather Gang say?",
      thread_ts: "thread id",
    });
  });

  it("rejects on a non-200 status code", async () => {
    opm(app);
    const handler = app.getHandler();

    axios.get.mockResolvedValue({ data: null, status: 400 });

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      text:
        "I didn't get a response from OPM, so... what does Capital Weather Gang say?",
      thread_ts: "thread id",
    });
  });

  it("handles a successful response", async () => {
    opm(app);
    const handler = app.getHandler();

    axios.get.mockResolvedValue({
      data: {
        AppliesTo: "applies to",
        Icon: "Open",
        StatusSummary: "summary",
        Url: "http://url",
      },
      status: 200,
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
