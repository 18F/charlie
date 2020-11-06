const utils = require("../utils");

const brainKey = "coffeemate_queue";

module.exports = (robot) => {
  const queue = robot.brain.get(brainKey) || [];

  const { addEmojiReaction, postEphemeralMessage } = utils.setup(robot);

  robot.hear(/coffee me/i, (res) => {
    addEmojiReaction("coffee", res.message.room, res.message.id);

    // First, is the current user in already in the queue?
    // If so, just let them know
    if (queue.includes(res.message.user.id)) {
      postEphemeralMessage({
        channel: res.message.room,
        user: res.message.user.id,
        text:
          "You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!",
        as_user: true,
      });
      return;
    }

    // If we didn't bail out already, add the current user to the queue
    queue.push(res.message.user.id);
    robot.brain.set(brainKey, queue);
    robot.brain.save();

    // Now do we have a pair or not?
    if (queue.length < 2) {
      postEphemeralMessage({
        channel: res.message.room,
        user: res.message.user.id,
        text:
          "You’re in line for coffee! You’ll be introduced to the next person who wants to meet up.",
        as_user: true,
      });
    } else {
      // pair them up
      postEphemeralMessage({
        channel: res.message.room,
        user: res.message.user.id,
        text: `You’ve been matched up for coffee with <@${queue[0]}>! `,
        as_user: true,
      });

      // Now start a 1:1 DM chat between the people in queue.
      robot.adapter.client.web.mpim.open(queue.join(","), (err, mpim) => {
        if (err || !mpim.ok) {
          robot.logger.warning("Error with Slack API", err);
          return;
        }

        const msg =
          "You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:";

        // mpim.send msg
        robot.messageRoom(mpim.group.id, {
          text: msg,
          username: "coffeemate",
          icon_emoji: ":coffee:",
          as_user: false,
        });

        // then empty the queue again
        queue.length = 0;
        robot.brain.set(brainKey, queue);
        robot.brain.save();
      });
    }
  });
};
