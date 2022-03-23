const { getApp } = require("../utils/test");

const a11y = require("./a11y");

describe("ask a11y", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers the message handlers", () => {
    a11y(app);
    debugger;
    expect(app.message).toHaveBeenCalledWith(
      /ask a(11|ll)y+$/i,
      expect.any(Function)
    );
  });

  it("returns a static menu", () => {
    a11y(app);
    const handler = app.getHandler(0);
    const say = jest.fn();
    debugger;
    handler({ say });
    
    expect(say).toHaveBeenCalledWith({
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Here are some things you can type in Slack that A11yBot can respond to*"
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*ask a11y fact*"
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "_This will return a random accessibility resource or fact_"
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*ask a11y*"
          }
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "_Returns a list of commands that a11y can respond to_"
          }
        }
      ]
    });
  });
});
