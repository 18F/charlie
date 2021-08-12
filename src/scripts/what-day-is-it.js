/* This is a joke bot, in reference to how time never seems to pass since March
   2020. This is one of our coping mechanisms during the COVID-19 pandemic.
   Future maintainers, please be gentle with us. We're doing the best we can
   with what we've got.
*/

const { directMention } = require("@slack/bolt");

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
