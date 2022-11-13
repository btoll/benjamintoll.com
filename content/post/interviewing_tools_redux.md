+++
title = "On Interviewing Tools, Redux"
date = "2022-11-11T21:00:57Z"

+++

"I was looking for a job and then I found a job.  And Heaven knows, I'm miserable now."

- Morrissey

---

This is [the second part] of an award-winning series.

- [The Big Introduction](#the-big-introduction)
- [Thoughts on Coding Challenges](#thoughts-on-coding-challenges)
- [Thoughts on Interviewing](#thoughts-on-interviewing)
- [Conclusion](#conclusion)
- [References](#references)

## The Big Introduction

I was interviewing a lot recently as a "devops" dude.  For the most part I enjoy interviewing (even though I historically have a lot of anxiety around it), but I keep running into a disturbing trend that [I wrote about before].

More on that in a bit.  But first, an exciting announcement:  I'm no longer doing coding challenges in interviews.  Hurray!

> Note that this article is about interviewing for a **"devops"** role.

## Thoughts on Coding Challenges

Does this mean that I don't think that interviews shouldn't have a coding component?  No, of course not!  Is there anything quite as titillating as seeing code coming at you in a technical job interview?  It's just that I'm not doing your silly coding algorithm challenges lifted from leetcode or some other website anymore.

So, why am I taking this non-controversial position?  Primarily because of the direct experience I've had working as both a programmer and "devops" dude over the course of my career and common sense.

For instance, I've never had to write any code as a "devops" dude that needed a graph algorithm, but I've been asked them in interviews.  I've never had to use an implementation of [Pascal's triangle] (or any of the other asinine questions I was asked in interviews for a JavaScript "engineer" role) to solve a problem with the frontend of a website.

Of course, there is a time and place for everything.  For instance, I've had to be familiar with and write (and read) many practical algorithms when applying to positions writing system code in Python and Go.  However, I didn't have one or more people watching me silently as I did so.  The ability to code under pressure is certainly a skill, but it doesn't necessarily mean that someone is a good programmer or translate into the ability to solve business problems in a logical and simple way that is also maintainable and extensible.

I've written openly before about my struggles with intense anxiety about doing coding interviews, so I'm not trying to hide anything or put lipstick on a pig (perhaps not the correct analogy).  I know I'm a good programmer, but depending on many factors that are completely out of my control, I may do poorly in your interview.

This is enough reason for me to opt-out of participating in coding challenges.  However, there is another side to this, a dark side, like the underside of a dog turd that has been out in the yard for an entire New England winter, just waiting to be discovered.

Once I would land the job, I would quickly discover that too often the code was poorly written and lacked any kind of thought for the future.  This included current code that was being checked in.  After [realizing that I had made a terrible mistake], I could only conclude that the apparent reverence of "clean" code and Dr. Bob displayed during their interview(s) did not extend to their production code nor fit into [their Agile methodology] of rushing value to the customer faster than you can say "hipster beard".

---

I quickly found out that there was much consternation about my position on coding challenges as I spoke with both recruiters and hiring managers.  One company in particular just couldn't wrap their heads around this.  How could they possibly get an understanding of my coding proficiency if I wouldn't participate in their finely crafted coding challenges that had been carefully lifted by their team from the Internets?

I answered them patiently, pointing to [my GitHub] which includes many, many examples of projects in both compiled and interpreted languages, as well in imperative, object-oriented and functional idioms that I've been writing and pushing to GitHub for over twelve years.

I pointed them to this fine website, where I have been writing articles for several years.  Through it, one can easily get a good idea of what interests me and my commitment to learning.

Lastly, I pointed to my willingness to complete a take home assignment, which I've done many times before.

Sadly, none of this passed their sniff test, as I was obviously trying to pull a fast one, and the interviews didn't go anywhere.  They cleverly saw through the charade that I had been presenting to the world for the past twenty years.


## Thoughts on Interviewing

I've done my share of interviewing on the opposite side of the desk as the interviewer, and if you can't get a really good idea of the quality of a candidate by asking them probing questions that allow the candidate to provide expansive answers, then you're not asking interesting questions that by their very nature require a certain amount of experience, both practical and academic, in order to answer well.  And putting in the work needed to know what the "right" questions are can itself require a significant amount of time and experience.

Interviewing is hard, but not in the way that people who whine about not being able to find good candidates would have you believe.  Interviewing is hard because it takes work, and too many people don't put in the work that a candidate deserves.  Those that are in the position of interviewing others should approach it with humility, informed by the knowledge that soon they could be in the same hot seat again.

Furthermore, it is really easy to tell if someone is bullshitting you.  If you can't tell, then you don't know your subject matter well enough, and that's on you (and it's back to the woodshed).  Knowing the subject matter well allows you to ask relevant follow-up questions and allows for open-ended questions to go where they may and for as long as you want, as well as detecting when a candidate is bullshitting their way through a question.

As for gleaning someone's experience with writing code, I really don't understand the hand-wringing around this.  There are so many ways to determine if a candidate is who they present themselves to be.  If someone can provide examples of their projects on GitHub or some other platform, well, there you go.  Can you really not get a good example of their ability to write a Bash or Python script given a history of their code?  Plus, as a bonus, you have examples of how well they write (or don't write) documentation by their project `README`s.

If that's not enough, here are some areas of discussion for the interview, which may or may not apply to the position to which they're interviewing:

- design patterns
- programming paradigms
    + imperative
    + object-oriented
    + functional
- advantages and use cases for compiled versus interpreted languages
- testing
- debugging

## Conclusion

As to that disturbing trend I alluded to in [the Big Introduction](#the-big-introduction), I'm continuing to be involved in interviews where the company is interviewing for tools rather than human beings.

What does that mean?  It means that if I don't know Ansible well enough, or some AWS service, or any other tool that can be found on any "devops" greatest hits list, then I'm shown the door.  This is in direct opposition with my own experience, that these tools are generally not difficult to learn to use and use well.  Apparently, many "devops" folks don't share my optimism.

I've seen this kind of arrogance before when I was working as a frontend "engineer", but the tools, of course, were different.  People want to feel that what they do is special and that only a select few can do it.  And they don't like to be told that what they do isn't as difficult or as special as they'd like to believe.

## References

- [On Interviewing Tools](/2021/05/03/on-interviewing-tools/)

[the second part]: /2021/05/03/on-interviewing-tools/
[I wrote about before]: /2021/05/03/on-interviewing-tools/
[my GitHub]: https://github.com/btoll
[Pascal's triangle]: https://en.wikipedia.org/wiki/Pascal%27s_triangle
[realizing that I had made a terrible mistake]: /2021/11/26/on-realizing-youve-made-a-huge-mistake/
[their Agile methodology]: /2021/12/26/on-hating-agiles-guts/

