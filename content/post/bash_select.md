+++
title = "On Bash Select"
date = "2021-03-27T23:54:24-04:00"

+++

You know what's cool?  [This]:

<pre class="math">
$ PS3="Night time is the right time #? "
$
$ select item in *.sh; do echo You picked $item \($REPLY\); break; done
1) case.sh
2) create_cert.sh
3) hugo.sh
<a href="https://www.youtube.com/watch?v=set73DT5KiI">Night time is the right time</a> #? 2
You picked create_cert.sh (2)
</pre>

I had no idea that Bash could do this.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

[This]: https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html

