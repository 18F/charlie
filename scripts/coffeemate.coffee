request = require('request')

module.exports = (robot) ->
	queue = robot.brain.get("coffeemate_queue") || []
	robot.hear /coffee me/i, (res) ->
		# First, is the current user in already in the queue?
		# If so, just let them know
		console.log("the current user is", res.message.user.name)
		console.log("the current queue is", queue)
		if res.message.user.name in queue
			res.reply "You're already in the queue. " +
				"As soon as we find someone else to meet with, we'll introduce you."
			#return
		# If we didn't bail out already, add the current user to the queue
		queue.push(res.message.user.name)
		robot.brain.set "coffeemate_queue", queue
		robot.brain.save()
		# Now do we have a pair or not?
		if queue.length < 2
			res.reply "You’re in line for coffee! " +
				"You’ll be introduced to the next person who wants to meet up."
		else
			# pair them up
			res.reply "You’ve been matched up for coffee with <@" + queue[0] + ">! " +
				"I’ll start a direct message for you two. :coffee: :tada:"
			# Now start a 1:1 DM chat between the people in queue.
			options = {
				token: process.env.HUBOT_SLACK_TOKEN,
				users: queue.toString()
			}

			mpim = robot.adapter.client.web.mpim.open { options }, (err, mpim) ->
				if err or !mpim.ok
					console.log("Error with Slack API", err)
				
				msg = "You two have been paired up for coffee." +
						"The next step is to figure out a time that works for both of you." +
						"Enjoy! :coffee:"

				mpim.send msg
				
				# then empty the queue again
				robot.brain.set "coffeemate_queue", []
				robot.brain.save()
