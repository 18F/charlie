const expect = require('chai').expect;
const moment = require('moment-timezone');
const sinon = require('sinon');
const scheduler = require('node-schedule');

describe('Angry Tock', () => {
  const clock = sinon.useFakeTimers();
  const sandbox = sinon.createSandbox();

  const robot = {
    adapter: {
      client: {
        web: {
          users: {
            list: sandbox.stub().yields(false, {
              members: [
                {
                  deleted: false,
                  is_restricted: false,
                  is_bot: false,
                  id: 'slack1',
                  real_name: 'User 1',
                  profile: {
                    email: 'user@one'
                  }
                },
                {
                  deleted: false,
                  is_restricted: false,
                  is_bot: false,
                  id: 'slack2',
                  real_name: 'User 2',
                  profile: {
                    email: 'user@two'
                  }
                },
                {
                  deleted: false,
                  is_restricted: false,
                  is_bot: false,
                  id: 'slack3',
                  real_name: 'User 3',
                  profile: {
                    email: 'user@three'
                  }
                },
                {
                  deleted: true,
                  is_restricted: false,
                  is_bot: false,
                  id: 'deleted user',
                  real_name: 'deleted user',
                  profile: {
                    email: 'user@deleted'
                  }
                },
                {
                  deleted: false,
                  is_restricted: true,
                  is_bot: false,
                  id: 'restricted user',
                  real_name: 'restricted user',
                  profile: {
                    email: 'user@restricted'
                  }
                },
                {
                  deleted: false,
                  is_restricted: false,
                  is_bot: true,
                  id: 'bot user',
                  real_name: 'bot user',
                  profile: {
                    email: 'user@bot'
                  }
                }
              ]
            })
          }
        }
      }
    },
    http: sandbox.stub(),
    logger: {
      info: sandbox.spy(),
      warning: sandbox.spy()
    },
    messageRoom: sandbox.spy()
  };

  robot.http.withArgs('tock url/user_data.json').returns({
    header: sinon
      .stub()
      .withArgs('Authorization', 'Token tock token')
      .returns({
        get: sinon.stub().returns(
          sinon.stub().yields(
            false,
            null,
            JSON.stringify([
              {
                current_employee: true,
                is_18f_employee: true,
                is_active: true,
                is_billable: true,
                organization: null,
                unit: null,
                user: 'employee1'
              },
              {
                current_employee: true,
                is_18f_employee: true,
                is_active: true,
                is_billable: true,
                organization: '18F',
                unit: 'Engineering Chapter',
                user: 'employee2'
              },
              {
                current_employee: true,
                is_18f_employee: true,
                is_active: true,
                is_billable: true,
                organization: 'Who knows',
                unit: '',
                user: 'employee3'
              },
              {
                current_employee: true,
                is_18f_employee: false,
                is_active: true,
                is_billable: true,
                organization: '',
                unit: '',
                user: 'not an 18F employee'
              },
              {
                current_employee: false,
                is_18f_employee: true,
                is_active: true,
                is_billable: false,
                organization: '',
                unit: '',
                user: 'not a current employee'
              },
              {
                current_employee: false,
                is_18f_employee: false,
                is_active: true,
                is_billable: true,
                organization: '',
                unit: '',
                user: 'not 18, nor a current employee'
              },
              {
                current_employee: true,
                is_18f_employee: true,
                is_active: false,
                is_billable: true,
                organization: '',
                unit: '',
                user: 'not active'
              }
            ])
          )
        )
      })
  });

  robot.http.withArgs('tock url/users.json').returns({
    header: sinon
      .stub()
      .withArgs('Authorization', 'Token tock token')
      .returns({
        get: sinon.stub().returns(
          sinon.stub().yields(
            false,
            null,
            JSON.stringify([
              {
                email: 'user@one',
                first_name: 'User',
                id: 'tock1',
                last_name: 'One',
                username: 'employee1'
              },
              {
                email: 'user@two',
                first_name: 'User',
                id: 'tock2',
                last_name: 'Two',
                username: 'employee2'
              },
              {
                email: 'user@three',
                first_name: 'User',
                id: 'tock3',
                last_name: 'Three',
                username: 'employee3'
              },
              {
                email: 'user@four',
                first_name: 'User',
                id: 'tock4',
                last_name: 'Four',
                username: 'employee4'
              },
              {
                email: 'user@five',
                first_name: 'User',
                id: 'tock5',
                last_name: 'Five',
                username: 'employee5'
              },
              {
                email: 'user@six',
                first_name: 'User',
                id: 'tock6',
                last_name: 'Six',
                username: 'not active'
              }
            ])
          )
        )
      })
  });

  robot.http.withArgs(sinon.match('tock url/reporting_period_audit/')).returns({
    header: sinon
      .stub()
      .withArgs('Authorization', 'Token tock token')
      .returns({
        get: sinon.stub().returns(
          sinon.stub().yields(
            false,
            null,
            JSON.stringify([
              {
                id: 'tock1',
                email: 'user@one',
                first_name: 'User',
                last_name: 'One',
                username: 'employee1'
              },
              {
                id: 'tock2',
                email: 'user@two',
                first_name: 'User',
                last_name: 'Two',
                username: 'employee2'
              },
              {
                id: 'tock4',
                email: 'user@four',
                first_name: 'User',
                last_name: 'Four',
                username: 'employee4'
              },
              {
                id: 'tock5',
                email: 'user@five',
                first_name: 'User',
                last_name: 'Five',
                username: 'employee5'
              },
              {
                id: 'tock6',
                email: 'user@six',
                first_name: 'User',
                last_name: 'Six',
                username: 'not active'
              }
            ])
          )
        )
      })
  });

  beforeEach(() => {
    sandbox.spy(scheduler, 'scheduleJob');

    process.env.HUBOT_TOCK_API = 'tock url';
    process.env.HUBOT_TOCK_TOKEN = 'tock token';
    process.env.ANGRY_TOCK_TIMEZONE = 'Asia/Tokyo';
    process.env.ANGRY_TOCK_FIRST_TIME = '10:00';
    process.env.ANGRY_TOCK_SECOND_TIME = '14:45';
  });

  afterEach(() => {
    clock.reset();
    sandbox.resetHistory();
    sandbox.restore();
  });

  after(() => {
    clock.restore();
  });

  const loadAngryTock = () => {
    delete require.cache[require.resolve('../../scripts/angry-tock')];
    return require('../../scripts/angry-tock'); // eslint-disable-line global-require
  };

  it('issues a warning and does not schedule a shouting match if un/mis-configured', () => {
    process.env.HUBOT_TOCK_API = '';
    process.env.HUBOT_TOCK_TOKEN = '';
    let angryTock = loadAngryTock();
    angryTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);

    process.env.HUBOT_TOCK_API = 'set';
    process.env.HUBOT_TOCK_TOKEN = '';
    angryTock = loadAngryTock();
    angryTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);

    process.env.HUBOT_TOCK_API = '';
    process.env.HUBOT_TOCK_TOKEN = 'set';
    angryTock = loadAngryTock();
    angryTock(robot);
    expect(robot.logger.warning.called).to.equal(true);
    expect(scheduler.scheduleJob.called).to.equal(false);
  });

  describe('schedules the next shouting match on startup', () => {
    it('if it is shouty day and before first-shout time, schedules a first-shout', () => {
      // Monday, April 8, 1974: Hank Aaron hits his 715th career homerun,
      // breaking Babe Ruth's record.
      const time = moment.tz(
        '1974-04-08 00:00:00',
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(time.toDate().getTime());

      const angryTock = loadAngryTock();
      angryTock(robot);

      time.hour(10);
      expect(
        scheduler.scheduleJob.calledWith(time.toDate(), sinon.match.func)
      ).to.equal(true);
    });

    it('if it is shouty day, after the first-shout time but before the second-shout time, schedules a second-shout', () => {
      // Monday, May 20, 1991: Michael Jordan named NBA MVP.
      const time = moment.tz(
        '1991-05-20 11:00:00',
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(time.toDate().getTime());

      const angryTock = loadAngryTock();
      angryTock(robot);

      time.hour(14);
      time.minute(45);
      expect(
        scheduler.scheduleJob.calledWith(time.toDate(), sinon.match.func)
      ).to.equal(true);
    });

    it('if it is not shouty, schedules a first-shout for the next shouty day', () => {
      // Friday, October 18, 2019 - First all-female spacewalk conducted by NASA
      // astronauts Christina Koch and Jessica Meir outside of the Internaional
      // Space Station.
      const initial = moment.tz(
        '2019-10-18 09:00:00',
        process.env.ANGRY_TOCK_TIMEZONE
      );
      clock.tick(initial.toDate().getTime());

      const angryTock = loadAngryTock();
      angryTock(robot);

      // Monday, October 21, 2019 - World's oldest natural pearl, dated at 8,000
      // years old, is found new Abu Dhabi.
      const scheduled = moment.tz(
        '2019-10-21 10:00:00',
        process.env.ANGRY_TOCK_TIMEZONE
      );
      expect(
        scheduler.scheduleJob.calledWith(scheduled.toDate(), sinon.match.func)
      ).to.equal(true);
    });
  });

  it('engages in a series of shouting matches over time, as appopriate', async () => {
    // Monday, May 1, 1978 - Ernest Nathan Morial, first African-American mayor
    // of New Orleans, is inaugurated.
    const initial = moment.tz(
      '1978-05-01 09:00:00',
      process.env.ANGRY_TOCK_TIMEZONE
    );
    clock.tick(initial.toDate().getTime());

    const angryTock = loadAngryTock();
    angryTock(robot);

    // We advance to Monday at 10:00 and we should have gotten some DMs. Tick
    // asynchronously so it breaks to event loop, allowing all the internal
    // promises and callbacks to resolve before we run our assertions.
    await clock.tickAsync(moment.duration({ hours: 1 }).asMilliseconds());

    expect(robot.messageRoom.callCount).to.equal(2);

    expect(
      robot.messageRoom.calledWith('slack1', {
        username: 'Disappointed Tock',
        icon_emoji: ':disappointed-tock:',
        text: 'Please <https://tock.18f.gov|Tock your time>!',
        as_user: false
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith('slack2', {
        username: 'Disappointed Tock',
        icon_emoji: ':disappointed-tock:',
        text: 'Please <https://tock.18f.gov|Tock your time>!',
        as_user: false
      })
    ).to.equal(true);

    // Reset stub history, then advance to the second shout and make sure we got
    // some more DMs.
    robot.messageRoom.resetHistory();
    await clock.tickAsync(
      moment.duration({ hours: 4, minutes: 45 }).asMilliseconds()
    );

    expect(robot.messageRoom.callCount).to.equal(3);

    expect(
      robot.messageRoom.calledWith('slack1', {
        username: 'Angry Tock',
        icon_emoji: ':angrytock:',
        text: '<https://tock.18f.gov|Tock your time>! You gotta!',
        as_user: false
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith('slack2', {
        username: 'Angry Tock',
        icon_emoji: ':angrytock:',
        text: '<https://tock.18f.gov|Tock your time>! You gotta!',
        as_user: false
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith('18f-gmt', {
        attachments: [
          {
            fallback:
              '• <@slack1> (notified on Slack)\n• <@slack2> (notified on Slack)',
            color: '#FF0000',
            text:
              '• <@slack1> (notified on Slack)\n• <@slack2> (notified on Slack)'
          }
        ],
        username: 'Angry Tock',
        icon_emoji: ':angrytock:',
        text: '*The following users are currently truant on Tock:*',
        as_user: false
      })
    ).to.equal(true);

    // Reset stub history, then advance to next week's first shout and make
    // sure we got fresh happy DMs.
    robot.messageRoom.resetHistory();
    await clock.tickAsync(
      moment.duration({ days: 6, hours: 19, minutes: 15 }).asMilliseconds()
    );

    expect(robot.messageRoom.callCount).to.equal(2);

    expect(
      robot.messageRoom.calledWith('slack1', {
        username: 'Disappointed Tock',
        icon_emoji: ':disappointed-tock:',
        text: 'Please <https://tock.18f.gov|Tock your time>!',
        as_user: false
      })
    ).to.equal(true);

    expect(
      robot.messageRoom.calledWith('slack2', {
        username: 'Disappointed Tock',
        icon_emoji: ':disappointed-tock:',
        text: 'Please <https://tock.18f.gov|Tock your time>!',
        as_user: false
      })
    ).to.equal(true);

    // Last time. Advance to the secound shouting. This finishes all the shouty
    // routes through the bot and we can be done.
    robot.messageRoom.resetHistory();

    // But first, clear out the truants, so we can test the case where Angry
    // Tock's rage is sated and Happy Tock returns.
    robot.http
      .withArgs(sinon.match('tock url/reporting_period_audit/'))
      .returns({
        header: sinon
          .stub()
          .withArgs('Authorization', 'Token tock token')
          .returns({
            get: sinon
              .stub()
              .returns(sinon.stub().yields(false, null, JSON.stringify([])))
          })
      });

    await clock.tickAsync(
      moment.duration({ hours: 4, minutes: 45 }).asMilliseconds()
    );

    expect(robot.messageRoom.callCount).to.equal(1);

    expect(
      robot.messageRoom.calledWith('18f-gmt', {
        username: 'Happy Tock',
        icon_emoji: ':happy-tock:',
        text: 'No Tock truants!',
        as_user: false
      })
    ).to.equal(true);
  });
});
