+++
title = "On Running a Tor Onion Service in a Chroot"
date = "2018-04-06T14:33:56-04:00"

+++

## Tor Onion Services

A Tor onion service is, frankly, awesome.  Previously known as a hidden service, it is a service (http, ssh, git, etc.) that exists solely in the Tor network.  That not only means that you'll need Tor-enabled software to view any service, but that traffic to and from it never leaves the Tor network.

For example, in the case of a web service (i.e., a web server), content is accessible (browsable) as usual, but the host's IP address cannot be known by the client, since there is a Tor circuit between them (and, just as importantly, that onion service cannot know the client's IP address).  Content can be posted anonymously with great assurance that the poster will remain anonymous (if they so wish), and the usual traffic analysis attacks that Tor can be subject to is a non-issue since the traffic never leaves the Tor network.

Host names look like this: `http://wmtpmql2hds4ijcp.onion`

Let's first look at creating a chroot environment in which the onion service will run.  The advantage of this is that the service will be sandboxed, so in the unfortunate event that the service is compromised, the damage will be contained to the chroot and not infect the host environment\*.

> Note that there are many ways to create a chroot! If you have a preferred method (or don't wish to run the service in a chroot), then the next section can be skipped.  It describes a nice way to automate the process.

## Create the Chroot

There is a Debian package called [debootstrap] that will download and install a base system that can be used as a chroot where you can sandbox your onion service.  We'll use the package [schroot] for this.

I've created a repo that wraps this entire process in a shell script, and you can [download or clone it] from GitHub.  Invoke the script by doing something like the following:

	$ sudo ./install_chroot.sh -c foo -u btoll -r stretch

This will create a chroot called `foo` in `/srv/chroot`, download and install Debian `stretch` into it and create a user  called `btoll` (with root privileges).

In a nutshell, this script does the following things:

1. Installs debootstrap and schroot from your package repository.
2. Creates the following [chroot definition] in `/etc/schroot/chroot.d/$CHROOT_NAME`:

		[$CHROOT_NAME]
		description=Debian ($DEBIAN_RELEASE)
		type=directory
		directory=/srv/chroot/$CHROOT_NAME
		users=$CHROOT_USER
		groups=sbuild
		root-users=$CHROOT_USER
		root-groups=root

3. Copies your `/etc/apt/sources.list` file to the chroot (`/srv/chroot/$CHROOT_NAME/etc/apt/sources.list`).
4. Removes your home directory as a default mount point in `/etc/schroot/default/fstab`.
5. Creates the chroot sandbox in `/srv/chroot/`.

You can then enter your chroot by issuing the following command:

	$ schroot -u $CHROOT_USER -c $CHROOT_NAME

(Of course the variables above map to whatever you entered on the command line when running the `install_chroot.sh` shell script.  See the [README] for more information and read the comments in the shell script.)

You are now ready to create your Tor onion service in the chroot!

## The Onion Service

### The Tor Onion Service Protocol

> Feel free to skip this section if the technical details don't interest you.

First, it is worth reading for yourself the [Tor onion service protocol].  It is not long.  Do it now, and I'll be here when you get back.

Ok, great.  Let's summarize the important bits.

1. **Select the introduction points** - The onion service randomly selects three relays that will serve as introduction points and creates circuits to each one (three hops).  As a result, the relay points cannot know the IP address of the onion service.  They will, however, know the service's identity by receiving its public key.

2. **Advertise that the service is available** - The onion service then uploads an *onion service descriptor* to a distributed hash table containing its public key and a summary of each of its randomly-selected introduction points.  This descriptor is cryptographically-signed by the service's private key: a 16-character long name (which was generated from the public key when the service was created on your machine - you'll see this later), appended with the `.onion` extension, is how the service can be found in the Tor network.  The service is now setup.

	Because of the assurances of public-key cryptography, all parties can be confident that they are indeed talking to the owner of the onion service by the fact that the name is generated from the public key.

3. **The client downloads the descriptor and sets up a rendezvous point** - After learning of the onion address, the client downloads the onion service descriptor from the distributed hash table, in the process learning the onion service's three randomly-selected introduction points.  The client "around this time", meaning now or even before the request for the descriptor, establishes a circuit to a randomly-picked relay, henceforth known as the *rendezvous point*, and tells it a one-time secret.  Incidentally, if the descriptor cannot be downloaded, it could be because the onion service is currently offline.

4. **The client requests an introduction of the host** - Using the service's public key, the client encrypts the address of the rendezvous point and the one-time secret and sends it to one of the introduction points as an *introduce* message.  The chosen introduction point in turn sends the introduce message via its own circuit to the onion service.  Since this communication occurs over established circuits, the service cannot correlate the introduce message with the client, so it remains anonymous.

5. **The onion service creates a circuit to the rendezvous point** - After having decrypted the client's introduce message to find the address of the rendezvous point and the one-time secret, the onion service will then establish a circuit to the said rendezvous point and sends the one-time secret to it in a *rendezvous* message.

	Due to an attack vector where an adversary could operate a relay and try to force the service into creating an aribitrary number of circuts and by chance choosing it as the entry node, the service is forced to use the same set of entry guards when establishing this circuit.

6. **The client and service communicate via the rendezvous point** - The client is notified by the rendezvous point about the successful establishment of the connection with the service. They will then use their respective circuits to communicate, with the rendezvous point simply relaying the end-to-end encrypted messages between the end nodes.

	Note that the rendezvous never learns about the identity of either the onion service or the client.

I also highly recommend reading more about [onion services best practices].

### Create the Onion Service

Creating the service is very straightforward (it's assumed that Tor is installed and up and running).  The [Tor official docs] on this are short and to the point and easy to follow.  Installing a web server is easy, and I recommend [nginx].  There are plenty of tutorials to be found on installation and setup so I won't cover it here, but don't use the [military-industrial complex] to do your search. Use [these guys] instead.

Now that you've installed nginx in the chroot,  it's time to configure your onion service.  You need only be concerned with two directives, `HiddenServiceDir` and `HiddenServicePort`.  [From the docs]:

- *HiddenServiceDir* is a directory where Tor will store information about that onion service. In particular, Tor will create a file here named `hostname` which will tell you the onion URL. You don't need to add any files to this directory. Make sure this is not the same directory as the `hidserv` directory you created when setting up thttpd, as your HiddenServiceDir contains secret information!

- *HiddenServicePort* lets you specify a virtual port (that is, what port people accessing the onion service will think they're using) and an IP address and port for redirecting connections to this virtual port.

Put this config in `torrc` (mine is located at `/etc/tor/torrc`).  Note that this is done in the host environment, **not** the chroot.

For example, mine looks like this:

	############### This section is just for location-hidden services ###

	## Once you have configured a hidden service, you can look at the
	## contents of the file ".../hidden_service/hostname" for the address
	## to tell people.
	##
	## HiddenServicePort x y:z says to redirect requests on port x to the
	## address y:z.

	HiddenServiceDir /home/btoll/hidden_service/
	HiddenServicePort 80 127.0.0.1:2001

Restart Tor ( `killall -HUP tor` ), and the `hidden_service` directory will be created in the location that you specified in the `torrc` run command file.  Inside, there will be two files: `hostname` and `private_key`.  Feel free to publish the contents of `hostname` to the front page of The New York Times.

The last thing to do before starting nginx is to add a server block so nginx knows how to serve requests to the service.  Here is an example that works with the onion service config given in the `torrc` example above (added to `/etc/nginx/sites-available/default`):

	server {
		listen 2001;
		listen [::]:2001;

		server_name lgewyajrjxytj4z6.onion;

		error_page 401 403 404 /404.html;
		root /var/www/html;

		index index.html index.htm;

		location / {
			try_files $uri $uri/ =404;
		}
	}

Note that the ports must match and the `server_name` must be that of the onion service address.

To start the onion service, do the following:

1. Change to the chroot

        $ schroot -u btoll -c foo

2. Start the server

        $ sudo /etc/init.d/nginx start

Now, point your Tor-enabled browser to the listed domain, i.e., `http://wmtpmql2hds4ijcp.onion`, and you should see the contents of your public web directory.  Just for fun, point another non-Tor-enabled browser at the onion domain and watch it timeout, as no DNS resolver in the universe will be able to service the request.  Weeeeeeee!

Stick a fork in yourself, because you're done!

## Conclusion

It cannot be overstated how important this is.  With the continued assaults on our Internet freedoms, we now have a viable alternative network to the Internet that cannot as easily be bent to serve the interests of corporations, governments and ideologues.

\* Fingers crossed!

[debootstrap]: https://packages.debian.org/stretch/debootstrap
[schroot]: https://packages.debian.org/stretch/schroot
[download or clone it]: https://github.com/btoll/chroot
[chroot definition]: https://manpages.debian.org/stretch/schroot/schroot.conf.5.en.html
[README]: https://github.com/btoll/chroot/blob/master/README.md
[Tor onion service protocol]: https://www.torproject.org/docs/onion-services.html.en
[onion services best practices]: https://help.riseup.net/en/security/network-security/tor/onionservices-best-practices
[Tor official docs]: https://www.torproject.org/docs/tor-onion-service.html.en
[nginx]: https://www.nginx.com/
[military-industrial complex]: https://www.eff.org/deeplinks/2018/04/should-google-really-be-helping-us-military-build-ai-systems
[these guys]: https://duckduckgo.com/
[From the docs]: https://www.torproject.org/docs/tor-onion-service.html.en#two

