+++
title = "On SSH Port Forwarding"
date = "2018-08-24T12:43:54-04:00"

+++

When I first saw port forwarding in action it seemed like magic, and I was immediately captivated.  I've since been using [`SSH`] to forward ports every single day for years.

## What is it?

Essentially, it is [tunneling] traffic over an `SSH` encrypted connection.  Using the client/server paradigm, an `SSH` client is started on the local machine which connects to an `SSH` server on the remote machine.

## How does it work?

When issuing an `SSH` command, an encrypted tunnel is created between the initiating machine and the remote machine.  Applications will then send their data into this tunnel to the other side.  The tunnel can be thought of as a conduit for the traffic, and it doesn't care what type of application-layer traffic it is forwarding, as it is merely passing the traffic between the communicating applications on either end.

When remote port forwarding, the remote machine sends traffic to the `SSH` daemon listening on the remote machine, which in turn forwards the packets to the `SSH` daemon on the other end.  That daemon then sends the packets to the destination, the local application.

When local port forwarding, the local machine sends traffic to the `SSH` daemon listening on the local machine, which in turn forwards the packets to the `SSH` daemon on the other end.  That daemon then sends the packets to the destination, the remote application.

So, these operations are inverses of each other, and all types of `SSH` port forwarding are only one command away.  Beautiful.

> The applications don't have to be on the same machine as the `SSH` daemons on either end of the tunnel, I'm simplifying to (hopefully) illustrate the point.

## Why use it?

- Hide traffic on a public wifi
- Encrypt legacy applications
- Circumvent firewall rules
- VPN
- Do bad things

## Examples

There are three types of port forwarding:

- <a href="#remote-port-forwarding">Remote</a>
- <a href="#local-port-forwarding">Local</a>
- <a href="#dynamic-port-forwarding">Dynamic</a>

The examples use the following options (consult the [man page]):

<pre class="math">
f - Requests `ssh` to go to background just before command execution.
C - Requests compression of all data.
N - Do not execute a remote command.
R - Remote port forwarding.
L - Local port forwarding.
D - Dynamic port forwarding.
</pre>

> If you get the error:
>
>		ssh: connect to host localhost port 22: Connection refused
>
> Start the `ssh` daemon:
>
>		# systemctl start ssh
>
> Recall that the application connects to the local `SSH` client, which in turn forwards the request (and passes back the response), so `SSH` needs to be running as a daemon.

Note that I'm making several assumptions here:

- You have access to the domain that is the destination and have root access or are in the `sudo` group (to open a port in the firewall).
- <strike>You have an account on the remote machine</strike> (not always necessary, depends on how the `SSH` server is configured).
- `SSH` is installed on both the local and remote machines and is [configured to allow remote port forwarding].

> ### Remote Port Forwarding
>
> Forward a port from the server machine to the client machine.
>
>		$ ssh -R port:host:hostport [user@]hostname
>
> #### Scenario
>
> I'm starting a blog about JavaScript because I'm a Senior JavaScript Engineer.  While still in the development phase, I'd like to share the home page with a friend who is a designer to get some feedback about fonts.
>
> Unfortunately, I'm tethering to get my internet connection, and I can't make my local web server (on port 80) publicly accessible.  Luckily, I know someone who is tech-savvy, and they give me the following command to run from a terminal:
>
> 		$ ssh -fCNR 31137:localhost:31337 example.com
>
> After doing an Internet search, I'm able to find the Terminal app on my Mac and paste in the command.  I can then tell my friend to point their browser at `www.example.com:31337` to view my site, which is actually running on my local machine.

---

> ### Local Port Forwarding
>
> Forward a port from the client machine to the server machine.
>
>		$ ssh -L port:host:hostport [user@]hostname
>
> #### Scenario
>
> I'm now working on another post that's going to add tremendous value for my followers and help to promote my brand.  The development server is remote, and I haven't been shown how to install a TLS certificate yet.  So, in order to protect the precious bits from prying eyes, I'm going to tunnel my traffic by locally forwarding a port.  Again pasting in the command I was given, I run:
>
>		$ ssh -fCNL 31337:example.com:80 localhost
>
> I now point my browser at `localhost:31337` and have an encrypted connection to `example.com`!

---

> ### Dynamic Port Forwarding
>
> Create a local [SOCKS] proxy that will forward ports on an application level.  This can be any application-layer protocol (HTTP, FTP, etc.).
>
>		port [user@]hostname
>
> #### Scenario
>
> I'm at a coffee house, and I have my coolest Mac with all the stickers.  I want to protect my traffic, because anyone in here could be a hacker.  I first paste in the command that establishes the SOCKS server:
>
>		$ ssh -fCND 1080 example.com
>
> In the meantime, I've already had my applications configured to dynamically forward all my ports through this SOCKS5 proxy.  My tech-savvy contact showed me how to do this in the [preferences in Firefox], and for browsers that would set the proxy settings globally, I'll type into the Terminal the command I had him write down on a Post-it note:
>
>		$ chromium --proxy-server="socks5://localhost:1080" &> /dev/null &
>
> This seems to be so much better than local port forwarding.  With that, I'm limited to only communicating with a single machine; that which is specified on the command line.  However, with dynamic port forwarding, all my traffic is forwarded, regardless of its destination, as long as the application knows to send it into the `SSH` tunnel (and the browsers do know to do this, since I configured them above).
>
> I just browse the web using Firefox or Chromium like I normally do, and I don't have to fiddle with the address bar and add any port numbers!
>
> Weeeeeeeeeeeeeeeeeeeeee

[`SSH`]: https://www.openssh.com/
[tunneling]: https://www.ssh.com/ssh/tunneling/
[port]: https://en.wikipedia.org/wiki/Port_%28computer_networking%29
[man page]: https://linux.die.net/man/1/ssh
[configured to allow remote port forwarding]: https://www.ssh.com/ssh/tunneling/example#sec-Remote-Forwarding
[SOCKS]: https://en.wikipedia.org/wiki/SOCKS
[preferences in Firefox]: https://support.mozilla.org/en-US/kb/connection-settings-firefox

