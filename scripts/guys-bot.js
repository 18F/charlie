const guysRegex = /(?<!boba )(?<!halal )guy(s|z)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)/i;

module.exports = robot => {
  robot.hear('guy[sz]', msg => {
    if (!guysRegex.test(msg.message.text)) {
      return;
    }

    msg.send({
      attachments: [
        {
          color: '#2eb886',
          pretext: `Did you mean *y'all*? (_<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|What's this?>_)`,
          title: `<https://web.archive.org/web/20170714141744/https://18f.gsa.gov/2016/01/12/hacking-inclusion-by-customizing-a-slack-bot/|18F: Digital service delivery | Hacking inclusion: How we customized a bot to gently correct people who use the word 'guys'>`,
          text: `We want to build a diverse and inclusive workplace where people use more inclusive language so we recently customized Slackbot's autoresponses to respond automatically with different phrases if someone uses the words "guys" or "guyz" in an 18F chat room.`,
          fallback: 'for notifications or IRC clients'
        }
      ],
      as_user: false,
      icon_emoji: ':tts:',
      username: 'Inclusion Bot',
      unfurl_links: false,
      unfurl_media: false
    });
  });
};
