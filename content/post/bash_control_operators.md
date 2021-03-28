+++
title = "On Bash Control Operators"
date = "2021-03-26T19:44:03-04:00"

+++

I've been reading the [Bash Reference Manual] like a good boy, and I came across a version of a Bash control operator that I don't recall seeing before:

`|&`

[Say what?]

From the [Pipelines] page in the Bash manual:

>  If `|&` is used, `command1`'s standard error, in addition to its standard output, is connected to `command2`'s standard input through the pipe; it is shorthand for `2>&1 |`.

Um.

Let's suss this out.

---

So, what is a control operator?  From the [Definitions] page:

> A token that performs a control function. It is a newline or one of the following: ‘||’, ‘&&’, ‘&’, ‘;’, ‘;;’, ‘;&’, ‘;;&’, ‘|’, ‘|&’, ‘(’, or ‘)’.

Most of the control operators are well-known, but a few aren't, such as `;&`, `;;&` and `|&`.  This post will focus on the ones that I find the most interesting.

> Some of the others, such as `||` and `&&`, are usually the only ones covered in most tutorials on this topic and are easy to find on the Internets.  Because of this, I won't be covering them here.

---

# `;&` and `;;&`

Used in `case` [conditional constructs].

- `;;`
    - Once matched, no further clauses are attempted to match.  The most common control operator in a `case`.

			read -r -p "Choose one [dog|cat|bear]: " ANIMAL

			case $ANIMAL in
				dog)
					echo You chose a dog!
					;;
				cat | dog)
					echo You chose a cat!
					;;
				bear | cat | dog)
					echo You chose a bear!
					;;
			esac

		Let's run it!

            $ ./case.sh
            Choose one [dog|cat|bear]: bear
            You chose a bear!
            $
            $ ./case.sh cat
            Choose one [dog|cat|bear]: cat
            You chose a cat!
            $
            $ ./case.sh
            Choose one [dog|cat|bear]: dog
            You chose a dog!

- `;&`
    - Execute the commands in the next clause regardless of match.

			read -r -p "Choose one [dog|cat|bear]: " ANIMAL

			case $ANIMAL in
				dog)
					echo You chose a dog!
					;&
				cat)
					echo You chose a cat!
					;;
				bear)
					echo You chose a bear!
					;;
			esac

		Let's run it!

            $ ./case.sh
            Choose one [dog|cat|bear]: bear
            You chose a bear!
            $
            $ ./case.sh cat
            Choose one [dog|cat|bear]: cat
            You chose a cat!
            $
            $ ./case.sh
            Choose one [dog|cat|bear]: dog
            You chose a dog!
            You chose a cat!

        > Note that in the last example the `cat` clause was called for the user input of "dog" even though it doesn't match the value of `$ANIMAL`.

- `;;&`
    - Continue testing subsequent clauses (like [`fallthrough` in golang]).

			read -r -p "Choose one [dog|cat|bear]: " ANIMAL

			case $ANIMAL in
				dog)
					echo You chose a dog!
					;;&
				cat)
					echo You chose a cat!
					;;&
				bear | dog | cat)
					echo You chose a bear!
					;;
			esac

		Let's run it!

			$ ./case.sh
            Choose one [dog|cat|bear]: bear
            You chose a bear!
            $
            $ ./case.sh
            Choose one [dog|cat|bear]: cat
            You chose a cat!
            You chose a bear!
            $
            $ ./case.sh
            Choose one [dog|cat|bear]: dog
            You chose a dog!
            You chose a bear!

        > Note that subsequent clauses only invoke their command(s) if the value of `$ANIMAL` matches.

That's groovy.

Next, let's cover the operator that started this article.

---

# `|&`

Used in pipelines to fold both `stderr` and `stdout` input streams into the next command's `stdin`.

Let's see a viable example of this.  I'm going to pipe the results of a `curl` request to `awk` and parse its `stdin` for the `Host:` (headers) and `<title>` (body) values.  The output I'm expecting will look like this:

<pre class="math">
&gt; Host: www.benjamintoll.com
benjamintoll.com
</pre>

Let's see the pipeline:

```
$ curl -vs https://www.benjamintoll.com |& awk '/Host:/{print}/<title>/{match($0,/<title>(.*)<\/title>/,arr);print arr[1]}'
> Host: www.benjamintoll.com
benjamintoll.com
```

How does this work?  The verbose flag `-v` writes its information to `stderr` and the result of the `curl` fetch (`index.html`) is written to `stdout`.  The `|&` control operator combines these data streams into `stdin`, which is read by `awk`.

Another way to write this, as the Bash reference manual quoted above said, would be to lexically merge the two streams prior to the pipe `|`:

```
curl -sv https://www.benjamintoll.com 2>&1 | awk '/Host:/{print}/<title>/{match($0,/<title>(.*)<\/title>/,a);print a[1]}
```

Because the verbose flag is needed to get the headers (and recall it writes the debugging information to `stderr`), we must use one of the two methods above to get both pieces of information:

- the `Host` header
- the HTML Title tag in the request body

If `stderr` isn't also captured, the result will look like this:

```
$ curl -sv https://www.benjamintoll.com | awk '/Host:/{print}/<title>/{match($0,/<title>(.*)<\/title>/,a);print a[1]}'
* Rebuilt URL to: https://www.benjamintoll.com/                                                                                                                    [27/4979]
*   Trying 167.114.97.28...
* TCP_NODELAY set
* Connected to www.benjamintoll.com (167.114.97.28) port 443 (#0)
* ALPN, offering h2
* ALPN, offering http/1.1
* successfully set certificate verify locations:
*   CAfile: /etc/ssl/certs/ca-certificates.crt
  CApath: /etc/ssl/certs
} [5 bytes data]
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
} [512 bytes data]
* TLSv1.3 (IN), TLS handshake, Server hello (2):
{ [106 bytes data]
* TLSv1.2 (IN), TLS handshake, Certificate (11):
{ [2511 bytes data]
* TLSv1.2 (IN), TLS handshake, Server key exchange (12):
{ [365 bytes data]
* TLSv1.2 (IN), TLS handshake, Server finished (14):
{ [4 bytes data]
* TLSv1.2 (OUT), TLS handshake, Client key exchange (16):
} [102 bytes data]
* TLSv1.2 (OUT), TLS change cipher, Client hello (1):
} [1 bytes data]
* TLSv1.2 (OUT), TLS handshake, Finished (20):
} [16 bytes data]
* TLSv1.2 (IN), TLS handshake, Finished (20):
{ [16 bytes data]
* SSL connection using TLSv1.2 / ECDHE-RSA-AES256-GCM-SHA384
* ALPN, server accepted to use h2
* Server certificate:
*  subject: CN=benjamintoll.com
*  start date: Mar 25 00:20:40 2021 GMT
*  expire date: Jun 23 00:20:40 2021 GMT
*  subjectAltName: host "www.benjamintoll.com" matched cert's "www.benjamintoll.com"
*  issuer: C=US; O=Let's Encrypt; CN=R3
*  SSL certificate verify ok.
* Using HTTP2, server supports multi-use
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
} [5 bytes data]
* Using Stream ID: 1 (easy handle 0x555a657f8580)
} [5 bytes data]
> GET / HTTP/2
> Host: www.benjamintoll.com
> User-Agent: curl/7.58.0
> Accept: */*
>
{ [5 bytes data]
* Connection state changed (MAX_CONCURRENT_STREAMS updated)!
} [5 bytes data]
< HTTP/2 200
< server: nginx
< date: Sun, 28 Mar 2021 03:35:40 GMT
< content-type: text/html
< content-length: 16367
< last-modified: Sun, 28 Mar 2021 03:29:49 GMT
< etag: "605ff82d-3fef"
< accept-ranges: bytes
<
{ [8059 bytes data]
benjamintoll.com
* Connection #0 to host www.benjamintoll.com left intact
```

What happened?  It looks like we did get information written to `stderr`, so why wasn't it captured in the `awk` command and instead dumped whole hog to the terminal?

The result make sense.  Remember, both `stdout` and `stderr` are printed to the terminal.  So, the `curl` command to the left of the pipe will print to `stderr` because the `-v` verbose flag is set (remove the flag and see what happens), which means that all of the debug information written to `stderr` will be printed **before** anything is piped to the next command.

But, you may be thinking, why isn't the full `index.html` document also printed?  Well, that's because of the pipeline.  Remember, the pipe will connect the `stdout` of the command on the left to the `stdin` of the command on the right.  And the command on the right is limiting what is printed by the `awk` command.  Sweet!

> ## What's that `awk`?
>
> <b>`/Host:/{print}`</b>
>   - Matches "> Host: www.benjamintoll.com" and prints the text after the colon (`:`).
>   - In this case, `print` == `print $0`.
>
> <b>`/<title>/`</b>
>   - Matches the first occurrence of "&lt;title&gt;".
>
> <b>`match($0,/<title>(.*)<\/title>/,arr)`</b>
>   - Uses the [`match` string function] to search the string value of `$0`, which in this case is the line that matched the previous regexp.
>   - The second parameter is the regexp to that will match the a substring of `$0`.
>   - Finally, it puts the results in the array `arr`.
>
> <b>`print arr[1]`</b>
>   - Print the second element, which in this case is the content of the &lt;title&gt; markup, "benjamintoll.com".

To see which bits are written to the different streams, you can run the following commands:

View `stderr`:

```
$ curl -sv https://www.benjamintoll.com > /dev/null
```

View `stdout`:

```
$ curl -sv https://www.benjamintoll.com 2> /dev/null
```

Also, the following two commands are functionally equivalent and are left as an exercise to the reader to figure out why:

```
$ curl -sv https://www.benjamintoll.com  2> >(head) > /dev/null
$
$
$ curl -sv https://www.benjamintoll.com |& head
```

# Conclusion.

In conclusion, I conclude that this was a fine post.

[Bash Reference Manual]: https://www.gnu.org/software/bash/manual/html_node/index.html
[Say what?]: https://www.youtube.com/watch?v=veCodY5YuYY
[Pipelines]: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
[Definitions]: https://www.gnu.org/software/bash/manual/html_node/Definitions.html
[conditional constructs]: https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html
[`fallthrough` in golang]: https://golangbyexample.com/fallthrough-keyword-golang/
[`match` string function]: https://www.gnu.org/software/gawk/manual/html_node/String-Functions.html

