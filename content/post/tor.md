+++
title = "On Using Tor Beyond the Browser"
date = "2018-03-07T20:13:41-05:00"

+++

Everyone knows about using the Tor browser on desktop and mobile, and the more people using the network the greater the anonymity.  However, there are several other situations in which I also use Tor, and I'll quickly go over them.

It is assumed that Tor is installed and has been started.

## Download Debian packages using Tor onion services

There's no reason why I would want anyone to know what software I'm using, regardless of its purpose.  Indeed, there is an attack vector where an adversary could surmise a host's vulnerabilities by the packages downloaded from the distro.  To prevent this, the Debian administrators have set up several [Tor onion services] to allow a client to download packages with not only the assurance of end-to-end encryption but of complete anonymity. This is possible because all the communication happens within the Tor network, i.e., there are no exit nodes involved in which an adversary could snoop (I highly suggest reading the [Tor onion service protocol] for a better understanding of how this works, it's quite ingenious).

There are only two steps to set this up:

1. Install the [apt-transport-tor] package.
2. Replace the normal Debian mirror entries with the following:

		deb tor+http://vwakviie2ienjx6t.onion/debian          stretch            main
		deb tor+http://vwakviie2ienjx6t.onion/debian          stretch-updates    main
		deb tor+http://sgvtcaew4bxjd7ln.onion/debian-security stretch/updates    main

## Use torsocks

[torsocks] is a great program provided by the Tor team to prevent DNS leaks and other nefarious things, and it has replaced `proxychains` in my regular use because [it is far safer].  Its purpose is to enable the safe use of most applications by routing any network traffic they generate through the Tor network.  This is accomplished by wrapping the Berkeley internet sockets layer API and other functions such as `gethostbyname` and `gethostbyaddr`.

Why would you want to use this?  Avoiding the aforementioned DNS leaks is one reason.  Also, some applications will generate network traffic on their own, unbeknownst to the user.

Incidentally, such leaks can de-anonymize you, and because of this it is vitally important that you use the Tor browser.  It has been patched with such things in mind.  And no, using a non-Tor browser over Tor, such as through a SOCKS proxy, isn't the same thing and will not protect you.

To use, simply prepend `torsocks` to the command:

		torsocks wget http://www.example.com

`torsocks` is just a simple shell script that sets the [LD_PRELOAD] environment variable before launching the program in a new shell (open it in your editor and look at it!).  You could, for instance, set that in your shell's startup scripts, although that will not allow you to use DNS lookup tools like `dig` and `host` without a hacky workaround like:

		LD_PRELOAD=\  host www.example.com

Note there are two spaces after the backslash!

Because `torsocks` does not allow any traffic that can't go through the Tor network like UDP, it will throw an error when attempting to do so.  This is a good thing.  For example:

		torsocks dig www.example.com

will fail with a giant error, which serves as a good reminder to be mindful of your network traffic.  This brings me to the next tool.

## Use tor-resolve

[tor-resolve] is another tool from the Tor team.  It's to be used as a DNS resolver:

		tor-resolve www.example.com

It will not use `/etc/hosts` or any local resolvers, but instead will [pass the hostname to Tor] to be transported along a circuit to be resolved by an exit relay.  At this point, the IP will be passed back along the circuit.  Importantly, no UDP packets are ever sent from the local machine.  This is the same way that DNS is resolved when using the Tor browser.

Although some will complain that this is an extra step and an inconvenience, I believe it is well worth it and, frankly, have never believed that the "convenience" argument is very compelling.  It is trivial to write a shell helper script that would resolve any DNS query using `tor-resolve`, which could then pass/pipe the result to another program.


[Tor onion services]: https://bits.debian.org/2016/08/debian-and-tor-services-available-as-onion-services.html
[Tor onion service protocol]: https://www.torproject.org/docs/onion-services.html.en
[apt-transport-tor]: https://packages.debian.org/search?keywords=apt-transport-tor
[torsocks]: https://github.com/dgoulet/torsocks
[it is far safer]: https://tor.stackexchange.com/a/13521
[LD_PRELOAD]: https://linux.die.net/man/8/ld.so
[tor-resolve]: https://linux.die.net/man/1/tor-resolve
[pass the hostname to Tor]: https://tor.stackexchange.com/a/26

