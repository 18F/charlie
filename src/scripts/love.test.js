const {
  getApp,
  utils: { slack },
} = require("../utils/test");
const love = require("./love");

describe("love bot", () => {
  const app = getApp();

  const message = {
    client: {
      chat: {
        getPermalink: jest.fn(),
        postMessage: jest.fn(),
      },
    },
    context: {
      matches: [
        "whole message",
        "lovey part",
        "loved person",
        "everything after",
      ],
    },
    event: {
      channel: "channel id",
      ts: "message id",
      thread_ts: "thread id",
      user: "user id",
    },
    say: jest.fn(),
  };

  it("subscribes to love messages", () => {
    love(app);

    expect(app.message).toHaveBeenCalledWith(
      /^\s*(love|<3|:heart\w*:)\s+((<@[\w-]+>\s*)+)(.*)$/i,
      expect.any(Function)
    );
  });

  it("responds to loving messages", async () => {
    const handler = app.getHandler();

    message.client.chat.getPermalink.mockResolvedValue({
      permalink: "http://perma-url",
    });
    slack.getChannelID.mockResolvedValue("love channel id");

    await handler(message);

    expect(message.client.chat.postMessage).toHaveBeenCalledWith({
      channel: "love",
      icon_emoji: ":heart:",
      text: "<@user id> loves loved person! <http://perma-url|link>",
      unfurl_links: true,
    });
    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":heart:",
      text: "Yay, more love for <#love channel id>! Thanks, <@user id>!",
      thread_ts: "thread id",
    });
  });
});
