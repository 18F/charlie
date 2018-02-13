const sinon = require('sinon');
const expect = require('chai').expect;

describe('startup announcement', () => {
  const robot = {
    messageRoom: sinon.stub()
  };

  beforeEach(() => {
    robot.messageRoom.reset();
    delete require.cache[require.resolve('../../scripts/startup_announce')];
  });

  it('announces itself when starting up, using default channel', () => {
    const announceSetup = require('../../scripts/startup_announce');
    announceSetup(robot);

    expect(robot.messageRoom.calledWith('bots', { target: 'bots', text: sinon.match.string })).to.be.true;
  });

  it('uses the channel value from the environment, if provided', () => {
    process.env.HUBOT_STATUS_CHANNEL = 'status-channel'
    const announceSetup = require('../../scripts/startup_announce');
    announceSetup(robot);

    expect(robot.messageRoom.calledWith('status-channel', { target: 'status-channel', text: sinon.match.string })).to.be.true;
  });
});
