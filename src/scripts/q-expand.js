// Description:
// Ask for a Q* TTS acronym to be fully expanded to its full glory
//
//  Dependencies:
//    "csv-parse": "4.16.3"
//
//
// Commands:
//    qex[pand] ACRONYM
//
//    example:
//    qexp QUEAAD

const { directMention } = require("@slack/bolt");
const parser = require("csv-parse");
const fs = require("fs");

function qExpander(expandThis, csvData) {
  const acronym = expandThis.toUpperCase();
  const fullResponse = [acronym];
  let substr = 0;
  // work backwards from full acronym back on char at a time
  for (substr = acronym.length; substr >= 1; substr -= 1) {
    const thisOne = acronym.slice(0, substr);
    // default is "dunno"
    let response = "???";
    if (thisOne in csvData) {
      response = csvData[thisOne];
    }
    const bars = "|".repeat(substr - 1);
    fullResponse.push(`${bars}└──${thisOne}: ${response}`);
  }

  // emit the response
  return fullResponse.join("\n");
}

/*
var csvData = {};
fs.createReadStream("src/scripts/q-expand.csv")
  .pipe(parser({ delimiter: "," }))
  .on("data", function (csvrow) {
    csvData[csvrow[0]] = csvrow[1];
  })
  .on("end", function () {
    // XXX first arg needs to be variable sent in from bot
    qExpander("queacc", csvData);
  });
*/

module.exports = (app) => {
  app.message(
    directMention(),
    /qex\s+([a-z]{1,6})/i,
    async ({ context, event: { thread_ts: thread }, say }) => {
      const acronymSearch = context.matches[1];

      const csvData = {};
      let resp = "";

      fs.createReadStream("src/scripts/q-expand.csv")
        .pipe(parser({ delimiter: "," }))
        .on("data", (csvrow) => {
          csvData[csvrow[0]] = csvrow[1];
        })
        .on("end", () => {
          resp = qExpander(acronymSearch, csvData);
        });

      const response = {
        icon_emoji: ":mindblown:",
        thread_ts: thread,
        text: `\`\`\`${resp}\`\`\``,
      };
      say(response);
    }
  );
};
