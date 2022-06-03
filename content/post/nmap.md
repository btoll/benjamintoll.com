+++
title = "On Nmap"
date = "2021-12-07T04:06:46Z"
draft = true

+++

> This article is going to act as a primer for [`Nmap`], the network mapper.

`Nmap` is a great tool to not only be aware of but to have in your toolkit.  Its main use is arguably as a [port scanner] and fingerprinting (that is, determining the type of program listening on the port, its version, etc.) services discovered on those ports, but it is used in general for gathering information about servers.

It is often used in cyber security network scanning and network discovery and ascertaining the security posture of an organization's servers.

However, it can also do many other things such supporting a scripting engine that allows for much customization when querying a server.  Much of this can cross the line from information gathering to intrusion, and this can be against the law, so be aware of what you're doing and where you're doing it.

For these reasons, it's best to only scan servers that you own or have permission to scan.

> Even simply port scanning can be illegal!
>
> [Fyodor], the creator of `Nmap`, helpfully allows us to scan one of his servers without fear of reprisal:
>
> <pre class="math">
> scanme.nmap.org
> </pre>

It's easy enough to install it:

```
$ sudo apt-get install nmap
```

## Basics

The help flag prints a lot of helpful information:

```
$ nmap -h
```

It is separated into the following sections:

```
$ nmap -h | sed -n 's/^\(.*\):$/\1/p'
TARGET SPECIFICATION
HOST DISCOVERY
SCAN TECHNIQUES
PORT SPECIFICATION AND SCAN ORDER
SERVICE/VERSION DETECTION
SCRIPT SCAN
OS DETECTION
TIMING AND PERFORMANCE
FIREWALL/IDS EVASION AND SPOOFING
OUTPUT
MISC
EXAMPLES
```

Let's take a look at each one in turn.

### Target Specification

One of the simplest `Nmap` commands that can be run is against the target's IP address:

```
$ nmap benjamintoll.com
Starting Nmap 7.80 ( https://nmap.org ) at 2021-12-07 04:48 UTC
Nmap scan report for benjamintoll.com (167.114.97.28)
Host is up (0.0013s latency).
rDNS record for 167.114.97.28: vps-5102c79a.vps.ovh.ca
Not shown: 997 closed ports
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https

Nmap done: 1 IP address (1 host up) scanned in 0.12 seconds
```

When run as an unprivileged user, as we did above, `Nmap` will do a `TCP Connect Scan`, which by default will scan 1000 `tcp` ports.  Which ports, exactly?  Well, they are all listed in `/usr/share/nmap/nmap-services`.  This will perform the full 3-way handshake that we all know and love:

- `SYN`
- `SYN/ACK`
- `ACK`

Sadly, this type of scan is more likely to be detected by intrusion detection software.

If run as a privileged user, then `Nmap` will do a `Raw SYN Stealth Scan`, since only privileged users can create raw packets.  This is also quicker and only needs a 2-way handshake:

- `SYN`
- `SYN/ACK`

This detects port states more reliably than the `TCP Connect Scan`.

Let's choose thirty random targets on the Internet! [Do you feel lucky?]

```
$ sudo nmap -iR 30
```

This will probaby take quite a while, depending upon how nervous a person you are, and pressing any key will show you the percent done.  Pressing `v` will increase the verbosity.

A scan of this size will probably find some hosts that are up, and if so, it will show the IP and the ports states that `Nmap` found.

Scan a range:

```
$ nmap 192.168.1.1-5
```

### Port States

- open: a program is listening and actively accepting connections
- closed: no program is listening (it still demonstrates that a host is up)
- filtered: it cannot be determined if the port is open because there is packet filtering that is preventing the probes from reaching the port
- unfiltered: accessible, but `Nmap` cannot determine if the port is open or closed
- open|filtered: can be either, `Nmap` hasn't been able to determine it
- closed|filtered: can be either, `Nmap` hasn't been able to determine it

### Host Discovery

```
$ nmap -sL facebook.com/24
$ nmap -sL -iR 100 -vv

# Ping scan.
$ nmap -sn -iR 100 -vv
```

[`Nmap`]: https://nmap.org/
[port scanning]: https://en.wikipedia.org/wiki/Port_scanner
[Fyodor]: https://en.wikipedia.org/wiki/Gordon_Lyon
[Do you feel lucky?]: https://www.youtube.com/watch?v=abmULTYJJEg

