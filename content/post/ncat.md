+++
title = "On Ncat"
date = "2018-04-30T13:06:28-04:00"

+++

Traditionally called the "Swiss Army knife" for reading, writing and redirecting traffic across network connections, [Ncat] is used in a variety of different ways, including controlling and debugging network connections.   It is an improved replacement for [netcat] and is included when downloading [Nmap].

Although for some use cases it can act as a drop-in replacement for netcat, it is different in several important areas  in that it offers:

+ Security and authentication via TLS
+ Support for IPv6
+ Connection brokering
+ Proxy connections

Here are some of its use cases:

+ Act as a TCP client or server for HTTP, FTP and other TCP/IP connections.  This enables fine control over what a client sends to a server, and it also allows investigation into what a client is doing.
+ Set up secure channels using TLS.
+ Redirect or proxy TCP and UDP (among others) connections to other hosts.
+ Acts as a network `cat`.

Since Ncat is a pipeline tool that reads from `stdin` and writes to `stdout`, it can be used in any manner of of I/O redirection with which you're accustomed.  None of the streams are altered unless given the the `-C` flag (adds `CRLF` for `EOL` sequence).

Ncat either operates in connect mode (client) or listen mode (server).  Let's take a look at some use cases.

## Connect Mode

One of the simplest uses is to connect to a TCP server, like Telnet:

	$ ncat -C benjamintoll.com 80
	> HTTP / GET/1.0
	>
	>

Using TLS:

	$ ncat -C --ssl theowlsnestfarm.com 443
	> HTTP / GET/1.0
	>
	>

## Listen Mode

Here is Ncat listening as a server:

	$ ncat -l localhost 10003 < <(echo -e "HTTP/1.0 200 OK\n\n<h1>hello world</h1>")

Or, in a loop:

    $ while true; do ncat -l localhost 10003 < <(echo -e "HTTP/1.0 200 OK\n\n<h1>hello world</h1>"); done

Simply point a browser to `localhost:10003` (or curl)

Note that, in the previous example, Ncat is expecting a file descriptor to be redirected to `stdin`, so you could replace the process substitution here with a regular file.

The following would also do the same as the previous listening Ncat example:

	$ echo -e "HTTP/1.0 200 OK\n\n<h1>hello world</h1>" | ncat -l localhost 10003

Or:

	$ cat | ncat -l localhost 10003
	> HTTP/1.0 200 OK
	>
	> <h1>hello world</h1>
	>

> Note that there are also many [examples of using TLS] with both server and client certificates in the Ncat guide.

## Access Control

Ncat also supports access control.  You can whitelist and blacklist by host (`--allow` and `--deny`, respectively) or by lists in a file (`--allowfile` or `--denyfile`).  Ncat supports the following syntax:

+ IPv4 and IPv6 addresses
+ hostnames
+ IPv4 octet ranges
+ CIDR netmasks

For example:

    $ ncat -l --allow 2001:db8::7d
    $ ncat -l --deny google.com
    $ ncat -l --allow 192.168.0.0/24
    $ ncat -l --allowfile trusted_hosts.txt

You can also limit the number of connections:

    $ ncat -l --max-conns 3

Naturally, this is not secure and shouldn't be replied upon in any significant way, but I think it's good enough for a quick file transfer or chat session or the like.

## Command Execution

Ncat allows a server to respond with the results of a command executed by means of:

+ Directly executing a binary
+ Passing a command string to be interpreted by a shell
+ Invoking a Lua script

For example, the following commands will do the same thing, i.e., list the contents of the directory of the Ncat "server".  Open two terminals and execute the following command in the first terminal, which will then wait for a client connection:

    $ ncat -le "/bin/ls -al"
    $ ncat -l --sh-exec "ls -al"

Then, in the other terminal, make the client request:

    $ ncat localhost

Holy zap!

Although I don't use it very frequently, it does come in handy.

## File Transfer

I usually prefer `scp` over Ncat when transferring a single file, except in one instance - archive files.  I find it preferable to use Ncat because doing the operation as a stream means that I don't have to create a temporary archive file.

For example, the following will stream a bzip2 archive from `trout` to `chomsky`:

	chomsky$ ncat -l 1972 | tar xjv
	  trout$ tar cjv keygen.c Makefile | ncat --send-only chomsky 1972

As you can see, the listening Ncat on `chomsky` receives the stream and pipes it to `tar`, thereby "untarring" it without further intervention from me.  As an added bonus, the `--send-only` flag will automatically close the connection as soon as the transfer is complete.

### Using a Broker

	chomsky$ ncat -l --broker
	   nero$ ncat chomsky > outputfile
	  trout$ ncat --send-only chomsky < inputfile

## Chat

Simple two user chat:

	germanicus$ ncat -kl --max-conns 1
	      nero$ ncat germanicus

Note that without the access control flag other clients can connect to the listening Ncat process but that that will only establish its own channel with the "server".  In other words, none of the other clients will "hear" the conversation.  Use it or don't :)

If multi-user chat is desired, simply start Ncat in listening mode with the `--broker` flag:

    $ ncat -l --broker

A multi-user chat with designated usernames can be used with the `--chat` option.  For example, all messages all prefaced with `<usern>`, where `n` is the client connection's file descriptor (this cannot be changed).  This will automatically enable connection brokering.

    $ ncat -l --chat

Anything received on one channel is broadcast out to all the other channels, but note that the server doesn't receive any client messages.

Incidentally, I wrote a [simple chat program] that does the same, and it does allow the connecting client to choose a unique username.

[Ncat]: https://nmap.org/ncat/
[netcat]: http://nc110.sourceforge.net/
[Nmap]: https://nmap.org/
[examples of using TLS]: https://nmap.org/ncat/guide/ncat-ssl.html
[simple chat program]: https://github.com/btoll/simple_chat

