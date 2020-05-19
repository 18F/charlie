const expect = require('chai').expect;
const sinon = require('sinon');

const guysBot = require('../../scripts/guys-bot');

describe('Inclusion/guys bot', () => {
  const sandbox = sinon.createSandbox();
  const robot = {
    hear: sandbox.stub()
  };

  const msg = {
    message: { text: '' },
    send: sandbox.stub()
  };

  beforeEach(() => {
    msg.message.text = '';
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  it('subscribes to utterances of "guys"', () => {
    guysBot(robot);
    expect(robot.hear.calledWith('guy[sz]', sinon.match.func)).to.equal(true);
  });

  describe('guys bot handler', () => {
    let handler;

    const expectedResponse = {
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
    };

    beforeEach(() => {
      guysBot(robot);
      handler = robot.hear.args[0][1];
    });

    it('does not respond to "guys" in quotes', () => {
      ['guys', 'guyz'].forEach(guy => {
        msg.message.text = `this has "${guy}" in double quotes`;
        handler(msg);
        expect(msg.send.called).to.equal(false);

        msg.message.text = `this has '${guy}' in single quotes`;
        handler(msg);
        expect(msg.send.called).to.equal(false);

        msg.message.text = `this has “${guy}” in smart quotes`;
        handler(msg);
        expect(msg.send.called).to.equal(false);
      });
    });

    it('does not respond to boba guys', () => {
      msg.message.text = `this is about boba guys, not the other kind`;
      handler(msg);
      expect(msg.send.called).to.equal(false);

      msg.message.text = `this is about Boba guys, not the other kind`;
      handler(msg);
      expect(msg.send.called).to.equal(false);
    });

    it('does not respond to Halal guys', () => {
      msg.message.text = `this is about Halal guys, not the other kind`;
      handler(msg);
      expect(msg.send.called).to.equal(false);
    });

    it('does respond to just guys', () => {
      msg.message.text = 'hello guys';
      handler(msg);
      expect(msg.send.calledWith(expectedResponse));
    });

    it('does respond to just guyz', () => {
      msg.message.text = 'hello guyz';
      handler(msg);
      expect(msg.send.calledWith(expectedResponse));
    });
  });
});
