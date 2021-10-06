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
var parser = require("csv-parse");
var fs = require("fs");
const {
  slack: { addEmojiReaction },
} = require("../utils");

function q_expander(expand_this, csvData) {
  var acronym = expand_this.toUpperCase();
  var full_response = [acronym];
  // work backwards from full acronym back on char at a time
  for (var substr = acronym.length; substr >= 1; substr--) {
    let this_one = acronym.slice(0, substr);
    // default is "dunno"
    let response = "???";
    if (this_one in csvData) {
      response = csvData[this_one];
    }
    full_response.push(
      "|".repeat(substr - 1) + "└──" + `${this_one}: ${response}`
    );
  }

  // emit the response
  console.log(full_response.join("\n"));
}

var csvData = {};
fs.createReadStream("src/scripts/q-expand.csv")
  .pipe(parser({ delimiter: "," }))
  .on("data", function (csvrow) {
    csvData[csvrow[0]] = csvrow[1];
  })
  .on("end", function () {
    // XXX first arg needs to be variable sent in from bot
    q_expander("queacc", csvData);
  });

/*
module.exports = (app) => {
  app.message(
    directMention(),
    /qex[pand] {1,6}[a-z]/i,
    async ({ mssage: {thread_ts: thread}, say }) => {

    }
};
*/
