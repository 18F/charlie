// Description:
// Ask for a Q* TTS initialism to be fully expanded to its full glory
//
// pulls information from config/q-expand.csv in this repo
// that csv file got its information from two Google Doc org charts
// FAS TTS High level:
// https://docs.google.com/presentation/d/1otRbhoGRN4LfDnWpN6zZ0ymjPpTBW3t79pIiuBREkCY/edit?usp=sharing
// TTS Solutions:
// https://docs.google.com/presentation/d/10Qfq1AaQh74q76Pik99kQedvshLBo0qLWZGsH-nrV0w/edit?usp=sharing
//
// XXX somewhere there's another google doc about TTS Client Services (18f, etc.), but can't find the link now
//
//  Dependencies:
//    "csv-parse": "5.0.4"
//
//
// Commands:
//    qex[p] INITIALISM
//
//    examples:
//    qexp QUEAAD
//    qex qq2

const { parse } = require("csv-parse");

const fs = require("fs");

function getCsvData() {
  const csvData = {};
  return new Promise((resolve) => {
    fs.createReadStream("config/q-expand.csv")
      .pipe(parse({ delimiter: "," }))
      .on("data", (csvrow) => {
        csvData[csvrow[0]] = csvrow[1];
      })
      .on("end", () => {
        resolve(csvData);
      });
  });
}

function qExpander(expandThis, csvData) {
  let initialism = expandThis.toUpperCase();
  const fullResponse = [initialism];
  // flag Contractor notation endings
  const isContractor = initialism.endsWith("-C");

  // change -C to c.
  // lowercase c to disambiguate from other C endings not
  // related to contractor
  if (isContractor) {
    initialism = initialism.replace("-C", "c");
  }
  // work backwards from full initialism back on char at a time
  for (let substr = initialism.length; substr >= 1; substr -= 1) {
    let thisOne = initialism.slice(0, substr);
    // default is "dunno"
    let response = "???";
    if (thisOne.endsWith("c")) {
      thisOne = `${initialism.slice(0, substr - 1)}-C`;
      response = "Contractor";
    } else if (thisOne in csvData) {
      response = csvData[thisOne];
    }
    const bars = "|".repeat(substr - 1);
    fullResponse.push(`${bars}└──${thisOne}: ${response}`);
  }

  // return the response block
  return fullResponse.join("\n");
}

module.exports = (app) => {
  const csvData = module.exports.getCsvData();
  app.message(
    /^qexp?\s+([a-z0-9-]{1,8})$/i,
    async ({ message: { thread_ts: thread }, context, say }) => {
      const initialismSearch = context.matches[1];
      const resp = qExpander(initialismSearch, await csvData);
      const response = {
        icon_emoji: ":tts:",
        username: "Q-Expander",
        text: `\`\`\`${resp}\`\`\``,
        thread_ts: thread,
      };
      say(response);
    }
  );
};
module.exports.getCsvData = getCsvData;
