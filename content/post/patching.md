+++
title = "On Patching"
date = "2019-06-16T21:54:25-04:00"

+++

One of the simple pleasures in life is patching code.  Most days, it's done using [Git], but sometimes I still do it the old-fashioned way.  In fact, I used our old friend [`patch`] just the other day.  Weeeeeeeeeeeeeeeeeeeeeeeeee

> I'll be using "patch" interchangeably as both `patch` tool and as the set of changes provided by a `diff` tool.

If using Git, the simplest way to produce a [patch] is to use the [`git-diff`] tool:

```
$ git diff
$ git diff foo.c
$ git diff foo.c > foo.patch
```

Also, I'll use the [`git-show`] tool to see the differences that made up the last commit:

```
$ git show
```

Of course, we don't need to [email patches to project maintainers] like they used to in the bad old days.  Now, since everyone used distributed systems, that method of communicating patches has been obsoleted, right?  All I need to know is [`git-pull`] and [`git-push`] and where to click on GitHub!

Um, no.  So, even if your little JavaScript team doesn't feel the need to distribute patches, that doesn't mean that others aren't doing it.  Yes, there are even Git tools for that ([`git-format-patch`], [`git-am`]).

<p>Anyway, let&rsquo;s look at a quick example of using <a href="http://man7.org/linux/man-pages/man1/diff.1.html"><code>diff</code></a> and <code>patch</code> to create and apply a patch, respectively, like they did back in the 16<sup>th</sup> century.</p>

<h1 id="a-quick-one-while-he-s-away">A Quick One, While He&rsquo;s Away</h1>

<p>Here&rsquo;s a nice program:</p>

<p><code>foo.c</code></p>

<pre><code>#include &lt;stdio.h&gt;

void main(int argc, char **argv) {
    printf(&quot;I'm a little foo, hear me roar\n&quot;);
}
</code></pre>

<p>And it&rsquo;s second version:</p>

<p><code>foo2.c</code></p>

<pre><code>#include &lt;stdio.h&gt;

void main(int argc, char **argv) {
    char *name = &quot;foo&quot;;
    printf(&quot;I'm a little %s, hear me roar\n&quot;, name);
}
</code></pre>

<h3 id="the-diff">The <code>diff</code></h3>

<p>Now, let&rsquo;s print the difference using a normal <code>diff</code>:</p>

<pre><code>$ diff foo.c foo2.c

4c4,5
&lt;     printf(&quot;I'm a little foo, hear me roar\n&quot;);
---
&gt;     char *name = &quot;foo&quot;;
&gt;     printf(&quot;I'm a little %s, hear me roar\n&quot;, name);
</code></pre>

<p>The first line refers to the prescriptive changes that must be made to the left file to make it look like the right.  The numbers on the right of the letter <code>c</code> refer to the left file and the numbers (actually, it&rsquo;s a range) on the right to the right file.  It can be interpreted thusly:</p>

<p>&ldquo;Line 4 in the left file must be changed to match lines 4 and 5 in the right file.&rdquo;</p>

<blockquote>
<p>Does this look familiar?  <a href="https://en.wikipedia.org/wiki/Ed_(text_editor)"><code>ed</code></a> commands!</p>
</blockquote>

<p>There are three different actions, depending upon the changes to the file:</p>

<ul>
<li><strong>c</strong> = change</li>
<li><strong>a</strong> = add</li>
<li><strong>d</strong> = delete</li>
</ul>

<p>Then, <code>diff</code> shows us the changes in the files (separated by dashes <code>---</code>).  The <code>&lt;</code> symbol denotes the changes that happened to the file on the left (the order of the files given to the <code>diff</code> command matters) and &lsquo;&gt;&rsquo; denotes the file on the right.</p>

<p>This is great, but let&rsquo;s save the <code>diff</code> using a different format.  We&rsquo;ll output what is known as a <strong>unified</strong> <code>diff</code>, which simply means that it prints the differences as a single chunk of text, instead of distinct chunks, which is what what saw from a normal <code>diff</code>.</p>

<p>Let&rsquo;s see the difference by printing a unified <code>diff</code>:</p>

<pre><code>$ diff -u projects/sandbox/foo.c projects/sandbox/foo2.c

--- projects/sandbox/foo.c       2019-07-07 12:52:54.676192440 -0400
+++ projects/sandbox/foo2.c      2019-07-07 12:55:21.155537240 -0400
@@ -1,6 +1,7 @@
 #include &lt;stdio.h&gt;
 
 void main(int argc, char **argv) {
-    printf(&quot;I'm a little foo, hear me roar\n&quot;);
+    char *name = &quot;foo&quot;;
+    printf(&quot;I'm a little %s, hear me roar\n&quot;, name);
 }
</code></pre>

<p>Here, we see that the differences have been combined with some extra instructions at the top for the <code>patch</code> tool.  The <code>@@ -1,6 +1,7 @@</code> stipulates that <code>diff</code> shows the lines one through six of the file on the left and lines one through seven on the right.</p>

<p><code>patch</code> may not replace the hunk at exactly those lines.  It will do its best, but the applied patch lines may differ.  From the man page:</p>

<pre>
With context diffs, and to a lesser extent with normal diffs, patch can detect
when the line numbers mentioned in the patch are incorrect, and attempts to find
the correct place to apply each hunk of the patch.  As a first guess, it takes
the line number mentioned for the hunk, plus or minus any offset used in applying
the previous hunk.  If that is not the correct place, patch scans both forwards
and backwards for a set of lines matching the context given in the hunk.
</pre>

<p>If it can&rsquo;t find a correct place to patch, it will give up with a rejection file.</p>

<p>Now, let&rsquo;s save that patch and send it to our friend Chester:</p>

<pre><code>$ diff -u projects/sandbox/foo.c foo2.c &gt; foo.patch
</code></pre>

<blockquote>
<p>Note, there are other formats outputted by the <code>diff</code> command that are interesting and worthwhile to see.</p>

<p>For instance, I didn&rsquo;t talk about the <code>-e</code> flag to the <code>diff</code> command.  It&rsquo;s so cool I can barely contain myself.  See the link in the <code>References</code> section for more information (and the <code>patch</code> man page, of course, which was already linked in the above article).</p>
</blockquote>

<h3 id="the-patch">The <code>patch</code></h3>

<p>Ok, Chester has received our patch file, and now he&rsquo;ll happily apply it to his source file.  First, he puts on his special merge hat, the one with the propellers, and then he gets down to business.</p>

<p>One of the most important things to know when patching a source file(s) is where in the file system the patch was made in relation to Chester&rsquo;s directory structure.  If the path of the file(s) in the patch file doesn&rsquo;t match Chester&rsquo;s directory structure, he can use the <code>-pN</code> flag to strip off path prefixes.</p>

<p>I&rsquo;ll show examples from the man page to illustrate the point:</p>

<pre><code>For example, supposing the file name in the patch file was

          /u/howard/src/blurfl/blurfl.c

setting -p0 gives the entire file name unmodified, -p1 gives

          u/howard/src/blurfl/blurfl.c

without the leading slash, -p4 gives

          blurfl/blurfl.c

and not specifying -p at all just gives you blurfl.c.
</code></pre>

<p>Patch will try to determine the type of the <code>diff</code> when it starts up, but this of course can be set explicitly on the command line, i.e., <code>-u</code> for a unified <code>diff</code>.</p>

<p>Ok, let&rsquo;s finally have Chester apply that bad boy.  He does indeed have a <code>foo.c</code> file, but it&rsquo;s the directory <code>derp/</code>, which of course differs from the path in the patch file.</p>

<p>Chester enters the following commands:</p>

<pre><code>$ cd derp
$ patch -p2 &lt; foo.patch
patching file foo.c
</code></pre>

<p>And all is right with the world!</p>

<h2 id="more-patch-fun">More <code>patch</code> fun</h2>

<p>Here are some more sweet things you can do with <code>patch</code>:</p>

<ul>
<li><p>Create a backup of the file when patching by suppling the <code>-b</code> or <code>--backup</code> switch.</p>

<ul>
<li>This will backup the original file with the <code>.orig</code> extension.</li>
</ul></li>

<li><p>Create a versioned number of the file by giving the <code>-V</code> switch.</p>

<ul>
<li>Must be used with the backup flag.</li>
<li>Will create sequentially-versioned files with the <code>.~N~</code> extension.</li>
</ul></li>

<li><p>Revert the applied patch with the <code>-R</code> or <code>--reverse</code> switch.</p>

<pre><code>$ patch -p2 &lt; foo.patch
$ patch -R &lt; foo.patch
</code></pre></li>

<li><p>Run the command without actually applying the patch with the <code>--dry-run</code> switch.</p></li>
</ul>

<h1 id="references">References</h1>

<ul>
<li><a href="https://www.computerhope.com/unix/udiff.htm">Linux diff command</a></li>
</ul>

[Git]: https://git-scm.com/
[`patch`]: https://linux.die.net/man/1/patch
[patch]: https://en.wikipedia.org/wiki/Patch_(computing)
[`git-diff`]: https://git-scm.com/docs/git-diff
[`git-show`]: https://git-scm.com/docs/git-show
[email patches to project maintainers]: https://lkml.org/lkml/2004/12/20/255
[`git-pull`]: https://git-scm.com/docs/git-pull
[`git-push`]: https://git-scm.com/docs/git-push
[`git-format-patch`]: https://git-scm.com/docs/git-format-patch
[`git-am`]: https://git-scm.com/docs/git-am

