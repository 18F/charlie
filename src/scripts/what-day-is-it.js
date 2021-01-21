/* This is a joke bot, in reference to how time never seems to pass since March
   2020. This is one of our coping mechanisms during the COVID-19 pandemic.
   Future maintainers, please be gentle with us. We're doing the best we can
   with what we've got.
*/

const { directMention } = require("@slack/bolt");
const moment = require("moment-timezone");

const endOfMarch = moment.tz("2021-01-19T23:59:59Z", "America/New_York");

module.exports = (app) => {
  app.message(directMention(), /what day is it/i, ({ say }) => {
    const now = moment.tz("America/New_York");
    const date = now.format("dddd, MMMM Do, YYYY");
    const days = Math.ceil(moment.duration(now.diff(endOfMarch)).as("days"));

    say(`Today is ${date}. It has been ${days} days since March 2020.`);
  });
};
