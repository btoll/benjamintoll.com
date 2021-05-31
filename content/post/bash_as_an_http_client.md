+++
title = "On Bash as an HTTP Client"
date = "2021-05-30T18:16:18-04:00"

+++

> This article isn't restricted to just the Bash shell.  The implementation is specific to Bash, but there are other shells that can accomplish the same thing.

I recently learned of a cool way to read and write from network sockets from a shell.  Since I use [the Bash shell], all commands and anything else related to using sockets is scoped to it.

As long as Bash was compiled with [`--enable-net-redirections`], it can use the `/dev/tcp` and `/dev/udp` special files, if present, to read and write from sockets to a remote service.  If the operating system does not have those files, bash will emulate the files internally.

From the man page:

<code style="font-size: 16px;">
Bash handles several filenames specially when they are used in redirections, as described in the following table.  If the operating system on which Bash is running provides these special files, Bash will use them; otherwise it will emulate them internally with the behavior described below.

...

- /dev/tcp/*host*/*port*
    If host is a valid hostname or Internet address, and port is an integer port number or service name, Bash attempts to open the corresponding TCP socket.

- /dev/udp/*host*/*port*
    If host is a valid hostname or Internet address, and port is an integer port number or service name, Bash attempts to open the corresponding UDP socket.

...
</code>

In this post, we'll be using it as an http client.

---

I set up a demo that runs on the same machine.  In it, I have two terminal sessions open in a single window in [`tmux`].  In the left pane, I'm running the python simple server that is serving up a single page:

`index.html`

<pre class="math">
&lt;head&gt;
&lt;body&gt;
&lt;h1&gt;you are here&lt;/h1&gt;
&lt;/body&gt;
&lt;/head&gt;

</pre>

Pretty fantastic stuff.  `simple-server` is an alias that starts the Python web server, and I'm sending it to the background:

```
$ alias simple-server
alias simple-server='python3 -m http.server'
$
$ simple-server &
```

In the right pane, I'm creating the [tcp] socket, reading the http response and then sending it to [`stdout`] where the it's displayed in the terminal:

```
$ exec 7</dev/tcp/127.0.0.1/8000                (1)
$ echo -e "GET / HTTP/1.0\n" >&7                (2)
$ cat <&7                                       (3)
HTTP/1.0 200 OK
Server: SimpleHTTP/0.6 Python/3.6.9
Date: Mon, 31 May 2021 03:39:25 GMT
Content-type: text/html
Content-Length: 53
Last-Modified: Sun, 30 May 2021 21:53:30 GMT

<head>
<body>
<h1>you are here</h1>
</body>
</head>

$ exec 7<&-                                     (4)
```

Notes:

1. We're creating a new file descriptor that will be used for redirection, just in the same way that the `stdin`, `stdout` and `stderr` streams are automatically connected to every process.
1. Send the HTTP GET into the socket.  This is standard HTTP protocol for getting a resource, and should be familiar to anyone that's used `telnet` to interact with an HTTP server.
1. Read the response from the socket and display in the terminal.
1. Close the file descriptor.

> Note that this file descriptor was only created to read.  They can be created as read, write and read/write.

Let's take a look at the file descriptors that the Bash process has open:

```
$ echo $BASHPID
16918
$ echo $$
16918
~:$ ls /proc/$$/fd
0  1  2  255  7
```

> Note, be careful of using `$BASHPID` in a subshell, as it will return the child's PID not the parent's:
>
>       $ (echo $$ $BASHPID)
>       $ 16918 3470

Note the file descriptor 7; that is ours.  If we were to investigate that further, we'll see that it's indeed an open socket:

```
$ file /dev/fd/7
/dev/fd/7: broken symbolic link to socket:[28722815]
```

Why is the symbolic link reported as broken?  Because it's linked to a resource that doesn't live in the local filesystem, and, as such, it's unable to be followed.

Let's reference that resource id above after creating and reading from the socket:

```
$ exec 7</dev/tcp/127.0.0.1/8000
$ lsof 2> /dev/null | ag 28722815
ag         6960                  btoll    7u     IPv4           28722815       0t0        TCP localhost:44302->localhost:8000 (ESTABLISHED)
bash      16918                  btoll    7u     IPv4           28722815       0t0        TCP localhost:44302->localhost:8000 (ESTABLISHED)
$
$ echo -e "GET / HTTP/1.0\n" >&7
$ lsof 2> /dev/null | ag 28722815
ag         7205                  btoll    7u     IPv4           28722815       0t0        TCP localhost:44302->localhost:8000 (CLOSE_WAIT)
bash      16918                  btoll    7u     IPv4           28722815       0t0        TCP localhost:44302->localhost:8000 (CLOSE_WAIT)
$
$ exec 7<&-
$ lsof 2> /dev/null | ag 28722815
$
```

The last call to `lsof` shows that the file descriptor was indeed closed as the socket has been removed from the list of open files.

> Bash can use UDP sockets as well.

Of course, it's possible to open a socket to anything that has a valid domain or IP address:

```
$ exec 9</dev/tcp/benjamintoll.com/80
$ echo -e "HEAD /^C
$ echo -e "HEAD / HTTP/1.0\n" >&9
$ cat <&9
[snipped]
$
$ exec 9</dev/tcp/52.149.246.39/80
$ echo -e "HEAD / HTTP/1.0\n" >&9
$ cat <&9
[snipped]
$ exec 9<&-
```

---

There are clearly easier ways to make socket connections: `wget`, `curl`, `ncat` and `socat` are just a few that come to mind.  Also, allowing Bash to make socket connections may violate your security policy and may need to be locked down depending on if the machine is single or multi-user.

But in a pinch, this may just come in handy.  And the joy from discovering something new, especially in unlooked-for places, is the best part of all.

[the Bash shell]: https://www.gnu.org/software/bash/
[`--enable-net-redirections`]: https://www.gnu.org/software/bash/manual/html_node/Optional-Features.html
[the `man` page]: https://man7.org/linux/man-pages/man1/bash.1.html#REDIRECTION
[shell builtin commands]: https://man7.org/linux/man-pages/man1/bash.1.html#SHELL_BUILTIN_COMMANDS
[`tmux`]: https://github.com/tmux/tmux/wiki
[TCP]: https://en.wikipedia.org/wiki/Transmission_Control_Protocol
[`stdout`]: https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)

