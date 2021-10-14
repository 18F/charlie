// Description:
// Ask for a Q* TTS initialism to be fully expanded to its full glory
//
//  Dependencies:
//    "csv-parse": "4.16.3"
//
//
// Commands:
//    qex[p] INITIALISM
//
//    examples:
//    qexp QUEAAD
//    qex qq2

const parser = require("csv-parse");
const fs = require("fs");

function getCsvData() {
  const csvData = {};
  return new Promise((resolve) => {
    fs.createReadStream("config/q-expand.csv")
      .pipe(parser({ delimiter: "," }))
      .on("data", (csvrow) => {
        csvData[csvrow[0]] = csvrow[1];
      })
      .on("end", () => {
        resolve(csvData);
      });
  });
}

function qExpander(expandThis, csvData) {
  const initialism = expandThis.toUpperCase();
  const fullResponse = [initialism];
  // work backwards from full initialism back on char at a time
  for (let substr = initialism.length; substr >= 1; substr -= 1) {
    const thisOne = initialism.slice(0, substr);
    // default is "dunno"
    let response = "???";
    if (thisOne in csvData) {
      response = csvData[thisOne];
    }
    const bars = "|".repeat(substr - 1);
    fullResponse.push(`${bars}└──${thisOne}: ${response}`);
  }

  // return the response block
  return fullResponse.join("\n");
}

module.exports = (app) => {
  app.message(/^qexp?\s+([a-z0-9]{1,6})$/i, async ({ context, say }) => {
    const initialismSearch = context.matches[1];
    const csvData = await getCsvData();
    const resp = qExpander(initialismSearch, csvData);
    const response = {
      icon_emoji: ":tts:",
      username: "Q-Expander",
      text: `\`\`\`${resp}\`\`\``,
    };
    say(response);
  });
};
module.exports.getCsvData = getCsvData;
