//  Description:
//    get opm status from api
//
//  Dependencies:
//    None
//
//  Commands:
//    @bot opm status
//
//  Author:
//    lauraggit

const { directMention } = require("@slack/bolt");
const axios = require("axios");
const {
  helpMessage,
  stats: { incrementStats },
} = require("../utils");

// :greenlight: :redlight: :yellowlight:
const icons = {
  Open: ":greenlight:",
  Alert: ":yellowlight:",
  Closed: ":redlight:",
};

module.exports = (robot) => {
  helpMessage.registerInteractive(
    "OPM's DC office status",
    "opm status",
    "Working in DC and want to know if the office is closed due to snow or, perhaps, raven attack? Charlie is good friends with the bots over at OPM and will gladly fetch that information for you. No more having to open a web browser all by yourself!",
  );

  robot.message(
    directMention(),
    /opm status/i,
    async ({ event: { thread_ts: thread }, say }) => {
      incrementStats("OPM status");

      try {
        const { data, status } = await axios.get(
          "https://www.opm.gov/json/operatingstatus.json",
        );
        if (status !== 200) {
          throw new Error("Invalid status");
        }
        say({
          icon_emoji: icons[data.Icon],
          text: `${data.StatusSummary} for ${data.AppliesTo}. (<${data.Url}|Read more>)`,
          thread_ts: thread,
          unfurl_links: false,
          unfurl_media: false,
        });
      } catch (e) {
        say({
          text: "I didn't get a response from OPM, so... what does <https://www.washingtonpost.com/local/weather/|Capital Weather Gang> say?",
          thread_ts: thread,
          unfurl_links: false,
          unfurl_media: false,
        });
      }
    },
  );
};
