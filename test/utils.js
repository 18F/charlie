const { assert, expect } = require('chai');
const sinon = require('sinon');
const slackClient = require('@slack/client');

const utils = require('../utils');

describe('utility helpers', () => {
  const sandbox = sinon.createSandbox();

  const WebClient = sandbox.stub(slackClient, 'WebClient');

  const webAPI = {
    chat: {
      postEphemeral: sandbox.spy()
    }
  };

  const robot = {
    adapter: {
      client: {
        web: {
          reactions: {
            add: sandbox.stub()
          }
        }
      },
      options: {
        token: 'slack token'
      }
    }
  };

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    WebClient.returns(webAPI);
  });

  after(() => {
    slackClient.WebClient.restore();
  });

  it('sets up utilities and returns functions', () => {
    const out = utils.setup(robot);

    expect(typeof out.addEmojiReaction === 'function').to.equal(true);
    expect(typeof out.postEphemeralMessage === 'function').to.equal(true);
  });

  it('posts an ephemeral message', () => {
    const { postEphemeralMessage } = utils.setup(robot);

    postEphemeralMessage('this is my magical message');

    expect(
      webAPI.chat.postEphemeral.calledWith('this is my magical message')
    ).to.equal(true);
  });

  describe('adds an emoji reaction', () => {
    let addEmojiReaction;
    beforeEach(() => {
      const out = utils.setup(robot);
      addEmojiReaction = out.addEmojiReaction;
    });

    it('rejects if there is an error posting the emoji', async () => {
      robot.adapter.client.web.reactions.add.yields('there was an error', null);

      try {
        await addEmojiReaction('emoji', 'channel id', 'message id');
        assert.fail('should not resolve');
      } catch (e) {
        expect(
          robot.adapter.client.web.reactions.add.calledWith(
            'emoji',
            {
              channel: 'channel id',
              timestamp: 'message id'
            },
            sinon.match.func
          )
        ).to.equal(true);
      }
    });

    it('rejects if Slack refuses to post the emoji', async () => {
      robot.adapter.client.web.reactions.add.yields(null, { ok: false });

      try {
        await addEmojiReaction('emoji', 'channel id', 'message id');
        assert.fail('should not resolve');
      } catch (e) {
        expect(
          robot.adapter.client.web.reactions.add.calledWith(
            'emoji',
            {
              channel: 'channel id',
              timestamp: 'message id'
            },
            sinon.match.func
          )
        ).to.equal(true);
      }
    });

    it('resolves if the emoji is added successfully', async () => {
      robot.adapter.client.web.reactions.add.yields(null, { ok: true });

      try {
        await addEmojiReaction('emoji', 'channel id', 'message id');
      } catch (e) {
        assert.fail('should not reject');
      }

      expect(
        robot.adapter.client.web.reactions.add.calledWith(
          'emoji',
          {
            channel: 'channel id',
            timestamp: 'message id'
          },
          sinon.match.func
        )
      ).to.equal(true);
    });
  });
});
