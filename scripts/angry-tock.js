const moment = require('moment');

const TOCK_API_URL = 'https://tock.app.cloud.gov/api';

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

const getTockUsers = async robot =>
  new Promise((resolve, reject) => {
    robot
      .http(`${TOCK_API_URL}/user_data.json`)
      .header('Authorization', `Token ${process.env.HUBOT_TOCK_TOKEN}`)
      .get()((userDataErr, _, userDataBody) => {
      if (userDataErr) {
        return reject(new Error(userDataErr));
      }

      const userDataObjs = JSON.parse(userDataBody)
        .filter(u => u.current_employee && u.is_18f_employee && u.is_billable)
        .map(u => ({ user: u.user }));

      return robot
        .http(`${TOCK_API_URL}/users.json`)
        .header('Authorization', `Token ${process.env.HUBOT_TOCK_TOKEN}`)
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

  const tockUsers = await getTockUsers(robot);

  const tockSlackUsers = merge(tockUsers)
    .with(slackUsers)
    .on('email');

  return tockSlackUsers;
};

const getTockTruants = async robot => {
  const now = moment();
  while (now.format('dddd') !== 'Sunday') {
    now.subtract(1, 'day');
  }
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

module.exports = async robot => {
  const tockSlackUsers = await getTockSlackUsers(robot);
  const truants = await getTockTruants(robot);
  console.log(
    tockSlackUsers.filter(tu => truants.some(t => t.email === tu.email))
  );
};
