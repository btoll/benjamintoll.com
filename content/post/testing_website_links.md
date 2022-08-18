+++
title = "On Testing Website Links"
date = "2022-08-15T21:08:57Z"

+++

In revisiting some of my older posts, I noticed that some of the links were broken.  Well, I can't have that.

So, I wrote a tool that will crawl each article or directory of articles, gather all the links, and then make a [`HEAD`] request to each one.  I wrote it in Go because of its concurrency model, implemented by [goroutines], since the tool would be making tens, hundreds, perhaps thousands of `HEAD` requests over its little lifetime.

Before I go any further, I wanted to say that it's not the *greatest* tool I've ever written, but it's *not too shabby*, either.  It accomplishes my main goals, which is good enough for now.

Here are the design goals:

- Should be a CLI tool and easy to run as a [Git `pre-commit` hook] and in CI pipelines.
- Should have a modicum of configuration.  At the very least, the user should be able to provide:
    + Custom headers
    + Link regular expression
    + Skip pattern for links

<!--+ Skip [`HTTP` status codes] for `HTTP` response status codes-->

The design goals have been met, it's a working tool, and I'm happy.  I'll continue to revisit it, because I rarely write something from which I permanently move on.  Since I'm always trying to get better at what I do, I'm sure I'll come back to it and think to myself, "well, this certainly is a pile!".

In the meantime, it's working title is [`link-scanner`], and it is up on my GitHub.

Here is the current usage:

```
$ ./link-scanner -h
Usage of ./link-scanner:
  -dir string
        Optional.  Searches every file in the directory for a match.  Non-recursive.
  -filename string
        Optional.  Takes precedence over directory searches.
  -filetype .html
        Only searches files of this type.  Include the period, i.e., .html (default ".md")
  -header string
        Optional.  Takes comma-delimited pairs of key:value
  -q    Optional.  Turns on quiet mode.
  -regex string
        Optional.  The search pattern (regex) used when gathering the links in an article. (default "(?:https?:\\/\\/[^<>].*\\.[^\\W\\s)\"<>]+[\\w\\.,$'%\\-/?=]*?)$")
  -skipPattern string
        Optional.  Will skip any gathered links matching this pattern. (default "\\.onion|example\\.com")
  -v    Optional.  Turns on verbose mode.
```

---

Since I wrote this primarily to shoehorn into daily use, let's now briefly take a look at the three ways I've implemented it into my workflow as a:

1. [Binary](#binary)
1. [Git `pre-commit` hook](#git-pre-commit-hook)
1. [GitHub Action](#github-action)

---

## Binary

Testing all the links in a particular file:

```
$ link-scanner -filename gpg.md
```

Testing all the links in a particular directory with custom headers:

```
$ link-scanner -dir content/post -header "User-Agent:Mozilla/5.0,Content-Type:application/json"
```

## Git pre-commit hook

In my breathtaking article on how I use the [Git `pre-commit` hook], I explicate its setup, so I won't go over it now in full.

Briefly, you could uncomment one of more of the Git hooks specified in the [`install.sh` script] in the [`dotfiles`] repository, change directory to the location of your local repository, and then run that script.

Or, copy both the [`pre-commit`] runner and the [`pre-commit.d/link-scanner.sh`] into your `.git` directory in the top-level of your repository in the `hooks` directory.

In the root of the repository:

```
$ cd ./.git/hooks
$ wget --no-clobber https://github.com/btoll/dotfiles/blob/master/git-hub/hooks/pre-commit
$ wget --no-clobber --directory-prefix pre-commit.d https://github.com/btoll/dotfiles/blob/master/git-hub/hooks/pre-commit.d/link-scanner.sh
```

This script will automatically run when committing a Git object (`git commit`).  To disable, simply add the `--no-verify` option:

```
$ git commit --no-verify -am 'derpy'
```

## GitHub Action

The GitHub Action is very straightforward and probably doesn't need any explanation, as it's immediately identifiable by its similarity to the obnoxious number of "IaC" cloud CI/CD tools that the cool kids are constantly yammering on about.

I used GitHub Actions because I just did a short stint at GitHub as a consultant and liked the experience.  Also, although I'm not doing it here, I like that you can "bring your own" agent.  I know of at least one other platform that does this (Buildkite), but since all of my repositories are hosted by GitHub, I'll use GitHub Actions.

[`scan.yml`]

<pre class="math">
name: Link Scanner

on:
  push:
    branches:
      - master

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v2

      - name: Scan Links
        uses: docker://btoll/link-scanner:latest
        with:
          args: -dir content/post -v

</pre>

[`HEAD`]: https://developer.mozilla.org/en-US/docs/web/http/methods/head
[goroutines]: https://golangbot.com/goroutines/
[Git `pre-commit` hook]: /2021/03/30/on-a-git-hook-pattern/
[`HTTP` status codes]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[`link-scanner`]: https://github.com/btoll/link-scanner
[Binary]: /2022/08/05/on-getting-started-with-go/
[GitHub Action]: https://github.com/features/actions
[`install.sh` script]: https://github.com/btoll/dotfiles/blob/master/git-hub/install.sh
[`dotfiles`]: https://github.com/btoll/dotfiles
[`pre-commit`]: https://github.com/btoll/dotfiles/blob/master/git-hub/hooks/pre-commit
[`pre-commit.d/link-scanner.sh`]: https://github.com/btoll/dotfiles/blob/master/git-hub/hooks/pre-commit.d/link-scanner.sh
[`scan.yml`]: https://github.com/btoll/benjamintoll.com/blob/master/.github/workflows/scan.yml

