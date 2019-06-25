const expect = require('chai').expect;
const sinon = require('sinon');

const fancyFont = require('../../scripts/fancy-font');

describe('fancy-font', () => {
  const robot = {
    hear: sinon.stub()
  };

  beforeEach(() => {
    robot.hear.resetBehavior();
    robot.hear.resetHistory();
  });

  it('subscribes to "fancy font" messages', () => {
    fancyFont(robot);
    expect(
      robot.hear.calledWith(/^fancy font (.*)$/i, sinon.match.func)
    ).to.equal(true);
  });

  it('converts ASCII Latin characters to fancy font', () => {
    const send = sinon.spy();

    fancyFont(robot);
    const handler = robot.hear.args[0][1];
    handler({
      match: [
        'fancy font ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz'
      ],
      send
    });

    expect(
      send.calledWith('𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩 𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃')
    ).to.equal(true);
  });

  it('hands back non-ASCII Latin characters without changing them', () => {
    const send = sinon.spy();

    fancyFont(robot);
    const handler = robot.hear.args[0][1];
    handler({
      match: ['fancy font ABC abc å∫ç∂´ƒ©', 'ABC abc å∫ç∂´ƒ©'],
      send
    });

    expect(send.calledWith('𝓐𝓑𝓒 𝓪𝓫𝓬 å∫ç∂´ƒ©')).to.equal(true);
  });
});
