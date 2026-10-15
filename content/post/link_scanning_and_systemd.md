+++
title = "On Link Scanning And systemd"
date = "2026-10-16T02:08:42-04:00"

+++

Hello, friends.  I am here to write a succinct post about a cool and useful pipeline I designed to enable me to catch non-resolvable links in my blog articles.  I really do hope that I succeed in not only a wonderful and enlightening explanation of the pipeline but the brevity of the article, because the last several ones have been way too long.  I've been so annoyed with myself that I'm still not talking to myself.

> I'm defining "non-resolvable links" for any response that returns a [status code] outside the 200-399 range.

---

- [`link-scanner`](#link-scanner)
    + [`link-scanner` as a `pre-commit` Hook](#link-scanner-as-a-pre-commit-hook)
- [`bafka`](#bafka)
- [`systemd-timer`](#systemd-timer)
    + [Installation](#installation)
- [Conclusion](#conclusion)
- [References](#references)

## `link-scanner`

I wrote a CLI tool several years ago that I recently gave a massive upgrade, adding concurrency and a worker pool and some other things it should have had in the first place.  Anyway, the project is called [`link-scanner`], and its *raison d'être* is simply to scan a given web page, collect all the links (`href`) and then verify the status of each by sending it a [`HEAD`] request.

> Actually, if a link returns a [403 Forbidden] status code, `link-scanner` will then send a `GET` request to try and make a successful connection.  This [status code] indicates the server refused to process the client request because of firewall rules or something similar, and sending a `GET` request can make it past those restrictions.

This is great, but you know what would be even better?  Including it in a CI/CD process!  This entailed refactoring the project and allowing it to be exported as a library.  Once that was done, it could be imported into a CI/CD pipeline rather easily (there is an old example of a GitHub Action in the repository).  The way I use it today is as a Git [`pre-commit`] hook, because I am not afraid of `pre-commit` hooks.

> Should a Git `pre-commit` be considered a CI/CD process?  I think so.  After all, it's running locally on the machine and potentially saving useless cycles in the cloud.

For example, I can have it scan any blog article included for a commit for non-resolvable links, and it will not commit if the operation fails.  To enable this, I added a `--quiet` switch to the CLI tool that will not write anything to `stdout` but will instead return an exit value of 1 if any of the links are unresolvable.  You can see the [`link-scanner` `pre-commit` hook](https://github.com/btoll/git-hooks-and-extensions/blob/main/hooks/_/link-scanner.sh) on my GitHub.

```bash
$ link-scanner --help
Usage of link-scanner:
  -quiet
        Suppress output. Useful for CI pipelines that just need an exit value.
  -tagName string
        The HTML node to target in which to get the links. (default "body")
  -url string
        The URL to check for valid links.
```

This is great.  Now, instead of only functioning as a CLI tool, the `link-scanner` library can be used in a CI/CD process and imported into another tool to provide functionality that can be further built upon.  In a minute, we'll look into a tool that does exactly that in this article.

But first, let's take a short detour and look a bit further into the `link-scanner` `pre-commit` hook.

### `link-scanner` as a `pre-commit` Hook

I have a project called [`git-hooks-and-extensions`] that makes it criminally easy to not only install Git hooks but also useful Git extensions that will make your life easier.  As an example, we'll briefly look into a Git extension called [`git-init-wrapper`] that wraps the creation of multiple Git `pre-commit` hooks.

Here is an example of its use:

```bash
$ git init-wrapper --dir foo --hooks _,go --yes
```

This will do the following:

- Initializes a new empty Git repository in the `foo` directory.
- Adds a useful `.gitignore` file with the name of the directory (because the name of the directory is almost always the name of the project which is almost always the name of the binary that should not be checked into version control), a `LICENSE` and a `README.md` with the following skeleton form:
    ```bash
	$ cat README.md
	# foo

	## License

	[GPLv3](COPYING)

	## Author

	[Benjamin Toll](https://benjamintoll.com)
    ```
- Installs [Go](https://github.com/btoll/git-hooks-and-extensions/tree/main/hooks/go) and [system](https://github.com/btoll/git-hooks-and-extensions/tree/main/hooks/_) `pre-commit` hooks:
    ```bash
	$ cat .git/config
    [core]
            repositoryformatversion = 0
            filemode = true
            bare = false
            logallrefupdates = true
    [hooks "pre-commit"]
            hook = EOF.bash
            hook = ggshield.sh
            hook = hadolint.sh
            hook = link-scanner.sh
            hook = shellcheck.sh
            hook = trivy.sh
            hook = vagrantfile.sh
            hook = go-build.sh
            hook = go-fmt.sh
            hook = golangci-lint.sh
            hook = go-mod.sh
            hook = gosec.sh
            hook = go-test.sh
            hook = go-vet.sh
            hook = govulncheck.sh
    ```
    + Note the `--yes` switch in the `git-init-wrapper` command above.  Without that, the tool will have you confirm the installation of every hook.

All of the hooks run automatically when committing.

If installing only the Git `pre-commit` is your only objective, see the [`git-hooks`] extension.  The `git-init-wrapper` command will delegate to this and [`git-bootstrap`] under the hood.

If that isn't nice, I don't know what is.

> All of this is covered in extreme detail in the #1 New York Times bestselling blog article [On git-hooks-and-extensions].  In addition, here is an earlier article that first introduced this idea called [On a Git Hook Pattern].

## `bafka`

As promised, we now turn to another tool of mine that builds upon and extends the use of `link-scanner`.  Annoyingly, it's called [`bafka`].  Don't ask.

As discussed, `link-scanner` is a nifty tool to check for unresolvable links on a single page.  `bafka` extends this to scan the [sitemap] of any given website and then scan all of the links on all of the pages found.

[Kool Moe Dee].

Moreover, `bafka` can be run every hour as a [`systemd-timer`] unit, writing the failed links to a temporary file (`/tmp/scan_results.jsonl`) (you can find the unit definitions in the [`systemd`](https://github.com/btoll/bafka/tree/master/systemd) directory).  When it does, [`notify-send`] will send a notification through [D-Bus] that will appear on the desktop.

Again, where `link-scanner` will scan a single web page, `bafka` will scan an entire web site.  Here is an example of its usage:

```bash
$ bafka \
    -uri https://example.com \
    -sitemap sitemap.xml \
    -workers 35 \
    -output /tmp/results.jsonl
```

This will first collect and test all of the links listed on `https://example.com/sitemap.xml`.  Next, it will iterate over that collection, handing work to the configured worker pool (`-workers`) of 35 [goroutines] to scan each page and collect the results.  Finally, it writes the name of the page and the unresolvable links of that page as [`jsonl`] to `stdout` or to the value of `-output`.

Here is an example of the `jsonl`:

```json
{"target":"https://benjamintoll.com/2024/10/31/on-lvm/","links":{"403":["https://www.theurbanpenguin.com/"]}}
{"target":"https://benjamintoll.com/2023/07/06/on-creating-rpm-packages/","links":{"403":["https://linux.die.net/man/1/rpmdev-newspec"]}}
{"target":"https://benjamintoll.com/2023/06/24/on-debsigs/","links":{"403":["https://stackoverflow.com/a/55950788"]}}
{"target":"https://benjamintoll.com/2023/06/01/on-inspecting-deb-packages/","links":{"403":["https://linux.die.net/man/8/apt-cache"]}}
{"target":"https://benjamintoll.com/2026/06/29/on-ditching-vagrant/","links":{"404":["/2022/08/12/on-virtual-machines/","/2023/11/28/on-linux-container-networking/"],"403":["https://man.archlinux.org/man/virt-install.1"]}}
```

If `--output` is specified, the [`basename`] is taken from the given path and the file written to `/tmp/BASENAME`.  This is [a security feature of Go]; the tool is only allowing writes to `/tmp`.

Practically, these means that `--output /tmp/foo.jsonl` and `--output foo.jsonl` are the same.

```bash
$ bafka --help
Usage of ./bafka:
  -output string
        Instead of writing to stdout, write to a file.
  -sitemap string
        The list of available links. (default "sitemap.xml")
  -uri string
        The target site.
  -workers int
        The number of workers in the worker pool. (default 20)
```

## `systemd-timer`

The last step in this journey is to create a `systemd-timer` that will be triggered every hour by the `systemd` user manager, just like a [cron] job.  The name of the `timer` units is `bafka.timer`, and its job is to call the `bafka.service` to execute the [`bafka`] tool and output the results to `/tmp/scan_results.jsonl`.  Currently, this process is overwriting the output file every time, because I do not have a need right now to save its state.

Because both units share the name `bafka`, the user manager knows which `service` to activate when the `timer` is triggered.  There is no need to explicitly define the name of the `service` in the `timer` definition, although this can be done.

Here are the contents of `bafka.service` and `bafka.timer`, respectively:

[`bafka.service`](https://github.com/btoll/bafka/blob/master/systemd/bafka.service)

```ini
[Unit]
Description=Scan every article on benjamintoll.com for unresolvable links
After=graphical-session.target
Requisite=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=oneshot
ExecStart=/home/btoll/projects/bafka/bafka -uri https://benjamintoll.com -workers 40 -output /tmp/scan_results.jsonl
ExecStartPost=/usr/bin/notify-send "bafka job finished" "Scan results written to /tmp/scan_results.jsonl"

```

> `bafka.service` does not need an [Install] block because it is not meant to be enabled.

[`bafka.timer`](https://github.com/btoll/bafka/blob/master/systemd/bafka.timer)

```ini
[Unit]
Description=Run bafka every hour
After=graphical-session.target
Requisite=graphical-session.target
PartOf=graphical-session.target

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=graphical-session.target

```

Note that both units need the `graphical-session.target` to be enacted because the `service` relies upon the `notify-send` binary (and the `timer` should only be triggered when the `graphical-session.target` is active), and `notify-send` needs a fully graphical environment in which to execute.  Change these to your preference if this isn't desired.

The `bafka.timer` will be triggered every hour on the hour (because of `OnCalendar=hourly`) to call the `bafka.service`.  The `PartOf=graphical-session.target` directive says that the `graphical-session.target` propagates stop and restart operations from the `target` to the listed unit.  In other words, if the currently active `target` is `graphical-session` and the `target` is changed to `multi-user`, then both units will receive a stop signal from the `graphical-session.target` when it stops.

The `Requisite=graphical-session.target` directive states that the units can only be activated when the `graphical-session.target` is active.  It will refuse to start a unit if the active `target` does not match the value of `Requisite=`.

### Installation

I want to install these as a local user, so I'll copy them into `$HOME/.config/systemd/user/`.  Then, I'll register both with the user manager by reloading the daemon:

```bash
$ mkdir -p ~/.config/systemd/user/
$ cp systemd/bafka.{service,timer} ~/.config/systemd/user/
$ systemctl --user daemon-reload
```

I'll now enable the `bafka.timer`, which will create a [symbolic link] in the user manager directory at `$HOME/.config/systemd/user/graphical-session.target.wants/bafka.timer`.  Note that the new directory is named after the `WantedBy=` directive in the unit file.


```bash
$ systemctl --user enable --now bafka.timer
$ readlink -f ~/.config/systemd/user/graphical-session.target.wants/bafka.timer
/home/btoll/.config/systemd/user/bafka.timer
```

> [`sudo`] is not needed because these are user units (note the `--user` switch).

The user manager directory now looks like this:

```bash
$ tree ~/.config/systemd/user
/home/btoll/.config/systemd/user/
├── bafka.service
├── bafka.timer
└── graphical-session.target.wants/
    └── bafka.timer -> /home/btoll/.config/systemd/user/bafka.timer

```

That's it!  We'll now get a desktop notification every hour on the hour that the operation has successfully run.  If not successful, the logs can be reviewed using [`journalctl`].

```bash
$ journalctl --user --unit bafka.service
```

> You can also see the most recent logs by checking its status (`systemctl --user status bafka.service`).

By the way, after they've been registered with the `systemd` user manager, you can interact with the units using `systemctl --user`.  For example, get the contents of the files using the `cat` command (this is the same as [`cat`]ting the files):

```bash
$ systemctl --user cat bafka.service
$ systemctl --user cat bafka.timer
```

And, their statuses:

```bash
$ systemctl --user status bafka.service
○ bafka.service - Scan every article on benjamintoll.com for unresolvable links
     Loaded: loaded (/home/btoll/.config/systemd/user/bafka.service; static)
     Active: inactive (dead) since Fri 2026-10-16 23:01:05 EDT; 4min 49s ago
 Invocation: 992defc09c7e46f5879775cdd75b0712
TriggeredBy: ● bafka.timer
   Main PID: 2986376 (code=exited, status=0/SUCCESS)
   Mem peak: 69.8M
        CPU: 12.324s

Oct 16 23:00:47 kilgore-trout systemd[2920490]: Starting bafka.service - Scan every article on benjamintoll.com for unresolvable links...
Oct 16 23:01:05 kilgore-trout systemd[2920490]: Finished bafka.service - Scan every article on benjamintoll.com for unresolvable links.
Oct 16 23:01:05 kilgore-trout systemd[2920490]: bafka.service: Consumed 12.324s CPU time, 69.8M memory peak.

$ systemctl --user status bafka.timer
● bafka.timer - Run bafka every hour
     Loaded: loaded (/home/btoll/.config/systemd/user/bafka.timer; enabled; preset: enabled)
     Active: active (waiting) since Fri 2026-10-16 19:26:41 EDT; 3h 39min ago
 Invocation: 19919bba38bc4258b0e8dd75541d735e
    Trigger: Sat 2026-10-17 00:00:00 EDT; 53min left
   Triggers: ● bafka.service

Oct 16 19:26:41 kilgore-trout systemd[2920490]: Started bafka.timer - Run bafka every hour.
```

## Conclusion

Let's recap what we've learned today, children.  There is a project called [`link-scanner`] that can be used as both a CLI tool and an importable library.  `link-scanner` can be easily inserted into any CI/CD pipeline, where it can quietly pass or fail with an exit code or provide more detailed information encoded as `json`.  Further, it can be added as a `pre-commit` hook which will catch any issues before committing.

The next step was to zoom out and create the [`bafka`] tool that would not only scan a single page or article but would scan `N` number of pages by passing it a [sitemap].  The tool will collect all of the data and print its results, a line at a time, per article encoded as `json`.  This output is by default printed to `stdout` (and redirected to a file) or written to a file specified by `--output`.

Finally, `systemd-timer` got the nod and came out from the bullpen to close this one out.  The `bafka` project includes two `systemd` unit files that register a service and the timer that activates it with the `systemd` user manager.  These units allow the `bafka` tool to run hourly at the top of the hour.

After sitting and thinking about this for a long time, I've emerged from the desert to conclude that this is a damn fine article.

<!--
It describes a tool that scans a web page to check for unresolvable links and another that extends that to include scanning an entire website using the links defined in a sitemap.

Further, it shows how to register a timer with `systemd` to call the latter as a cron job (the `systemd` unit files are included in the repository).  This will save all the results as `jsonl`  in `/tmp` and raise a desktop notification upon successful completion.

Lastly, there is an example to include the former as a Git `pre-commit` hook, and it's also easy to include it in a CI/CD pipeline.
-->

## References

- [`link-scanner`]
- [`bafka`]
- [`git-hooks-and-extensions`]
- [On git-hooks-and-extensions]
<!--- [systemd/User](https://wiki.archlinux.org/title/Systemd/User)-->

[`link-scanner`]: https://github.com/btoll/link-scanner
[`HEAD`]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/HEAD
[`pre-commit`]: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
[`git-hooks-and-extensions`]: https://github.com/btoll/git-hooks-and-extensions
[On git-hooks-and-extensions]: /2026/07/27/on-git-hooks-and-extensions/
[`notify-send`]: https://manpages.org/notify-send
[`systemd-timer`]: https://www.man7.org/linux/man-pages/man5/systemd.timer.5.html
[D-Bus]: https://en.wikipedia.org/wiki/D-Bus
[sitemap]: https://en.wikipedia.org/wiki/Site_map
[cron]: https://en.wikipedia.org/wiki/Cron
[`bafka`]: https://github.com/btoll/bafka
[`jsonl`]: https://en.wikipedia.org/wiki/JSON_streaming#JSONL
[status code]: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[403 Forbidden]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403
[`git-init-wrapper`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-init-wrapper
[`git-hooks`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-hooks
[`git-bootstrap`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-bootstrap
[On a Git Hook Pattern]: /2021/03/30/on-a-git-hook-pattern/
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[goroutines]: https://en.wikipedia.org/wiki/Go_(programming_language)#Concurrency
[`basename`]: https://en.wikipedia.org/wiki/Basename
[a security feature of Go]: https://go.dev/blog/osroot#introducing-osroot
[symbolic link]: /2022/09/25/on-hard-and-soft-links/
[`sudo`]: https://www.man7.org/linux/man-pages/man8/sudo.8.html
[`journalctl`]: https://www.man7.org/linux/man-pages/man1/journalctl.1.html
[`cat`]: https://www.man7.org/linux/man-pages/man1/cat.1.html

