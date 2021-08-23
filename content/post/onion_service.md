+++
title = "On Running a Tor Onion Service in a Chroot"
date = "2021-08-20T14:33:56-04:00"

+++

---

> This article for appeared on April 6, 2018.  It has been significantly updated, earning a new publication date.  Among the updates:
> 1. Updating the onion service from version 2 to version 3.
> 1. Details on installing `tor`.
> 1. Details on installing the `chroot` using `schroot`.
> 1. Details on installing `nginx`.

---

- [Tor Onion Services](#tor-onion-services)
- [Creating the Chroot](#creating-the-chroot)
    + [Installing `schroot`](#installing-schroot)
    + [Installing `nginx` in the `chroot`](#installing-nginx-in-the-chroot)
    + [Configuring `nginx`](#configuring-nginx)
- [The Onion Service](#the-onion-service)
    + [The Tor Onion Service Protocol](#the-tor-onion-service-protocol)
    + [Installing `tor`](#installing-tor)
    + [Create the Onion Service](#create-the-onion-service)
- [Starting `nginx`](#starting-nginx)
- [Conclusion](#conclusion)

---

## Tor Onion Services

A Tor onion service is, frankly, awesome.  Previously known as a hidden service, it is a service (http, ssh, git, etc.) that exists solely in the Tor network.  That not only means that you'll need Tor-enabled software to view any service, but that traffic to and from it never leaves the Tor network.

For example, in the case of a web service (i.e., a web server), content is accessible (browsable) as usual, but the host's IP address cannot be known by the client, since there is a Tor circuit between them (and, just as importantly, that onion service cannot know the client's IP address).  Content can be posted anonymously with great assurance that the poster will remain anonymous (if they so wish), and the usual traffic analysis attacks that Tor can be subject to is a non-issue since the traffic never leaves the Tor network.

[Onion service names] have a 56 character length and look like this:

`xlwg5q4e23voyjrtdvopp5thk2q5zopsgxpxo7jeffjodzdhaoizuoad.onion`

Let's first look at creating a `chroot` environment in which the onion service will run.  The advantage of this is that the service will be sandboxed, so in the unfortunate event that the service is compromised, the damage will be contained to the `chroot` and not infect the host environment\*.

> Note that there are many ways to create a `chroot`! If you have a preferred method (or don't wish to run the service in a `chroot`), then the next section can be skipped.  It describes a nice way to automate the process.

## Creating the `chroot`

### Installing `schroot`

There is a Debian package called [debootstrap] that will download and install a base system that can be used as a `chroot` where you can sandbox your onion service.  We'll use the package [`schroot`] for this.

I've [created a project] that wraps this entire process in a shell script, and you can [download or clone it] from GitHub.  Invoke the script by doing something like the following:

    $ sudo ./install.sh \
    --chroot onion \
    --group sudo \
    --release bullseye

This will create a `chroot` called `onion` in `/srv/chroot`, download and install Debian `bullseye` into it and allow any user in the `sudo` group to log into the `chroot`.  The given group is added to both the `groups` and the `root-groups` [`schroot` config keys], the latter giving any user that is a member of that group password-less access to the `chroot`.

> Likewise, adding a user via the `--user` flag will add the user to both the `users` and the `root-users` config keys with the same result.

In a nutshell, this script does the following things:

1. Installs debootstrap and `schroot` from your package repository.
1. Creates the following `schroot` definition in `/etc/schroot/chroot.d/$CHROOT_NAME`:

    <pre class="math">
    [onion]
    description=Debian (bullseye)
    type=plain
    directory=/srv/chroot/onion
    personality=linux
    profile=
    users=
    root-users=
    groups=sudo
    root-groups=sudo
    </pre>

1. Creates the `chroot` sandbox in `/srv/chroot/onion`.

> Of course the variables above map to whatever you entered on the command line when running the `install.sh` shell script.  See the [README] for more information and read the comments in the shell script.

Well, that was fun.  Let's now install `nginx` in the `chroot`.

### Installing `nginx` in the `chroot`

To install anything in the `chroot`, we'll have to access it as a privileged user.  Let's use the `root` user.

Issue the following command on the host:

```
$ schroot --directory / -u root -c onion
```

You should now see a root prompt in the `chroot`:

```
#
```

> Actually, depending on your `PS1` prompt, you may see more information like the hostname, etc.

Do the following to install `nginx`:

```
# apt update
# apt install nginx -y
# command -v nginx
/usr/sbin/nginx
```

Ok, we're all set to continue.

### Configuring `nginx`

In the `nginx` `default` config file, the only thing we need to change is the port number in the `server` block.  Currently, the beginning of the active server block looks like this:

<pre class="math">
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    ...
</pre>

This will need to be changed to the port that we will define in a later step in the `/etc/tor/torrc` config file for both IPv4 and IPv6.  In this case, it will be 25432, so let's go ahead and update that now.

Instead of installing `Vim`, the king of all editors, we can update the file with tools currently on the filesystem.  Let's use our old friend `sed`, the stream editor:

```
# sed -i 's/80/25432/' /etc/nginx/sites-available/default
```

Easy-peasy!

That will do it.  Let's check out the active server block now:

`/etc/nginx/sites-available/default`

<pre class="math">
server {
    listen 25432 default_server;                (1)
    listen [::]:25432 default_server;           (1)

    server_name _;                              (2)

    error_page 401 403 404 /404.html;
    root /var/www/html;

    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
</pre>

Notes:

1. The port must be the same as that defined in the `HiddenServicePort` key in the `torrc` config file.
1. If this is the only onion service on the machine, then it's not necessary to specify the Tor hostname.

Looks good, champ!

We'll now turn our lonely eyes to the onion service.

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

### Installing `tor`

First, we'll need to install the `tor` binary on the host.  I run Debian-based systems, so I'll get it using the `apt` package manager.  However, the Tor project recommends installing from [their Tor Debian repository].  Debian maintains long-term support (LTS) for their Tor package, so this means that it may not contain critical updates and vulnerability patches that their own latest stable version does.

> The `tor` binary is not the same as the [Tor browser]!  The browser listens on ports 9050 and 9051, and the `tor` program listens on port 9150.
>
>		$ ss -tlnp | ag 915?
>		LISTEN   0         4096              127.0.0.1:9150             0.0.0.0:*        users:(("tor",pid=5664,fd=11))
>       LISTEN   0         4096              127.0.0.1:9151             0.0.0.0:*        users:(("tor",pid=5664,fd=6))
>       $
>       $ ps -C tor -o pid=
>        5664

The installation is very straightforward:

From the CLI:

<pre class="math">
$ sudo apt install apt-transport-https                  <span style="color: green;">(1)</span>
$ {
    echo "deb     [arch=amd64] https://deb.torproject.org/torproject.org $(lsb_release -sc) main" ;
    echo "deb-src [arch=amd64] https://deb.torproject.org/torproject.org $(lsb_release -sc) main" ;
} | sudo tee -a /etc/apt/sources.list.d/tor.list        <span style="color: green;">(2)</span>
$
$ wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | gpg --import
$ gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | sudo apt-key add -
$
$ sudo apt update
$ sudo apt install tor deb.torproject.org-keyring -y    <span style="color: green;">(3)</span>
$ tor --version
Tor version 0.4.5.10.
$ tor &                                                 <span style="color: green;">(3)</span>
</pre>

Notes:

1. This allows fetching packages from `apt` using TLS.  Hopefully this has already been installed, for it is a good security measure and should be used whether or not `tor` is installed.
1. Add the Tor Debian repositories to `apt`.
1. Install both the latest stable `tor` package.  The `deb.torproject.org-keyring` from the Tor project helps to keep the signing key current.
1. Finally, start Tor and background it.

### Create the Onion Service

Creating the service is very straightforward.  The [Tor official docs] on this are short, to the point and easy to follow.

Now that you've installed `nginx` in the `chroot`, it's time to configure your onion service in the host.  You need only be concerned [with two directives]:

- `HiddenServiceDir`
    + This is a directory where Tor will store information about that onion service. In particular, Tor will create a file here named `hostname` which will tell you the onion URL. You don't need to add any files to this directory. Make sure this is not the same directory as the `hidserv` directory you created when setting up thttpd, as your HiddenServiceDir contains secret information!
- `HiddenServicePort`
    + This lets you specify a virtual port (that is, what port people accessing the onion service will think they're using) and an IP address and port for redirecting connections to this virtual port.

Put this config in `torrc` (the default location is `/etc/tor/torrc`).

For example, Kilgore Trout's looks like this:

	############### This section is just for location-hidden services ###

	## Once you have configured a hidden service, you can look at the
	## contents of the file ".../hidden_service/hostname" for the address
	## to tell people.
	##
	## HiddenServicePort x y:z says to redirect requests on port x to the
	## address y:z.

	HiddenServiceDir /home/kilgore/hidden_service/
	HiddenServicePort 80 127.0.0.1:25432

Restart Tor ( `killall -HUP tor` ), and the `hidden_service` directory will be created in the location that you specified in the `torrc` run command file.  Inside, there will be two files: `hostname` and `private_key`.  Feel free to publish the contents of `hostname` to the front page of The New York Times.

That's it, bub!  That wasn't too bad!

## Starting `nginx`

To start the onion service, do the following:

1. Change to the `chroot`:

        $ schroot --directory / -u root -c onion

1. Start the server:

        # service nginx start
        Starting nginx: nginx.

1. Verify it's running in the `chroot`:

        # service nginx status
        nginx is running.
        #
        # ss -nlpt | grep 25432
        LISTEN 0      511          0.0.0.0:25432      0.0.0.0:*    users:(("nginx",pid=923343,fd=6),("nginx",pid=923341,fd=6),("nginx",pid=923340,fd=6),("n
        ginx",pid=923339,fd=6),("nginx",pid=923337,fd=6),("nginx",pid=923336,fd=6),("nginx",pid=923335,fd=6),("nginx",pid=923334,fd=6),("nginx",pid=923333
        ,fd=6))
        LISTEN 0      511             [::]:25432         [::]:*    users:(("nginx",pid=923343,fd=7),("nginx",pid=923341,fd=7),("nginx",pid=923340,fd=7),("n
        ginx",pid=923339,fd=7),("nginx",pid=923337,fd=7),("nginx",pid=923336,fd=7),("nginx",pid=923335,fd=7),("nginx",pid=923334,fd=7),("nginx",pid=923333
        ,fd=7))

    >	If you'd like a gas, a real hoot, you can exit to the host and run the following commands:
    >
    >	    $ ss -nlpt | ag 25432
    >	    LISTEN    0         511                0.0.0.0:25432             0.0.0.0:*
    >
    >	    LISTEN    0         511                   [::]:25432                [::]:*
    >
    >	Here we see that the same `pid`s are listed as that in the `chroot`:
    >
    >	    $ ps -C nginx
    >	       PID TTY          TIME CMD
    >	    923333 ?        00:00:00 nginx
    >	    923334 ?        00:00:00 nginx
    >	    923335 ?        00:00:00 nginx
    >	    923336 ?        00:00:00 nginx
    >	    923337 ?        00:00:00 nginx
    >	    923339 ?        00:00:00 nginx
    >	    923340 ?        00:00:00 nginx
    >	    923341 ?        00:00:00 nginx
    >	    923343 ?        00:00:00 nginx
    >
    >   I wonder why...

Now, point your Tor browser to the listed domain, i.e., **`http://xlwg5q4e23voyjrtdvopp5thk2q5zopsgxpxo7jeffjodzdhaoizuoad.onion`**, and you should see the contents of your public web directory.  Just for fun, point another non-Tor-enabled browser at the onion domain and watch it timeout, as no DNS resolver in the universe will be able to service the request.  Weeeeeeee!

Back in the `chroot`, let's change the default index page, so we know that our eyes doth not deceive us and that we really have accomplished what we set out to do.

```
$ schroot --directory / -u root -c onion
# cd /var/www/html
# rm index.nginx-debian.html
# cat > index.html
<html>
<body>
<h1>Bowie!</h1>
</body>
</html>
```

Press **CTRL-D** to write that to file.  Then, go to your Tor browser and reload the page.  It should now have changed from the default `nginx` page to the single word "Bowie!".

We're now convinced.

Stick a fork in yourself, because you're done!

## Conclusion

This can easily be automated.  This can easily be done with a simple shell script.

Lastly, it cannot be overstated how important this is.  With the continued assaults on our Internet freedoms, we now have a viable alternative network to the Internet that cannot as easily be bent to serve the interests of corporations, governments and ideologues.

\* Fingers crossed!

[Onion service names]: https://support.torproject.org/onionservices/v2-deprecation/
[debootstrap]: https://packages.debian.org/stretch/debootstrap
[schroot]: https://packages.debian.org/stretch/schroot
[download or clone it]: https://github.com/btoll/chroot
[`schroot` config keys]: https://manpages.debian.org/stretch/schroot/schroot.conf.5.en.html
[created a project]: https://github.com/btoll/chroot
[README]: https://github.com/btoll/chroot/blob/master/README.md
[Tor onion service]: https://community.torproject.org/onion-services/
[Tor onion service protocol]: https://www.torproject.org/docs/onion-services.html.en
[onion services best practices]: https://help.riseup.net/en/security/network-security/tor/onionservices-best-practices
[Tor browser]: https://www.torproject.org/download/
[their Tor Debian repository]: https://support.torproject.org/apt/tor-deb-repo/
[Tor official docs]: https://www.torproject.org/docs/tor-onion-service.html.en
[nginx]: https://www.nginx.com/
[with two directives]: https://www.torproject.org/docs/tor-onion-service.html.en#two

