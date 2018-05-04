+++
title = "On TCP/IP Basics"
date = "2018-04-29T14:04:15-04:00"

+++

I've recently been doing a lot of research into port scanning, packet sniffing and other useful network debugging processes, so I've been brushing up on my understanding of TCP/IP (Transmission Control Protocol/Internet Protocol).  Most of the text here serves as crib notes I took as I was re-reading portions of the excellent [TCP/IP Illustrated] by W. Richard Stevens.  All the images are taken from his book.

## TCP/IP Protocol Suite

The TCP/IP protocol suite (also known as the Internet Protocol Suite) makes the Internet and every other network possible.  The suite is composed of many different protocols operating at four different layers:

+ Application layer - HTTP, FTP, SMTP, Telnet, etc.
+ Transport layer - TCP, UDP
+ Network layer - IP, ICMP, IGMP
+ Link layer - ARP, RARP
	- Includes the device driver in the kernel and the physical network interface card

The link layer takes the packet off the wire and delivers it up through the stack to the application layer.

## Layering

Usually, in Unix, the application layer is a user space process and the lower three layers are implemented in kernel space.  For instance, the lower three layers move the data to the socket-handling functions, which marks the boundary between kernel space and user space, to be delivered to the application process.

![Layering] (/images/layering.gif)

Indeed, the top layer only concerns itself with the application details, while the lower layers are concerned with moving this data to the other host.  These layers don't know (or care) about what is happening above it, and the same can be said about the application layer - it doesn't care how its packets were routed to it, and this includes not needing to know about the physical topology of the underlying network, whether Ethernet or Token Ring, etc.  This encapsulation is a very important part of how TCP/IP can work so seamlessly.

## Encapsulation

![Encapsulation] (/images/tcp_encapsulation.gif)

Note that the encapsulation diagram for UDP would look practically the same, except for the datagram when passed between the transport and network layers is obviously referred to as a UDP datagram, and the size of the header is 8 bytes rather than 20.

- The IP header contains an 8-bit *protocol* field that holds the layer to which the data belongs (1 = ICMP, 2 = IGMP, 6 = TCP, 17 = UDP). Recall that TCP and UDP are transport layer protocols but that IMCP, generally a network layer protocol, can be an application layer protocol (Traceroute, Ping).
- Similarly, the transport layer header as a 16-bit *port numbers* field (one for the destination port and one for the source port) that delineates which application it should be passed to.  This is because many different applications on the host could be using TCP and UDP at any one time.
- Finally, the link layer stores an identifier in the 16-bit *frame type* field in the Ethernet frame header that designates which IP protocol it contains (ARP, RARP).

## Demultiplexing

Demultiplexing is the process where the network stack passes a received packet up to the application layer.  It does this by removing the header at each level to determine which protocol should receive the packet in the layer above it.

![Demultiplexing] (/images/demultiplexing.gif)

For example, the link layer looks at the Ethernet frame header and looks to see which IP protocol in the layer above it must receive the data.  The network layer looks in its IP header to determine which transport layer protocol should receive the data, and finally the transport layer looks at the destination port number, the source IP address and the source port number fields (an internet socket) in its header to see which application receives the segment. 

Note that ICMP and IGMP messages are encapsulated in IP datagrams!  This is because, even though the are adjuncts to IP, they can be used in the application layer, as we've seen.  Also, ARP and RARP don't neatly fit into this model either, since they have their own Ethernet frames types, just like IP datagrams.

[TCP/IP Illustrated]: https://en.wikipedia.org/wiki/TCP/IP_Illustrated

