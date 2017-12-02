const moment = require('moment-timezone');
const scheduler = require('node-schedule');
const holidays = require('@18f/us-federal-holidays');

const TIMEZONE = process.env.TIMEZONE || 'America/New_York';
const CHANNEL = process.env.HUBOT_HOLIDAY_REMINDER_CHANNEL || 'general';

let lastRun = '';

function hasRunAlready(date) {
  return (date.format('YYYY-M-D') === lastRun);
}

function isWeekend(date) {
  const today = date.format('dddd');
  return (today === 'Saturday' || today === 'Sunday');
}

function isReportingTime(date) {
  return (date.hours() === 15 && date.minutes() === 00);
}

function getNextWeekday(date) {
  const targetDate = moment(date).add(1, 'day');
  while (targetDate.format('dddd') === 'Saturday' || targetDate.format('dddd') === 'Sunday') {
    targetDate.add(1, 'day');
  }
  return targetDate;
}

function holidayForDate(date) {
  const dateString = date.format('YYYY-M-D');
  const possibleHolidays = holidays.allForYear(date.format('YYYY')).filter(holiday => holiday.dateString === dateString);

  if (possibleHolidays.length) {
    return possibleHolidays[0];
  }
  return false;
}

function timerTick(robot, now, internalFunctions) {
  if (internalFunctions.isWeekend(now) || !internalFunctions.isReportingTime(now) || internalFunctions.hasRunAlready(now)) {
    return;
  }
  lastRun = now.format('YYYY-M-D');

  const nextWeekday = internalFunctions.getNextWeekday(now);
  const upcomingHoliday = internalFunctions.holidayForDate(nextWeekday);

  if (upcomingHoliday) {
    robot.messageRoom(CHANNEL, `@here Remember that *${nextWeekday.format('dddd')}* is a federal holiday for the observation of *${upcomingHoliday.name}*!`);
  }
}

module.exports = (robot) => {
  scheduler.scheduleJob('0 0 * * * 1-5', () => {
    timerTick(robot, moment().tz(TIMEZONE), { isReportingTime, hasRunAlready, getNextWeekday, holidayForDate });
  });
};

// Expose for testing
module.exports.timerTick = timerTick;
module.exports.isWeekend = isWeekend;
module.exports.isReportingTime = isReportingTime;
module.exports.hasRunAlready = hasRunAlready;
module.exports.getNextWeekday = getNextWeekday;
module.exports.holidayForDate = holidayForDate;
