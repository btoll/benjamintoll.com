+++
title = "On Setting Up a Basic OpenVPN Server"
date = "2018-06-23T22:55:52-04:00"

+++

Setting up an [OpenVPN] server is a difficult task and has a reputation for being a scary undertaking (perhaps not warranted, but I held that opinion until recently).  It's been on my radar for a very long time (re: years), and after I recently stumbled across a pair of podcast episodes on the subject on [Hacker Public Radio] by [Klaatu], I decided to dig in.  I've heard several of his episodes before, and I knew that they would be good.  I wasn't disappointed.

The following post is merely the notes I took as I listened to both episodes; all credit is his.  Incidentally, everything just worked after I configured the server and client configs as he suggested and fired up `OpenVPN` on both ends...how often does that happen? :)

Let's get started!

# Server Setup

The first episode on `OpenVPN` by Klaatu deals with [the server setup] and is actually the fourth in a mini-series entitled Server Basics.  The previous episodes are not necessary to setup the virtual private network and deal with entirely different subjects.

> Before we get started, I'm running Debian stretch on a 64-bit processor.  Depending on your OS, your mileage may vary.  If you use Windows, you're completely on your own :)
>
> In addition, I'm using `OpenVPN` 2.4.6 and easy-rsa 3.

The first thing to do is to install `OpenVPN` and [easy-rsa], which is a project that sets up a PKI (public-key infrastructure) for a root certificate authority, consisting of shell scripts to help ease the creation of all the certificates and keys needed by `OpenVPN`.

	sudo apt-get install openvpn easy-rsa

I'm using version easy-rsa3 to follow along with Klaatu, but most of the docs out there use an older version (usually version 2).  If your package manager doesn't have version 3 (as mine didn't), you can get it from GitHub.  Just clone it and make sure that the version 3 branch is checked out before recursively copying the `easyrsa3` directory to your home directory.

For example, I did:

	mkdir ~/projects
	cd ~/projects
	git clone https://github.com/OpenVPN/easy-rsa.git
	cd easy-rsa
	cp -r easyrsa3/ ~

Listing the directory, you should find:

	~:$ ls -1 easyrsa3/
	easyrsa
	openssl-easyrsa.cnf
	vars.example
	x509-types

In addition, you may need to install [OpenSSL] if it's not currently on your system.

Ok, the first thing to do is to create the public-key infrastructure (PKI).  To do this, change into the new `easyrsa3` dir in the home directory and issue the following command:

	~/easyrsa3:$ ./easyrsa init-pki

	init-pki complete; you may now create a CA or requests.
	Your newly created PKI dir is: /home/btoll/easyrsa3/pki

	~/easyrsa3:$

We can view the contents of this newly-created directory:

	~/easyrsa3:$ ls -lR pki
	pki:
	total 8
	drwx------ 2 btoll btoll 4096 Jul  4 23:46 private
	drwx------ 2 btoll btoll 4096 Jul  4 23:46 reqs

	pki/private:
	total 0

	pki/reqs:
	total 0
	~/easyrsa3:$

The `private` and `reqs` directories don't contain anything for now.  Subsequent command will build up our infrastructure.

Now, let's generate a Certificate Authority (CA) as the previous response to the `init-pki` command alluded to:

	~/easyrsa3:$ ./easyrsa build-ca
	Enter New CA Key Passphrase:
	Re-Enter New CA Key Passphrase:
	Generating RSA private key, 2048 bit long modulus
	........................................................................................................+++
	.............+++
	e is 65537 (0x010001)
	You are about to be asked to enter information that will be incorporated
	into your certificate request.
	What you are about to enter is what is called a Distinguished Name or a DN.
	There are quite a few fields but you can leave some blank
	For some fields there will be a default value,
	If you enter '.', the field will be left blank.
	-----
	Common Name (eg: your user, host, or server name) [Easy-RSA CA]:derp

	CA creation complete and you may now import and sign cert requests.
	Your new CA certificate file for publishing is at:
	/home/btoll/easyrsa3/pki/ca.crt

	~/easyrsa3:$

As the output above shows, we're first prompted to create passphrase.  Although you may be tempted, DO NOT leave this blank or input a short or otherwise easily-crackable passphrase.  My suggestion is to use [Diceware] passphrases.  It then generates a 2048-bit RSA private key.  At the next prompt, it will ask for the Distinguished Name (DN), which as it hints, can be your hostname.  Finally, it will create the new cert and place it in the new `pki` directory, along with other new bits relating to the creation of the CA.

Let's now create a new request:

	~/easyrsa3:$ ./easyrsa gen-req derp
	Generating a 2048 bit RSA private key
	....+++
	...............+++
	writing new private key to '/home/btoll/easyrsa3/pki/private/derp.key.XtnYvZMQAm'
	Enter PEM pass phrase:
	Verifying - Enter PEM pass phrase:
	-----
	You are about to be asked to enter information that will be incorporated
	into your certificate request.
	What you are about to enter is what is called a Distinguished Name or a DN.
	There are quite a few fields but you can leave some blank
	For some fields there will be a default value,
	If you enter '.', the field will be left blank.
	-----
	Common Name (eg: your user, host, or server name) [derp]:

	Keypair and certificate request completed. Your files are:
	req: /home/btoll/easyrsa3/pki/reqs/derp.req
	key: /home/btoll/easyrsa3/pki/private/derp.key

	~/easyrsa3:$

Replace `derp` with whatever you entered as the DN previously, and again enter a strong passphrase for the private key.  `easyrsa` creates the keypair and cert request and places them into the PKI.

Now, we'll create a cert for our server.

	~/easyrsa3:$ ./easyrsa sign-req server derp


	You are about to sign the following certificate.
	Please check over the details shown below for accuracy. Note that this request
	has not been cryptographically verified. Please be sure it came from a trusted
	source or that you have verified the request checksum with the sender.

	Request subject, to be signed as a server certificate for 3650 days:

	subject=
	    commonName                = derp


	Type the word 'yes' to continue, or any other input to abort.
	  Confirm request details: yes
	Using configuration from ./openssl-easyrsa.cnf
	Enter pass phrase for /home/btoll/easyrsa3/pki/private/ca.key:
	Check that the request matches the signature
	Signature ok
	The Subject's Distinguished Name is as follows
	commonName            :ASN.1 12:'derp'
	Certificate is to be certified until Jul  2 04:29:41 2028 GMT (3650 days)

	Write out database with 1 new entries
	Data Base Updated

	Certificate created at: /home/btoll/easyrsa3/pki/issued/derp.crt

	~/easyrsa3:$

Note the literal string `server` in the command above is needed to explicitly generate the signed certificate for the server `derp`.  Immediately after entering the above command it will briefly summarize what the cert is for (i.e., the commandName `derp`), and it will ask you to confirm the request details.  Simply enter `yes` at the prompt.  After entering the passphrase for the private CA key, it will create the cert as part of your PKI.

Now, the server needs a Diffie-Hellman file, for which we'll use our friend `OpenSSL`.

	openssl dhparam -out dh2048.pem 2048

This tells `OpenSSL` to create the file in the current now directory called `dh2048.pm`, which is convention since we specified it to use 2048 bits.

> Note that here in the episode Klaatu talks about generating a `ta.key` for extra TLS protection with the VPN we're creating.  He doesn't go into detail about installing this, only about generating it with the command:
>
>	sudo openvpn --genkey --secret ta.key
>
> `ta.key` is again by convention the default name, which stands for TLS Auth.

At this point, we've now generated all the files that we need for a base `OpenVPN` install.  We'll now copy these keys and certs to the location in the filesystem where `OpenVPN` will expect to find them.

Before we do, ensure that however you installed `OpenVPN` placed a directory in `/etc`:

	ls /etc/openvpn

If not, you can create it with the needed subdirectories:

	sudo mkdir -p /etc/openvpn/{certs,keys}

Now, to copy the necessary files to their new homes.  I'm going to explicitly copy them one at a time, but obviously you could do the same thing using only a couple commands.

	cd ~/easyrsa3
	sudo cp dh2048.pem /etc/openvpn/certs
	sudo cp pki/ca.crt /etc/openvpn/certs
	sudo cp pki/issued/derp.crt /etc/openvpn/certs

	sudo cp ta.key /etc/openvpn/keys
	sudo cp pki/private/derp.key /etc/openvpn/keys

We'll now pivot to install the server configuration script named `server.conf` into `/etc/openvpn`.  If it doesn't currently exist (depends on the package manager), you can always get a default server config from [the downloads page] of the `OpenVPN` website.  As of this writing, 2.4.6 is the latest release:

	curl https://swupdate.openvpn.org/community/releases/openvpn-2.4.6.tar.xz | tar xJf -

After changing into the `OpenVPN` directory, the default config files should be in `openvpn/examples/sample-config-files/`.  Grab `server.conf` and copy it to `/etc/openvpn`.

I kept most of the defaults, such as 1194 as the port and UDP as the protocol, and I'll only, illustrate the differences here.  I suggest, however, to read through the configuration file as it is well-commented.

	# SSL/TLS root certificate (ca), certificate
	# (cert), and private key (key).
	ca /etc/openvpn/certs/ca.crt
	cert /etc/openvpn/certs/derp.crt
	key /etc/openvpn/keys/derp.key

	# Diffie hellman parameters.
	dh /etc/openvpn/certs/dh2048.pem

	# Configure server mode and supply a VPN subnet
	# for OpenVPN to draw client addresses from.
	server 10.8.0.0 255.255.255.0

	# Select a cryptographic cipher.
	# This config item must be copied to
	# the client config file as well.
	# Note that v2.4 client/server will automatically
	# negotiate AES-256-GCM in TLS mode.
	# See also the ncp-cipher option in the manpage
	cipher AES-256-CBC

	# For compression compatible with older clients use comp-lzo
	# If you enable it here, you must also
	# enable it in the client config file.
	comp-lzo

	# The maximum number of concurrently connected
	# clients we want to allow
	max-clients 10

	# It's a good idea to reduce the OpenVPN
	# daemon's privileges after initialization.
	user nobody
	group nogroup

	# Output a short status file showing
	# current connections, truncated
	# and rewritten every minute.
	status openvpn-status.log

	# By default, log messages will go to the syslog (or
	# on Windows, if running as a service, they will go to
	# the "\Program Files\OpenVPN\log" directory).
	# Use log or log-append to override this default.
	log-append  /var/log/openvpn/openvpn.log

	# Set the appropriate level of log
	# file verbosity.
	verb 6

	# Silence repeating messages.  At most 20
	# sequential messages of the same message
	# category will be output to the log.
	mute 20

	# Notify the client that when the server restarts so it
	# can automatically reconnect.
	explicit-exit-notify 0

Ok, that was a ton of stuff to get through to the good part, which is to now test the `OpenVPN` server.  Let's ensure first that traffic can actually reach the process.

Open port 1194 in firewall to allow traffic into the server.  Note that [ufw] is an easy-to-use front end to [iptables].

	sudo ufw allow 1194/udp

Obviously change the port number from the default if you've chosen to use another.

Check the routing table to see if there is an entry for the VPN (`ip a` will show all the network devices).

	~:$ sudo route
	Kernel IP routing table
	Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
	10.8.0.2        0.0.0.0         255.255.255.255 UH    0      0        0 tun0
	10.8.0.0        10.8.0.2        255.255.255.0   UG    0      0        0 tun0
	172.217.4.46    0.0.0.0         255.255.255.0   U     0      0        0 venet0
	default         0.0.0.0         0.0.0.0         U     0      0        0 venet0


Finally, run the following command to start the `OpenVPN` server:

	sudo openvpn --askpass --daemon derp --config /etc/openvpn/server.conf

This should prompt you for your passphrase.  Depending on how/if you're logging, it will then either spit out a bunch of logs or just return you the prompt.  If the latter, I highly recommend tailing your log file and checking to make sure there are no errors.  Also, you can grep the active processes to see if it started:

	pgrep openvpn

If it's running, the process id will be returned.  Congratulations!

### Troubleshooting

It's always worth repeating: check the logs!  Again, it's helpful to tail the log file when firing up the server:

	sudo tail -f /var/log/openvpn/openvpn.log

Recall that we set the verbosity at 6 in `server.conf`, so this should give us good error reporting, and I haven't found the need to bump it up to 9.  My experience has been that `OpenVPN` has gone through pains to make sure that any errors are clear and informative, and any problems I had I was able to resolve immediately after checking the logs.

# Client Setup

The second episode in the aforementioned miniseries on `OpenVPN` deals with [the client setup].

I'm going to create the client files on the server using the same PKI workspace that we setup previously.

        ~/easyrsa3:$ ./easyrsa gen-req client0
        Generating a 2048 bit RSA private key
        .+++
        ..........+++
        writing new private key to '/home/btoll/easyrsa3/pki/private/client0.key.KwvXQq04e5'
        Enter PEM pass phrase:
        Verifying - Enter PEM pass phrase:
        -----
        You are about to be asked to enter information that will be incorporated
        into your certificate request.
        What you are about to enter is what is called a Distinguished Name or a DN.
        There are quite a few fields but you can leave some blank
        For some fields there will be a default value,
        If you enter '.', the field will be left blank.
        -----
        Common Name (eg: your user, host, or server name) [client0]:

        Keypair and certificate request completed. Your files are:
        req: /home/btoll/easyrsa3/pki/reqs/client0.req
        key: /home/btoll/easyrsa3/pki/private/client0.key

Similarly to when we did it for the server, it will ask us to enter a passphrase and then a Distinguished Name, which defaults to whatever name you gave it on the command line (in this case `client0`).

> This step could have been done by the client on their machine, and then this generated request file could have been sent to you to be signed by the server certificate.  It really depends on their skill level.

Now, sign it.  Note that this command mirrors the one for the server, except for the fact that we're specifying that we're signing the request for a client with the given name.

	~/easyrsa3:$ ./easyrsa sign-req client client0


        You are about to sign the following certificate.
        Please check over the details shown below for accuracy. Note that this request
        has not been cryptographically verified. Please be sure it came from a trusted
        source or that you have verified the request checksum with the sender.

        Request subject, to be signed as a client certificate for 3650 days:

        subject=
            commonName                = client0


        Type the word 'yes' to continue, or any other input to abort.
          Confirm request details: yes
        Using configuration from ./openssl-easyrsa.cnf
        Enter pass phrase for /home/btoll/easyrsa3/pki/private/ca.key:
        Check that the request matches the signature
        Signature ok
        The Subject's Distinguished Name is as follows
        commonName            :ASN.1 12:'client0'
        Certificate is to be certified until Jun 21 01:34:08 2028 GMT (3650 days)

        Write out database with 1 new entries
        Data Base Updated

        Certificate created at: /home/btoll/easyrsa3/pki/issued/client0.crt

This process should be familiar to you now; enter `yes` at the prompt, followed by the server's passphrase for its private key.

This is now the signed cert that we send back to the user (`client0.crt`).

> Hopefully, it goes without saying that only the server key in the PKI created by the server can be used to sign any client requests.  A signed client request by a different server key would not allow these two systems to communicate.

Since there's no user involved in this process, we'll tar all the client files that we created and copy it ourselves to the user (client) computer:

	mkdir -p ~/easyrsa3/client0-vpn && cd ~/easyrsa3/client0-vpn
	cp pki/ca.crt client0-vpn/
	cp pki/issued/client0.crt client0-vpn/
	cp pki/private/client0.key client0-vpn/
	sudo chown btoll:btoll ta.key
	cp ta.key client0-vpn/

	// Tar and secure copy to client.
	tar cjf client0-vpn.bz2 client0-vpn

	// Now, on client computer.
	cd ~
	scp onf:~/easyrsa3/client0-vpn.bz2 .

As we did on the server, the client needs to move files into correct location(s):

	(cd to home dir on client computer)
	cd ~
	tar xf client0-vpn.bz2

	// Create the same dir structure as on the server, if it doesn't already exist.
	// The directory structure doesn't matter at the end of the day as long as you
	// point the config to the correct location(s), but I find it's good to mirror
	// the server as there's one less moving part!
	sudo mkdir -p /etc/openvpn/{certs,keys}
	sudo cp client0-vpn/{ca,client0}.crt /etc/openvpn/certs
	sudo cp client0-vpn/{ta,client0}.key /etc/openvpn/keys

`/etc/openvpn` should now at least contain those copied files (and maybe others, depending upon your distro and package manager):

	~:$ ls -lR /etc/openvpn
	.:
	total 16
	drwxr-xr-x 2 root root 4096 Jun 23 22:12 certs
	drwxr-xr-x 2 root root 4096 Jun 23 21:51 keys
	-rwxr-xr-x 1 root root 1301 Jun 24 16:31 update-resolv-conf

	./certs:
	total 12
	-rw------- 1 root root 1176 Jun 23 21:50 ca.crt
	-rw------- 1 root root 4439 Jun 23 22:12 client0.crt

	./keys:
	total 8
	-rw------- 1 root root 1854 Jun 23 21:51 client0.key
	-rw------- 1 root root  636 Jun 23 21:51 ta.key
	~:$

> It's worth repeating that some of these files could have been created by the user on their machine, but the client request MUST send you their request that you will then sign with the server key.  The certificate generated by signing their request is what they need and can only come from the `OpenVPN` server with whom they wish to communicate!

Now, let's install a `client.conf` file on the client, again mirroring the process that we previously did on the server.  Note that I found a sample `client.conf` config at the location below, but it may not be the same for you:

	sudo cp /usr/share/doc/openvpn/examples/sample-config-files/client.conf /etc/openvpn/
	sudo vi /etc/openvpn/client.conf

I kept most of the defaults, such as 1194 as the port and UDP as the protocol, and I'll only, illustrate the differences here.  I suggest, however, to read through the configuration file as it is well-commented.

	# The hostname/IP and port of the server.
	# You can have multiple remote entries
	# to load balance between the servers.
	remote your.server.ip.addr 1194

	# Keep trying indefinitely to resolve the
	# host name of the OpenVPN server.  Very useful
	# on machines which are not permanently connected
	# to the internet such as laptops.
	resolv-retry infinite

	# Most clients don't need to bind to
	# a specific local port number.
	nobind

	# Downgrade privileges after initialization (non-Windows only)
	user nobody
	group nogroup

	# SSL/TLS parms.
	# See the server config file for more
	# description.  It's best to use
	# a separate .crt/.key file pair
	# for each client.  A single ca
	# file can be used for all clients.
	ca /etc/openvpn/certs/ca.crt
	cert /etc/openvpn/certs/client0.crt
	key /etc/openvpn/keys/client0.key

	# Verify server certificate by checking that the
	# certicate has the correct key usage set.
	# This is an important precaution to protect against
	# a potential attack discussed here:
	#  http://openvpn.net/howto.html#mitm
	#
	# To use this feature, you will need to generate
	# your server certificates with the keyUsage set to
	#   digitalSignature, keyEncipherment
	# and the extendedKeyUsage to
	#   serverAuth
	# EasyRSA can do this for you.
	remote-cert-tls server

	# Select a cryptographic cipher.
	# If the cipher option is used on the server
	# then you must also specify it here.
	# Note that 2.4 client/server will automatically
	# negotiate AES-256-GCM in TLS mode.
	# See also the ncp-cipher option in the manpage
	cipher AES-256-CBC

	# Enable compression on the VPN link.
	# Don't enable this unless it is also
	# enabled in the server config file.
	comp-lzo

	# Set log file verbosity.
	verb 6

	# Silence repeating messages
	mute 20

Now for the moment of truth.  Let's start `OpenVPN` on the client and see if we can ping the server!

	sudo openvpn --askpass --daemon derp --config /etc/openvpn/client.conf

Hopefully, it prompted you for your passphrase.  If not, something went wrong.  Check the server logs!

Now, try to ping the server:

	ping -c 4 10.8.0.1

If that didn't work, check the server logs!

You'll now see your new TUN network device!

	~:$ ip addr show tun0
	67: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UNKNOWN group default qlen 100
	    link/none
	    inet 10.8.0.6 peer 10.8.0.5/32 scope global tun0
	       valid_lft forever preferred_lft forever
	    inet6 fe80::afa0:ee89:e545:d1cf/64 scope link stable-privacy
	       valid_lft forever preferred_lft forever
	~:$

	~:$ sudo ifconfig tun0
	[sudo] password for btoll:
	tun0: flags=4305<UP,POINTOPOINT,RUNNING,NOARP,MULTICAST>  mtu 1500
		inet 10.8.0.6  netmask 255.255.255.255  destination 10.8.0.5
		inet6 fe80::afa0:ee89:e545:d1cf  prefixlen 64  scopeid 0x20<link>
		unspec 00-00-00-00-00-00-00-00-00-00-00-00-00-00-00-00  txqueuelen 100  (UNSPEC)
		RX packets 435  bytes 82324 (80.3 KiB)
		RX errors 0  dropped 0  overruns 0  frame 0
		TX packets 628  bytes 75234 (73.4 KiB)
		TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

	~:$

Now that we're on the same network, i can ssh to the `OpenVPN` server:

	ssh 10.8.0.1

Cool!!!!!

You can also ping the client from the server:

	ping -c 4 10.8.0.6

### Troubleshooting

As I've often said, check the server logs!  The errors are very descriptive and have helped me to immediately fix any issues I had.  Also, don't be afraid to search online (as always, not with Google!).

If there's nothing helpful in the logs, check the firewall setting on the server.  I previously mentioned opening up port 1194, so make sure that the port is enabled for UDP traffic:

	sudo ufw status

In addition, you may have to route `OpenVPN` traffic to the subnet you want to reach.  Check the routing table on the client:

	~:$ sudo route
	Kernel IP routing table
	Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
	default         _gateway        0.0.0.0         UG    600    0        0 wlp3s0
	10.8.0.1        10.8.0.5        255.255.255.255 UGH   0      0        0 tun0
	10.8.0.5        0.0.0.0         255.255.255.255 UH    0      0        0 tun0
	link-local      0.0.0.0         255.255.0.0     U     1000   0        0 wlp3s0
	192.168.43.0    0.0.0.0         255.255.255.0   U     600    0        0 wlp3s0

> I already had an entry in my routing table, but it may have been from a prior installation.  You may have to do:
>
>	sudo route add -net 10.8.0.0/24 dev tun0

This is telling the kernel's routing table to route all traffic from the `tun0` device to our subnet `10.8.0.0/24`.

Just as a note, if you need to bring the network device up or down, you can use the following commands:

	ip link set down dev tun0
	ip link set up dev tun0

As a nicety, set the new server VPN IP address in your DNS resolver.

	sudo echo "openvpn 10.8.0.1" >> /etc/hosts
	ssh openvpn

# Beyond the Basics

So, now we have an `OpenVPN` network installed and operational, with both sides able to ping each other.  That's great, and it is a huge accomplishment!

However, this is just a basic installation using most of the defaults that we preset in both the server and client `OpenVPN` configurations.

The only thing more that I needed was to send all my IP traffic through the new VPN tunnel.  I pointed my browser at [DNS Leak Test] and observed the IP address that it reported for me.  At first it was my ISP, as was expected.  I then changed over to my server configuration and added (or uncommented) the following `push` directive:

	# If enabled, this directive will configure
	# all clients to redirect their default
	# network gateway through the VPN, causing
	# all IP traffic such as web browsing and
	# and DNS lookups to go through the VPN
	# (The OpenVPN server machine may need to NAT
	# or bridge the TUN/TAP interface to the internet
	# in order for this to work properly).
	push "redirect-gateway def1 bypass-dhcp"

Restart the `OpenVPN` server, refresh the web page, and it should change to that of your `OpenVPN` server.  Easy peasy!

The only thing left to do for web browsing is to prevent DNS leaks, because I definitely do not want my ISP knowing what sites I'm visiting.

Place the following lines in your `client.conf`:

	script-security 2
	up /etc/openvpn/update-resolv-conf
	down /etc/openvpn/update-resolv-conf

This should direct all DNS requests through the VPN tunnel, and you can verify this through DNS Leak Test's [Extended test] feature.

> If you're wondering where the `update-resolv-conf` script came from, it came by default with the `OpenVPN` package downloaded by my package manager.  Again, I'm on a Linux system (Debian), so this fix is specific to Linux.  Windows will have a different solution, consult the `OpenVPN` docs.

[OpenVPN]: https://openvpn.net/
[Hacker Public Radio]: http://hackerpublicradio.org/
[Klaatu]: http://hackerpublicradio.org/correspondents.php?hostid=78
[the server setup]: http://hackerpublicradio.org/eps.php?id=2447
[easy-rsa]: https://github.com/OpenVPN/easy-rsa
[OpenSSL]: https://www.openssl.org/
[Diceware]: https://github.com/btoll/diceware
[the downloads page]: https://openvpn.net/index.php/open-source/downloads.html
[the client setup]: http://hackerpublicradio.org/eps.php?id=2451
[ufw]: https://wiki.ubuntu.com/UncomplicatedFirewall
[iptables]: https://en.wikipedia.org/wiki/Iptables
[DNS Leak Test]: https://www.dnsleaktest.com/
[Extended test]: https://www.dnsleaktest.com/results.html

