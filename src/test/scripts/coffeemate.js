const expect = require('chai').expect;
const sinon = require('sinon');

const coffeemate = require('../../scripts/coffeemate');

describe('coffeemate', () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    adapter: {
      client: {
        web: {
          mpim: {
            open: sandbox.stub()
          },
          reactions: {
            add: sandbox.stub()
          }
        }
      },
      options: {
        token: 'SLACK TOKEN'
      }
    },

    brain: {
      get: sandbox.stub(),
      save: sandbox.spy(),
      set: sandbox.spy()
    },

    hear: sandbox.spy(),

    messageRoom: sandbox.spy()
  };

  const webAPI = {
    chat: {
      postEphemeral: sandbox.spy()
    }
  };
  const WebClient = sinon.stub().returns(webAPI);

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  it('subscribes to "coffee me" messages and loads the existing queue from the brain', () => {
    coffeemate(robot, { WebClient });
    expect(robot.hear.calledWith(/coffee me/i, sinon.match.func)).to.equal(
      true
    );
    expect(robot.brain.get.calledWith('coffeemate_queue')).to.equal(true);
  });

  describe('when the coffee queue is initially empty', () => {
    let handler;
    before(() => {
      coffeemate(robot, { WebClient });
      handler = robot.hear.args[0][1];
    });

    it('sends an ephemeral message the first time a user asks for coffee and adds them to the queue', () => {
      handler({
        message: {
          id: 'message id',
          user: {
            id: 'user 1'
          },
          room: 'room id'
        }
      });

      expect(
        robot.adapter.client.web.reactions.add.calledWith('coffee', {
          channel: 'room id',
          timestamp: 'message id'
        })
      ).to.equal(true);

      expect(
        webAPI.chat.postEphemeral.calledWith({
          channel: 'room id',
          user: 'user 1',
          text:
            'You’re in line for coffee! You’ll be introduced to the next person who wants to meet up.',
          as_user: true
        })
      ).to.equal(true);

      expect(
        robot.brain.set.calledWith('coffeemate_queue', ['user 1'])
      ).to.equal(true);
      expect(robot.brain.save.calledAfter(robot.brain.set)).to.equal(true);
    });

    it('sends an ephemeral message subsequent time a user asks for coffee and does nothing to the queue', () => {
      handler({
        message: {
          id: 'message id',
          user: {
            id: 'user 1'
          },
          room: 'room id'
        }
      });

      expect(
        robot.adapter.client.web.reactions.add.calledWith('coffee', {
          channel: 'room id',
          timestamp: 'message id'
        })
      ).to.equal(true);

      expect(
        webAPI.chat.postEphemeral.calledWith({
          channel: 'room id',
          user: 'user 1',
          text:
            'You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!',
          as_user: true
        })
      ).to.equal(true);

      expect(robot.brain.set.notCalled).to.equal(true);
      expect(robot.brain.save.notCalled).to.equal(true);
    });

    it('sends an ephemeral message, opens a DM, and resets the queue when a different user asks for coffee', () => {
      // Have the mpim.open method call back
      robot.adapter.client.web.mpim.open.yields(null, {
        ok: true,
        group: {
          id: 'dm id'
        }
      });

      handler({
        message: {
          id: 'message id',
          user: {
            id: 'user 2'
          },
          room: 'room id'
        }
      });

      expect(
        robot.adapter.client.web.reactions.add.calledWith('coffee', {
          channel: 'room id',
          timestamp: 'message id'
        })
      ).to.equal(true);

      expect(
        webAPI.chat.postEphemeral.calledWith({
          channel: 'room id',
          user: 'user 2',
          text: 'You’ve been matched up for coffee with <@user 1>! ',
          as_user: true
        })
      ).to.equal(true);

      // DM is opened...
      expect(
        robot.adapter.client.web.mpim.open.calledWith('user 1,user 2')
      ).to.equal(true);

      // ...and message sent
      expect(
        robot.messageRoom.calledWith('dm id', {
          text:
            'You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:',
          username: 'coffeemate',
          icon_emoji: ':coffee:',
          as_user: false
        })
      );

      expect(robot.brain.set.calledWith('coffeemate_queue', [])).to.equal(true);
      expect(robot.brain.save.calledAfter(robot.brain.set)).to.equal(true);
    });
  });

  describe('when the coffee queue begins with a user in it', () => {
    let handler;
    before(() => {
      robot.brain.get.withArgs('coffeemate_queue').returns(['user 1']);
      coffeemate(robot, { WebClient });
      handler = robot.hear.args[0][1];
    });

    it('sends an ephemeral message the first time a user asks for coffee and does nothing to the queue', () => {
      handler({
        message: {
          id: 'message id',
          user: {
            id: 'user 1'
          },
          room: 'room id'
        }
      });

      expect(
        robot.adapter.client.web.reactions.add.calledWith('coffee', {
          channel: 'room id',
          timestamp: 'message id'
        })
      ).to.equal(true);

      expect(
        webAPI.chat.postEphemeral.calledWith({
          channel: 'room id',
          user: 'user 1',
          text:
            'You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!',
          as_user: true
        })
      ).to.equal(true);

      expect(robot.brain.set.notCalled).to.equal(true);
      expect(robot.brain.save.notCalled).to.equal(true);
    });

    it('sends an ephemeral message subsequent time a user asks for coffee and does nothing to the queue', () => {
      handler({
        message: {
          id: 'message id',
          user: {
            id: 'user 1'
          },
          room: 'room id'
        }
      });

      expect(
        robot.adapter.client.web.reactions.add.calledWith('coffee', {
          channel: 'room id',
          timestamp: 'message id'
        })
      ).to.equal(true);

      expect(
        webAPI.chat.postEphemeral.calledWith({
          channel: 'room id',
          user: 'user 1',
          text:
            'You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!',
          as_user: true
        })
      ).to.equal(true);

      expect(robot.brain.set.notCalled).to.equal(true);
      expect(robot.brain.save.notCalled).to.equal(true);
    });

    it('sends an ephemeral message, opens a DM, and resets the queue when a different user asks for coffee', () => {
      // Have the mpim.open method call back
      robot.adapter.client.web.mpim.open.yields(null, {
        ok: true,
        group: {
          id: 'dm id'
        }
      });

      handler({
        message: {
          id: 'message id',
          user: {
            id: 'user 2'
          },
          room: 'room id'
        }
      });

      expect(
        robot.adapter.client.web.reactions.add.calledWith('coffee', {
          channel: 'room id',
          timestamp: 'message id'
        })
      ).to.equal(true);

      expect(
        webAPI.chat.postEphemeral.calledWith({
          channel: 'room id',
          user: 'user 2',
          text: 'You’ve been matched up for coffee with <@user 1>! ',
          as_user: true
        })
      ).to.equal(true);

      // DM is opened...
      expect(
        robot.adapter.client.web.mpim.open.calledWith('user 1,user 2')
      ).to.equal(true);

      // ...and message sent
      expect(
        robot.messageRoom.calledWith('dm id', {
          text:
            'You two have been paired up for coffee. The next step is to figure out a time that works for both of you. Enjoy! :coffee:',
          username: 'coffeemate',
          icon_emoji: ':coffee:',
          as_user: false
        })
      );

      expect(robot.brain.set.calledWith('coffeemate_queue', [])).to.equal(true);
      expect(robot.brain.save.calledAfter(robot.brain.set)).to.equal(true);
    });
  });
});
