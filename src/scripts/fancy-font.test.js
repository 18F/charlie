const { getApp } = require("../utils/test");
const fancyFont = require("./fancy-font");

describe("fancy-font", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('subscribes to "fancy font" messages', () => {
    fancyFont(app);
    expect(app.message).toHaveBeenCalledWith(
      /^fancy font (.*)$/i,
      expect.any(Function),
    );
  });

  it("converts ASCII Latin characters to fancy font", () => {
    const message = {
      context: {
        matches: [
          "fancy font whole message",
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz",
        ],
      },
      message: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    fancyFont(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":fancy-capybara:",
      text: "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩 𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃",
      thread_ts: "thread timestamp",
      username: "Fancy Charlie",
    });
  });

  it("hands back non-ASCII Latin characters without changing them", () => {
    const message = {
      context: { matches: ["fancy font ABC abc å∫ç∂´ƒ©", "ABC abc å∫ç∂´ƒ©"] },
      message: { thread_ts: "another thread" },
      say: jest.fn(),
    };

    fancyFont(app);
    const handler = app.getHandler();
    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":fancy-capybara:",
      text: "𝓐𝓑𝓒 𝓪𝓫𝓬 å∫ç∂´ƒ©",
      thread_ts: "another thread",
      username: "Fancy Charlie",
    });
  });
});
