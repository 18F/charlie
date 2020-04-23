const holidays = require('@18f/us-federal-holidays');
const moment = require('moment-timezone');
const scheduler = require('node-schedule');

const TOCK_API_URL = process.env.HUBOT_TOCK_API;
const TOCK_TOKEN = process.env.HUBOT_TOCK_TOKEN;

const ANGRY_TOCK_TIMEZONE =
  process.env.ANGRY_TOCK_TIMEZONE || 'America/New_York';
const ANGRY_TOCK_FIRST_ALERT = moment(
  process.env.ANGRY_TOCK_FIRST_TIME || '10:00',
  'HH:mm'
);
const ANGRY_TOCK_SECOND_ALERT = moment(
  process.env.ANGRY_TOCK_SECOND_TIME || '16:00',
  'HH:mm'
);

/**
 * Join two arrays on a given property. Similar to a SQL JOIN.
 * @param {Array} arrayOne first array to be merged
 */
const join = arrayOne => ({
  /**
   * @param {Array} arrayTwo second array to be merged
   */
  with: arrayTwo => ({
    /**
     * @param {string} key property to join the arrays on
     */
    on: key =>
      arrayOne
        .filter(a => arrayTwo.some(b => b[key] === a[key]))
        .map(a => ({
          ...a,
          ...(arrayTwo.find(b => b[key] === a[key]) || {})
        }))
  })
});

/**
 * Get the current time in the configured timezone.
 * @returns {Moment} A moment object representing the current time in the
 *   configured timezone.
 */
const m = () => moment.tz(ANGRY_TOCK_TIMEZONE);

/**
 * Fetch a list of Slack users in the workspace that this bot is in.
 * @async
 * @param {Object} robot Hubot robot object
 * @returns {Promise<Array<Object>>} A list of Slack users.
 */
const getSlackUsers = async robot =>
  new Promise((resolve, reject) => {
    robot.adapter.client.web.users.list((err, response) => {
      if (err) {
        return reject(new Error(err));
      }
      return resolve(response.members);
    });
  });

/**
 * Fetch a list of Tock users that are current 18F employees.
 * @async
 * @param {Object} robot Hubot robot object
 * @returns {Promise<Array<Object>>} A list of Tock users
 */
const getCurrent18FTockUsers = async robot =>
  new Promise((resolve, reject) => {
    // First get user data. This is what tells us whether users are current and
    // are 18F employees. We'll use that to filter to just relevant users.
    robot
      .http(`${TOCK_API_URL}/user_data.json`)
      .header('Authorization', `Token ${TOCK_TOKEN}`)
      .get()((userDataErr, _, userDataBody) => {
      if (userDataErr) {
        return reject(new Error(userDataErr));
      }

      // Filter only current 18F employees. Only keep the user property. This
      // is their username, and we'll use that to filter the later user list.
      const userDataObjs = JSON.parse(userDataBody)
        .filter(u => u.current_employee && u.is_18f_employee)
        .map(u => u.user);

      // Now get the list of users. This includes email addresses, which we can
      // use to associate a user to a Slack account. However, this doesn't tell
      // us whether they are currently an employee or with 18F, so we have to
      // combine these two lists together.
      return robot
        .http(`${TOCK_API_URL}/users.json`)
        .header('Authorization', `Token ${TOCK_TOKEN}`)
        .get()((usersErr, response, usersBody) => {
        if (usersErr) {
          return reject(new Error(usersErr));
        }

        // Keep just the bits we care about.
        const users = JSON.parse(usersBody)
          .filter(u => userDataObjs.includes(u.username))
          .map(u => ({
            user: u.username,
            email: u.email,
            tock_id: u.id
          }));

        return resolve(users);
      });
    });
  });

/**
 * Get the truant users for the most recent completed Tock reporting period.
 * @async
 * @param {Object} robot Hubot robot object
 * @returns {<Promise<Array<Object>>} The list of truant users
 */
const getTockTruants = async robot => {
  const now = m();
  while (now.format('dddd') !== 'Sunday') {
    now.subtract(1, 'day');
  }
  // We're now at the nearest past Sunday, but that's the start of the current
  // reporting period. We want to go back one week further to see who is truant
  // on the PREVIOUS reporting period.
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

/**
 * Get all current 18F Tock users that are also Slack users.
 * @async
 * @param {Object} robot Hubot robot object
 * @returns {Promise<Array<Object>>} A list of users that are both current 18F
 *   employees in Tock and users in Slack, joined on their email addresses.
 */
const getTockSlackUsers = async robot => {
  const allSlackUsers = await getSlackUsers(robot);

  // This shouldn't filter anyone who would be in the current 18F Tock users,
  // but there's no good reason we can't go ahead and do this filter to be safe.
  const slackUsers = allSlackUsers
    .filter(u => !u.is_restricted && !u.is_bot && !u.deleted)
    .map(u => ({ slack_id: u.id, name: u.real_name, email: u.profile.email }));

  const tockUsers = await getCurrent18FTockUsers(robot);

  const tockSlackUsers = join(tockUsers)
    .with(slackUsers)
    .on('email');

  return tockSlackUsers;
};

/**
 * Shout at all the truant users.
 * @async
 * @param {Object} options
 * @param {Boolean} options.calm Whether this is Happy Tock or Angry Tock. Angry
 *   Tock is not calm. Defaults to Angry Tock.
 */
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

/**
 * Gets whether or not a given date/time is a Angry Tock shouting day.
 * @param {Moment} now The date/time to check, as a Moment object
 * @returns {Boolean} True if the passed date/time is a good day for shouting
 */
const isAngryTockDay = now => {
  const d = now || m();
  return d.format('dddd') === 'Monday' && !holidays.isAHoliday();
};

/**
 * Schedules the next time to shout at users.
 */
const scheduleNextShoutingMatch = () => {
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
      return scheduler.scheduleJob(firstTockShoutTime.toDate(), () => {
        shout({ calm: true });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }
    if (day.isBefore(secondTockShoutTime)) {
      // ...and Angry Tock should have shouted once, schedule an un-calm shout.
      return scheduler.scheduleJob(secondTockShoutTime.toDate(), () => {
        shout({ calm: false });
        setTimeout(() => scheduleNextShoutingMatch(), 1000);
      });
    }

    // ...and Angry Tock should have shouted twice already, advance a day and
    // schedule a shout for next week.
    day.add(1, 'day');
  }

  // ...and Angry Tock should have already shouted twice today, advance to the
  // next shouting day.
  while (!isAngryTockDay(day)) {
    day.add(1, 'day');
  }

  // Schedule a calm shout for the next shouting day.
  day.hour(firstHour);
  day.minute(firstMinute);
  day.second(0);

  return scheduler.scheduleJob(day.toDate(), () => {
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
