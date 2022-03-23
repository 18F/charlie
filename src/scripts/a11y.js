const fs = require("fs");

const menu = {
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
    }
  
const data = JSON.parse(fs.readFileSync("config/a11ybot-resources.json"));

function createMenuElement(element) {
  const elementName = {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": element
    },
  };

  const elementDescription = {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": `_Returns accessibility resources about_ ${  element}`
    }
  };
  return [elementName, elementDescription];
};

function createFullMenu() {
  let newMenu = menu.blocks
  // eslint-disable-next-line no-return-assign
  data.forEach( element => newMenu = newMenu.concat(createMenuElement(element.category)) );
  console.log(newMenu)
  debugger;
  //console.log(createMenuElement(data[0]["category"]))
  return newMenu;
};

module.exports = (app) => {
  app.message(/ask a(11|ll)y+$/i, async ({ say }) => {
    //categories.forEach( category => menu["blocks"].concat(categories) )
    say({blocks: createFullMenu()});
  });
};
