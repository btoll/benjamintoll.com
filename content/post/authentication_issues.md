+++
title = "On Authentication Issues"
date = "2021-11-18T20:01:05Z"

+++

I ran into an issue the other day with my an authentication key, and it wasn't the first time.  So, since I have a memory like a sieve, I'm going to write this article for my future forgetful self.  Also, as it turns out, it wasn't an issue with the service but with yours truly.  What a surprise!

---

I have a super helpful Bash function that loads an account's credentials into memory.  Let's take a look at it!

<pre class="math">
parse_creds() {
    local creds
    local account="${1:-default}"
    local profile_dir="$HOME/access-keys/$account"

    if [ ! -d "$profile_dir" ]
    then
        echo "[ERROR] Profile \`$account\` does not exist!"
    else
        creds=$(< "$profile_dir/accessKeys.csv" tail -1)
        echo "export SUPER_KEY_ID="$(awk -F, '{ print $1 }' <<< "$creds")
        echo "export SUPER_ACCESS_KEY="$(awk -F, '{ print $2 }' <<< "$creds")
    fi
}
</pre>

Let's load up the parent environment!

```
eval $(parse_creds kilgore-trout)
```

Then, after invoking a repugnant binary on the command line, I received the following error message:

<pre class="math">
An error occurred (SignatureDoesNotMatch) when calling the ListBuckets operation: The request signature we calculated does not match the signature you provided. Check your key and signing method.
</pre>

Well, that's a bummer.  I checked the usual suspects:

- Has the key been deactivated?
- Is it still valid?
- Is it in my environment?
- Is it a clock-syncing issue?

After verifying that none of the above were factors, I sat for awhile, defeated and sucking my thumb.

Let's do a sanity check and verify that what is being evaluated is correct:

```
$ parse_creds kilgore-trout
export SUPER_KEY_ID=AKIATNFRIZJOHUUIE6EO
export SUPER_ACCESS_KEY=cwNPIvRKvmhI1uw3z/kDoN390SfXkWoH7NsB8Mcz
```

Interesting.  Can you see the problem?  I didn't at first.

There's a little character in there that is a [special shell character] and should be single-quoted so it's interpreted literally.

Let's try it again:

```
$ export SUPER_ACCESS_KEY='cwNPIvRKvmhI1uw3z/kDoN390SfXkWoH7NsB8Mcz'
$ {invoked a repugnant binary}
$ 2021-11-16 00:57:17 kilgore-trout-was-here
```

It worked!  Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee!

# Conclusion

So, what have we learned today, kids?  Don't trust my Bash functions!

[special shell character]: https://tldp.org/LDP/abs/html/special-chars.html

