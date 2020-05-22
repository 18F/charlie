//  Description:
//    Inspect the data in redis easily
//
//  Commands:
//    hubot set tock line <line> - Associates a tock line with the current channel
//    hubot tock line - Display the tock line associated with the current channel, if any

const getTockLines = robot => {
  let tockLines = robot.brain.get('tockLines');
  if (!tockLines) {
    tockLines = {};
  }
  return tockLines;
};

module.exports = robot => {
  robot.respond(/tock( line)?$/i, msg => {
    const tockLines = getTockLines(robot);
    if (tockLines[msg.envelope.room]) {
      msg.send(
        `The tock line for <#${msg.envelope.room}> is \`${
          tockLines[msg.envelope.room]
        }\``
      );
    } else {
      msg.send(
        `I don't know a tock line for this room. To set one, say \`<@${robot.name}> set tock line <line>\``
      );
    }
  });

  robot.respond(/set tock( line)? (.*)$/i, msg => {
    const tockLines = getTockLines(robot);
    tockLines[msg.envelope.room] = msg.match[2];
    robot.brain.set('tockLines', tockLines);
    robot.brain.save();
    msg.send('Okay, I set the tock line for this room');
  });
};
