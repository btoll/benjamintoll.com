+++
title = "On Error Messages That Matter"
date = "2026-06-18T00:04:57-04:00"

+++

I've been thinking lately about error messages, both what they should describe and who they are intended for.  When a program fails at any point during its runtime, what should be communicated and what should be done with that communication?

Too often these questions, which are not only essential but commonsensical, unfortunately are not asked, are ignored or are lazily addressed.  In the latter case, often it's just the program panicking with a stack trace.  That can be helpful during development and testing, but, to an end user who probably isn't a programmer, and a scary jumble of text that makes no sense and just makes them angry (in addition to now being frustrated that something that should work is not).

---

For a brief time I was contracted to work with GitHub on their Professional Services team through my employer (Taos, later acquired by IBM).  It was a great experience, and everyone I met was wonderful.  The intent was for me to assist with teaching GitHub Actions to enterprise customers, but I thankfully was put on a different project that had been a thorn in their side for over a year when they realized that I had a lot of experience programming.

One of the raison d'être of the Professional Services team is to migrate new customers from competitive platforms such as Gitlab to GitHub.  Because of different APIs, structures, data serialization and a million other things, there needs to be tooling that does this, for obvious reasons (you don't want to be doing this by hand).  In other words, companies engage with Services to have *them* do it so *they* don't have to.

There were several tools used in the migration process, all of them command-line tools, written in Ruby.  The existing tools worked for straightforward migrations, but they struggled with edge cases and didn't communicate failures clearly.  This was the case with one of their biggest clients, Intel, whose complexity exposed all of the soft spots of the tooling, and they had been stuck in the migration process for over a year as the back-and-forth dragged on.

Most customers did not have programming experience and thus naturally and rightly just expected the tools to work, and when they frequently didn't, insult was added to injury when they were presented with the aforementioned stack trace that they didn't recognize as such nor know what to do with.  Intel was firmly in this camp, and they were frustrated with the slow progress on their migration.

Having had many jobs that worked directly with the public, I didn't mind talking with the people who actually use the software, so I was happy to join a call with Intel twice a week to jump start the engagement (as it's called) and see it to its conclusion.  The first thing I wanted to know was what was making them unhappy and why the migration was stalling.  This generated some great conversations where I was able to put myself in their shoes and understand not only the areas where the migration was failing but what their expectations were.

I would then get to work on the migration tools, working off of the notes I had taken during the meetings.  The first task was to get more familiar with Ruby and its reflective programming paradigm, which I ended up using to great effect on the project.

I then would replicate GitLab projects locally so I could reproduce the errors that Intel had told me about.  Since I didn't have access to their projects because of proprietary reasons, I wrote tooling in Go that would "bootstrap" any number of GitLab projects with dummy data.  For example, if Intel told me that the migration would fail if any of the projects had a wiki, I could easily add that to my tool to replicate the failure.  I naturally called the tool [`gitlab-bootstrap`] and wrote clear documentation on how to use it (see the [`README`](https://github.com/btoll/gitlab-bootstrap/blob/master/README.md)) and provided and [`examples`](https://github.com/btoll/gitlab-bootstrap/tree/master/examples) directory with several examples on how to use it (i.e., GitLab objects are defined in either `yaml` or `json`).

> It even has a `Makefile` and a `Dockerfile`, complete [with instructions](https://github.com/btoll/gitlab-bootstrap/blob/master/docs/DOCKER.md).

To keep this article brief, I won't go into all of the errors and operations that caused them, but I found many and fixed them all.  The thing that shocked me the most, though, is the lack of clarity around an error.  There was nothing "actionable", as your favorite scrum master likes to say, as the error messages were nothing but cryptic stack traces that meant nothing to the user.  So, one of the main goals was to provide clear messages to the user describing what had failed, where it had failed, and, when applicable, what input as expected compared to what had been actually received.

The approach of reproducing on my end in a sandbox and elucidating the errors had a significant impact on the project.  Our meetings were reduced to once a week, with most of the communication being written emails that detailed what I had done and why, with their responses consisting of the new clarifying error messages that they'd receive that would pinpoint exactly what went wrong.  The iterations quickened, and they were so happy with the attention and progress that even the weekly meeting was dropped in favor of emails.

I'm proud to say that we were able to completely finish their migration to their satisfaction in under two months.

---

So, what's the lesson, children?  Remember your audience when you write software.  They are not you or the nerd sitting next to you, and not only will they not understand errors that are not informative but it will frustrate them and make them want to holler.

Actually speaking with users is A Good Thing, and building relationships can lead to momentum and progress that can potentially remove some meetings from your schedule.  After all, who likes meetings?  No one.  No one likes meetings.

## References

- [`gitlab-bootstrap`]

[`gitlab-bootstrap`]: https://github.com/btoll/gitlab-bootstrap

