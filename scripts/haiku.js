const syllable = require("syllable");

module.exports = robot => {
  robot.hear(/.*/i, msg => {
    const whole = msg.match[0];

    if (syllable(whole) === 17) {
      const parts = whole.split(" ");
      const five1 = [];
      const seven = [];
      const five2 = [];

      // Start adding words one at a time until we
      // reach or exceed five syllables. If we exceed
      // five syllables, then this can't be haiku-ified
      while (syllable(five1.join(" ")) < 5) {
        five1.push(parts.shift());
      }
      if (syllable(five1.join(" ")) !== 5) {
        return;
      }

      // Same with the next seven syllables
      while (syllable(seven.join(" ")) < 7) {
        seven.push(parts.shift());
      }
      if (syllable(seven.join(" ")) !== 7) {
        return;
      }

      // And if we're here, we can be certain there are
      // exactly five syllables remaining.
      five2.push(...parts);

      msg.send({
        as_user: false,
        icon_emoji: "giraffe_face",
        text: `${five1.join(" ")}\n${seven.join(" ")}\n${five2.join(" ")}`,
        username: "Haiku Bot"
      });
    }
  });
};
