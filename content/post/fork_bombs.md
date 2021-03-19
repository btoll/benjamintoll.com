+++
title = "On Fork Bombs"
date = "2021-03-18T20:05:36-04:00"

+++

As I was writing [my previous article on zombie processes], I was reminded of [fork bombs] and how they're a barrel of laughs.

My first encounter with them was when I worked as a tech phone jockey at [Earthlink] in Harrisburg, PA.  On a lark, other phone techs would send a version of a fork bomb that would continually open new browser windows until the browser crashed (and sometimes the system).  Adding to the hilarity was the fact that the victim would be on a call with a customer at the time.

A [denial of service attack], a fork bomb constantly spawns new processes which increase exponentially and quickly exhausts system resources.  For example, it will saturate the [system process table] and eat up RAM and CPU time, grinding the system to a halt.

This happens very quickly because of the exponentiation.

![Fork Bomb](/images/fork_bomb.png)

Let's look at some examples.

---

# Examples

- [Bash](#bash)
- [C](#c)
- [Python](#python)
- [Windows](#windows)

#### Bash

<pre class="math">
$ :(){ :|:& };:

<b>:()</b>    Is a function name with no parameters.
<b>{</b>      The start of the function body.
<b>:|:</b>    A recursive call. The function is actually being called twice
       and is piping the input from one call to the other.
<b>&</b>      Backgrounds the previous function call so that it will not die.
<b>}</b>      The close of the function body.
<b>;</b>      Finishes the function declaration.
<b>:</b>      Calls the function.

# It helps to view this with whitespace added:
:() {
    : | : &
}
:

# This can be also be rewritten with better named symbols to assist in understanding:
bomb() {
    bomb | bomb &
}
bomb
</pre>

#### C

<pre class="math">
#include &lt;stdlib.h&gt;

int main() {
    while (1) {
        fork();
    }
}
</pre>

#### Python

<pre class="math">
import os


def main() {
    while (1):
        os.fork()
}
</pre>

#### Windows

<pre class="math">
%0|%0
</pre>

---

# Mitigation

Don't let anyone use your system.

Also:

<pre class="math">
# Get information about the Bash builtin <i>ulimit</i>:
$ ulimit help

# View the current limit:
$ ulimit -u

# View all limits:
$ ulimit -a

# Set the maxiumum user processes limit at 2000:
$ ulimit -u 2000
</pre>

Or set system-wide in `/etc/security/limits.conf`.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

[my previous article on zombie processes]: /2021/03/17/on-creating-a-zombie-process/
[fork bombs]: https://en.wikipedia.org/wiki/Fork_bomb
[Earthlink]: https://en.wikipedia.org/wiki/EarthLink
[denial of service attack]: https://en.wikipedia.org/wiki/Denial-of-service_attack
[system process table]: https://exposnitc.github.io/os_design-files/process_table.html

