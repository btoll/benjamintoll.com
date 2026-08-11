+++
title = "On Classless Networks"
date = "2021-04-24T22:33:04-04:00"

+++

This is the second article in a two-part series:

1. [Classful Networks]
1. **Classless Networks**

---

- [Classless Networks](#classless-networks)
- [CIDR Notation](#cidr-notation)
    + [Examples](#examples)
    + [Properties](#properties)
- [Calculating Hosts and Ranges from CIDR Notation](#calculating-hosts-and-ranges-from-cidr-notation)
    + [Example 1](#example-1)
    + [Example 2](#example-2)
    + [Example 3](#example-3)
    + [Example 4](#example-4)
- [Calculating a Supernetwork](#calculating-a-supernetwork)
- [References](#references)

> They may not have much class, but they are certainly not rubes.

## Classless Networks

Classless networks were implemented in 1993 by the [Internet Engineering Task Force] to supplant the classful network architecture.  Two of the most important needs to address were:

1. Slowing [IPv4 address exhaustion].
1. Slowing the growth of [routing tables] due to the inability to do route aggregation.

To address these goals, classless networks introduced the idea of variable-length subnet masking ([VLSM]).  This allowed for the allotting of arbitrary-length network prefixes and allowed each network to be divided into power-of-2 sized subnets.  In other words, their size was not limited to 8-bit groups that resulted in blocks of Class A, B and C addresses like the classful networking scheme.  So, they can be sized according to need.

> The new system does away with the importance of the first three bits of an IP address to identify a class network.  Because of this, the new scheme was to be known as *classless* and the old system was to be known as *classful*.  Neat!

## CIDR Notation

Classless Inter-Domain Routing ([CIDR]) (pronounced ["cider"](https://en.wiktionary.org/wiki/CIDR), like apple cider) became the new method for allocating IP addresses and for IP routing.  It included the routing prefix and a decimal suffix, the latter being the netmask used to determine how many addressable machines are on a particular network or subnetwork.  This way of specifying an address and a suffix is now widely known as CIDR notation\*.

Importantly, routing protocols were updated to carry not just the IP address but also the new decimal suffix (the [subnet mask]), and routers and other devices were reprogrammed to be able to understand this new notation.

> Here's a fun anecdote.  I once worked on a team where the manager would pronounce CIDR as "cedar".  I'd never heard that before.  I don't think anybody had.  Instead of correcting him or pronouncing it correctly to give him a subtle hint, one by one the team members started adopting his pronunciation.

### Examples

What are some examples of CIDR notation?

- `192.0.2.0/24`
- `2001:db8::/32` ([IPv6])
- `/16`
- `10.0.0.0/8`
- `10.0.0.1/8`
- `10/8`

The last three are functionally equivalent.

> Initially, the subnet mask was expressed as a full 32-bit [dotted-decimal] string like the IP address:
>
>     192.24.12.0/255.255.252.0
>
> What we now come to know as CIDR notation was only introduced later as network engineers came to prefer the more succinct version:
>
>     192.24.12.0/22

### Properties

What are some properties of CIDR notation?

- The decimal number suffix is the netmask and is represented as the leading 1 bits in the network mask.
- The number of hosts can be calculated using the following formula: 2<sup>address length − prefix length</sup>:
    + The address length is 32 for `IPv4`.
    + The address length is 128 for `IPv6.`
- The network prefix bits are always contiguous.

> A subnet mask encodes the same information as a prefix length.

## Calculating Hosts and Ranges from CIDR Notation

I'm only going to be working with IPv4 in these examples.  Also, we'll use the table below to help us in our calculations.

 <span style="display: inline-block; width: 100px">Octets/Bytes</span> | <span style="display: inline-block; width: 100px">Bits</span> | <span style="display: inline-block; width: 200px">Hosts</span>
 :---: | ---: | ---:
 1 | 8 | 256
 2 | 16 | 65,536
 3 | 24 | 16,777,216
 4 | 32 | 4,294,967,296

---

### Example 1

**`192.168.0.0/27`**

- There are 32 total addresses.  This is the address space.
    + 2<sup>32</sup> - <sup>27</sup> = 2<sup>5</sup> = 32
- Range:
    + `192.168.0.1` - `192.168.0.30`
- 32 - 2 = 30 addressable hosts (i.e., the usable hosts).
    + Addresses that can't be used:
        - `192.168.0.0` network address.
        - `192.168.0.31` broadcast address.

Calculating a CIDR range when there are less than 256 addresses is easy.  Since the last octet is the only one in play, so to speak, it's simply a matter of adding the number of addressable hosts from 1 - `n`, inclusive.

Network range:
<b>192.168.0.0</b> - <b>192.168.0.31</b>

Addressable range:
<b>192.168.0.1</b> - <b>192.168.0.30</b>

### Example 2

In my view, the second example is much more difficult to understand, at least at first.  I'll walk through it in detail, and the same operations can be applied to the subsequent examples to determine their ranges.

**`192.168.128.0/17`**

- There are 32,768 total addresses.
    + 2<sup>32</sup> - <sup>17</sup> = 2<sup>15</sup> = 32768
- There are 32,766 addressable hosts.
- Range:
    + `192.168.128.1` - `192.168.255.254`

Let's break that down:

<pre class="math">
First, let's calculate the number of hosts.

Let's recall the forumula:

    2<sup>address length − prefix length</sup>

Since it is an IPv4 address, the address length is 32 bits.
The prefix length is the decimal suffix, 17.

    2<sup>32 − 17</sup>
    = 2<sup>15</sup>
    = 32,768

    Let's not forget about our friend <a href="https://linux.die.net/man/1/bc">bc</a>!  He's here to help!
    $ bc <<< 2^15
    32768

Easy peasy lemon squeezy.

Now, onward to calculate the range.

So, we know the maximum number of hosts in the subnet is 32,768.  We need to know the
number of octets that are encompassed by the number of hosts.

The subnet mask is 17 (/17), which means that the first 17 bits are masked, that is,
they are all 1s.

Let's start at the first octet.  We know that will be all 1s, so we'll subtract 17 - 8 = 9.

We move on to the next octet.  Since 9 bits is greater than 1 byte (an octet),
we again subtract: 9 - 8 = 1.

The last remaining bit will be the first bit of the third octet, and we can now conclude
that the last 7 bits of the third octet are all 0 and are part of the available hosts.

Recall, since network bits are contiguous, everything after the last bit of the netmask
(the network portion) <b>must</b> be 0 and thus part of the available hosts portion of
the address.

It follows then that the 4<sup>th</sup> is entirely part of the available hosts and every
bit is 0.

This then provides us with all of the information that we need to calculate the range.

The range starts with the first octet that doesn't contain all 1s.  In this case, it's the
third.  The first bit is part of the network prefix, and the last seven are part of the
address space.  To calculate the start of the range, simply take 2 to the power of the
remaining host bits:

8 - 1 = 7 => 2<sup>7</sup> = 128 => 192.168.128

The end of the range is simple, it's the address that is all 1s minus 2 for the router
address and the broadcast address:

2<sup>8</sup> = 256 - 2 => 192.168.254

Voilà, we now have our range of network AND addressable hosts:

Network range:
<b>192.168.128.0</b> - <b>192.168.255.255</b>

Addressable range:
<b>192.168.128.1</b> - <b>192.168.255.254</b>
</pre>

### Example 3

**`167.192.0.0/12`**

- There are 1,048,576 total addresses.
    + 2<sup>32</sup> - <sup>12</sup> = 2<sup>20</sup> = 1048576
- There are 1,048,574 addressable hosts.
- Range:
    + `167.192.0.1` - `167.207.255.254`

<pre class="math">
2<sup>32 − 12</sup>
= 2<sup>20</sup>
= 1,048,576

The network prefix masks less than two octets, 12 bits.  It will look like this:

<b>11111111 11110000 00000000 00000000</b>

Starting in the second octet:

8 - 4 = 4 => 2<sup>4</sup> = 16

Since this addressable range starts in the second nibble of the second octet, the
number of hosts is 16 and should be added to the current number of 192 to calculate
the end range of the second octet.

The last two octets are all 0s, of course, so this will be 255.  But, don't forget
to subtract 1 for the number of addressable hosts!

Network range:
<b>167.192.0.0</b> - <b>167.207.255.255</b>

Addressable range:
<b>167.192.0.1</b> - <b>167.207.255.254</b>
</pre>

### Example 4

**`8.0.0.0/6`**

- There are 67,108,864 total addresses.
    + 2<sup>32</sup> - <sup>6</sup> = 2<sup>26</sup> = 67108864
- There are 67,108,862 addressable hosts.
- Range:
    + `8.0.0.1` - `11.255.255.254`

<pre class="math">
2<sup>32 − 6</sup>
= 2<sup>26</sup>
= 67,108,864

The network prefix masks less than one octets, 6 bits.  It will look like this:

<b>11111100 11110000 00000000 00000000</b>

Using the same logic as in the previous examples, we get:

Network range:
<b>8.0.0.0</b> - <b>11.255.255.255</b>

Addressable range:
<b>8.0.0.1</b> - <b>11.255.255.254</b>
</pre>

> **Q.** Is there a command-line tool to do this?
>
> **A.** There sure is, Jack!
>
>     $ sudo apt install sipcalc
>     $
>	  $ sipcalc 8.0.0.0/6
>	  -[ipv4 : 8.0.0.0/6] - 0
>
>	  [CIDR]
>	  Host address            - 8.0.0.0
>	  Host address (decimal)  - 134217728
>	  Host address (hex)      - 8000000
>	  Network address         - 8.0.0.0
>	  Network mask            - 252.0.0.0
>	  Network mask (bits)     - 6
>	  Network mask (hex)      - FC000000
>	  Broadcast address       - 11.255.255.255
>	  Cisco wildcard          - 3.255.255.255
>	  Addresses in network    - 67108864
>	  Network range           - 8.0.0.0 - 11.255.255.255
>	  Usable range            - 8.0.0.1 - 11.255.255.254
>
> Weeeeeeeeeeeeeeeeeeeeee!

## Calculating a Supernetwork

I'll briefly touch on how to create a [supernet] before we leave and all go back to our happy places.  Recall that one of the needs that CIDR addresses is the growth of the routing tables because of the inability to do route aggregation with the classful networking system.

Let's see an example of how CIDR allows us to do route aggregation and thus create supernetworks that can simply be a single entry in a routing table.

Let's say there are 5 subnets:

- `192.168.198.0`
- `192.168.199.0`
- `192.168.200.0`
- `192.168.201.0`
- `192.168.202.0`

How do we determine the address of the supernet?  For instance, we only have IP addresses with no information about the network perfix.  How do we determine that?

Let's look at the bits they have in common.  We'll concentrate on the 3<sup>rd</sup> octet, since we can tell just at a glance that the other octets are the same and thus have the same bits in common (the last octet is just the network address).

<pre>
$ for n in {198..202}; do asbits $n 2; done
<span style="color: brown;">1100</span> 0110
<span style="color: brown;">1100</span> 0111
<span style="color: brown;">1100</span> 1000
<span style="color: brown;">1100</span> 1001
<span style="color: brown;">1100</span> 1010
</pre>

The bits in common are the [nibble] highlighted in <span style="color: brown;">brown</span>.  And, look, it's our old pal [`asbits`]!  He is always there when you need him!  That's the mark of a true friend.

So, what is `11000000` in decimal?

There are lots of tools to do this conversion, here we'll use Python:

```
$ python -c 'print(int("11000000", 2))'
192
```

> It's safe to assume the that second argument to `int` is the base, but you can execute the following at the cli as a sanity check: `python -c "help(int)"`.

Append that as the third octet: `192.168.192.0`

Ok, almost there.  The last thing to do is determine the suffix for the CIDR notation.  We can easily do this by counting the 1 bits, starting from the first octet (so, count up to the right-most 1 bit):

`11111111.11111111.11000000.00000000`

That would be 18.  So, the final result is:

**`192.168.192.0/18`**

And verify it with our new friend [`sipcalc`]:

```
$ sipcalc 192.168.192.0/18
-[ipv4 : 192.168.192.0/18] - 0

[CIDR]
Host address            - 192.168.192.0
Host address (decimal)  - 3232284672
Host address (hex)      - C0A8C000
Network address         - 192.168.192.0
Network mask            - 255.255.192.0
Network mask (bits)     - 18
Network mask (hex)      - FFFFC000
Broadcast address       - 192.168.255.255
Cisco wildcard          - 0.0.63.255
Addresses in network    - 16384
Network range           - 192.168.192.0 - 192.168.255.255
Usable range            - 192.168.192.1 - 192.168.255.254

-
```

## References

- [RFC 1518](https://tools.ietf.org/html/rfc1518)
- [RFC 1519](https://tools.ietf.org/html/rfc1519)
- [RFC 4632](https://tools.ietf.org/html/rfc4632)
- [CIDR Report](https://www.cidr-report.org/as2.0/)
- [CIDR Calculator](http://networkcalculator.ca/cidr-calculator.php)

\* Invented by [Phil Karn]

[Classful Networks]: /2021/04/18/on-classful-networks/
[classful networks]: https://en.wikipedia.org/wiki/Classful_network
[Internet Engineering Task Force]: https://en.wikipedia.org/wiki/Internet_Engineering_Task_Force
[IPv4 address exhaustion]: https://en.wikipedia.org/wiki/IPv4_address_exhaustion
[routing tables]: https://en.wikipedia.org/wiki/Routing_table
[VLSM]: https://en.wikipedia.org/wiki/File:VLSM_Chart.svg
[CIDR]: https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing
[subnet mask]: https://en.wikipedia.org/wiki/Subnetwork
[IPv6]: https://en.wikipedia.org/wiki/IPv6_address
[dotted-decimal]: https://en.wikipedia.org/wiki/Dot-decimal_notation
[supernet]: https://en.wikipedia.org/wiki/Supernetwork
[nibble]: https://en.wikipedia.org/wiki/Nibble
[`asbits`]: https://github.com/btoll/tools/tree/master/c/asbits
[`sipcalc`]: http://manpages.ubuntu.com/manpages/trusty/man1/sipcalc.1.html
[Phil Karn]: https://en.wikipedia.org/wiki/Phil_Karn

