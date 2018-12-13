const sinon = require('sinon');
const expect = require('chai').expect;

const xpost = require('../../scripts/xpost');

const mockSandbox = sinon.createSandbox();
const robot = {
  hear: mockSandbox.stub(),
  messageRoom: mockSandbox.stub(),
  adapter: {
    client: {
      web: {
        channels: {
          list: mockSandbox.stub()
        },
        reactions: {
          add: mockSandbox.stub()
        }
      }
    },
    options: {
      token: 'Slack Web API Token'
    }
  }
};

describe('xpost', () => {
  beforeEach(() => {
    mockSandbox.resetBehavior();
    mockSandbox.resetHistory();
  });

  describe('can verify if the bot is in a channel', () => {
    it('rejects with the error if the Slack API returns an error', () => {
      robot.adapter.client.web.channels.list.yields('the api error message');

      return xpost
        .isInChannel(robot, null)
        .then(() => {
          expect.fail(false, false, 'should reject');
        })
        .catch(err => {
          expect(err).to.equal('the api error message');
        });
    });

    it('rejects with an error object if the Slack response is not okay and does not contain an error', () => {
      robot.adapter.client.web.channels.list.yields(null, { ok: false });

      return xpost
        .isInChannel(robot, null)
        .then(() => {
          expect.fail(false, false, 'should reject');
        })
        .catch(err => {
          expect(err).to.be.an('error');
        });
    });

    it('returns false and a null channel ID if the requested channel does not exist', () => {
      robot.adapter.client.web.channels.list.yields(null, {
        ok: true,
        channels: [{ name: 'good-channel' }]
      });

      return xpost
        .isInChannel(robot, 'z')
        .catch(() => {
          expect.fail(false, false, 'should resolve');
        })
        .then(channelInfo => {
          expect(channelInfo).to.be.an('object');
          expect(channelInfo.inChannel).to.be.false;
          expect(channelInfo.channelID).to.be.null;
        });
    });

    it('returns false and the channel ID if the requested channel does exist but the robot is not in it', () => {
      robot.adapter.client.web.channels.list.yields(null, {
        ok: true,
        channels: [
          { name: 'good-channel', id: 'good-channel-id', is_member: false }
        ]
      });

      return xpost
        .isInChannel(robot, 'good-channel')
        .catch(() => {
          expect.fail(false, false, 'should resolve');
        })
        .then(channelInfo => {
          expect(channelInfo).to.be.an('object');
          expect(channelInfo.inChannel).to.be.false;
          expect(channelInfo.channelID).to.equal('good-channel-id');
        });
    });

    it('returns true and the channel ID if the requested channel does exist and the robot is in it', () => {
      robot.adapter.client.web.channels.list.yields(null, {
        ok: true,
        channels: [
          { name: 'good-channel', id: 'good-channel-id', is_member: true }
        ]
      });

      return xpost
        .isInChannel(robot, 'good-channel')
        .catch(() => {
          expect.fail(false, false, 'should resolve');
        })
        .then(channelInfo => {
          expect(channelInfo).to.be.an('object');
          expect(channelInfo.inChannel).to.be.true;
          expect(channelInfo.channelID).to.equal('good-channel-id');
        });
    });
  });

  describe('can add a reaction to an existing message', () => {
    it('rejects with the error if the Slack API returns an error', () => {
      robot.adapter.client.web.reactions.add.yields('the api error message');

      return xpost
        .addReaction(robot, null, null, null)
        .then(() => {
          expect.fail(false, false, 'should reject');
        })
        .catch(err => {
          expect(robot.adapter);
          expect(err).to.equal('the api error message');
        });
    });

    it('rejects with an error object if the Slack response is not okay and does not contain an error', () => {
      robot.adapter.client.web.reactions.add.yields(null, { ok: false });

      return xpost
        .addReaction(robot, null, null, null)
        .then(() => {
          expect.fail(false, false, 'should reject');
        })
        .catch(err => {
          expect(err).to.be.an('error');
        });
    });

    it('resolves with no value if there is no error and the Slack response is okay', () => {
      robot.adapter.client.web.reactions.add.yields(null, { ok: true });

      return xpost
        .addReaction(robot, null, null, null)
        .then(() => {
          expect(true).to.be.true;
        })
        .catch(() => {
          expect.fail(false, false, 'should resolve');
        });
    });
  });

  it('registers a "hear" handler', () => {
    xpost(robot);
    expect(robot.hear.calledOnce).to.be.true;
    expect(robot.hear.firstCall.args[1]).to.be.a('function');
  });

  describe('the main responder function', () => {
    const postEphemeral = mockSandbox.spy();
    const WebAPI = sinon.stub().returns({ chat: { postEphemeral } });

    const msg = {
      send: mockSandbox.stub(),
      message: {
        text: '',
        room: '',
        user: {
          id: 'user-id'
        }
      },
      match: ['']
    };
    let responder = null;

    beforeEach(() => {
      WebAPI.resetHistory();
      xpost(robot, WebAPI);
      responder = robot.hear.firstCall.args[1];
      expect(WebAPI.calledWith('Slack Web API Token')).to.equal(true);
    });

    it('does not xpost anything if the message text does not match and the message is from a private channel', () => {
      msg.message.text = 'hello world xpost';
      msg.message.room = 'Private';

      responder(msg);

      expect(msg.send.callCount).to.equal(0);
    });

    it('posts help text if the message text does not match and the message is from a public channel', () => {
      msg.message.text = 'hello world xpost';
      msg.message.room = 'Cpublic';

      responder(msg);

      expect(postEphemeral.callCount).to.equal(1);
      expect(postEphemeral.firstCall.args[0]).to.eql({
        channel: 'Cpublic',
        user: 'user-id',
        text: 'XPOST usage: `<your message> XPOST #channel`'
      });
    });

    it('does all the expected things if the message text does match and the message is from a public channel', done => {
      msg.message.text =
        'hello world #not-a-target xpost #target1 #target2 #target3';
      msg.message.room = 'Cpublic';

      robot.adapter.client.web.channels.list.yields(false, {
        ok: true,
        channels: [
          { name: 'target1', id: 'target1', is_member: true },
          { name: 'target2', id: 'target2', is_member: true },
          { name: 'target3', id: 'target3', is_member: false }
        ]
      });
      robot.adapter.client.web.reactions.add.yields(null, { ok: true });

      responder(msg);

      // Need to tick before we make assertions because some of the things we
      // want to verify happen in promise resolutions.  If we assert without
      // waiting, the promises will not have resolved and not all of the code
      // will have finished executing.
      setTimeout(() => {
        expect(robot.adapter.client.web.channels.list.callCount).to.equal(3);
        expect(robot.adapter.client.web.reactions.add.callCount).to.equal(1);

        expect(robot.messageRoom.callCount).to.equal(2);
        expect(robot.messageRoom.firstCall.args[0]).to.be.oneOf([
          'target1',
          'target2'
        ]);
        expect(robot.messageRoom.secondCall.args[0]).to.be.oneOf([
          'target1',
          'target2'
        ]);
        done();
      }, 10);
    });
  });
});
