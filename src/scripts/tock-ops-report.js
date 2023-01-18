const holidays = require("@18f/us-federal-holidays");
const moment = require("moment-timezone");
const scheduler = require("node-schedule");
const {
  dates: { getCurrentWorkWeek },
  slack: { postMessage },
  tock: { get18FUsersWhoHaveNotTocked },
} = require("../utils");

module.exports = (app, config = process.env) => {
  if (!config.TOCK_API || !config.TOCK_TOKEN) {
    app.logger.warn(
      "Tock compliance report disabled: Tock API URL or access token is not set"
    );
    return;
  }

  const TRUANT_REPORT_TIMEZONE =
    config.ANGRY_TOCK_TIMEZONE || "America/New_York";
  const TRUANT_REPORT_TIME = moment(
    config.ANGRY_TOCK_SECOND_TIME || "16:00",
    "HH:mm"
  );

  const TRUANT_REPORT_TO = (config.ANGRY_TOCK_REPORT_TO || "#18f-supes").split(
    ","
  );

  const getNextReportTime = () => {
    // The reporting time for the current work week would be the first day of
    // that working week.
    const reportTime = moment
      .tz(getCurrentWorkWeek()[0], TRUANT_REPORT_TIMEZONE)
      .hour(TRUANT_REPORT_TIME.hour())
      .minute(TRUANT_REPORT_TIME.minute())
      .second(0);

    // If we've already passed the report time for the current work week,
    // jump to the next Monday, and then scoot forward over any holidays.
    if (reportTime.isBefore(moment())) {
      reportTime.add(7, "days").day(1);
      while (holidays.isAHoliday(reportTime.toDate())) {
        reportTime.add(1, "day");
      }
    }

    return reportTime;
  };

  const report = async () => {
    const untockedUsers = await get18FUsersWhoHaveNotTocked(
      moment.tz(TRUANT_REPORT_TIMEZONE)
    );

    if (untockedUsers.length > 0) {
      const untockedList = untockedUsers
        .map(({ username }) => `• ${username}`)
        .join("\n");

      const tockComplianceReport = {
        attachments: [
          {
            fallback: untockedList,
            color: "#FF0000",
            text: untockedList,
          },
        ],
        username: "Angry Tock",
        icon_emoji: ":angrytock:",
        text: "*The following users have not yet reported their time on Tock:*",
      };

      await Promise.all(
        TRUANT_REPORT_TO.map((channel) =>
          postMessage({ ...tockComplianceReport, channel })
        )
      );
    }
  };

  const scheduleNextReport = () => {
    const when = getNextReportTime();

    scheduler.scheduleJob(when.toDate(), async () => {
      await report();

      // Once we've run the report, wait a minute and then schedule the next
      setTimeout(() => {
        scheduleNextReport();
      }, 60 * 1000).unref();
    });
  };

  scheduleNextReport();
};
