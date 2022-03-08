module.exports = (app) => {
  app.message(/ask a(11|ll)y+$/i, async ({ say }) => {
    say({
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
};
