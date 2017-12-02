const sinon = require('sinon');
const expect = require('chai').expect;

const moment = require('moment');
const reminder = require('../../scripts/holiday-reminder');

describe('holiday reminder', () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    messageRoom: sandbox.spy(),
    brain: {
      get: sandbox.stub(),
      set: sandbox.spy()
    }
  };

  const functionMocks = {
    isWeekend: sandbox.stub(),
    isReportingTime: sandbox.stub(),
    hasRunAlready: sandbox.stub(),
    getNextWeekday: sandbox.stub(),
    holidayForDate: sandbox.stub()
  };

  beforeEach(() => {
    sandbox.reset();
  });

  describe('checks if already run today', () => {
    it('returns false initially', () => {
      robot.brain.get.withArgs('LAST_HOLIDAY_REPORT_DATE').returns(0);
      expect(reminder.hasRunAlready(moment(), robot)).to.equal(false);
    });

    it('returns true if stashed date is same as passed-in date', () => {
      robot.brain.get.withArgs('LAST_HOLIDAY_REPORT_DATE').returns('08:00')
      const date = {
        format: () => '08:00'
      };
      expect(reminder.hasRunAlready(date, robot)).to.equal(true);
    });
  });

  describe('checks if a date is a weekend', () => {
    const weekdays = [
      moment('2017-10-16'),
      moment('2017-10-17'),
      moment('2017-10-18'),
      moment('2017-10-19'),
      moment('2017-10-20')
    ];
    const weekends = [
      moment('2017-10-15'),
      moment('2017-10-21')
    ];

    it('returns false for weekdays', () => {
      weekdays.forEach(date => {
        expect(reminder.isWeekend(date.utc())).to.equal(false);
      });
    });

    it('returns true for weekends', () => {
      weekends.forEach(date => {
        expect(reminder.isWeekend(date.utc())).to.equal(true);
      });
    });
  });

  describe('checks if it is time to report', () => {
    let targetHours, targetMinutes;
    before(() => {
      const configuredTime = moment(process.env.REPORTING_TIME || '15:00', 'HH:mm');
      targetHours = configuredTime.hours();
      targetMinutes = configuredTime.minutes();
    });

    it('returns false for all times other than the configured one', () => {
      const timesToTest = [ ];
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute++) {
          if (hour === targetHours && minute === targetMinutes) {
            continue;
          }
          const dateString = `2017-10-18T${hour < 10 ? '0' : ''}${hour}:${minute < 10 ? '0' : ''}${minute}:00Z`;
          timesToTest.push(`${hour < 10 ? '0' : ''}${hour}:${minute < 10 ? '0' : ''}${minute}:00Z`);
        }
      }

      timesToTest.forEach(timeString => {
        expect(reminder.isReportingTime(moment(`2017-10-18T${timeString}`).utc())).to.equal(false);
      });
    });

    it('returns true for the configured time', () => {
      const dateString = `2017-10-18T${targetHours < 10 ? '0' : ''}${targetHours}:${targetMinutes < 10 ? '0' : ''}${targetMinutes}:00`;
      expect(reminder.isReportingTime(moment(dateString))).to.equal(true);
    });
  });

  describe('gets the next weekday', () => {
    it('gives me a Monday if today is Friday', () => {
      const date = moment('2017-10-13');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Monday');
    });

    it('gives me a Monday if today is Saturday', () => {
      const date = moment('2017-10-14');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Monday');
    });

    it('gives me a Monday if today is Sunday', () => {
      const date = moment('2017-10-15');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Monday');
    });

    it('gives me a Tuesday if today is Monday', () => {
      const date = moment('2017-10-16');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Tuesday');
    });

    it('gives me a Wednesday if today is Tuesday', () => {
      const date = moment('2017-10-17');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Wednesday');
    });

    it('gives me a Thursday if today is Wednesday', () => {
      const date = moment('2017-10-18');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Thursday');
    });

    it('gives me a Friday if today is Thursday', () => {
      const date = moment('2017-10-19');
      expect(reminder.getNextWeekday(date.utc()).format('dddd')).to.equal('Friday');
    });
  });

  describe('gets the holiday for a given date', () => {
    it('returns false for days that are not holidays', () => {
      const notHolidays = [
        moment('2017-10-08'),
        moment('2017-11-12'),
        moment('2019-07-03')
      ];

      notHolidays.forEach(date => {
        expect(reminder.holidayForDate(date.utc())).to.equal(false);
      });
    });


    it('returns true for days that are holidays', () => {
      const holidays = [
        moment('2017-10-09'),
        moment('2017-11-23'),
        moment('2019-07-04')
      ];

      holidays.forEach(date => {
        expect(reminder.holidayForDate(date.utc())).to.be.an('object');
      });
    });
  });

  describe('the ticker works as expected', () => {
    describe('it does not post a reminder when...', () => {
      it('...it is a weekend', () => {
        functionMocks.isWeekend.returns(true);
        reminder.timerTick(robot, null, functionMocks);
        expect(robot.messageRoom.callCount).to.equal(0);
      });

      it('...it is not 15:00', () => {
        functionMocks.isReportingTime.returns(false);
        reminder.timerTick(robot, null, functionMocks);
        expect(robot.messageRoom.callCount).to.equal(0);
      });

      it('...it has already run today', () => {
        functionMocks.hasRunAlready.returns(true);
        reminder.timerTick(robot, null, functionMocks);
        expect(robot.messageRoom.callCount).to.equal(0);
      });

      it('...the next weekday is not a holiday', () => {
        functionMocks.holidayForDate.returns(false);
        reminder.timerTick(robot, null, functionMocks);
        expect(robot.messageRoom.callCount).to.equal(0);
      });
    });

    it('posts a reminder when it is a weekday, it is 15:00, it has not already run, and the next weekday is a holiday', () => {
      functionMocks.isWeekend.returns(false);
      functionMocks.isReportingTime.returns(true);
      functionMocks.hasRunAlready.returns(false);
      functionMocks.holidayForDate.returns({ name: 'Holiday!' });
      functionMocks.getNextWeekday.returns(moment());
      reminder.timerTick(robot, moment(), functionMocks);
      expect(robot.messageRoom.callCount).to.equal(1);
      expect(robot.brain.set.calledWith('LAST_HOLIDAY_REPORT_DATE'));
    });
  });

  describe('integration tests', () => {
    beforeEach(() => {
      functionMocks.isReportingTime.returns(true);
      functionMocks.hasRunAlready.returns(false);
      functionMocks.isWeekend = reminder.isWeekend;
      functionMocks.getNextWeekday = reminder.getNextWeekday;
      functionMocks.holidayForDate = reminder.holidayForDate;
    });

    describe('does not report on weekends', () => {
      describe('does not report on Saturdays...', () => {
        it('...when the next Monday is not a holiday', () => {
          reminder.timerTick(robot, moment('2017-10-21').utc(), functionMocks);
          expect(robot.messageRoom.callCount).to.equal(0);
        });

        it('...when the next Monday is a holiday', () => {
          reminder.timerTick(robot, moment('2017-10-07').utc(), functionMocks);
          expect(robot.messageRoom.callCount).to.equal(0);
        });
      });

      describe('does not report on Sundays...', () => {
        it('...when the next Monday is not a holiday', () => {
          reminder.timerTick(robot, moment('2017-10-22').utc(), functionMocks);
          expect(robot.messageRoom.callCount).to.equal(0);
        });

        it('...when the next Monday is a holiday', () => {
          reminder.timerTick(robot, moment('2017-10-08').utc(), functionMocks);
          expect(robot.messageRoom.callCount).to.equal(0);
        });
      });
    });

    describe('does not report if the next weekday is not a holiday', () => {
      it('...and it is not Friday', () => {
        reminder.timerTick(robot, moment('2017-10-25').utc(), functionMocks);
        expect(robot.messageRoom.callCount).to.equal(0);
      });

      it('...and it is Friday', () => {
        reminder.timerTick(robot, moment('2017-10-27').utc(), functionMocks);
        expect(robot.messageRoom.callCount).to.equal(0);
      });
    });

    describe('does report if the next weekday is a holiday', () => {
      it('...and it is not Friday', () => {
        reminder.timerTick(robot, moment('2017-11-22').utc(), functionMocks);
        expect(robot.messageRoom.callCount).to.equal(1);
        expect(robot.brain.set.calledWith('LAST_HOLIDAY_REPORT_DATE'));
      });

      it('...and it is Friday', () => {
        reminder.timerTick(robot, moment('2017-10-06').utc(), functionMocks);
        expect(robot.messageRoom.callCount).to.equal(1);
        expect(robot.brain.set.calledWith('LAST_HOLIDAY_REPORT_DATE'));
      });
    });

    describe('some holiday edge cases', () => {
      it('2018 New Year\'s (falls on Monday 2018, should remind on Friday 2017)', () => {
        reminder.timerTick(robot, moment('2017-12-29').utc(), functionMocks);
        expect(robot.messageRoom.callCount).to.equal(1);
        expect(robot.brain.set.calledWith('LAST_HOLIDAY_REPORT_DATE'));
      });

      it('Thanksgiving any year (should remind on a preceding Wednesday)', () => {
        reminder.timerTick(robot, moment('2017-11-22').utc(), functionMocks);
        expect(robot.messageRoom.callCount).to.equal(1);
        expect(robot.brain.set.calledWith('LAST_HOLIDAY_REPORT_DATE'));
      });
    });
  });
});
