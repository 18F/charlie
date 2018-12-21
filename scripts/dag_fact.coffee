# Description:
#   Selects a random dog fact
#
# Commands:
#   dag facts
#
# Author:
#   TC Baxter

facts = [
  ":belle-dag: Belle loves sunbeams more than anything except belly rubs and bacon.",
  ":belle-dag: Belle likes to have her nails painted. She holds out her paw to have it
    done, then wants to show everyone how they look when they're done.",
  ":belle-dag: Belle can't see or hear all that well anymore.
    She relies on her well-honed sniffer.",
  ":bubba: Bubba used to be scared of walking down the stairs,
      so Kate and Micah had to carry him downstairs each day.",
  ":bubba: Bubba’s favorite food is cottage cheese.",
  ":bubba: On walks, Bubba is easily intimidated — he’s typically scared of
      garbage cans and upturned paper grocery bags.",
  ":bubba: Bubba was originally going to be named “Tater Tot” (but Bubba was a better fit).",
  ":cooper: Cooper's full name is Wilford J Cooperbottom.",
  ":cooper: Cooper only likes two toys: his laser and destroying whatever toy
      Cupcake had a minute ago.",
  ":cooper: One day Cooper was paying too much attention to another dog
    and he walked right into a parked car.",
  ":cooper: Every winter we have to rub dryer sheets on Cooper or else he gets shocked every
    time someone touches him. He gets very careful about touching anyone.",
  ":cooper: When we go to the dog park, Cooper likes to show off on the agility dog ramps.
    We never trained him to do the ramps,
    he just saw other dogs on them and he likes to one-up other dogs.",
  ":cooper: If you give :cooper: Cooper and :cupcake-dag: Cupcake a toy they will remember.
    When you come to visit months later they will go to the toybox and get it out to show you
    that they still have it."
  ":cupcake-dag: Cupcake does not like hats. At all.",
  ":cupcake-dag: Cupcake's full name is Princess Petunia Cupcake.",
  ":cupcake-dag: Cupcake likes to nap on the back of the couch.",
  ":cupcake-dag: Cupcake can roll down car windows, but she won't do it for Cooper.",
  ":fox-dag: Fox and Luna are 18F dog twins.",
  ":fox-dag: Fox's favorite food is smoked salmon. She's fancy like that.",
  ":fox-dag: Fox once barked at a picture of a dog in a magazine.",
  ":hugo: Hugo is named after Hugo Cabret, the literary child abandoned to
      raise himself in the infrastructure of a railway station,
      on account of his being abandoned by his prior owners.",
  ":hugo: Hugo can be convinced to crawl under a bed from one side to the other when amped up.",
  ":hugo: Hugo will do a somersault on command,
      but only in front of the bedroom closet where he originally learned the trick.",
  ":hugo: Hugo is terrified of humans wearing headbands with springy things on them,
      even if they are people he knows well.",
  ":laddie-dag: Laddie is scared of his own farts.",
  ":loki: Loki will give you the stare of death if you do not share an apple with him.",
  ":loki: Loki’s tongue is physically too large for his own mouth and just hangs out all day.",
  ":loki: Loki once ate an entire bag of Reese’s peanut butter cups, wrappers and all.
      He had sparkly :poop: for a week!",
  ":loki: Loki once decided it was a good idea to roll around in cow patties
      and run up to us like it was no big deal.",
  ":loki: Loki was named after the Nordic god of tricks and mischief,
      which fits his personality perfectly.",
  ":mahalo_goldeneye: Mahalo raced in Daytona Beach, Florida.",
  ":mason: Mason's middle name is Dreamsicle. It was his name when we adopted him
      (his sister was Creamsicle).",
  ":neko: Jessie dropped an apple once, and Neko grabbed it like a ball
      and went running around the house to show it off.",
  ":neko: Neko is part rottweiler, part pit bull, and part chow chow,
      which is the best and weirdest and most surprising thing.",
  ":pancho-dag: Pancho can read.",
  ":pancho-dag: Pancho is not color blind, he knows UPS brown.",
  ":pixie: I am a rescue that was found injured on the side of the highway.
     Don't worry I'm all healed up and healthy now. - Pixie",
  ":pixie: I like to give \"puppy hugs\", where I lean on you
      placing my paws around you. - Pixie :two_hearts:",
  ":pixie: I love to chase and bark at wheels! - Pixie",
  ":pixie: My middle name is sioux. - Pixie",
  ":pixie: My favorite chew toy was \"my Tito\", a plush Titos vodka bottle
    gifted from my neighbor who works in the food/bev industry :joy:.
    Tito was retired in 2018, and my new favorite is \"Ricky\", an
    unstuffed floppy raccoon. - Pixie",
  ":pixie: I love  to go on hikes in the wilderness and will hike all day. - Pixie",
  ":pixie: I still see my foster mom regularly
      and stay with her when my owners go on extendted trips. - Pixie",
  ":pixie: My owner is @scottweber - Pixie",
  ":ripley-dag: Ripley sleeps on her dog bed in our bedroom, but every morning,
    about a half hour before it's time for us to get up,
    she climbs into the human bed under the covers for some snugs",
  ":ripley-dag: One time Ripley ate some weird peach thing from
    the tree on the corner and barfed on the couch.",
  ":ripley-dag: Ripley is scared of even the smallest human toot,
    but happily delivers her own brutal farts with extreme nonchalance.",
  ":ripley-dag: Things Ripley has calmly slept through: thunderstorms, fireworks,
    the dogs next door barking all day, our house getting its roof replaced. :sweat_smile:",
  ":ripley-dag: Ripley was the star pupil of her obedience class, at least until she
    celebrated by dropping a :poop: in the middle of the floor on graduation day.",
  ":ripley-dag: Ripley sleeps on her dog bed in our bedroom, but every morning,
    about a half hour before it's time for us to get up, she climbs into the human bed
    under the covers for some snugs.",
  ":ripley-dag: Thanks to the magic of static cling, Ripley often gets up from a nap and wanders
      around the house with her blanket stuck to her like a shawl or some kind of strange dog skirt.",
  ":ruby-dag: If there is snow on the ground and I'm outside, there is snow on my snoot. - Ruby",
  ":ruby-dag: I like to growl at carved pumpkins. :jack_o_lantern: - Ruby",
  ":ruby-dag: Finding street food on the ground is one of my best talents. I found a _full chicken thigh_ once. - Ruby",
  ":scully: Scully doesn't chew human things she's not supposed to.
      But she does pick up socks that are left on the floor and move them to other locations.",
  ":winry-smile: Winry was afraid of going up or down stairs,
      so when Greg moved into a house that had them,
      she just slept in the living room by herself until she got over it.",
  ":winry-smile: Winry ate a banana peel once when Greg wasn't looking.
      She was totally fine.",
  ":winry-smile: Winry has heterochromia - one eye is solid blue
      but the other is half blue,half brown.",
  ":winry-smile: Sometimes if you put one of Winry's back feet near her ear,
    it'll start scratching automatically.
    That gets on her nerves and she'll start biting her foot to make it stop.",
  ":winry-smile: Winry likes to be pushed around the carpet.
    You push her away and she jumps up and comes running back to your hands."
  ":zoey: Zoey thinks she is the cat police at our house:
      if they are fighting (usually playfully) with each other, she runs up to them,
      sits in front of them and whines until they stop.",
  ":zoey: Zoey loves to take baths. When I say, \"time for a bath?!\"
      she will run to the bathtub and sit down.",
]

module.exports = (robot) ->
  robot.hear /dag fact(s)?/i, (res) ->
    fact = res.random(facts)

    emoji = ':dog:'
    match = fact.match /^(:[^:]+:)(.*)$/
    if match
      emoji = match[1]
      fact = match[2].trim()

    res.send
      text: fact
      as_user: false
      username: 'Dag Bot (Charlie)'
      icon_emoji: emoji

module.exports.factList = facts;
