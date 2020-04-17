const expect = require('chai').expect;
const sinon = require('sinon');

const travelTeam = require('../../scripts/travel-team');

describe('Travel Team out-of-office message', () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    hear: sandbox.stub(),
    adapter: {
      client: {
        web: {
          conversations: {
            list: sandbox.stub()
          }
        }
      }
    }
  };

  let handler = null;
  beforeEach(() => {
    travelTeam(robot);
    handler = robot.hear.args[0][1];

    robot.adapter.client.web.conversations.list.yields(false, {
      channels: [
        { id: 'c1', name: 'channel 1' },
        { id: 'ch2', name: 'travel' },
        { id: 'ch3', name: 'channel 3' }
      ]
    });
  });

  afterEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  it('subscribes to :all_the_things:', () => {
    travelTeam(robot);
    expect(robot.hear.calledWith(/.*/, sinon.match.func)).to.equal(true);
  });

  describe('message handler', () => {
    const message = {
      message: {
        room: 'ch2',
        user: {
          id: 'user'
        }
      },
      send: sandbox.spy()
    };

    beforeEach(() => {
      message.message.room = 'ch2';
      message.message.user.id = 'user';
    });

    it('does nothing if the incoming message is not directed to the #travel channel', async () => {
      message.message.room = 'ch1';
      await handler(message);
      expect(message.send.called).to.equal(false);
    });

    it('does nothing if the current time is during the work week', async () => {
      // Tuesday, Jnuary 17, 1984: US Supreme Court rules that recording on VHS
      // tapes for later playback does not violate federal copyright laws.
      const clock = sinon.useFakeTimers(443188800000);
      await handler(message);
      expect(message.send.called).to.equal(false);
      clock.restore();
    });

    it('sends a message if the current time is during a federal holiday', async () => {
      // Thursday, July 4, 1996: Hotmail is born.
      const clock = sinon.useFakeTimers(836481600000);
      await handler(message);

      expect(
        message.send.calledWith({
          as_user: false,
          icon_emoji: sinon.match.string,
          text:
            'Hi <@user>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Friday morning and someone will respond promptly.',
          username: 'TTS Travel Team'
        })
      ).to.equal(true);
      clock.restore();
    });

    it('sends a message if the current time is during a weekend', async () => {
      // Sunday, October 19, 2003: Mother Teresa is beatified by Pope John
      // Paul II.
      const clock = sinon.useFakeTimers(1066564800000);
      message.message.user.id = 'other_user';
      await handler(message);

      expect(
        message.send.calledWith({
          as_user: false,
          icon_emoji: sinon.match.string,
          text:
            'Hi <@other_user>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.',
          username: 'TTS Travel Team'
        })
      ).to.equal(true);
      clock.restore();
    });

    it('does not send a message to the same user for at least 3 hours', async () => {
      // Sunday, September 7, 2014: Serena Williams wins her third consecutive
      // US Open title.
      const clock = sinon.useFakeTimers(1410091200000);
      message.message.user.id = 'repeat_user';
      await handler(message);

      expect(
        message.send.calledWith({
          as_user: false,
          icon_emoji: sinon.match.string,
          text:
            'Hi <@repeat_user>. The TTS travel team is unavailable on weekends and holidays. If you need to change your flight for approved travel, contact AdTrav at (877) 472-6716. For after-hours emergency travel authorizations, see <https://handbook.tts.gsa.gov/travel-guide-b-after-hours-emergency-travel-authorizations/|the Handbook>. For other travel-related issues, such as an approval in Concur, please drop a new message in this channel Monday morning and someone will respond promptly.',
          username: 'TTS Travel Team'
        })
      ).to.equal(true);

      sandbox.resetHistory();

      await handler(message);
      expect(message.send.called).to.equal(false);

      sandbox.resetHistory();

      // Switch users, make sure it does send a message to the new user
      message.message.user.id = 'first_timer';
      await handler(message);
      expect(message.send.called).to.equal(true);

      sandbox.resetHistory();

      // Switch back to the repeat user.
      message.message.user.id = 'repeat_user';
      await handler(message);
      expect(message.send.called).to.equal(false);

      sandbox.resetHistory();

      // Now move forward 3 hours and see that we get a new message for the user
      clock.tick(3 * 60 * 60 * 1000);
      await handler(message);
      expect(message.send.called).to.equal(true);

      clock.restore();
    });
  });
});
