# Charlie - 18F's Plastic Pal That's Fun to Be With

A Slack app bot used within 18F for fun and work.

## What all it can do

### Interactive bots

##### Coffeemate

Schedule virtual coffees with random teammates! Not sure who you should talk to?
Charlie can help! Say `coffee me` to get put into the virual coffee queue. As
soon as someone else signs up, Charlie will connect you.

##### Facts

Charlie knows **_so many_** facts. Dog facts, cat facts, giraffe facts, dolphin
facts. There are just so many facts. You can just say `dog fact` (or
`giraffe fact`, etc.)to get Charlie to share its knowledge with you.

##### Fancy font

Feeling fancy, and want your message to reflect that? Charlie is here! Just say
`fancy font <your message>` and Charlie will respond with a very fancy version
of your message. So fancy!

##### Federal holidays

Itching for a day off and want to know when the next holiday is? Charlie knows
all the (standard, recurring) holidays! Just say
`@charlie when is the next holiday` and Charlie will let you know.

##### HugMe

Need to see a little hug in your life? Friends from TTS past have left us a gift
and Charlie will deliver it whenever you need. Just say `@charlie hug me` or
`@charlie hug bomb <number>` to get a little happiness dropped right on your
screen.

##### Love/Kudos bot

What's that? Someone did something awesome and you want everyone to know about
it? Charlie's got you covered. Just say `love @user for the thing` and Charlie
will share the love in the `#love` channel for everyone to see. Share the love!

##### March 2020 bot

Ask `@charlie what day is it?`, and Charlie will let you know what day it is in
the Evermarch 2020 reckoning. It's... it's been a very long March.

##### OPM's DC offices status

Working in DC and want to know if the office is closed due to snow or, perhaps,
raven attack? Charlie knows all! Say `@charlie opm status` and it will ask OPM
for the latest information and then pass that along to you. No more having to
open a web browser all by yourself!

##### Procurement glossary

Not sure what a procurement term means? Charlie might be able to help! Say
`@charlie define <term>` and it will attempt to look the term up in the
[18F Procurement Glossary](https://github.com/18f/procurement-glossary)
and report what it finds.

##### Tock line

What Tock line do I bill this project to? Ugh, who can remember? Charlie can!
In a channel, you can say `@charlie set tock <number>` and Charlie will remember
the Tock line for that room. In the future, if you need to know what to bill to,
say `@charlie tock` and it will let you know. Handy!

##### Zen bot

Say `@charlie zen` to get Charlie to fetch a product-, techy-, or code-focused
message of zen. Read it, and breathe.

### Non-interactive bots

##### Helpful tau bot

If Charlie sees something it recognizes as a time posted into chat, it will send
a message that only you can see, letting you know what that time is in your
timezone. Charlie tries really hard.

##### Holiday reminders

On the business day before a federal holiday, Charlie will post a reminder in
#general-talk. Take the day off, don't do work for the government, and observe
it in the way that is most suitable for you!

##### Inclusion bot

Charlie passively listens for language with racist, ableist, sexist, or other
exclusionary histories. When it hears such words or phrases, it quietly lets the
speaker know and offers some suggestions. What a great bot, helping nudge us all
to thoughtful, inclusive language!

##### Optimistic / Angry Tock

At the end of the work week, Charlie will send a private message to any Tockable
people who haven't submitted their Tock yet to remind them to do it. At the
start of the next work week, Charlie will send a message to people who still
haven't submitted their Tock. Finally, at the end of the first day of the work
week, Charlie will send a message to 18F supervisors letting them know about
anyone whose Tock report is late.

##### Travel team

Did you know that the TTS Travel team takes weekends and holidays too? It's
true, they do! And Charlie knows it too. If you drop a question or comment in
the travel channel on a closed day, Charlie will remind you that the office is
closed and offer some helpful tips to get you through. It will also let you know
when the Travel team will be back in the office!

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
installed, setup a PostgreSQL container, hook up Charlie and postgres, and start
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
policy says our computers must not do this, so you will need to run the app in
cloud.gov to test it.

## Deploying

Charlie is deployed in [Cloud.gov](https://cloud.gov/).

Charlie is set up with continuous deployment, just merge your code to main and
it will get deployed with CircleCI.

## Configuration

- [OAuth scopes and events](oauth.md) are required for integration with Slack
- [Environment variables](env.md) are required to connect and change bot behaviors

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
