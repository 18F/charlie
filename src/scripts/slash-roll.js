module.exports = async (app) => {
  app.command("/roll", async ({ ack, say, command }) => {
    await ack();

    const dieRoll = (number) => Math.floor(Math.random() * number) + 1;
    /* parse command.text
    Simplest case: d[whatever]
    */

    const [, sides] = command.text.match(/d([0-9]{1,4})/) ?? [];
    const actualSides = sides ? Number.parseInt(sides, 10) : 20;

    await say({
      // icon_emoji: "",
      // username: "",
      text: `<@${command.user_id}> rolled ${
        command.text
      }, resulting in ${dieRoll(actualSides)}`,
    });
  });
};
