# Charlie - 18F's Plastic Pal That's Fun to Be With

A Slack app bot used within 18F for fun and work.

- [What all it can do](#what-all-it-can-do)
  - [Interactive bots](#interactive-bots)
  - [Non-interactive bots](#non-interactive-bots)
- [Development](#development)
- [Public domain](#public-domain)

## What all it can do

### Interactive bots

#### BioArt

Get a piece of art curated by the National Institutes of Health! The
[BioArt source](https://bioart.niaid.nih.gov/) project is a collection of
science visuals, including artistic represetnations of bacteria, viruses, cells,
animals, and more! Just say `bio art` or `bio-art` to get some art!

##### Coffeemate

Schedule virtual coffees with random teammates! Not sure who you should talk to?
Charlie can help! Say `coffee me` to get put into the virtual coffee queue. As
soon as someone else signs up, Charlie will connect you.

##### Dad jokes

Charlie can fetch a joke from
[Fatherhood.gov](https://www.fatherhood.gov/for-dads/dad-jokes) to brighten up
your day. Just say `@Charlie dad joke` to increase your daily joy.

##### Employee resource group invite requests

To see a list of TTS employee resource and affinity groups that accept automated
invitation requests, just ask Charlie! Say `@Charlie ergs` and the bot will send
you a direct message listing the groups along with a button for each one.
Clicking the button will send a message to the group letting them know you'd
like an invitation!

Some employee resource and affinity groups are not available by automated
invitation request. To see the complete list of ERGs and contact information,
you can send yourself a direct message that just says `ergs` and Slackbot will
respond with that information!

##### Evermarch

Ever wondered what day of March 2020, we're currently on? Charlie can tell you.
Just say `evermarch` in any channel where Charlie is, and it'll let you know.

##### Facts

Charlie knows **_so many_** facts. Dog facts, cat facts, giraffe facts, dolphin
facts. There are just so many facts. You can just say `dog fact` (or
`giraffe fact`, etc.) to get Charlie to share its knowledge with you.

| Key word          | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `alan fact`       | Shares a fact about people named Alan             |
| `alumni dog fact` | Shares a fact about a dog belonging to a TTS alum |
| `ask ally fact`   | Shares a fact about accessible web development    |
| `bird fact`       | Shares a fact about a TTS person's bird           |
| `cat fact`        | Shares a fact about a TTS person's cat            |
| `dino fact`       | Shares a fact about dinosaurs                     |
| `dog fact`        | Shares a fact about a TTS person's dog            |
| `dolphin fact`    | Shares a fact about dolphins                      |
| `ed simulator`    | Shares a quote from 18F alumni Ed Mullen          |
| `giraffe fact`    | Shares a fact of dubious truth about giraffes     |
| `minnesota facts` | Shares a fact about the state of Minnesota        |
| `park fact`       | Shares a fact about the US National Parks         |
| `randy fact`      | Shares a fact about 18F staff member Randy        |
| `screambot`       | Joyfully screams along with you                   |
| `wisconsin facts` | Shares a fact about the state of Wisconsin        |

##### Fancy font

Feeling fancy, and want your message to reflect that? Charlie is here! Just say
`fancy font <your message>` and Charlie will respond with a very fancy version
of your message. So fancy!

##### Federal holidays

Itching for a day off and want to know when the next holiday is? Charlie knows
all the (standard, recurring) holidays! Just say
`@charlie when is the next holiday` and Charlie will let you know.

##### Three-paycheck months

Do you look forward to 3-paycheck months to treat yourself to something nice?
Maybe blue crabs? You deserve nice things, and Charlie can help! Just say
`@charlie when's the next 3-paycheck month?` (or something similar; Charlie is
not too picky) and it'll let you know the next one up!

##### Handbook search

Wondering if the [TTS Handbook](https://handbook.tts.gsa.gov) has useful
information for a particular topic but don't want to open your browser? Charlie
can help! Just say `@handbook terms` and Charlie will search the Handbook for
`terms` for you (replace `terms` with whatever you want). If it finds anything,
it'll post links in a threaded response to your request.

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

##### Pug bot

Do you like pugs? Do you want pictures of pugs? Charlie can help! Just say
`@Charlie pug me` to get a picture of a cute pug, or `@Charlie pug bomb [count]`
to get a bunch of pug pictures! (You can leave the count out; Charlie will
send 3 pictures if you don't ask for a specific number.)

##### Q-Expander bot

Ever wonder what the Q\* initialisms are after everyone's names? Each letter describes where a person fits in the organization. Say `qex [q-initialism]` and get a detailed tree response back.

For example:
`qex queaad`

Response:

```
QUEAAD
|||||└──QUEAAD: Chumanjalaal Cohort
||||└──QUEAA: Engineering
|||└──QUEA: 18F Chapters
||└──QUE: 18F
|└──QU: Office of Clients & Markets
└──Q: FAS (TTS)
```

##### Tock line

What Tock line do I bill this project to? Ugh, who can remember? Charlie can!
In a channel, you can say `@charlie set tock <number>` and Charlie will remember
the Tock line for that room. In the future, if you need to know what to bill to,
say `@charlie tock` and it will let you know. Handy!

##### US Code Bot

The law sure is fun, and Charlie can help you look it up! If you drop a citation
to the US Code, Charlie will attempt to look it up on the
[Cornell LII](https://www.law.cornell.edu/uscode/text) website and post the text
in a thread. Handy for you legal eagles!

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
[#general-talk](https://app.slack.com/client/T025AQGAN/C04KL9ZN2). Take the day
off, don't do work for the government, and observe it in the way that is most
suitable for you!

##### Inclusion bot

Charlie passively listens for [language with racist, ableist, sexist, or other
exclusionary histories](https://github.com/18F/charlie/blob/main/InclusionBot.md)
(content warning: the linked document includes words and phrases that the bot
listens for, and these words and phrases may be offensive). When it hears such
words or phrases, it quietly lets the speaker know and offers some suggestions.
What a great bot, helping nudge us all to thoughtful, inclusive language! We also
maintain [a history](https://github.com/18F/charlie/blob/main/CHANGELOG.inclusion_bot.md)
of the evolution of Inclusion Bot.

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

## Development

See [the wiki](https://github.com/18F/charlie/wiki) for developer documentation
and our [contributing docs](CONTRIBUTING.md) for contribution guidelines

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related
> rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull
> request, you are agreeing to comply with this waiver of copyright interest.
