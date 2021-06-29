+++
title = "On Extending Git"
date = "2019-07-05T21:54:25-04:00"

+++

<p>One of my favorite things to do is automate my workflows.  When it comes to version control, <a href="https://git-scm.com/">Git</a> makes this extremely easy to do by allowing it to be extended.</p>

<p>So, what does it mean to extend Git?  Simply put, it&rsquo;s extending Git&rsquo;s behavior to do anything you would like.  Effectively, it&rsquo;s adding programs written in any language and invoking them as if they were Git built-ins.</p>

<p>For example, everyone knows <code>git pull</code> and <code>git push</code>.  I&rsquo;ve extended Git to also do <code>git hub</code> and <code>git bootstrap</code>, as well as <code>git dirty</code> (well, technically that&rsquo;s an alias, but you get my point).</p>

<h2 id="extending-git">Extending Git</h2>

<p>How is this done?  There are only three simple rules:</p>

<ol>
<li><p>Create your script in a file called <code>git-scriptname</code>, where <code>scriptname</code> is obviously a placeholder for, well, the name of the script :)</p></li>

<li><p>Make the script executable.</p></li>

<li><p>Place the script in your <code>$PATH</code>.</p></li>
</ol>

<p>Say what?  Yeah, it&rsquo;s really that easy.  But you will look like a hero to your peers!</p>

<blockquote>
<p>All of my Git extensions are shell scripts, but you can use any scripting language you&rsquo;d like that&rsquo;s on the system.</p>
</blockquote>

<p>Let&rsquo;s go further and create your own man pages for these extensions.</p>

<h2 id="man-pages">Man Pages</h2>

<p>Wouldn&rsquo;t it be <a href="https://www.youtube.com/watch?v=b5rKZs6HnB4">dynamite</a> to create and install your own man pages?  Wouldn&rsquo;t it be sweet to do <code>man git-hub</code>?  Yes!</p>

<p>You can do this in four easy steps:</p>

<ol>
<li><p>Download the <code>pod2man</code> package using your package manager.</p></li>

<li><p>Create a <code>.pod</code> file.  It&rsquo;s easy to create, just use one of mine as a template to create your own.</p>

<p>For example, create <code>git-hub.pod</code>:</p>

<pre><code>=head1 NAME

git-hub - Open any file, directory or commit on GitHub in regular view or blame view.

=head1 SYNOPSIS

git hub [ -f, --file file ] [ -b, --branch branch ] [ --range 'L10-L20' ] [ --get-hash hash ] [ --hash hash ] [ --blame ]

=head1 EXAMPLES

git hub
    - Opens the current working directory.

git hub --file grid/filters/filter/List.js
    - Opens the file.

git hub -f grid/header/Container --blame
    - Opens the file in a blame view.

git hub --branch extjs-4.2.x -f Component.js
    - Opens the file in a remote branch other than the one that is currently checked out.

git hub --hash b51abf6f38902
    - Opens the commit hash.

git hub --get-hash EXTJS-15755
    - Opens the commit hash to which the local topic branch points.

git hub --get-hash extjs5.1.0
    - Opens the commit hash to which the tag points.

git hub -f app.js --range 'L10-L20'
    - Opens the file with the specified range highlighted.

=head1 AUTHOR

Benjamin Toll &lt;benjam72@yahoo.com&gt;
</code></pre></li>

<li><p>Generate the file:</p>

<pre><code>pod2man git-hub.pod &gt; git-hub.1
</code></pre></li>

<li><p>Weeeeeeeeeeeeeeeeeeeeeeeeee</p></li>
</ol>

<blockquote>
<p>I have a repo called <a href="https://github.com/btoll/git-init">git-init</a> where I&rsquo;ve collected all of my extensions, aliases and hooks.  Check out the <a href="https://github.com/btoll/git-init/blob/master/README.md">README</a> for examples!</p>
</blockquote>

<h2 id="faves">Faves</h2>

<p>I&rsquo;ll list some of my favorite Git extensions, ones that I use every single day.</p>

<ul>
<li><p><a href="https://github.com/btoll/git-init#git-bootstrap">git-bootstrap</a> - Open the files that make up a particular commit in Vim.</p></li>

<li><p><a href="https://github.com/btoll/git-init#git-hub">git-hub</a> - Open any file, directory or commit on GitHub in regular view or blame view.</p></li>

<li><p><a href="https://github.com/btoll/git-init#git-introduced">git-introduced</a> - Find the commit(s) that introduced or removed a method or other search pattern.</p></li>

<li><p><a href="https://github.com/btoll/git-init#git-ls">git-ls</a> - List the files that are staged and modified or that make up any given commit and optionally open in Vim for editing.</p></li>
</ul>

<p>Click through to see examples for each one.</p>

<h2 id="installation">Installation</h2>

<p>Since I&rsquo;m a prince, I wrote some install scripts to make it easy to install both <a href="https://github.com/btoll/git-init/blob/master/install.sh">the extensions</a> and <a href="https://github.com/btoll/git-init/blob/master/install_manpages.sh">the man pages</a> on a system.</p>

<h2 id="conclusion">Conclusion</h2>

<p>I don&rsquo;t need no stinkin&rsquo; conclusion.</p>

<h2 id="references">References</h2>

<ul>
<li><a href="https://www.atlassian.com/git/articles/extending-git">Extending git</a></li>
<li><a href="http://linuxfocus.org/English/November2003/article309.shtml">Writing man-pages</a></li>
</ul>

