# Description:
#   Inspect the data in redis easily
#
# Commands:
#   hubot show users - Display all users that hubot knows about
#   hubot show storage - Display the contents that are persisted in the brain

get_tock_lines = (robot) ->
    tock_lines = robot.brain.get('tock_lines')
    if !tock_lines
      tock_lines = { }
    return tock_lines

module.exports = (robot) ->
  robot.respond /tock line$/i, (msg) ->
    tock_lines = get_tock_lines(robot)
    if tock_lines[msg.envelope.room]
      msg.send 'The tock line for #' + msg.envelope.room + ' is ' + tock_lines[msg.envelope.room]
    else
      msg.send 'I don\'t know a tock line for this room!'

  robot.respond /set tock line (.*)$/i, (msg) ->
    tock_lines = get_tock_lines(robot)
    tock_lines[msg.envelope.room] = msg.match[1]
    robot.brain.set 'tock_lines', tock_lines
    robot.brain.save()
    msg.send 'Okay, I set the tock line for this room'
