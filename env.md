# Environment variables

Charlie will read its configuration from environment variables. If deployed in
a Cloud Foundry environment, it will read environment variables from an
associated custom user-provided service (CUPS) as well. Charlie will also
populate environment variables with the values defined in `.env`, if present.

CUPS variables are highest priority. `.env` variables are second. Local
variables have the lowest precedence.

| name                      | purpose                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLACK_TOKEN               | Required to connect to Slack. This is the bot user OAuth access token.                                                                                                                             |
| SLACK_SIGNING_SECRET      | Required to receive events from Slack. This is available from the Slack app configuration page, under "Basic Information."                                                                         |
| DATABASE_URL              | Required to connect to the database used to store Charlie's "brain"                                                                                                                                |
| PORT                      | What port Charlie should listen to incoming webhook requests on. Slack will call these webhooks when it receives events. Defaults to port 3000.                                                    |
| TOCK_API                  | Required for Angry and Optimistic Tock bots. If not set, those bots will not start.                                                                                                                |
| TOCK_TOKEN                | Required for Angry and Optimistic Tock bots. If not set, those bots will not start.                                                                                                                |
| ANGRY_TOCK_TIMEZONE       | The timezone used for Angry Tock notifications for truant users. Defaults to `America/New_York` if unset.                                                                                          |
| ANGRY_TOCK_FIRST_TIME     | The time of day for the first reminder to Tock truants. This is sent at the same time to all truants, based on the timezone in `ANGRY_TOCK_TIMEZONE`. Defaults to 10:00 am.                        |
| ANGRY_TOCK_SECOND_TIME    | The time of day for the second reminder to Tock truants as well as supervisors. This is sent at the same time to all truants, based on the timezone in `ANGRY_TOCK_TIMEZONE`. Defaults to 4:00 pm. |
| ANGRY_TOCK_REPORT_TO      | A comma-delimited list of channels or users to send the second truancy report to. Defaults to `#18f-supes`. Specify users with their Slack member ID (`Uxxxxxxxxxx`).                              |
| HAPPY_TOCK_REPORT_TO      | A comma-delimited list of channels or users to celebrate with if nobody is truant. Defaults to `#18f`. Specify users with their Slack member ID (`Uxxxxxxxxxx`).                                   |
| HOLIDAY_REMINDER_CHANNEL  | What channel Charlie will post upcoming holiday reminders into. Defaults to `general`. Channel name should not include a hash sign.                                                                |
| HOLIDAY_REMINDER_TIME     | What time to post holiday reminders. Defaults to 3:00 pm.                                                                                                                                          |
| HOLIDAY_REMINDER_TIMEZONE | The timezone used to determine when to post the reminder. Defaults to `America/New_York`.                                                                                                          |
| LOG_LEVEL                 | Log level. When using Docker, this is set to `debug`. Otherwise defaults to log level `info`.                                                                                                      |
