# Charlie - 18F's Hubot

This is a version of GitHub's chat bot, [Hubot](https://hubot.github.com/). Hubot's pretty cool.

## What all it can do

`@charlie fun fact` or `@charlie fun fact me`  
Get a fun fact!

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

`something awesome xpost #channel`  
Charlie will attempt to copy your message to the specified channel.  If it can't,
it'll let you know.

`@charlie when is the next holiday?`
Charlie will tell you when the next federal holiday is

`@charlie ping`
Charlie will respond with `PONG` - useful for making sure Charlie's online

Plus lots more.  Try sending a DM to Charlie with `help` for a full list!

## Running Charlie locally

The easiest way to test Charlie locally is using Docker.  First, create a `.env` file
(see the `.env-sample` for reference) that sets, at minimum, the `HUBOT_SLACK_TOKEN`
variable.  (See the configuration section on environment variables below for a list of
all the variables you can set.)  Then, run `docker-compose up`.  This will get all of
Charlie's dependencies installed, setup a redis container, hook up Charlie and redis,
and start Charlie up.

If you don't want to use Docker, you can run `npm install` from the root directory,
set your `HUBOT_SLACK_TOKEN` environment variable, and then run `sh start.sh`.  This
is a minimum execution; to enable more features, you may need to set associated
environment variables.

## Deploying

18F's Hubot is named Charlie, and is deployed in [Cloud.gov](https://cloud.gov/).

Charlie is set up with continuous deployment, just merge your code to master and
it will get deployed with Travis.

## Configuration

### slack-github-issues

We use [hubot-slack-github-issues](https://github.com/mbland/hubot-slack-github-issues) to automatically create Github issues
when certain emoji reactions are added to messages in certain channels.  This is configured in
[config/slack-github-issues.json](config/slack-github-issues.json).

The `<token>` strings in the top part of the config are replaced by environment variables (see below) if
provided.  To add a new Github issue rule, add a new entry to the `rules` array.  The properties are
as follows:

|name|purpose|
|---|---|
|reactionName|The name of the emoji in Slack that should trigger this issue, without the colons.  For example, if you want `:evergreen:` to trigger an issue, this value should be `evergreen`.|
|githubRepository|The name (and only the name) of the repository where the issue should be filed. The repo owner is taken from the top level of the config, in the `githubUser` property.|
|channelNames|A list of channel names where this reaction will trigger an issue.  This lets you limit responses to just certain channels.  If this is not included, then Charlie will respond to the reaction in every channel.

### Environment variables

|name|purpose|
|---|---|
|HUBOT_SLACK_TOKEN|Required to connect to Slack.
|HUBOT_GITHUB_TOKEN|Required for Github integrations.  For example, there's a script that will create a Github issue when certain emoji reactions are added to messages.  This token must be set for that to work.|
|HUBOT_TWITTER_ACCESS_TOKEN_SECRET|Used by the twitter stream integration
|HUBOT_TWITTER_STREAM_ACCESS_TOKEN|Used by the twitter stream integration
|HUBOT_TWITTER_STREAM_CONSUMER_KEY|Used by the twitter stream integration
|HUBOT_TWITTER_STREAM_CONSUMER_KEY|Used by the twitter stream integration
|ADAPTER|This should either be omitted or set to `slack`
|HUBOT_SLACK_GITHUB_ISSUES_CONFIG_PATH|Path to the file that configures the script that creates Github issues when emoji reactions are added.  Defaults to `config/slack-github-issues.json`.  The default is accurate for Charlie, but if you needed to override it for testing, you certainly can.
|HUBOT_LOG_LEVEL|Log level.  When using Docker, this is set to `debug`.
|REDIS_URL|URL to redis, if desired.  The URL should be of the form `redis://:password@host:port` - note that there is not a username before the password in this URL, because redis does not support usernames.

## Documentation

General information about Hubot can be found here:

https://hubot.github.com/

## Contributing

Please read the [contribution guidelines](CONTRIBUTING.md) before submitting a
pull request.

## Public domain

This project is in the worldwide [public domain](LICENSE.md).  As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related
> rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull
> request, you are agreeing to comply with this waiver of copyright interest.
