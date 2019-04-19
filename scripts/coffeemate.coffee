defaultWebClient = require("@slack/client").WebClient

module.exports = (robot, { WebClient = defaultWebClient } = {}) ->
	webAPI = new WebClient robot.adapter.options.token
	queue = robot.brain.get("coffeemate_queue") || []

	robot.hear /coffee me/i, (res) ->
		# First, is the current user in already in the queue?
		# If so, just let them know
		if res.message.user.id in queue
			webAPI.chat.postEphemeral
				channel: res.message.room
				user: res.message.user.id
				text: "You’re already in the queue. As soon as we find someone else to meet with, we’ll introduce you!"
				as_user: true
			return

		# If we didn't bail out already, add the current user to the queue
		queue.push(res.message.user.id)
		robot.brain.set "coffeemate_queue", queue
		robot.brain.save()
		
		# Now do we have a pair or not?
		if queue.length < 2
			webAPI.chat.postEphemeral
				channel: res.message.room
				user: res.message.user.id
				text: "You’re in line for coffee! You’ll be introduced to the next person who wants to meet up."
				as_user: true
		else
			# pair them up
			webAPI.chat.postEphemeral
				channel: res.message.room
				user: res.message.user.id
				text: "You’ve been matched up for coffee with <@" + queue[0] + ">! "
				as_user: true

			# Now start a 1:1 DM chat between the people in queue.
			robot.adapter.client.web.mpim.open queue.join(','), (err, mpim) ->
				if err or !mpim.ok
					console.log("Error with Slack API", err)
					return

				msg = "You two have been paired up for coffee. " +
						"The next step is to figure out a time that works for both of you. " +
						"Enjoy! :coffee:"

				# mpim.send msg
				robot.messageRoom mpim.group.id,
					text: msg
					username: "coffeemate"
					icon_emoji: ":coffee:"
					as_user: false

				
				# then empty the queue again
				robot.brain.set "coffeemate_queue", []
				robot.brain.save()
