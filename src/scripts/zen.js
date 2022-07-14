// Description:
//   Display GitHub zen message from https://api.github.com/zen API
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   zen - Display GitHub zen message
//
// Author:
//   anildigital
//
const { directMention } = require("@slack/bolt");
const axios = require("axios");
const {
  stats: { incrementStats },
} = require("../utils");

module.exports = (app) => {
  app.message(
    directMention(),
    /\bzen\b/i,
    async ({ event: { thread_ts: thread }, say }) => {
      incrementStats("zen");
      const { data } = await axios.get("https://api.github.com/zen");
      say({ text: data, thread_ts: thread });
    }
  );
};
