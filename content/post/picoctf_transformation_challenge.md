+++
title = "On the picoCTF Transformation Challenge"
date = "2022-09-16T03:13:15Z"

+++

I recently started playing [capture the flag] and, goddamn, it is a lot of fun!  I was introduced to it after watching several videos on [John Hammond's channel], which I recommend, as he is a huge proponent of this type of learning and creates a lot of content on it.

For my first writeup, I chose the [Reverse Engineering Transformation challenge] (the link won't resolve unless you're logged in) from [picoCTF 2021] because of its use of [bitwise operations].

Of course, as everyone knows, bitwise operations are the Bee's Knees.

---

Here is the challenge:

I wonder what this really is... **`enc`** `''.join([chr((ord(flag[i]) << 8) + ord(flag[i + 1])) for i in range(0, len(flag), 2)])`

> Note that **`enc`** is a link to a file download that contains the following characters:
>
>     灩捯䍔䙻ㄶ形楴獟楮獴㌴摟潦弸弲㘶㠴挲ぽ

---

Since this is in the reverse engineering Jeopardy category, let's first take a look at how this string of characters was created, as this will inform us later when we need to reverse the operations.  In other words, we need to understand how the string of characters was created if we're to have any chance of reversing the process.

```python
''.join([chr((ord(flag[i]) << 8) + ord(flag[i + 1])) for i in range(0, len(flag), 2)])
```

It's doing the following things:

1. Iterating over the `flag` string two [Unicode] characters at a time and adding them together.  This has the effect of creating a 16-bit character.

1. Get the decimal number of the first character and push it to the left by eight bits (one byte).  This will create the room to add the second character to the right of the first character.  This creates a new 16 bit character, and since the original characters are both eight bits, adding them together doesn't overlap or destroy either character.

    > Multiplying by 256 would have the same effect as bit shifting eight bits to the left.

1. Get the decimal number of the second character and add it to the first.

1. After ranging over the string, return the new string from the list.  Again, this will be:

       灩捯䍔䙻ㄶ形楴獟楮獴㌴摟潦弸弲㘶㠴挲ぽ

---

Let's expand the list comprehension syntax with comments that illustrate the steps above:

```python
encoded = []
for i in range(0, len(flag), 2):
    # Let's create a two-byte character.
    #
    # First, push bits of the first char over 8 bits.  This will create
    # room for the second char, which will be added to the first to create
    # the new two-byte character.
    first_char = ord(flag[i])
    pushed_first_char = first_char << 8

    # Second, add the second char to the pushed first.
    second_char = ord(flag[i + 1])
    two_bytes = pushed_first_char + second_char

    # Lastly, get the new char from the newly joined bytes and append to the list.
    encoded.append(chr(two_bytes))

"".join([encoded])
```

Now that we've pulled it apart to understand what it's doing, let's reverse engineer it.

---

I decided to use Python for its ease of use.

The first thing I did was to read the file contents of **`enc`** and display them:

`transformation.py`

```python
def main():
    with open("enc") as fd:
        flag = fd.read()

    print(flag)


if __name__ == "__main__":
    main()

```

```bash
$ python transformation.py
灩捯䍔䙻ㄶ形楴獟楮獴㌴摟潦弸弲㘶㠴挲ぽ
```

> I've symlinked my `python` executable:
>
> ```bash
> $ ls -l $(which python)
> lrwxrwxrwx 1 root root 7 Jul 29 13:43 /usr/bin/python -> python3
> $ python -V
> Python 3.8.10
> ```

Ok, let's now get the decimal value of each character:

`transformation.py`

```python
def main():
    with open("enc") as fd:
        flag = fd.read()

    print([ord(char) for char in flag])


if __name__ == "__main__":
    main()

```

```bash
$ python transformation.py
[28777, 25455, 17236, 18043, 12598, 24418, 26996, 29535, 26990, 29556, 13108, 25695, 28518, 24376, 24370, 13878, 14388, 25394, 12413]
```

> Clearly, all of the characters in the list are two bytes.  How do we know this?  Because all of the numbers are less than 65,536 but greater than 255.

If we take the first element, what would that look like in binary?

Let's ask our old friend [`asbits`]:

```bash
$ asbits
Usage: asbits <base-10 | hex | octal> [num nibbles=4]
$ asbits 28777
0111 0000 0110 1001
```

Ok, we know from the original code that this 16 bit number represents two of the original 8 bit characters.  But how do we extract each character from the 16 bit binary number?

Let's get the first character.  The original code bit-shifted the number 8 bits to the left, so let's do the inverse.  It will be easier to experiment on the command line instead of opening, writing and saving a file each time:

```bash
$ python -c "print(28777 >> 8)"
112
$ asbits 112 2
0111 0000
```

If we compare that 8 bit string to the 16 bit one directly above, we do indeed see that it is the same as the first two [nibbles].

Looks like we're heading in the right direction.  Let's now get the ascii character that is represented by 112 in decimal.  Again, we'll do this from the command line:

```bash
$ python -c "print(chr(112))"
p
```

Ok, great.  Now, what is the second character embedded in those two bytes?

For this, we can do one of my favorite operations.  Simply put, we'll use a bitmask, doing a [logical `AND` operation] on the entire number of bits to extract just the portion that we're interested in.

This will make sense with an example.  First, create a mask that will look like the following:

```
0000 0000 1111 1111
```

It's very easy.  We know what decimal number the binary number `11111111` represents: 255.

```bash
$ asbits 255 2
1111 1111
$ asbits 0xff 2
1111 1111
$ htoi 0xff
255
```

So, here is the binary number of the first 16 bit character:

```
$ asbits 28777
0111 0000 0110 100
```

And, here is the [bitmask]:

```bash
$ asbits 255
0000 0000 1111 1111
```

The logical `AND` bitwise operation will extract just the bits that represent the character we're after:

```bash
$ python -c "print(28777 & 255)"
105
$ python -c "print(chr(105))"
i
```

The first two characters are "p" and "i", which looks promising!  After all, the flag will begin with "picoCTF".  We'll wrap up that logic in a loop and give it a whirl.

Just as we saw that the first character contained the same 8 bits as the first two nibbles (or octet) of the 16 bit binary number above, the second character is the same as the last two nibbles:

```bash
$ asbits 105 2
0110 1001
```

---

Let's take a look at the finished code:

`transformation.py`

```python
def main():
    with open("enc") as fd:
        flag = fd.read()

    decoded = []

    for two_bytes in flag:
        # Bytes to integer.
        btoi = ord(two_bytes)
        # First byte.
        decoded.append(chr(btoi >> 8))
        # Second byte.
        decoded.append(chr(btoi & 255))

    print("".join(decoded))


if __name__ == "__main__":
    main()

```

Let's run it:

```bash
$ python transformation.py
picoCTF{16_bits_inst34d_of_8_26684c20}
```

And there's the flag!

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Summary

This challenge was fun and a good refresher on how elegant and concise (and fast!) bitwise operations are.  I think it is important to familiarize oneself with them, even though at first they may seem intimidating.

I included three links to other solutions below in the [References](#references) section.  I learned something from each one, and I encourage the reader to check out each one and others to learn as much as you can.

## References

- [picoCTF Transformation](https://www.bugninja.de/en/picoctf-transformation-3/)
- [PicoCTF-2021 Writeup - Transformation](https://picoctf2021.haydenhousen.com/reverse-engineering/transformation)
- [PicoCTF 2021: Transformation](https://infosecwriteups.com/picoctf-2021-transformation-6242546fba02)
- [Unicode Converter - Decimal, text, URL, and unicode converter](https://www.branah.com/unicode-converter)
- [`asbits`]
- [`htoi`](https://github.com/btoll/tools/blob/master/c/htoi.c)
- [On Ints as Bit Vectors](/2019/03/16/on-ints-as-bit-vectors/)

[capture the flag]: https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)
[John Hammond's channel]: https://www.youtube.com/c/JohnHammond010
[Reverse Engineering Transformation challenge]: https://play.picoctf.org/practice/challenge/104?page=1
[picoCTF 2021]: https://play.picoctf.org/events/34
[bitwise operations]: https://en.wikipedia.org/wiki/Bitwise_operation
[Unicode]: https://en.wikipedia.org/wiki/Unicode
[`asbits`]: https://github.com/btoll/tools/tree/master/c/asbits
[logical `AND`]: https://en.wikipedia.org/wiki/Logical_conjunction
[nibbles]: https://en.wikipedia.org/wiki/Nibble
[bitmask]: https://en.wikipedia.org/wiki/Mask_(computing)

