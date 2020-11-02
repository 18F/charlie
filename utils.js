const slack = require("@slack/client");

module.exports = {
  setup: (robot) => {
    const webAPI = new slack.WebClient(robot.adapter.options.token);

    const addEmojiReaction = async (reaction, channelID, messageID) => {
      return new Promise((resolve, reject) => {
        robot.adapter.client.web.reactions.add(
          reaction,
          {
            channel: channelID,
            timestamp: messageID,
          },
          (err, response) => {
            if (err) {
              return reject(err);
            }
            if (!response.ok) {
              return reject(new Error("Unknown error with Slack API"));
            }
            return resolve();
          }
        );
      });
    };

    /**
     * Convenience method for doing HTTP GET requests from Tock
     * @async
     * @param {String} url The URL to fetch
     * @returns {Promise<Object>} The JSON-parsed body.
     */
    const getFromTock = async (url) =>
      new Promise((resolve, reject) => {
        robot
          .http(`${process.env.HUBOT_TOCK_API}${url}`)
          .header("Authorization", `Token ${process.env.HUBOT_TOCK_TOKEN}`)
          .get()((err, _, body) => {
          if (err) {
            return reject(err);
          }
          return resolve(JSON.parse(body));
        });
      });

    /**
     * Fetch a list of Tock users that are current 18F employees.
     * @async
     * @param {Object} robot Hubot robot object
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
     * Get the 18F truant users for the most recent completed Tock reporting
     * period.
     * @async
     * @param {Object} robot Hubot robot object
     * @param {Number} weeksAgo How many weeks in the past to check. Defaults to 1.
     * @returns {<Promise<Array<Object>>} The list of truant users
     */
    const get18FTockTruants = async (now, weeksAgo = 1) => {
      while (now.format("dddd") !== "Sunday") {
        now.subtract(1, "day");
      }
      // We're now at the nearest past Sunday, but that's the start of the
      // current reporting period. Now back up the appropriate number of weeks.
      now.subtract(7 * weeksAgo, "days");

      const reportingPeriodStart = now.format("YYYY-MM-DD");

      const tockUsers = await getCurrent18FTockUsers();

      const allTruants = await getFromTock(
        `/reporting_period_audit/${reportingPeriodStart}.json`
      );

      return allTruants.filter((truant) =>
        tockUsers.some((tockUser) => tockUser.tock_id === truant.id)
      );
    };

    /**
     * Fetch a list of Slack users in the workspace that this bot is in.
     * @async
     * @param {Object} robot Hubot robot object
     * @returns {Promise<Array<Object>>} A list of Slack users.
     */
    const getSlackUsers = async () => {
      return new Promise((resolve, reject) => {
        robot.adapter.client.web.users.list((err, response) => {
          if (err) {
            return reject(err);
          }
          return resolve(response.members);
        });
      });
    };

    const getSlackUsersInConversation = async (conversationID) => {
      return new Promise((resolve, reject) => {
        robot.adapter.client.web.conversations.members(
          conversationID,
          async (err, response) => {
            if (err) {
              return reject(err);
            }

            try {
              const channelUsers = response.members;
              const allUsers = await getSlackUsers();

              return resolve(
                allUsers.filter(({ id }) => channelUsers.includes(id))
              );
            } catch (e) {
              return reject(e);
            }
          }
        );
      });
    };

    /**
     * Get all current 18F Tock users that are also Slack users.
     * @async
     * @param {Object} robot Hubot robot object
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
          slackUsers.some((slackUser) => slackUser.email === tock.email)
        )
        .map((tock) => ({
          ...tock,
          ...slackUsers.find((slackUser) => slackUser.email === tock.email),
        }));

      return tockSlackUsers;
    };
    const postEphemeralMessage = async (message) =>
      new Promise((resolve, reject) => {
        webAPI.chat.postEphemeral(message, (err, response) => {
          if (err) {
            return reject(err);
          }
          if (!response.ok) {
            return reject(new Error("Unknown error with Slack API"));
          }
          return resolve();
        });
      });

    return {
      addEmojiReaction,
      tock: {
        getCurrent18FTockUsers,
        getFromTock,
        get18FTockSlackUsers,
        get18FTockTruants,
      },
      getSlackUsers,
      getSlackUsersInConversation,
      postEphemeralMessage,
    };
  },
};
