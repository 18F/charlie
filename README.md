# Charlie - 18F's Plastic Pal That's Fun to Be With

A Slack app bot used within 18F for fun and work.

## What all it can do

`coffee me`
Charlie will add you to the queue for virtual coffee, or if someone else is
already in the queue, Charlie will match you up and send you each a DM!

`@charlie define <term>` or `@charlie glossary <term>`  
Charlie will attempt to look the term up in the
[18F Procurement Glossary](https://github.com/18f/procurement-glossary)
and report what it finds

`@charlie hug me` or `@charlie hug bomb <number>`  
Charlie will send you a picture of a hug-offering colleague, or several!

`love @someone for the thing` (or :heart: or `<3` them)  
Charlie will exclaim about even more love, and will post in the #love channel

`@charlie opm status`  
Charlie will check with OPM about whether or not DC offices are open today

`@charlie set tock <tock line>` or `@charlie set tock line <tock line>`  
Charlie will associate the current channel to the given tock line

`@charlie tock` or `@charlie tock line`  
Charlie will tell you what tock line is associated with the current channel, if any

`giraffe/dag/cat fact`
Charlie will tell you something fascinating.

`@charlie when is the next holiday?`
Charlie will tell you when the next federal holiday is

Plus more! Try sending a DM to Charlie with `help` for a full list!

## Running Charlie locally

Because Charlie is a Slack App (rather than a legacy bot integration), you'll
need to either have access to a Slack instance where you can create a new app or
get a token and signing secret for an existing app instance. Drop by
[#bots](https://app.slack.com/client/T025AQGAN/C02FPFGBG) in Slack to get more
details about creating a new app or using an existing one. If you create a new
one, see below about configuring OAuth scopes and Slack events.

The easiest way to test Charlie locally is using Docker. First, create a `.env`
file (see the `.env-sample` for reference) that sets, at minimum, the
`SLACK_TOKEN` and `SLACK_SIGNING_SECRET` variables. (See the configuration
section on environment variables below for a list of all the variables you can
set.) Then, run `docker-compose up`. This will get all of Charlie's dependencies
installed, setup a redis container, hook up Charlie and redis, and start
Charlie up. In this configuration, Charlie is run using
[nodemon](https://npm.im/nodemon), so it will automatically restart if you make
any code changes.

If you don't want to use Docker, you can run `npm install` from the root
directory, set your `SLACK_TOKEN` and `SLACK_SIGNING_SECRET` environment
variables, and then run `npm start-dev` to enable nodemon, or `npm start` to
disable it. This is a minimum execution; to enable more features, you may need
to set associated environment variables.

### Important note

Because Slack apps work by responding to web hooks rather than setting up a
persistent websocket connection, the machine where Charlie runs cannot respond
to Slack events unless it is accessible on the public internet over HTTPS. GSA
computers are not allowed to do this, so you will need to run the app in
cloud.gov and use

[NEED SOME DOCUMENTATION HERE ABOUT RUNNING IN CLOUD.GOV]

## OAuth scopes and Slack events

## Deploying

Charlie is deployed in [Cloud.gov](https://cloud.gov/).

Charlie is set up with continuous deployment, just merge your code to main and
it will get deployed with CircleCI.

## Configuration

### Environment variables

| name                   | purpose                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SLACK_TOKEN            | Required to connect to Slack.                                                                                                                                                                        |
| SLACK_SIGNING_SECRET   | Reqquired to receive events from Slack.                                                                                                                                                              |
| TOCK_API               | Required for Angry and Optimistic Tock bots.                                                                                                                                                         |
| TOCK_TOKEN             | Required for Angry and Optimistic Tock bots.                                                                                                                                                         |
| ANGRY_TOCK_TIMEZONE    | The timezone used for Angry Tock notifications for truant users. Defaults to `America/New_York` if unset.                                                                                            |
| ANGRY_TOCK_FIRST_TIME  | The time of day for the first reminder to Tock truants. This is sent at the same time to all truants, based on the timezone in `ANGRY_TOCK_TIMEZONE`.                                                |
| ANGRY_TOCK_SECOND_TIME | The time of day for the second reminder to Tock truants as well as supervisors. This is sent at the same time to all truants, based on the timezone in `ANGRY_TOCK_TIMEZONE`.                        |
| ANGRY_TOCK_REPORT_TO   | A comma-delimited list of channels or users to send the second truancy report to. Defaults to `#18f-supes`. Specify users with `@username`.                                                          |
| LOG_LEVEL              | Log level. When using Docker, this is set to `debug`.                                                                                                                                                |
| REDIS_URL              | URL to redis, if desired. The URL should be of the form `redis://:password@host:port` - note that there is not a username before the password in this URL, because redis does not support usernames. |

## Contributing

Please read the [contribution guidelines](CONTRIBUTING.md) before submitting a
pull request.

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related
> rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull
> request, you are agreeing to comply with this waiver of copyright interest.
