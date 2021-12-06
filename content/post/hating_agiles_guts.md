+++
title = "On Hating Agile's Guts"
date = "2021-12-04T17:46:27Z"

+++

# Contents

- [The Horror, the Horror](#the-horror-the-horror)
- [The Bobblehead's Agile Versus the Rest of Us](#the-bobbleheads-agile-versus-the-rest-of-us)
    + [Decreased Productivity](#decreased-productivity)
    + [Increased Laziness](#increased-laziness)
    + [Decreased Trust](#decreased-trust)
    + [Loss of Identity](#loss-of-identity)
- [So What is Agile, Really?](#so-what-is-agile-really)
- [Conclusion](#conclusion)

---

## The Horror, the Horror

I remember the first time I was fully exposed to Agile.  It wasn't in a dark alley, but it was seedy and gross, nonetheless.

I was working for a company outside of Boston, it was my first day, and I was introduced to someone called a Scrum Master.  Ok, whatever, our industry has a lot of terms and buzzwords and silly self-proclaimed titles, and I didn't give it much thought.

Then, along came Friday.  As we all shuffled into a well-lit conference room, I noticed the Post-It notes and magic markers on a table next to one of the whiteboards, which my new co-workers were all taking with varying levels of enthusiasm.

I grabbed my fair share and asked the natural question.  "You're to write down things you felt went well", came the response, "as well as things you felt didn't go well and suggestions on how we can improve."

"Well, we can just talk to each other without this bit of silliness", I thought but didn't say out loud, it being my first week and all.

I then was distracted by the Scrum Master, who at this time chose to make his appearance, carrying what looked like a stick with feathers attached to the upper end.

It was all downhill from there.

That's when all the Native American references started appearing.  "What is this, and why would they shamelessly incorporate Native American culture into their business practices?", I thought, and then:

"Is this really only my first week?  [I think I've made a huge mistake]."

## The Bobblehead's Agile Versus the Rest of Us

Since then, I haven't worked anywhere that had that level of pageantry, but every company used Agile to one degree or another.  New buzzwords, new faces, and yet the same results, at least as far as I was concerned.

And, what were those results?  The same as all the places I worked before Agile gripped the business world and titillated the imaginations of millions of product managers.

Some weeks were better than others (of course, it depends upon how you define "better").  Some tickets were worked, others were studiously avoided.  Many issues came up that weren't anticipated.  Some people communicated well, others didn't.

Crucially, though, there was now a difference.  In addition to the new goofy language that I'm supposed to use to discuss things that we already had perfectly good words for, programmers were now expected to care much more about business priorities than ever before, and in a way that is harmful to our work.  This, to me, has never passed the sniff test.

Here are some results of using Agile that I've seen play out numerous times at different companies.  They are all interrelated and connected, just like in business, where we all equally share in the profits!

### Decreased Productivity

Ostensibly, Agile gets features to the users quicker than ever before in the history of humankind.  However, my experience with Agile has been that it creates mountains and mountains of technical debt.

But don't worry, there's a ticket(s) for that, it's in the backlog.

And how often do we get to those tickets?  Well, we don't, because fixing technical debut Doesn't Provide Value to the Customer.

Then comes that inevitable day when even the manager concedes that the codebase has turned into an enormous steaming pile of manure, and now you can't get that feature out the door that Sales and Marketing over-promised because of it.

### Increased Laziness

+ **Begin Scene**: During the "Sprint", I submit a pull request with an easy fix of some outstanding technical debt.
+ **Agile Guy**: "Whoa, what's this?"
+ **Me**: "Oh, it's just some technical debt that I fixed."
+ **Agile Guy**: "Whoa, is this in your Sprint?"
+ **Me**: "It needs to be in my Sprint?"
+ **Agile Guy**: "Hey, we all agreed at the start of the Sprint on what our tickets should be."
+ **Me**: "I don't see what the problem is."
+ **Agile Guy**: "Well, there's no ticket for this."
+ **Me**: "I don't know how I could have possibly foreseen this.  Does it need to have a ticket?  It didn't take long at all to fix, can't we just review it and merge?"
+ **Agile Guy**: "Tell you what, bring this up in today's Standup and we'll discuss it in the Parking Lot!  Maybe we can create an Epic!"
+ **Me**: "..."
+ **Agile Guy**: "And, add it to the Backlog!"
+ **Annnnnnnnd End Scene**

So, today I learned that I don't have to do anything I don't want to do because It's Not in the Sprint.  Brilliant!

Bonus points if you're also told that it's not on the Roadmap.

In my view, what's notable about this is that unwillingness and laziness is codified into the Agile methodology.   Where before this type of behavior would be looked at askance, it's now seen as just following the rules.

### Decreased Trust

Why are you asking me what's in my Sprint?  Are you genuinely interested or are you keeping tabs on me?

Personally, I don't usually care beyond a mild interest what you're working on.  If you're blocked, I trust that you'll ask for help.  If you fix something, whether it's in the Sprint or not, I'm not going to question you and wonder if it took time away from some other task.  I'll just figure it was worth it, and I'll be glad that you have the drive and desire to fix things as you come across them.

I want to work with people like that.

Sometimes that get-up-and-go attitude, which should be highly-prized, is perceived as a bad thing that is a burden for others, I guess because Agile rules have been broken.  It makes no sense to me.

What happens if your Sprint work "rolls over" into the next Sprint?  Well, nothing, that's software development, isn't it?  Unexpected things come up, and we nod and say "Yep, that always happens", and then we'll have ourselves a nice little chuckle.

However, depending upon Agile and the rich ambiguous metrics that it offers, you just *might* instead get a warning that this has happened before and that it's negatively "impacting" the team's Velocity.

Holy crap!

You know what's ~~fun~~ ~~not fun~~ really awful?  Sprint planning and that poker game you have to play with the Fibonacci numbers.  This is where I get to tell you, the domain expert for a particular piece of software, how long you get to work on it.

Think it's a 5?  Think again!  Me and the rest of the team that have no idea what this code does think it's a 3!

### Loss of Identity

This is the worst of the bunch.

In my view, it's not hyperbolic to say that some programmers have become confused as to who they are and the purpose they serve.  Programmers are supposed to care about code, just as sales people are supposed to care about accounts and beavers are supposed to care about wood.

But I've personally witnessed just the opposite of this.  One of the most common complaints about Agile is how much the quality of the code suffers when not advocating for best practices.

I believe some of this has to do with younger programmers never having worked in an environment that **didn't** involve Agile.

Here is a short list of things that I often see passed over as not providing enough "value".  They rarely make it out of the Backlog, and if they do, are often kicked back in after realizing that the team has "taken on too many Story Points".

- refactoring
- tests
- security

If your manager doesn't advocate for you, then you're pretty much shit out of luck.  And some team members will happily go along with it.

## So What is Agile, Really?

The irony is that the [principles of the Agile Manifesto] are quite reasonable, and dare I say, commonsensical.  Interestingly, even [some of the founders of the Manifesto have had the shits] of their ideas being hijacked by taskmasters and self-important people with bad ideas (usually the same person) and, most appallingly, some fellow programmers.

Shockingly, Agile is not as Agile was intended.

[Robert C. Martin], one of the creators of Agile, has a fairly damning indictment of the bastardization of Agile by business interests, which starts at the 1:03:50 mark [from this talk] (the video is also embedded in the linked article in the previous paragraph).

He addresses some of my biggest criticisms of Agile, which is [that some programmers tend to align themselves with business priorities] and thus abandon their allegiance to purported priorities abscond from their responsibility and abandoning their leadership on technical subjects, which is our expertise and our domain.

## Conclusion

As I have written before, if we don't advocate for our domain, who will?  It is our responsibility alone in the organization.

The problem is...human beings!  It's a shock that humans would take a simple idea and immediately complicate it.

---

Oh, Business!  Your crisp handshakes and even crisper suits!  Intoxicating!  You allow me my two-hour commute and position at the trough!

[I think I've made a huge mistake]: /2021/11/26/on-realizing-youve-made-a-huge-mistake/
[principles of the Agile Manifesto]: https://agilemanifesto.org/principles.html
[some of the founders of the Manifesto have had the shits]: https://www.objectstyle.com/agile/why-developers-hate-agile
[Robert C. Martin]: https://en.wikipedia.org/wiki/Robert_C._Martin
[from this talk]: https://www.youtube.com/watch?v=ecIWPzGEbFc
[that some programmers tend to align themselves with business priorities]: /2021/11/26/on-realizing-youve-made-a-huge-mistake/

