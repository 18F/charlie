const holidays = require('@18f/us-federal-holidays');
const moment = require('moment-timezone');
const scheduler = require('node-schedule');

const TOCK_API_URL = process.env.HUBOT_TOCK_API;
const TOCK_TOKEN = process.env.HUBOT_TOCK_TOKEN;

const ANGRY_TOCK_TIMEZONE =
  process.env.HUBOT_ANGRY_TOCK_TZ || 'America/New_York';
const ANGRY_TOCK_FIRST_ALERT = moment(
  process.env.HUBOT_ANGRY_TOCK_FIRST_TIME || '10:00',
  'HH:mm'
);
const ANGRY_TOCK_SECOND_ALERT = moment(
  process.env.HUBOT_ANGRY_TOCK_SECOND_TIME || '16:00',
  'HH:mm'
);

const merge = arrayOne => ({
  with: arrayTwo => ({
    on: key =>
      arrayOne
        .filter(a => arrayTwo.some(b => b[key] === a[key]))
        .map(a => ({
          ...a,
          ...(arrayTwo.find(b => b[key] === a[key]) || {})
        }))
  })
});

const getSlackUsers = async robot =>
  new Promise((resolve, reject) => {
    robot.adapter.client.web.users.list((err, response) => {
      if (err) {
        return reject(new Error(err));
      }
      return resolve(response.members);
    });
  });

const getCurrent18FTockUsers = async robot =>
  new Promise((resolve, reject) => {
    robot
      .http(`${TOCK_API_URL}/user_data.json`)
      .header('Authorization', `Token ${TOCK_TOKEN}`)
      .get()((userDataErr, _, userDataBody) => {
      if (userDataErr) {
        return reject(new Error(userDataErr));
      }

      const userDataObjs = JSON.parse(userDataBody)
        .filter(u => u.current_employee && u.is_18f_employee)
        .map(u => ({ user: u.user }));

      return robot
        .http(`${TOCK_API_URL}/users.json`)
        .header('Authorization', `Token ${TOCK_TOKEN}`)
        .get()((usersErr, response, usersBody) => {
        if (usersErr) {
          return reject(new Error(usersErr));
        }

        const users = JSON.parse(usersBody).map(u => ({
          user: u.username,
          email: u.email,
          tock_id: u.id
        }));

        const tockUsers = merge(userDataObjs)
          .with(users)
          .on('user');

        return resolve(tockUsers);
      });
    });
  });

const getTockSlackUsers = async robot => {
  const allSlackUsers = await getSlackUsers(robot);

  const slackUsers = allSlackUsers
    .filter(u => !u.is_restricted && !u.is_bot && !u.deleted)
    .map(u => ({ slack_id: u.id, name: u.real_name, email: u.profile.email }));

  const tockUsers = await getCurrent18FTockUsers(robot);

  const tockSlackUsers = merge(tockUsers)
    .with(slackUsers)
    .on('email');

  return tockSlackUsers;
};

const m = () => moment.tz(ANGRY_TOCK_TIMEZONE);

const getTockTruants = async robot => {
  const now = m();
  while (now.format('dddd') !== 'Sunday') {
    now.subtract(1, 'day');
  }
  // We're now at the nearest Sunday, but we want to go back one further to see
  // who is absent on the PREVIOUS reporting period.
  now.subtract(7, 'days');

  const reportingPeriodStart = now.format('YYYY-MM-DD');

  return new Promise((resolve, reject) => {
    robot
      .http(
        `${TOCK_API_URL}/reporting_period_audit/${reportingPeriodStart}.json`
      )
      .header('Authorization', `Token ${process.env.HUBOT_TOCK_TOKEN}`)
      .get()((err, _, truantsBody) => {
      if (err) {
        return reject(new Error(err));
      }

      return resolve(JSON.parse(truantsBody));
    });
  });
};

let shout = robot => {
  shout = async ({ calm = false } = {}) => {
    const message = {
      username: `${calm ? 'Happy' : 'Angry'} Tock`,
      icon_emoji: calm ? ':happy-tock:' : ':angrytock:',
      text: calm
        ? 'Please <https://tock.18f.gov|Tock your time>!'
        : '<https://tock.18f.gov|Tock your time>! You gotta!',
      as_user: false
    };

    const tockSlackUsers = await getTockSlackUsers(robot);
    const truants = await getTockTruants(robot);
    const slackableTruants = tockSlackUsers.filter(tu =>
      truants.some(t => t.email === tu.email)
    );

    slackableTruants.forEach(({ slack_id: slackID }) => {
      robot.messageRoom(slackID, message);
    });
  };
};

const isAngryTockDay = now => {
  const d = now || m();
  return d.format('dddd') === 'Monday' && !holidays.isAHoliday();
};

const scheduleNextShoutingMatch = ({ schedule = scheduler } = {}) => {
  const day = moment.tz(ANGRY_TOCK_TIMEZONE);

  const firstHour = ANGRY_TOCK_FIRST_ALERT.hour();
  const firstMinute = ANGRY_TOCK_FIRST_ALERT.minute();
  const firstTockShoutTime = day.clone();
  firstTockShoutTime.hour(firstHour);
  firstTockShoutTime.minute(firstMinute);
  firstTockShoutTime.second(0);

  const secondHour = ANGRY_TOCK_SECOND_ALERT.hour();
  const secondMinute = ANGRY_TOCK_SECOND_ALERT.minute();
  const secondTockShoutTime = day.clone();
  secondTockShoutTime.hour(secondHour);
  secondTockShoutTime.minute(secondMinute);
  secondTockShoutTime.second(0);

  if (isAngryTockDay(day)) {
    // If today is the normal day for Angry Tock to shout...
    if (day.isBefore(firstTockShoutTime)) {
      // ...and Angry Tock should not have shouted at all yet, schedule a calm
      // shout.
      return schedule.scheduleJob(firstTockShoutTime.toDate(), () => {
        shout({ calm: true });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }
    if (day.isAfter(firstTockShoutTime) && day.isBefore(secondTockShoutTime)) {
      // ...and Angry Tock should have shouted once, schedule an un-calm shout.
      return schedule.scheduleJob(secondTockShoutTime.toDate(), () => {
        shout({ calm: false });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }

    // ...and Angry Tock should have shouted twice already, advance a day and
    // schedule a shout for next week.
    day.add(1, 'day');
  }

  // Advance to the next shouting day
  while (!isAngryTockDay(day)) {
    day.add(1, 'day');
  }

  // Schedule a calm shout for the next shouting day.
  day.hour(firstHour);
  day.minute(firstMinute);
  day.second(0);

  return schedule.scheduleJob(day.toDate(), () => {
    shout({ calm: true });
    setTimeout(() => scheduleNextShoutingMatch(), 1000);
  });
};

module.exports = async robot => {
  if (!TOCK_API_URL || !TOCK_TOKEN) {
    robot.logger.warning(
      'AngryTock disabled: Tock API URL or access token is not set'
    );
    return;
  }

  robot.logger.info('AngryTock starting up');

  // Setup the shouty method, to create a closure around the robot object.
  shout(robot);

  scheduleNextShoutingMatch();
};
