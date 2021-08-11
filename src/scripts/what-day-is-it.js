/* This is a joke bot, in reference to how time never seems to pass since March
   2020. This is one of our coping mechanisms during the COVID-19 pandemic.
   Future maintainers, please be gentle with us. We're doing the best we can
   with what we've got.
*/

const { Temporal, toTemporalInstant, Intl } = require("@js-temporal/polyfill");
const { directMention } = require("@slack/bolt");

// This will be able to go away when the polyfill is replaced with a native
// implementation, probably sometime in 2022. The polyfill is not for production
// use anyway, so all of this is just playing, getting ready.
// eslint-disable-next-line no-extend-native
Date.prototype.toTemporalInstant = toTemporalInstant;

const lastOfMarch2020 = Temporal.PlainDate.from({
  year: 2021,
  month: 1,
  day: 19,
});

const fmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

module.exports = (app) => {
  app.message(directMention(), /what day is it/i, ({ say }) => {
    const today = Temporal.PlainDate.from(
      Temporal.Now.instant().toZonedDateTime({
        calendar: "iso8601",
        timeZone: "America/New_York",
      })
    );

    const { days } = today.since(lastOfMarch2020);

    say(
      `Today is ${fmt.format(
        today
      )}. It has been ${days} days since March 2020.`
    );
  });
};
