# Hubot

This is a version of GitHub's chat bot, [Hubot](https://hubot.github.com/). Hubot's pretty cool.

## Testing Hubot Locally

You can test your hubot by running the following.

    % bin/hubot

You'll see some start up output about where your scripts come from and a
prompt.

    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading adapter shell
    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading scripts from /home/tomb/Development/hubot/scripts
    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading scripts from /home/tomb/Development/hubot/src/scripts
    Hubot>

Then you can interact with hubot by typing `hubot help`.

    Hubot> hubot help

    Hubot> animate me <query> - The same thing as `image me`, except adds a few
    convert me <expression> to <units> - Convert expression to given units.
    help - Displays all of the help commands that Hubot knows about.
    ...

## Deploying

18F's Hubot is named Charlie, and is deployed in [Cloud Foundry](https://www.cloudfoundry.org/). To deploy (as an 18F employee), follow [the steps to get started](https://docs.18f.gov/getting-started/setup/), then run:

```bash
cd 18f-bot
cf target -o devops -s hubot
cf push charlie
```

## Documentation

General information about Hubot can be found here:

https://hubot.github.com/
