module.exports = robot => {
  if (process.env.HUBOT_AUTH_ADMIN != null) {
    robot.logger.warning(
      'The HUBOT_AUTH_ADMIN environment variable is set not going to load roles.coffee, you should delete it'
    );
    return;
  }

  const getAmbiguousUserText = users => {
    return `Be more specific, I know ${
      users.length
    } people named like that: ${users.map(u => u.name).join(', ')}`;
  };

  robot.respond(/who is @?([\w .-]+)\?*$/i, msg => {
    let joiner = ', ';
    const name = msg.match[1].trim();

    if (name === 'you') {
      return msg.send("Who ain't I?");
    }
    if (name === robot.name) {
      return msg.send('The best.');
    }

    const users = robot.brain.usersForFuzzyName(name);
    if (users.length === 1) {
      const user = users[0];
      user.roles = user.roles || [];
      if (user.roles.length > 0) {
        if (user.roles.join('').search(',') > -1) {
          joiner = '; ';
        }
        return msg.send(`${name} is ${user.roles.join(joiner)}.`);
      }
      return msg.send(`${name} is nothing to me.`);
    }

    if (users.length > 1) {
      return msg.send(getAmbiguousUserText(users));
    }
    return msg.send(`${name}? Never heard of 'em`);
  });

  robot.respond(/@?([\w .\-_]+) is (["'\w: \-_]+)[.!]*$/i, msg => {
    const name = msg.match[1].trim();
    const newRole = msg.match[2].trim();

    if (
      name !== '' &&
      name !== 'who' &&
      name !== 'what' &&
      name !== 'where' &&
      name !== 'when' &&
      name !== 'why'
    ) {
      if (!newRole.match(/^not\s+/i)) {
        const users = robot.brain.usersForFuzzyName(name);
        if (users.length === 1) {
          const user = users[0];
          user.roles = user.roles || [];

          if (user.roles.includes(newRole)) {
            return msg.send('I know');
          }

          user.roles.push(newRole);
          if (name.toLowerCase() === robot.name.toLowerCase()) {
            return msg.send(`Ok, I am ${newRole}.`);
          }
          return msg.send(`Ok, ${name} is ${newRole}.`);
        }
        if (users.length > 1) {
          return msg.send(getAmbiguousUserText(users));
        }
        return msg.send(`I don't know anything about ${name}.`);
      }
    }
    return null;
  });

  robot.respond(/@?([\w .\-_]+) is not (["'\w: \-_]+)[.!]*$/i, msg => {
    const name = msg.match[1].trim();
    const newRole = msg.match[2].trim();

    if (
      name !== '' &&
      name !== 'who' &&
      name !== 'what' &&
      name !== 'where' &&
      name !== 'when' &&
      name !== 'why'
    ) {
      const users = robot.brain.usersForFuzzyName(name);
      if (users.length === 1) {
        const user = users[0];
        user.roles = user.roles || [];

        if (!user.roles.includes(newRole)) {
          return msg.send('I know.');
        }

        user.roles = user.roles.filter(r => r !== newRole);
        return msg.send(`Ok, ${name} is no longer ${newRole}.`);
      }
      if (users.length > 1) {
        return msg.send(getAmbiguousUserText(users));
      }
      return msg.send(`I don't know anything about ${name}.`);
    }
    return null;
  });
};
