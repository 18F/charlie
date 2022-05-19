# OAuth scopes and Slack events

The Charlie Slack app must be configured to enable events at an HTTP endpoint.
The endpoint will be the URL created by cloud.gov at deployment (or specified in
the manifest) with `/slack/events` appended to the end.

Once events are enabled, the app must be subscribed to the following bot events:

| name             | purpose                                                                   |
| ---------------- | ------------------------------------------------------------------------- |
| app_home_opened  | Notifications when a user opens the bot's Home view                       |
| app_mention      | Notifications when a user `@mentions` it                                  |
| message.channels | Notifications for messages in public channels that it is a member of      |
| message.groups   | Notifications for messages in private channels that it is a member of     |
| message.im       | Notifications for private messages sent to the bot                        |
| message.mpim     | Notifications for messages sent to a private group that it is a member of |

The bot will also need the following OAuth scopes in order for the above events
to be sent to it:

| name                 | purpose                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| app_mentions:read    | Required for `app_mention` event                                                                                                                                                                                                                                                     |
| channels:history     | Required for `message.channels` event                                                                                                                                                                                                                                                |
| channels:read        | Required to list all public channels (and their members) in the workspace. This is used by Angry Tock, holiday reminders, love bot, and Travel team to determine the channel ID of the proper channel to post to. Also used by Tiny Tau Bot to fetch a list of users in the channel. |
| chat:write           | Required to post messages to a channel. This is used by every bot.                                                                                                                                                                                                                   |
| chat:write.customize | Required to post messages to a channel with a custom emoji or name. This is used by several bots to differentiate them.                                                                                                                                                              |
| groups:history       | Required for `message.groups` event                                                                                                                                                                                                                                                  |
| groups:read          | Required to list private channels (and their members) that Charlie is in. Used by Tiny Tau Bot to fetch the list of users in the channel.                                                                                                                                            |
| im:history           | Required for `message.im` event                                                                                                                                                                                                                                                      |
| im:read              | Required to list all channels in the workspace. This is used by Angry Tock, holiday reminders, love bot, and Travel team to determine the channel ID of the proper channel to post to.                                                                                               |
| im:write             | Required to send private messages. This is used by Angry Tock and Optimistic Tock                                                                                                                                                                                                    |
| mpim:history         | Required for `message.mpim` event                                                                                                                                                                                                                                                    |
| mpim:read            | Required to list all channels in the workspace. This is used by Angry Tock, holiday reminders, love bot, and Travel team to determine the channel ID of the proper channel to post to.                                                                                               |
| mpim:write           | Required to send multiparty private messages. This is used by Coffeemate.                                                                                                                                                                                                            |
| reactions:write      | Required to add emoji reactions to messages. This is used by Coffemate and Inclusion bot.                                                                                                                                                                                            |
| users:read           | Required to list users and fetch metadata about them. This is used by Angry Tock, Optimistic Tock, and Tau bot.                                                                                                                                                                      |
| users:read.email     | Required to include users' email addresses when listing them. This is used by Angry Tock and Optimistic Tock.                                                                                                                                                                        |
