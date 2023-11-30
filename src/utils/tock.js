const axios = require("axios");
const { cache } = require("./cache");
const { getSlackUsers } = require("./slack");

const tockAPI = axios.create({
  baseURL: process.env.TOCK_API,
  headers: { Authorization: `Token ${process.env.TOCK_TOKEN}` },
});

const getFromTock = async (url) =>
  cache(`tock fetch: ${url}`, 10, async () => {
    const { data } = await tockAPI.get(url);
    return data;
  });

/**
 * Fetch a list of Tock users that are current 18F employees.
 * @async
 * @returns {Promise<Array<Object>>} A list of Tock users
 */
const getCurrent18FTockUsers = async () => {
  // First get user data. This is what tells us whether users are current and
  // are 18F employees. We'll use that to filter to just relevant users.
  const userDataBody = await getFromTock(`/user_data.json`);

  // Filter only current 18F employees. Only keep the user property. This
  // is their username, and we'll use that to filter the later user list.
  const userDataObjs = userDataBody
    .filter((u) => u.is_active && u.current_employee && u.is_18f_employee)
    .map((u) => u.user);

  // Now get the list of users. This includes email addresses, which we can
  // use to associate a user to a Slack account. However, this doesn't tell
  // us whether they are currently an employee or with 18F, so we have to
  // combine these two lists together.
  const usersBody = await getFromTock(`/users.json`);

  // Keep just the bits we care about.
  const users = usersBody
    .filter((u) => userDataObjs.includes(u.username))
    .map((u) => ({
      user: u.username,
      email: u.email,
      tock_id: u.id,
    }));

  return users;
};

/**
 * Get the 18F users who have not recorded their time in Tock for a given time
 * period.
 * @async
 * @param {Object} now Moment object representing the current time.
 * @param {Number} weeksAgo How many weeks in the past to check. Defaults to 1.
 * @returns {<Promise<Array<Object>>} The list of users who have not Tocked
 */
const get18FUsersWhoHaveNotTocked = async (now, weeksAgo = 1) => {
  while (now.format("dddd") !== "Sunday") {
    now.subtract(1, "day");
  }
  // We're now at the nearest past Sunday, but that's the start of the
  // current reporting period. Now back up the appropriate number of weeks.
  now.subtract(7 * weeksAgo, "days");

  const reportingPeriodStart = now.format("YYYY-MM-DD");

  const tockUsers = await getCurrent18FTockUsers();

  const allUnTockedUsers = await getFromTock(
    `/reporting_period_audit/${reportingPeriodStart}.json`,
  );

  return allUnTockedUsers.filter((user) =>
    tockUsers.some((tockUser) => tockUser.tock_id === user.id),
  );
};

/**
 * Get all current 18F Tock users that are also Slack users.
 * @async
 * @returns {Promise<Array<Object>>} A list of users that are both current 18F
 *   employees in Tock and users in Slack, joined on their email addresses.
 */
const get18FTockSlackUsers = async () => {
  const allSlackUsers = await getSlackUsers();

  // This shouldn't filter anyone who would be in the current 18F Tock users,
  // but there's no good reason we can't go ahead and do this filter to be safe.
  const slackUsers = allSlackUsers
    .filter((u) => !u.is_restricted && !u.is_bot && !u.deleted)
    .map((u) => ({
      slack_id: u.id,
      name: u.real_name,
      email: u.profile.email,
      tz: u.tz,
    }));

  const tockUsers = await getCurrent18FTockUsers();

  const tockSlackUsers = tockUsers
    .filter((tock) =>
      slackUsers.some(
        (slackUser) =>
          slackUser.email?.toLowerCase() === tock.email?.toLowerCase(),
      ),
    )
    .map((tock) => ({
      ...tock,
      ...slackUsers.find(
        (slackUser) =>
          slackUser.email?.toLowerCase() === tock.email?.toLowerCase(),
      ),
    }));

  return tockSlackUsers;
};

module.exports = {
  getCurrent18FTockUsers,
  get18FUsersWhoHaveNotTocked,
  get18FTockSlackUsers,
};
