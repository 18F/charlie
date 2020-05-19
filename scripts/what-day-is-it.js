/* This is a joke bot, in reference to how time never seems to pass since March
   2020. This is one of our coping mechanisms during the COVID-19 pandemic.
   Future maintainers, please be gentle with us. We're doing the best we can
   with what we've got.
*/

const moment = require('moment-timezone');

const march1 = moment.tz('2020-03-01T00:00:00Z', 'America/New_York');

module.exports = robot => {
  robot.respond(/what day is it/i, msg => {
    const now = moment.tz('America/New_York');

    const dow = now.format('dddd');
    const days = Math.ceil(moment.duration(now.diff(march1)).as('days'));

    msg.send(`Today is ${dow}, March ${days}, 2020`);
  });
};
