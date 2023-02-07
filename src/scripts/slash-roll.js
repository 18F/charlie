module.exports = async (app) => {
  app.command("/roll", async ({ ack, say, command }) => {
    await ack();

    const dieRoll = (number) => Math.floor(Math.random() * number) + 1;

    await say({
      // icon_emoji: "",
      // username: "",
      text: `<@${command.user_id}> rolled ${
        command.text
      }, resulting in ${dieRoll(20)}`,
    });
  });
};
