---
title: "On Loopback"
date: 2019-09-23T21:08:14-04:00
---

**The image and quotation are taken from the book [TCP/IP Illustrated] by [W. Richard Stevens].**

The [loopback interface] on a host allows a client and server on the same host to talk to each other.  By convention, it's usually assigned the IP address 127.0.0.1 and the name `localhost`.  It is part of the [Class A] network 127 (127.0.0.0/8 in [CIDR notation]).

It's noteworthy that no IP datagram traffic sent to the loopback interface may appear on the network.

From the book "TCP/IP Illustrated", chapter 2, section 7:

> Although we could imagine the transport layer detecting that the other end is the loopback address, and short circuiting some of the transport layer logic and all of the network layer logic, most implementations perform complete processing of the data in the transport layer and network layer, and only loop the IP datagram back to itself when the datagram leaves the bottom of the network layer.

Check out the illustration below to get a better sense of how it works:

![Loopback] (/images/loopback.gif)

There are three ways a datagram can be addressed that will cause the network layer or the network device driver at the link layer to pass the traffic to the loopback interface and then back up the stack via the network layer:

1. Directly addressing the 127.0.0.1 address.

1. Sending a broadcast or multicast packet (since the sending host is considered to be part of the multicasting or broadcasting).  The datagram is copied to the loopback interface and also sent onto the network.

1. Addressing a request to another of the host's IP addresses (a [multihomed host]).

Lastly, it's important to note that the loopback interface appears as just another link layer to the network layer.  The datagram is passed to the loopback interface directly from the network layer like any other link layer, which in turn passes it back up to the IP's input queue.

In this way, as noted above, the traffic is never placed onto the network.

[loopback interface]: https://en.wikipedia.org/wiki/Loopback#Virtual_loopback_interface
[Class A]: https://en.wikipedia.org/wiki/Classful_network#Classful_addressing_definition
[CIDR notation]: https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing#CIDR_notation
[TCP/IP Illustrated]: https://en.wikipedia.org/wiki/TCP/IP_Illustrated
[W. Richard Stevens]: https://en.wikipedia.org/wiki/W._Richard_Stevens
[multihomed host]: https://en.wikipedia.org/wiki/Multihoming

