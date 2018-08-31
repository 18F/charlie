Helper = require('hubot-test-helper')
helper = new Helper('../../scripts/love.coffee')

co     = require('co')
expect = require('chai').expect

describe 'love machine', ->

  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'user triggers love message', ->
    beforeEach ->
      co =>
        yield @room.user.say 'alice', 'love @bob for the cheesecake'

    it 'should reply to user', ->
      expect(@room.messages).to.eql [
        ['alice', 'love @bob for the cheesecake']
        ['hubot', 'alice loves @bob: for the cheesecake']
        ['hubot', 'Yay, more love for #love! Thanks, alice!']
      ]
