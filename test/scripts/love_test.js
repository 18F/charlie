const expect = require('chai').expect;
const sinon = require('sinon');

const script = require('../../scripts/love');

describe('love machine', () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    hear: sandbox.spy(),
    messageRoom: sandbox.spy()
  };

  const send = sandbox.spy();

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  describe('user triggers love message', () => {
    let handler;
    let regex;

    beforeEach(() => {
      script(robot);
      regex = robot.hear.args[0][0];
      handler = robot.hear.args[0][1];
    });

    it('should reply to user', () => {
      const match = regex.exec('love @bob for the cheesecake');
      handler({ match, message: { user: { name: 'alice' } }, send });

      expect(
        robot.messageRoom.calledWith(
          'love',
          'alice loves @bob: for the cheesecake'
        )
      ).to.equal(true);

      expect(
        send.calledWith('Yay, more love for #love! Thanks, alice!')
      ).to.equal(true);
    });
  });
});
