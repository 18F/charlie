
function Bot(rtm, request, token) {
	var startTime = new Date();
	var queue;

	function emptyQueue(callback) {
		robot.brain.set("queue", '');
		robot.brain.save()
	}

	function openGroupChat(coffeemateId, coffeeQueue) {
		var users = coffeemateId + ',' + coffeeQueue[0].user + ',' + coffeeQueue[1].user;
		var options = {url: "https://slack.com/api/mpim.open",
						qs: {token: token, users: users}};
		request.get(options, function(err, response, body) {
		    bodyObj = JSON.parse(body);
		    if(bodyObj.ok) {
		    	rtm.sendMessage("Hey! You two have been paired up for coffee. Next step is to figure out a time that works for both of you. Enjoy! :coffee:"
		  			, bodyObj.group.id);
		    }
		});
	}

	function listenForPrompts(coffeemateId) {
		rtm.start();

		var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

		rtm.on(RTM_EVENTS.MESSAGE, function (message) {
		  if(message.type === 'message' && message.text && message.text.toLowerCase().indexOf('coffee me') >= 0
		  		&& message.user !== coffeemateId) {
		  	queue.insert({user: message.user, available: true, timestamp: new Date()}, function(err, result) {
			  	queue.find({available: true}).toArray(function(err, coffeeQueue) {
				  	if((coffeeQueue.length % 2) === 1) {
				  		rtm.sendMessage("You’re in line for coffee! " +
				  			"You’ll be introduced to the next person who wants to meet up.", message.channel);
				  	}

				  	if(coffeeQueue.length >= 2) {
				  		nPairs = Math.floor(coffeeQueue.length / 2);

				  		for(var pairIdx = 0; pairIdx < nPairs; pairIdx++) {
				  			partner1 = pairIdx*2
				  			partner2 = pairIdx*2 + 1
					  		coffeeQueue[partner1].available = false;
					  		coffeeQueue[partner2].available = false;
					  		queue.update({_id: coffeeQueue[partner1]._id}, coffeeQueue[partner1]);
					  		queue.update({_id: coffeeQueue[partner2]._id}, coffeeQueue[partner2]);

					  		if(coffeeQueue[partner1].user !== coffeeQueue[partner2].user) {
						  		rtm.sendMessage(
						  			"You’ve been matched up for coffee with <@" + coffeeQueue[partner1].user + ">! " +
						  			"I’ll start a direct message for you two. :coffee: :tada:",
						  			message.channel);
						  		openGroupChat(coffeemateId, coffeeQueue, rtm);
					  		} else {
					  			rtm.sendMessage("You’re no longer in line for coffee. " +
					  				"But go ahead and pour yourself a cup—you deserve a break.",
						  			message.channel);
					  		}
				  		}
				  	}
				  	});
		  	});

		  } else {
		  	if(message.type === 'message' && message.text && message.text.indexOf('coffee queue') >= 0) {
		  		queue.find({available: true}).toArray(function(err, coffeeQueue) {
		  		rtm.sendMessage("People in line for coffee: " + coffeeQueue.length,
		  			message.channel);
		  	});
		   } else {
		   	if(message.type === 'message' && message.text &&
		  		(message.text.indexOf(coffeemateId) >= 0 || message.channel[0] == 'D')) {
		  		rtm.sendMessage("Sorry, I didn’t get that. To set up a virtual coffee, " +
		  			"direct message me and say `coffee me`, and I’ll match you up with a teammate. " +
		  			"You can also post `coffee me` in any channel I’m invited to.",
			  			message.channel);
		  	}
		   }}});}

	function run() {
		queue = robot.brain.get("queue");
		queue.ensureIndex('available'); // Probably not redis-y

		var options = {url: "https://slack.com/api/users.list",
						qs: {token: token}};
		request.get(options, function(err, response, body) {
				bodyObj = JSON.parse(body);
				if(bodyObj.ok) {
					var coffeemateId = bodyObj.members.filter(function(member) {
						return member.name === 'coffeemate'})[0].id
					listenForPrompts(coffeemateId);
				}
		})
	}

	return {run: run, emptyQueue: emptyQueue};
}

module.exports.Bot = Bot;