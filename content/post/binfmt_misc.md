+++
title = "On BINFMT_MISC"
date = "2021-12-31T06:02:40Z"

+++

Perusing [Jessie Frazelle's awesome blog] the other night, I came across an older article called [Nerd Sniped by BINFMT_MISC] that piqued my interest.

I had never heard of the [`BINFMT_MISC` kernel feature] before, so I immediately jumped into high gear and started reading everything I could find, starting with the articles she had linked to in her blog post.

As such, I became a victim of drive-by [nerd sniping].

Before I get into the meat and potatoes of what `BINFMT_MISC` allows you to do, I want to do a quick primer on a few subjects so we all fully understand what is happening here.

---

- [Binary Formats](#binary-formats)
- [Magic Numbers](#magic-numbers)
- [A Quick Recap, While He's Away](#a-quick-recap-while-hes-away)
- [Hello, world!](#hello-world)
- [Shebang, a Workhorse](#shebang-a-workhorse)
- [Registering a Binary Format, Old School](#registering-a-binary-format-old-school)
    + [By Extension](#by-extension)
    + [By Magic Number](#by-magic-number)
- [Registering a Binary Format with `systemd`](#registering-a-binary-format-with-systemd)
- [Conclusion](#conclusion)
- [References](#references)

---

## Binary Formats

Programmers tangentially use [binary formats] every day.  They do so without even giving it a second thought.

So, what do I mean by "tangentially"?  Well, you don't actually *use* a binary format, but you do execute binaries and executable shell scripts, for instance, that are in a binary format known to the operating system.

> Just so everyone is on the same page, what exactly do I mean by "script"?  Well, here's a definition of `script` as good and succinct as any I've seen:
>
> *An executable file starting with an interpreter directive is simply called a script, often prefaced with the name or general classification of the intended interpreter.*
>
>   - [Shebang Etymology]

Some of the formats are native to the Linux kernel, meaning they are compiled into the kernel, and you are free to [read the source].  Others can be registered in [user space] using the `BINFMT_MISC` interface, and we'll see an example of that shortly.

Once registered, the Linux kernel is aware of the format and, most importantly, what to do with the blob of binary data that is executed (for scripts, it's able to tell the [loader] what program to use to interpret the file).

And, what is this [binary data]?  Well, it can be `1`s and `0`s, or anything that has only two states (or two symbols).  The binary file format is simply a way of organizing or structuring this two-state information in a way that the kernel or a program can interpret and understand, often with the addition of headers and metadata and data segments and sections, et al.

That's great!  But, how does the OS know which program to use?

## Magic Numbers

When I was growing up, this was [magic].  It was only later that I learned it was also used by the Linux kernel to determine which program to use to interpret an executable file.

What is a magic number?  Simply put, it is a string or numeric constant used to identify a file type.

How does this work?  It's necessary to understand that every file that uses this method to signal to the kernel which program to use must embed a constant at the beginning of the file in the first 512 bytes.  If this constant is known, it is matched and the kernel will know which program should be used to execute the file and just passes it along to the proper interpreter.  Else, errors will be thrown merrily.

There are many tools that can be used to view magic numbers.  Here are some of them.

```
$ whatis hexdump
hexdump (1)          - ASCII, decimal, hexadecimal, octal dump
$ hexdump ~/bin/link-scanner | head -2
0000000 457f 464c 0102 0001 0000 0000 0000 0000
0000010 0002 003e 0001 0000 48c0 0046 0000 0000
```

```
$ whatis od
od (1)               - dump files in octal and other formats
$ od -c -N 16 ~/bin/link-scanner
0000000 177   E   L   F 002 001 001  \0  \0  \0  \0  \0  \0  \0  \0  \0
0000020
```

```
$ whatis readelf
readelf (1)          - display information about ELF files
$ readelf -h ~/bin/link-scanner | ag magic
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
```

```
$ whatis xxd
xxd (1)              - make a hexdump or do the reverse.
$ xxd ~/bin/link-scanner | head -2
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
00000010: 0200 3e00 0100 0000 c048 4600 0000 0000  ..>......HF.....
```

> These tools are inspecting a Go binary that was compiled on a 64-bit Linux machine.  Since it's an ELF file, the magic number will be the first four bytes (`7F E L F`).

```
$ printf '\x7f\x45\x4c\x46'
ELF
```

Well, that was fun.

Finally, you can use the [`file`] tool to determine the type of a file:

```
$ file ~/bin/link-scanner
/home/btoll/bin/link-scanner: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, Go BuildID=9oFCpKLetxD_AwgMFwqL/E5oZ0ELsHO7Q8Npp5OjW/n55HUBI7oRygTPB04OQT/7K2zkdQhLGj7EZpE_l7k, not stripped
$
$ file build_and_deploy.sh
build_and_deploy.sh: Bourne-Again shell script, ASCII text executable
```

## A Quick Recap, While He's Away

What have we learned, kids?  Hopefully we now understand that there are already some binary formats that are native, that is part of, the Linux kernel.  These binary formats are both for binary data, such as `a.out` and `ELF`, but also for textual scripting languages that are handed by the loader to the interpreter defined in the `shebang`.

For example, this is how shell scripts can be interpreted and compiled C binaries can be executed.  The former starts with an interpreter directive and the latter is in the ELF binary format (see [binfmt_elf.c] and [binfmt_script.c], respectively).

These formats are able to be executed by [the `exec` family of system calls] because the file formats are already registered and known to the kernel or have been matched by its magic number.

So, what does `BINFMT_MISC` afford us, then?  Well, it allows us to define our own binary formats and execute them in the same way as we would the ones already mentioned.

Pretty cool, huh?  Let's look at a completely ~~realistic~~ buffoonish example of how we can use this kernel feature to define a new binary format!

## Hello, world!

Let's create a simple Python program with the goal of calling it like a shell script but without having to define an interpreter directive ([`shebang`]) passing the file to the Python binary.  In essence, we'd want to call it like this:

```
$ ./hello.py
Hello, world!
```

After many design meetings, here is the program:

```
$ cat << EOF > hello.py
> print("Hello, world!")
>
> EOF
$ cat hello.py
print("Hello, world!")

```

How does Linux "see" this new file?

```
$ file hello.py
hello.py: ASCII text
```

All it sees is a bunch of text that it doesn't (yet) know what to do with.  Interestingly, Linux doesn't know that this is to be executed by a Python binary, even though it has the well-known `.py` extension.  Maybe we just need to turn on the executable bit?

```
$ chmod +x hello.py
$ ./hello.py
./hello.py: line 1: syntax error near unexpected token `"Hello, world!"'
./hello.py: line 1: `print("Hello, world!")'
```

Nope.  But don't abandon all hope yet, little fella!

We're going to look at some solutions to fix this, but before we do, let's have ourselves a nice coffee and talk about the [`shebang`].

## Shebang, a Workhorse

The `shebang` is actually a human-readable example of a magic number.  Specifically, its magic number byte string is [`0x23 0x21`], So it begins with the ASCII characters "#!":

```
$ printf '\x23\x21'
#!
```

Most folks are familiar with the `shebang`, truly an unsung hero.  It does its work silently and thanklessly.  That said, indeed the easiest way to run the above script would be to add the `shebang`, typically one of two ways:

<pre class="math">
#!/usr/bin/python

or

#!/usr/bin/env python
</pre>

Either way is sufficient to tell the kernel how to run this.  Also, `file` correctly recognizes the type of file:

```
$ file hello.py
hello.py: Python script, ASCII text executable
```

The loader knows to pass the script to the Python binary located on the machine because of the interpreter directive `/usr/bin/python` or `/usr/bin/env python`.

This fits well with many scripting languages like Python because the first character `#` denotes a comment, and so the `shebang` line is ignored.  We'll take advantage of this when registering our own magic number shortly.

And, it works because the kernel has a `load_script` function in the [`binfmt_script.c`] that matches it.  In its absence, the kernel would have no idea what to do with such a file, and we'd only see errors.

> There are projects such as [`gorun`] that take advantage of the `shebang` to run compiled programs whose source code don't recognize the `#` character as the beginning of a commented line.  This enables the compiled language to be loosely treated as a scripting language and be run with the `./PROGRAM` syntax as we've seen with the Python program (i.e., `./hello.py`).

Now, back to our regularly scheduled program.

## Registering a Binary Format, Old School

It's easy to register a new binary format.  There are only two steps:

1. Mount the `binfmt_misc` filesystem.

    Your distro may have done this already.  Here's a way you can check:

    ```
    $ mount | ag binfmt_misc
    systemd-1 on /proc/sys/fs/binfmt_misc type autofs (rw,relatime,fd=28,pgrp=1,timeout=0,minproto=5,maxproto=5,direct,pipe_ino=19071)
    binfmt_misc on /proc/sys/fs/binfmt_misc type binfmt_misc (rw,nosuid,nodev,noexec,relatime)
    ```

    Whoop, there it is, `/proc/sys/fs/binfmt_misc`!

    If not, you can mount it now:

    ```
    $ sudo mount binfmt_misc -t binfmt_misc /proc/sys/fs/binfmt_misc
    ```

1. Register the new format by writing to a special file.

    Binary formats can be registered by either extension or magic number.

### By Extension

Let's now register the `.py` file extension with the `BINFMT_MISC` kernel feature so we can execute our little pal `hello.py` as we would a shell script, i.e., `./hello.py`.

Before we do this, let's list the files in the special directory in `/proc`:

```
$ ls -l /proc/sys/fs/binfmt_misc/
total 0
--w------- 1 root root 0 Dec 30 23:54 register
-rw-r--r-- 1 root root 0 Dec 31 00:00 status
```

Now, we'll write to the `register` file, which is an interface between user space and kernel space and is how new binary formats are registered with the kernel.

After the following pipeline is interpreted by the shell, there should be a new file in the `binfmt_misc` directory with the name given to this binary format.

```
$ echo ":python:E::py::$(which python):OC" \
    | sudo tee /proc/sys/fs/binfmt_misc/register
:python:E::py::/usr/bin/python:OC
```

> A nice summary of the of the expected registration format can be found on the official [`BINFMT_MISC` kernel feature] guide and [on Wikipedia].

So far, so good!  Let's list out the directory again:

```
$ ls -l /proc/sys/fs/binfmt_misc/
total 0
-rw-r--r-- 1 root root 0 Dec 31 23:18 python
--w------- 1 root root 0 Dec 31 23:18 register
-rw-r--r-- 1 root root 0 Dec 31 00:00 status
```

Ok, looks like something happened (note the new `python` file). Let's dump the contents of that new file:

```
$ cat /proc/sys/fs/binfmt_misc/python
enabled
interpreter /usr/bin/python
flags: OC
extension .py
```

Sweet, the kernel now knows about the `.py` extension and to pass all such files to the `/usr/bin/python` interpreter!  Executing this as a script should now work:

```
$ ./hello.py
Hello, world!
```

And, it does.

By the way, the `BINFMT_MISC` feature only works when enabled, and it is when it's mounted.

```
$ cat /proc/sys/fs/binfmt_misc/status
enabled
```

Now, let's disable it and then re-enable it and run the script each time, just to see what happens in the different states:

```
$ echo 0 | sudo tee /proc/sys/fs/binfmt_misc/status
0
$ cat /proc/sys/fs/binfmt_misc/status
disabled
$ ./hello.py
./hello.py: line 1: syntax error near unexpected token `"Hello, world!"'
./hello.py: line 1: `print("Hello, world!")'
$
$ echo 1 | sudo tee /proc/sys/fs/binfmt_misc/status
1
$ cat /proc/sys/fs/binfmt_misc/status
enabled
$ ./hello.py
Hello, world!
```

Great, it's working as we would intuit it would.

> You can also deregister (and remove) a specific binary format by doing the following rather than disabling **all** of the registered user space binary formats:
>
>     echo -1 | sudo tee /proc/sys/fs/binfmt_misc/python

Let's reboot the machine and start fresh.

```
$ reboot
...
$ ls -l /proc/sys/fs/binfmt_misc/
total 0
--w------- 1 root root 0 Dec 31 23:36 register
-rw-r--r-- 1 root root 0 Dec 31 23:36 status
```

Ok, the registered binary format is gone.  It's very important to understand that registering binary formats in this way will **not** survive a system reboot.

### By Magic Number

Let's now register it by magic number rather by extension.

Let's first decide on a string or numeric constant.  Since I'm a child, I think that `5318008` will serve us well as our magic number.  However, and this is a bit of a cheat, we'll still preface it with `#` so the Python interpreter will see it as a commented line (otherwise, the Python interpreter will throw an error).  So, prefaced with the necessary "#" character, `#5318008` will be the full magic number.

```
$ echo ":python:M::\x235318008::$(which python):OC" \
    | sudo tee /proc/sys/fs/binfmt_misc/register
:python:M::\x235318008::/usr/bin/python:OC
```

And, we'll change the `shebang` in our script:

```
$ cat hello.py
#5318008
print("Hello, world!")

```

Again, we see that the kernel has created the new `python` file in the `/proc` directory:

```
$ ls -l /proc/sys/fs/binfmt_misc/
total 0
-rw-r--r-- 1 root root 0 Jan  1 00:59 python
--w------- 1 root root 0 Jan  1 00:59 register
-rw-r--r-- 1 root root 0 Dec 31 23:36 status
```

And, importantly, it's now looking for a magic number rather than a file extension:

```
$ cat /proc/sys/fs/binfmt_misc/python
enabled
interpreter /usr/bin/python
flags: OC
offset 0
magic 2335333138303038
```

Can we still run it?  You bet your booties!

```
$ ./hello.py
Hello, world!
```

That's all great, and this is tremendously exciting, but there's a problem.  As stated, doing it this way won't survive a reboot, though, and we don't want to have to do this every time we reboot the machine.

Let's see how we can persist this across system reboots.

## Registering a Binary Format with `systemd`

With [`systemd`], we can configure the additional binary format we developed in the last sections [to be loaded at boot].  There are three different locations in which we can register the binary format, and we'll put it in `/etc/binfmt.d/`.  The only requirement is that is has a `.conf` extension.  No biggie.

```
$ echo ":python:M::\x235318008::$(which python):OC" \
    | sudo tee /etc/binfmt.d/python.conf
:python:M::\x235318008::/usr/bin/python:OC
```

Since we didn't create this using the `register` interface, a new `python` file was **not** created in the `/proc` directory:

```
$ ls -l /proc/sys/fs/binfmt_misc/
total 0
--w------- 1 root root 0 Jan  1 00:59 register
-rw-r--r-- 1 root root 0 Dec 31 23:36 status
```

So, how will this file then be created?  By starting the service, of course!  Let's now start the [`binfmt` service], list the directory again and run the script!

```
$ sudo systemctl start systemd-binfmt
$ ls /proc/sys/fs/binfmt_misc/
python  register  status
$ cat /proc/sys/fs/binfmt_misc/python
enabled
interpreter /usr/bin/python
flags: OC
offset 0
magic 2335333138303038
$ ./hello.py
Hello, world!
```

Weeeeeeeeeeeeeeeeeeeeeee!

Interestingly, the `/proc/sys/fs/binfmt_misc/python` file is removed when the service is stopped:

```
$ sudo systemctl stop systemd-binfmt
$ ls /proc/sys/fs/binfmt_misc/
register  status
$ ./hello.py
./hello.py: line 2: syntax error near unexpected token `"Hello, world!"'
./hello.py: line 2: `print("Hello, world!")'
```

Obviously, without the `python` file the kernel can't tell the loader what to use to run the program, and we see the generated errors above when we try.

## Conclusion

Boldly go forth and create a new binary format and install a new `systemd` service.  The kernel isn't the boss of you, you do what you want, when you want!

Here are some widely-used binary file formats on Linux:

- [`a.out`]
    + [`binfmt_aout.c`]
    + This is an abbreviated form of "assembler output", [the filename of the output of Ken Thompson's PDP-7 assembler].
    + On my system, the filename "a.out" from the compilation of a C program is in ELF file format, not `a.out`.

- [ELF]
    + [`binfmt_elf.c`]

- [DWARF]

- script
    + [`binfmt_script.c`]

+ [`binfmt_misc.c`]

> Note that, even in systems with full kernel support for the "#!" magic number, some scripts lacking interpreter directives (although usually still requiring execute permission) are still runnable by virtue of the legacy script handling of the Bourne shell, still present in many of its modern descendants.  Scripts are then interpreted by the user's default shell.
>
> (Quote taken directly from [`shebang`] Wikipedia page.)

## References

- [Using Go as a scripting language in Linux](https://blog.cloudflare.com/using-go-as-a-scripting-language-in-linux/)
- [Playing with Binary Formats](https://www.linuxjournal.com/article/2568)
- [xslt shbang: Using xslt from the command line](https://unix.stackexchange.com/a/401808)
- ["systemctl stop systemd-binfmt" should remove the registered entries?](https://github.com/systemd/systemd/issues/13129)

[Jessie Frazelle's awesome blog]: https://blog.jessfraz.com/
[Nerd Sniped by BINFMT_MISC]: https://blog.jessfraz.com/post/nerd-sniped-by-binfmt_misc/
[`BINFMT_MISC` kernel feature]: https://www.kernel.org/doc/html/latest/admin-guide/binfmt-misc.html
[nerd sniping]: https://xkcd.com/356/
[binary formats]: https://en.wikipedia.org/wiki/Binary_code
[Shebang Etymology]: https://en.wikipedia.org/wiki/Shebang_(Unix)#Etymology
[read the source]: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/fs
[user space]: https://en.wikipedia.org/wiki/User_space
[loader]: https://en.wikipedia.org/wiki/Loader_(computing)
[binary data]: https://en.wikipedia.org/wiki/Binary_file
[magic]: https://en.wikipedia.org/wiki/Magic_Johnson
[`shebang`]: https://en.wikipedia.org/wiki/Shebang_(Unix)
[`0x23 0x21`]: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/fs/binfmt_script.c#n41
[`gorun`]: https://github.com/erning/gorun
[on Wikipedia]: https://en.wikipedia.org/wiki/Binfmt_misc#Registration
[`file`]: https://www.man7.org/linux/man-pages/man1/file.1.html
[the `exec` family of system calls]: https://www.it.uu.se/education/course/homepage/os/ht21/module-2/exec/
[`systemd`]: https://systemd.io/
[to be loaded at boot]: https://www.man7.org/linux/man-pages/man5/binfmt.d.5.html
[`binfmt` service]: https://www.man7.org/linux/man-pages/man8/systemd-binfmt.service.8.html
[`a.out`]: https://en.wikipedia.org/wiki/A.out
[ELF]: https://en.wikipedia.org/wiki/Executable_and_Linkable_Format
[DWARF]: https://en.wikipedia.org/wiki/DWARF
[`binfmt_aout.c`]: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/fs/binfmt_aout.c
[the filename of the output of Ken Thompson's PDP-7 assembler]: https://en.wikipedia.org/wiki/A.out#CITEREFRitchie1993
[`binfmt_elf.c`]: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/fs/binfmt_elf.c
[`binfmt_script.c`]: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/fs/binfmt_script.c
[`binfmt_misc.c`]: https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/fs/binfmt_misc.c

