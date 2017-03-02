Helper = require('hubot-test-helper')
scriptHelper = new Helper('../../scripts/love.coffee')

co     = require('co')
expect = require('chai').expect

describe 'hello-world', ->

  beforeEach ->
    @room = scriptHelper.createRoom(httpd: false)

  context 'user triggers love message', ->
    beforeEach ->
      co =>
        yield @room.user.say 'alice', 'love @bob for the cheesecake'

    it 'should reply to user', ->
      expect(@room.messages).to.eql [
        ['alice', 'love @bob for the cheesecake']
        ['hubot', '@alice hi']
      ]
