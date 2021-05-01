+++
title = "On Classful Networks"
date = "2021-04-18T23:33:04-04:00"

+++

This is the first article in a two-part series:

1. Classful Networks
1. [Classless Networks]

> This article talks about the first architectural version of network addressing that was in use between 1981-1993.  Even though the subject of this post is outdated, I believe it's necessary to understand classful networks and their limitations to be able to fully appreciate and understand CIDR (Classless Inter-Domain Routing), which is covered in the [next article].

---

As everyone knows, [Internet Protocol (IP) addresses] allow packets to be routed from a particular machine to another particular machine, whether it's across the street or around the world.

These IP addresses are 32-bits long and are grouped into four octets of 8-bits.  They are comprised of two pieces of information:  the network portion (or prefix) and the host portion.  The network prefix comes first and is what allows each router to know how and where to forward the packets (or not, if the destination IP address is on a local network) followed by the host identifier on that particular network.

So, how does one know where the network prefix of the 32-bits ends and the host portion begins?  Great question!  Let's dive in, bub!

# Classful Networks

The classful network strategy was first used in 1981 and was the one that I was first taught because I'm old.

The total network address space was divided into five classes, which were delineated based upon the first three bits of the network prefix of the IP address (and the top four bits for the multicast and reserved classes, Class D and Class E, respectively).  The bits of the first octet of each address that are significant to determining the class will be <u>underlined</u> in the examples below.  It is in this way that one can determine the class from any given IP address.

I'm not going to go much into the history here, other than to say that in the beginning, there was just the address space that would come to be known as Class A.  As more and more machines joined the Internet, it was observed that this network scheme wouldn't scale at all, and so the classful network addressing architecture was adopted in 1981.

Unfortunately, this expansion of the address space was also quickly seen to be inadequate at scale.  For instance, the 16384 (2<sup>14</sup>) IP addresses for Class B were quickly being depleting because of the rapid growth of the Internet, leading to the [IPv4 address exhaustion] that prompted the need for a new addressing scheme, [CIDR] (although [NAT] - Network Address Translation - would help with this issue).

Here are the five classes of networks:

- Class A

    + Address space:
        - 0.0.0.0 - 127.255.255.255
    + Size of network prefix:
        - 8 bits (1 byte)
        - <u>0</u>0000000\. - <u>0</u>1111111\.
    + Size of host portion:
        - 24 bits (3 bytes)
    + Number of networks:
        - 128 (2<sup>7</sup>)
    + Number of host machines:
        - 16,777,216 (2<sup>24</sup>)
    > 127.0.0.0 through 127.255.255.255 are reserved for [loopback] addresses.  Although reserved, they are still part of the class A address group.

- Class B

    + Address space:
        - 128.0.0.0 - 191.255.255.255
    + Size of network prefix in bits:
        - 16 (2 bytes)
        - <u>10</u>000000\.00000000\. - <u>10</u>111111\.11111111\.
    + Size of host portion:
        - 16 bits (2 bytes)
    + Number of networks:
        - 16,384 (2<sup>14</sup>)
    + Number of host machines:
        - 65,536 (2<sup>16</sup>)

- Class C

    + Address space:
        - 192.0.0.0 - 223.255.255.255
    + Size of network prefix in bits:
        - 24 (3 bytes)
        - <u>110</u>00000\.00000000\.00000000\. - <u>110</u>11111\.11111111\.11111111\.
    + Size of host portion:
        - 8 bits (1 byte)
    + Number of networks:
        - 2,097,152 (2<sup>21</sup>)
    + Number of host machines:
        - 256 (2<sup>8</sup>)

- Class D ([multicast])

    + Address space:
        - 224.0.0.0 - 239.255.255.255
    + First octet (one byte) of each address space boundary in bits:
        - <u>1110</u>0000\. - <u>1110</u>1111\.
    + Size of network prefix in bits:
        - not defined
    + Size of host portion in bits:
        - not defined
    + Number of networks:
        - not defined
    + Number of host machines:
        - not defined

- Class E (reserved)

    + Address space:
        - 240.0.0.0 - 255.255.255.255
    + First octet (one byte) of each address space boundary in bits:
        - <u>1111</u>0000\. - <u>1111</u>1111.
    + Size of network prefix in bits:
        - not defined
    + Size of host portion in bits:
        - not defined
    + Number of networks:
        - not defined
    + Number of host machines:
        - not defined
    > 255.255.255.255 is reserved as the IPv4 Broadcast address.

## Advantages of the Classful Network Architecture

The advantage of this system is that the size of the network, i.e., it's network prefix, could be determined from any IP address without any other clarifying information.  By examining the top three bits of the 32-bit addresses, one could quickly and easily determine the size of the network prefix as they fall cleanly into 8-bit chunks, whether 8-, 16- or 24 bits.

However, there are two big reasons that this scheme is a problem.

## Disadvantages of the Classful Network Architecture

1. It doesn't scale.
1. It doesn't allow for [route aggregation].

#### It Doesn't Scale

For instance, I use a private Class C network address space block at home.  My router is on `192.168.1.1` and my one or two machines are allocated addresses anywhere between the `192.168.1.{2,254}` range (`192.168.1.255` is used as the broadcast address).

Conversely, a medium or large company will have many, many more machines than I, and so a Class C network is too small for them.  However, the next largest network, Class B, is probably way too large, with 65,536 available addresses.

What is needed is a scheme that will allow to carve up a classful address block into more efficient sizes.

#### It Doesn't Allow for Route Aggregation

Since there are fixed sizes of classes of network address blocks, there need to be many routes added to the Internet routing tables, and these tables will grow large and consume lots of memory.

Rather, it would be good to be able to group, or aggregate, the routes together into a [supernetwork] that would only need to have one entry in the table to reference.

---

Now let's have a bit of fun exploring the classful networks.

# Examples

> For the following examples, I'll use our old friend [`asbits`] to transpose the decimal values to binary.

As mentioned previously, for each of the classes, the [subnet mask] is the same length/number of bits as the size of the network prefix of the IP address.  So, a network device could simply inspect the first few bits of the IP address to be able to determine its class and therefore its netmask.  Even a human could quickly do a back-of-the-napkin computation of the first octet to determine the class of a given IP address.  Neat!

Here's a nice little script to determine to which class belongs the given IP address or just the first octet:

`get_classful_network.py`

<pre class="math">
import sys


def main():
    try:
        octet = sys.argv[1]

        if "." in octet:
            octet = octet.split(".")[0]

        <span style="color: purple;">bits = int(octet) >> 4</span>

        if bits <= 7:
            print("Class A")
        elif bits >= 8 and bits <= 11:
            print("Class B")
        elif bits == 12 or bits == 13:
            print("Class C")
        elif bits == 14:
            print("Class D")
        elif bits == 15:
            print("Class E")
        else:
            print("Unknown Network Class")

    except IndexError:
        print("[ERROR] Missing argument")
    except ValueError:
        print("[ERROR] Argument must be of type `int`")


if __name__ == "__main__":
    main()
</pre>

```
$ python get_classful_network.py 167.114.97.28
Class B
$ python get_classful_network.py 167
Class B
```

How does the script work?  The most important bit (haha) is the right shift [bitwise operation] on the octet (highlighted in <span style="color: purple;">purple</span>, since bitwise operations are the stuff of royalty), also known as an [arithmetic shift].  By bit shifting four times to the right, we're reducing the 8-bit octet to just the four bits that will help us calculate the network class.

Let's take an example IP address that begins with `167`:

<pre class="math">
# 167 in binary.
1010 0111

# The first right shift (>> 1):
0101 0011

# The second right shift (>> 1):
0010 1001

# The third right shift (>> 1):
0001 0100

# The fourth right shift (>> 1):
0000 1010
</pre>

This number is now `10` in decimal and is easier to test.

> [Bit twiddling] is one the most exciting and coolest things in the world.  It can often simplify and solve a problem quite elegantly.  And it's great fun at parties!

Let's test the script using the network class boundaries<b>*</b>:

```
$ for n in {0,128,192,224,240}
> do
> python get_classful_network.py $n
> done
Class A
Class B
Class C
Class D
Class E
```

> How did I determine the decimal range for each network class in the `if` conditionals in the script (i.e., the script looks for a Class B network between numbers 8 and 11, inclusive)?
>
> You can run the following from the command line to see the bit representation of the first four bits of the first octet in any range.
>
>       Here is the Class B range:
>
>       $ for n in {128..191}; do echo "($n)" $(asbits $n 1); done
>       (128) 1000 0000
>       (129) 1000 0001
>       (130) 1000 0010
>       (131) 1000 0011
>       (132) 1000 0100
>       (133) 1000 0101
>       (134) 1000 0110
>       (135) 1000 0111
>       (136) 1000 1000
>       (137) 1000 1001
>       (138) 1000 1010
>       (139) 1000 1011
>       (140) 1000 1100
>       (141) 1000 1101
>       (142) 1000 1110
>       (143) 1000 1111
>       (144) 1001 0000
>       (145) 1001 0001
>       (146) 1001 0010
>       (147) 1001 0011
>       (148) 1001 0100
>       (149) 1001 0101
>       (150) 1001 0110
>       (151) 1001 0111
>       (152) 1001 1000
>       (153) 1001 1001
>       (154) 1001 1010
>       (155) 1001 1011
>       (156) 1001 1100
>       (157) 1001 1101
>       (158) 1001 1110
>       (159) 1001 1111
>       (160) 1010 0000
>       (161) 1010 0001
>       (162) 1010 0010
>       (163) 1010 0011
>       (164) 1010 0100
>       (165) 1010 0101
>       (166) 1010 0110
>       (167) 1010 0111
>       (168) 1010 1000
>       (169) 1010 1001
>       (170) 1010 1010
>       (171) 1010 1011
>       (172) 1010 1100
>       (173) 1010 1101
>       (174) 1010 1110
>       (175) 1010 1111
>       (176) 1011 0000
>       (177) 1011 0001
>       (178) 1011 0010
>       (179) 1011 0011
>       (180) 1011 0100
>       (181) 1011 0101
>       (182) 1011 0110
>       (183) 1011 0111
>       (184) 1011 1000
>       (185) 1011 1001
>       (186) 1011 1010
>       (187) 1011 1011
>       (188) 1011 1100
>       (189) 1011 1101
>       (190) 1011 1110
>       (191) 1011 1111
>
>   Note that the first four bits range from `1000` to `1011` in binary (8 to 11 in decimal).
>
>       Here is the Class D range:
>
>       $ for n in {224..239}; do echo "($n)" $(asbits $n 2); done
>       (224) 1110 0000
>       (225) 1110 0001
>       (226) 1110 0010
>       (227) 1110 0011
>       (228) 1110 0100
>       (229) 1110 0101
>       (230) 1110 0110
>       (231) 1110 0111
>       (232) 1110 1000
>       (233) 1110 1001
>       (234) 1110 1010
>       (235) 1110 1011
>       (236) 1110 1100
>       (237) 1110 1101
>       (238) 1110 1110
>       (239) 1110 1111
>
>   Here, the first four bits are all `1110` in binary (14 in decimal).

# Conclusion

So, at first classful networks seemed like a great idea, but two major flaws soon raised appeared on the horizon:

1. It doesn't scale.
1. It doesn't allow for route aggregation.

In the [next thrilling episode], we'll see how the [IETF] attempted to solve these problems.

---

<b>*</b> What do I mean by network class boundaries?  Specifically, the first octet of the first IP address in the range for each network class.  The first octet is underlined below:

- Class A <u>`0`</u>`.0.0.0`
- Class B <u>`128`</u>`.0.0.0`
- Class C <u>`192`</u>`.0.0.0`
- Class D <u>`224`</u>`.0.0.0`
- Class E <u>`240`</u>`.0.0.0`

This isn't something I've read of in the literature, it's just what I've been calling it for the purposes of this article.

[Classless Networks]: /2021/04/24/on-classless-networks/
[next article]: /2021/04/24/on-classless-networks/
[Internet Protocol (IP) addresses]: https://en.wikipedia.org/wiki/IP_address
[IPv4 address exhaustion]: https://en.wikipedia.org/wiki/IPv4_address_exhaustion
[Network Address Translation]: https://en.wikipedia.org/wiki/Network_address_translation
[CIDR]: https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing
[NAT]: https://en.wikipedia.org/wiki/Network_address_translation
[loopback]: /2019/09/23/on-loopback/
[multicast]: https://en.wikipedia.org/wiki/Multicast
[route aggregation]: https://en.wikipedia.org/wiki/Supernetwork
[supernetwork]: https://en.wikipedia.org/wiki/Supernetwork
[`asbits`]: https://github.com/btoll/tools/tree/master/c/asbits
[subnet mask]: https://en.wikipedia.org/wiki/Subnetwork
[bitwise operation]: https://en.wikipedia.org/wiki/Bitwise_operation#Bit_shifts
[arithmetic shift]: https://en.wikipedia.org/wiki/Arithmetic_shift
[Bit twiddling]: https://en.wikipedia.org/wiki/Bit_manipulation
[next thrilling episode]: /2021/04/24/on-classless-networks/
[IETF]: https://en.wikipedia.org/wiki/Internet_Engineering_Task_Force

