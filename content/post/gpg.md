+++
title = "On Using GPG"
date = "2018-03-30T16:41:49-04:00"

+++

Like most people\*, I use GPG everyday.  Although most often associated with email, that's usually not what I use it for.  Here are a couple of ways that I do.

## Securing Passwords

I used to use LastPass as my password manager, and it was nice and convenient.  But it always bothered me that my password vault was located in the cloud.  I researched it and cryptographers vouched for it, but I was still paranoid.  Here is a list of concerns that I had:

- Do they use and save keys or is my key generated on my machine?
- Are they making copies of my data?
- Are they scrubbing and deleting my data when I stop using their service?
- What if they're subpoenaed by the government or receive a secret NSA warrant?  [How would I even know?]
- Is the code open source?  [Can it be audited?]
- What about their security?

And companies and governments lie, especially when either money or privacy (or both) is concerned.

Yes, I realize that it could be just as easy for a determined adversary to get into my box as a cloud service.  But, and this is important to me, I know how my data is encrypted, I know where it is at all times, and I know that my key is [protected by a passphrase] even if my box is compromised.

Ok, having said that, I decided to write my own password manager to address these concerns.  Most importantly, I didn't try to write my own encryption algorithm (because that would be dumb) or do anything cute, because I knew that I would use GPG to encrypt and sign my password vault.  It was a lot of fun to do, and I [published it to npm], as I was writing mostly JavaScript at the time (I've since [ported it to Go], and it's better, of course).

So, I use [gpg-agent] to [store my passphrase], and I'm happy.  It's not as convenient as LastPass or another browser plugin that can automatically log me in, but somehow I still manage.

## End-to-end File Encryption

I have lots of super secrets on my machine that I don't want anyone else to see.  To be honest, I really don't, but that's not the point of privacy and encryption.  Often what I'll do is tar up files or whole directories and then encrypt that with my key.  I can then store that anywhere I please in the cloud.  For instance, I can push my encrypted password vault to the cloud and then pull that down onto any machine that I want, and everything is in sync.

## Signing

Signing is pretty ubiquitous.  Sometimes I'll sign a file to send to a friend, not just so they know it was from me but that they also know that no bits were fiddled with in transit.  But since this post is limited to how I use GPG every day, I'll limit it to one particular example.

GitHub added the nice feature of [commit signing] with your GPG key.  Here is a snippet from my `.gitconfig` file that shows the pertinent bits:

	[user]
		name = Benjamin Toll
		email = ben@example.com
		signingkey = B331L33T
	[alias]
		br = branch
		# -S = GPG-sign commit.
		ci = commit -S
		ca = commit -S --amend
		...

The `signingkey` key in the `user` clause can be created by issuing:

```
$ git config --global user.signingkey B331L33T
```

If you want signing to occur for all commits, instead of adding the `-S` switch to the (pre-)existing Git command aliases, you could just issue the following command:

```
$ git config --global commit.gpgsign true
```

This will then add it to your global `gitconfig`:

	[commit]
        gpgsign = true

> ## Who Needs GPG Browser Plugins?
>
> Encrypt and paste into web mail:
>
> 		$ cat << eof | gpg -ear ben@example.com | xsel -b
>
> Decrypt:
>
> 		$ cat | gpg -d
>
> Sign and paste into web mail:
>
>		$ cat << eof | gpg --clear-sign | xsel -b

\* I just chortled.

[How would I even know?]: https://www.calyxinstitute.org/projects/canary-watch
[Can it be audited?]: https://www.schneier.com/blog/archives/2015/04/truecrypt_secur.html
[protected by a passphrase]: https://www.ssh.com/ssh/passphrase
[published it to npm]: https://www.npmjs.com/package/stymie
[ported it to Go]: https://github.com/btoll/stymie-go
[gpg-agent]: https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
[store my passphrase]: https://unix.stackexchange.com/a/188813
[commit signing]: https://help.github.com/articles/signing-commits-using-gpg/

