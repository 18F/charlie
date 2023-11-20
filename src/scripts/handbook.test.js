const {
  axios,
  getApp,
  utils: {
    slack: { postEphemeralResponse },
  },
} = require("../utils/test");
const handbook = require("./handbook");

describe("TTS Handbook search", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("subscribes to the right message", () => {
    handbook(app);
    expect(app.message).toHaveBeenCalledWith(
      /^@?handbook (.+)$/i,
      expect.any(Function),
    );
  });

  describe("it handles bot triggers", () => {
    const message = {
      context: { matches: [null, null, "search string"] },
      event: { thread_ts: undefined, ts: 150 },
      say: jest.fn(),
    };

    let handler;
    beforeEach(() => {
      handbook(app);
      handler = app.getHandler();

      message.context.matches[2] = "search string";
    });

    it("gracefully responds if there is an error", async () => {
      axios.get.mockRejectedValue();
      await handler(message);

      expect(postEphemeralResponse).toHaveBeenCalledWith(message, {
        icon_emoji: ":tts:",
        username: "TTS Handbook",
        text: "Something went wrong trying to search the Handbook. Please try later!",
      });
    });

    it("converts characters accordingly before putting them in the search URL", async () => {
      message.context.matches[2] = "”some ’search‘ goes here“";
      await handler(message);

      expect(axios.get).toHaveBeenCalledWith(
        "https://search.usa.gov/search/?utf8=no&affiliate=tts-handbook&format=json&query=%22some%20'search'%20goes%20here%22",
      );
    });

    describe("handles search results coming from search.gov", () => {
      describe("when the triggering message is not already in a thread", () => {
        beforeEach(() => {
          message.event.thread_ts = undefined;
        });

        it("and there are no search results", async () => {
          axios.get.mockResolvedValue({ data: { results: [] } });
          await handler(message);

          expect(message.say).toHaveBeenCalledWith({
            icon_emoji: ":tts:",
            username: "TTS Handbook",
            text: `I couldn't find any results for "search string"`,
            thread_ts: 150,
          });
        });

        it("and there are some results", async () => {
          axios.get.mockResolvedValue({
            data: {
              results: [
                { body: "this is result #1", link: "link1", title: "result 1" },
                { body: "this is result #2", link: "link2", title: "result 2" },
                { body: "this is result #3", link: "link3", title: "result 3" },
                { body: "this is result #4", link: "link4", title: "result 4" },
                { body: "this is result #5", link: "link5", title: "result 5" },
              ],
            },
          });
          await handler(message);

          expect(message.say).toHaveBeenCalledWith({
            icon_emoji: ":tts:",
            username: "TTS Handbook",
            thread_ts: 150,
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: 'Handbook search results for "search string"',
                },
              },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "<link1|result 1>\nthis is result #1",
                },
              },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: "link1" }],
              },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "<link2|result 2>\nthis is result #2",
                },
              },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: "link2" }],
              },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "<link3|result 3>\nthis is result #3",
                },
              },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: "link3" }],
              },
            ],
          });
        });
      });

      describe("when the triggering message is in a thread", () => {
        beforeEach(() => {
          message.event.thread_ts = 300;
        });

        it("and there are no search results", async () => {
          axios.get.mockResolvedValue({ data: { results: [] } });
          await handler(message);

          expect(message.say).toHaveBeenCalledWith({
            icon_emoji: ":tts:",
            username: "TTS Handbook",
            text: `I couldn't find any results for "search string"`,
            thread_ts: 300,
          });
        });

        it("and there are some results", async () => {
          axios.get.mockResolvedValue({
            data: {
              results: [
                { body: "this is result #1", link: "link1", title: "result 1" },
                { body: "this is result #2", link: "link2", title: "result 2" },
                { body: "this is result #3", link: "link3", title: "result 3" },
                { body: "this is result #4", link: "link4", title: "result 4" },
                { body: "this is result #5", link: "link5", title: "result 5" },
              ],
            },
          });
          await handler(message);

          expect(message.say).toHaveBeenCalledWith({
            icon_emoji: ":tts:",
            username: "TTS Handbook",
            thread_ts: 300,
            blocks: [
              {
                type: "header",
                text: {
                  type: "plain_text",
                  text: 'Handbook search results for "search string"',
                },
              },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "<link1|result 1>\nthis is result #1",
                },
              },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: "link1" }],
              },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "<link2|result 2>\nthis is result #2",
                },
              },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: "link2" }],
              },
              { type: "divider" },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "<link3|result 3>\nthis is result #3",
                },
              },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: "link3" }],
              },
            ],
          });
        });
      });
    });
  });
});
