const aws = require("aws-sdk");
const cfenv = require("cfenv");
const {
  getApp,
  utils: {
    slack: { getChannelID },
  },
} = require("../utils/test");

jest.mock("aws-sdk");
jest.mock("cfenv");

describe("the hug bot", () => {
  const app = getApp();
  const getServiceCreds = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    cfenv.getAppEnv.mockReturnValue({ getServiceCreds });

    getServiceCreds.mockReturnValue({
      access_key_id: "access key id",
      bucket: "bucket",
      region: "region",
      secret_access_key: "secret access key",
    });
  });

  const load = async () =>
    new Promise((resolve) => {
      jest.isolateModules(() => {
        const module = require("./hugme"); // eslint-disable-line global-require
        resolve(module);
      });
    });

  it("doesn't provide a handler if the S3 credentials are unset", async () => {
    getServiceCreds.mockReturnValue(null);
    const bot = await load();
    bot(app);

    expect(app.message).not.toHaveBeenCalled();
  });

  it("sets up handlers if S3 credentials are set", async () => {
    const bot = await load();
    bot(app);

    expect(app.message.mock.calls.length).toBe(2);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /hug me/i,
      expect.any(Function)
    );

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /hug bomb( (\d+))?/i,
      expect.any(Function)
    );
  });

  it("handles a single hug request", async () => {
    const bot = await load();
    bot(app);
    jest.spyOn(bot, "hugBomb").mockReturnValue({});

    const handler = app.getHandler();
    handler("message");

    expect(bot.hugBomb).toHaveBeenCalledWith(1, "message");
  });

  it("handles a multi-hug request", async () => {
    const bot = await load();
    bot(app);
    jest.spyOn(bot, "hugBomb").mockReturnValue({});

    const handler = app.getHandler(1);
    const message = {
      context: { matches: ["whole", "number with spaces", 30] },
      other: "stuff",
    };
    handler(message);

    // We expect the context part of the message to be consumed by the handler
    // and not passed into the hugBomb method.
    expect(bot.hugBomb).toHaveBeenCalledWith(30, { other: "stuff" });
  });

  it("can't do the hugs if there's an S3 error", async () => {
    const listObjects = jest.fn().mockImplementation((_, callback) => {
      callback("error", null);
    });

    aws.S3.mockImplementation(() => ({ listObjects }));

    const bot = await load();
    bot(app);

    const say = jest.fn();
    await bot.hugBomb(5, { say });

    expect(say).toHaveBeenCalledWith("Error retrieving images: error");
  });

  it("hugs the hugs", async () => {
    getChannelID.mockResolvedValue("channel id");

    const listObjects = jest.fn().mockImplementation((_, callback) => {
      callback(null, {
        Contents: [
          { Key: "url1" },
          { Key: "url2" },
          { Key: "url3" },
          { Key: "url4" },
          { Key: "url5" },
        ],
      });
    });

    jest.spyOn(global.Math, "random").mockReturnValue(0);

    aws.S3.mockImplementation(() => ({ listObjects }));

    const bot = await load();
    bot(app);

    const say = jest.fn();
    await bot.hugBomb(5, { say });

    expect(listObjects).toHaveBeenCalledWith(
      { Bucket: "bucket" },
      expect.any(Function)
    );
    expect(say).toHaveBeenCalledWith({
      blocks: [
        {
          type: "image",
          title: { type: "plain_text", text: "Please enjoy this warm hug" },
          image_url: "https://s3-region.amazonaws.com/bucket/url1?rnd=0",
          alt_text: "Someone giving you a nice hug",
        },
        {
          type: "image",
          title: { type: "plain_text", text: "Please enjoy this warm hug" },
          image_url: "https://s3-region.amazonaws.com/bucket/url2?rnd=0",
          alt_text: "Someone giving you a nice hug",
        },
        {
          type: "image",
          title: { type: "plain_text", text: "Please enjoy this warm hug" },
          image_url: "https://s3-region.amazonaws.com/bucket/url3?rnd=0",
          alt_text: "Someone giving you a nice hug",
        },
        {
          type: "image",
          title: { type: "plain_text", text: "Please enjoy this warm hug" },
          image_url: "https://s3-region.amazonaws.com/bucket/url4?rnd=0",
          alt_text: "Someone giving you a nice hug",
        },
        {
          type: "image",
          title: { type: "plain_text", text: "Please enjoy this warm hug" },
          image_url: "https://s3-region.amazonaws.com/bucket/url5?rnd=0",
          alt_text: "Someone giving you a nice hug",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              "_If you would like to be added, send a picture in <#channel id>_",
          },
        },
      ],
    });
  });
});
