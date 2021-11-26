## Development

Charlie is a Slack App, and for structural and policy reasons described below, it can't be fully qualified in a local development environment.

Because Slack apps work by responding to web hooks rather than setting up a persistent websocket connection, the machine where Charlie runs cannot respond to Slack events unless it is accessible on the public internet over HTTPS. **GSA policy forbids our computers from doing this**. As a result, it is necessary to run the app in cloud.gov to test it.

To facilitate this requirement, there is a `GSA TTS Testing` Slack instance available to test in-development changes to Charlie before deploying to production. The Slack instance `GSA TTS Testing` is deployed in cloud.gov and this github repository is fully wired up with CI/CD to automatically deploy to it (for branches other than `main`).

### Anatomy of developing and deplolying a New Charlie Bot

For a new bot called `awesomobot`:

![awesomobot](awesomobot.png "awesomobot")

- Write the core bot functionality in a file name `src/scripts/awesomobot.js`
- Write an accompanying `src/scripts/awesomobot.test.js` file is required that contains relevant unit tests.
- Docker can and should be used for local linting and unit testing.
- `GSA TTS Testing` Slack can and should be used for live testing of `awesomobot`.
- Iterate as needed
- When feature complete and tested, file a Pull Request and get someone to review ([#bots](https://app.slack.com/client/T025AQGAN/C02FPFGBG) in Slack is a good place to start that discussion).
- After PR is reviewed, approved, and merged to `main`, deployment to TTS Slack is automatic via CI/CD hooks.

#### Using Docker for Local Linting and Unit Testing

Make sure Docker is installed locally and the daemon is running.

Start up the container:

```bash
docker-compose up
```

This will get all of Charlie's dependencies installed, set up a PostgreSQL container, hook up Charlie and postgres, and start Charlie. In this configuration, Charlie is run using [nodemon](https://npm.im/nodemon), so it will automatically restart if you make any code changes.

Run linter and tests:

```bash
docker exec -it charlie_charlie_1 npm run lint
docker exec -it charlie_charlie_1 npm test
```

_tip_: the above will test all unit tests across Charlie. To shorten iteration cycles, you can _temporarily_ change a regex from the top-level file `package.json` (don't commit this change) to _only_ test your code.

change this:

`"test": "jest 'src/.+/?.+\\.test\\.js'",`

to something like this:

`"test": "jest 'src/scripts/awesomobot\\.test\\.js'",`

#### Deploying to `GSA TTS Testing` Slack

Steps to get wired up to `GSA TTS Testing` Slack:

- Ask for assistance in the [#bots](https://app.slack.com/client/T025AQGAN/C02FPFGBG) channel.
- Contact an admin of `GSA TTS Testing` Slack about getting added as a user.

#### Getting the New Bot Deployed to Production

After `awesomobot` has been linted, unit tested, live tested on `GSA TTS Testing` Slack, and deemed production-ready, the process to get the new bot to `TTS` Slack is as follows:

- Push your `awesomo` branch to github.com/18F/Charlie
- File a Pull Request for `awesomo->main`
  -- PR should be from your development
  -- Include an explanatory paragraph in the PR as to what's in the request.
- Request a reviewer. If you don't know who should review the code, ask in the [#bots](https://app.slack.com/client/T025AQGAN/C02FPFGBG) channel
- After PR has passed review, merge the changes to `main` (sometimes the reviewer does this)
  -- CI/CD is setup so the deployment to `TTS` Slack is automatic
- Confirm in production Slack that the bot is functional and works as designed.

## Contributing

Please read the [contribution guidelines](CONTRIBUTING.md) before submitting a pull request.

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related
> rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull
> request, you are agreeing to comply with this waiver of copyright interest.
