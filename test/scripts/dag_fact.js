const Helper = require('hubot-test-helper');
const sinon = require('sinon');
const facts = require('../../scripts/dag_fact.coffee');

const helper = new Helper('../../scripts/dag_fact.coffee');

const co = require('co');
const expect = require('chai').expect;

describe('daggity facts', () => {
  // Replace the list of facts with one known fact, so we don't
  // have to worry about randomness.
  facts.factList.splice(0, facts.factList.length, 'this is an injected fact');

  beforeEach(() => {
    this.room = helper.createRoom();
  });
  afterEach(() => {
    this.room.destroy();
  });

  describe('user asks for a dag fact', () => {
    beforeEach(() => {
      return co(
        function*() {
          yield this.room.user.say('alice', 'I request one dag fact please');
          yield this.room.user.say('bob', 'I too would like some dag facts');
        }.bind(this)
      );
    });

    it('should reply with a wonderful fact about a dag', () => {
      expect(this.room.messages).to.eql([
        ['alice', 'I request one dag fact please'],
        [
          'hubot',
          {
            text: 'this is an injected fact',
            as_user: false,
            username: 'Dag Bot (Charlie)',
            icon_emoji: ':dog:'
          }
        ],
        ['bob', 'I too would like some dag facts'],
        [
          'hubot',
          {
            text: 'this is an injected fact',
            as_user: false,
            username: 'Dag Bot (Charlie)',
            icon_emoji: ':dog:'
          }
        ]
      ]);
    });
  });

  describe('a little more in-depth test', () => {
    const robot = { hear: sinon.stub() };
    facts(robot);
    const handler = robot.hear.args[0][1];

    it('sends a random response from an array', () => {
      const res = {
        random: sinon.stub().returns('random!'),
        send: sinon.stub()
      };
      handler(res);

      expect(res.random.calledWith(sinon.match.array)).to.eql(true);
      expect(
        res.send.calledWith({
          text: 'random!',
          as_user: false,
          username: 'Dag Bot (Charlie)',
          icon_emoji: ':dog:'
        })
      ).to.eql(true);
    });
  });
});
