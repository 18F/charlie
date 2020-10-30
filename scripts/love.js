//  Description:
//    For the giving of praise and thanks to colleagues.
//    Looks for messages like "love @username for [reason]", acknowledges them,
//    and copies them to #love.
//
//  Dependencies:
//    None
//
//  Configuration:
//    None
//
//  Commands:
//    None

module.exports = (robot) => {
  robot.hear(/^\s*(love|<3|:heart\w*:)\s+((@[\w-]+\s*)+)(.*)$/i, (msg) => {
    const lover = msg.message.user.name;
    const lovees = msg.match[2].trim();
    const action = msg.match[4];
    const room = "love";
    robot.messageRoom(room, `${lover} loves ${lovees}: ${action}`);
    msg.send(`Yay, more love for #love! Thanks, ${lover}!`);
  });
};
