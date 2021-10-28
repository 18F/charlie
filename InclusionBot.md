# Inclusion Bot change history

- **May 2020:** Inclusion Bot (then "Guys Bot") is moved into Charlie, replacing the
  previous implementation as a Slackbot autoresponder. We decided to make the
  move because it allowed us to be more targeted with triggers, such as ignoring
  "guys" in quotes. ([#208](https://github.com/18F/charlie/pull/208))

- **May 2020:** Made the bot message ephemeral, which means only the person who
  triggered the bot will see its response. The bot puts an emoji on the
  triggering message as a signal to the rest of the team that the bot has
  responded. ([#218](https://github.com/18F/charlie/pull/218))

- **December 2020:** Inclusion Bot is expanded to support responding to a wider
  variety of triggers and different alternatives. It also picks up on multiple
  triggers within a single message so it can respond to all of them at once. The
  list of triggers and alternative suggestions is pulled from
  [the Inclusion Bot document](https://docs.google.com/document/d/1MMA7f6uUj-EctzhtYNlUyIeza6R8k4wfo1OKMDAgLog/edit#)
  (**content warning:** offensive language).
  ([#258](https://github.com/18F/charlie/pull/258))

- **June 2021:** Inclusion Bot is expanded to include an optional modal window
  explaining why certain phrases or terms are problematic.
  ([#299](https://github.com/18F/charlie/pull/299))

- **October 2021:** Inclusion Bot's message is tweaked to seem less like it is
  accusing someone of being non-inclusive. This is to address a common feeling
  among some users that they are being "called out" by the bot. The greeting
  text is moved ahead of the list of triggering words, and a link to
  [the new Inclusion Bot document](https://docs.google.com/document/d/1iQT7Gy0iQa7sopBP0vB3CZ56GhyYrDNUzLdoWOowSHs/edit)
  is displayed. ([#320](https://github.com/18F/charlie/pull/320))
