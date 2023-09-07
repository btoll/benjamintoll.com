+++
title = "On Creating a Signing Subkey"
date = "2023-09-06T19:38:21-04:00"

+++

Today, children, we're going to create a signing subkey of our private `GPG` keypair.  The reason for doing this is to remove your primary private key from the keyring on your laptop.

Why would you want to do this?  Well, the primary private key is the primary proof of your identity online.  If your laptop is compromised in any way and your key is stolen, then your entire online identity is gone, and the thief can impersonate you online.  If you hadn't previously created a revocation certificate and stored it in a separate location, you can't even revoke the key.

However, if you create a signing subkey, you can use it for signing and then safely remove the primary private key from the laptop and store it in your safe place, like [the trust tree].

If, dog forbid, you lose your laptop or it's stolen, you only have to revoke the subkey and then re-upload your key to any keyserver where you had done so previously.  Your identity is still intact.  The damage is (hopefully) minimal, or at least not as catastrophic as it would be had you lost the primary key.

---

- [Creating a Keypair](#creating-a-keypair)
- [Optional Key Operations](#optional-key-operations)
- [Creating a Signing Subkey](#creating-a-signing-subkey)
- [Removing the Primary Signing Key](#removing-the-primary-signing-key)
    + [Legacy Instructions](#legacy-instructions)
- [References](#references)
- [Conclusion](#conclusion)

---

## Creating a Keypair

If needed, create a new key and give it an expiration date of a year.  Most importantly, give it a passphrase.

```bash
$ gpg --full-generate-key --expert
```

The `--expert` option gives more encryption options like `ECC`.  Select 9 for the keypair and then 1 for `Curve 25519`:

```bash
Please select what kind of key you want:
   (1) RSA and RSA (default)
   (2) DSA and Elgamal
   (3) DSA (sign only)
   (4) RSA (sign only)
   (7) DSA (set your own capabilities)
   (8) RSA (set your own capabilities)
   (9) ECC and ECC
  (10) ECC (sign only)
  (11) ECC (set your own capabilities)
  (13) Existing key
  (14) Existing key from card
Your selection? 9
Please select which elliptic curve you want:
   (1) Curve 25519
   (3) NIST P-256
   (4) NIST P-384
   (5) NIST P-521
   (6) Brainpool P-256
   (7) Brainpool P-384
   (8) Brainpool P-512
   (9) secp256k1
Your selection? 1
```

It's suggested by an overwhelming majority of users to set an expiration, which can always be changed later.  I usually go for one year:

```bash
Please specify how long the key should be valid.
         0 = key does not expire
      <n>  = key expires in n days
      <n>w = key expires in n weeks
      <n>m = key expires in n months
      <n>y = key expires in n years
Key is valid for? (0) 1y
Key expires at Fri 06 Sep 2024 12:05:10 AM UTC
```

Complete the rest of the steps and move on to the next section.

## Optional Key Operations

Here are some optional steps to take.

Add a photo, if you like.  I don't like.

```bash
$ gpg --edit-key KEYID
...
gpg> addphoto
...
gpg> save
```

List the algorithms in the order which you'd like to see them used by someone else when encrypting a message to your key.

```bash
$ gpg --edit-key KEYID
...
gpg> setpref ALGORITHMS
...
gpg> save
```

Add another email address.

```bash
$ gpg --edit-key KEYID
...
gpg> adduid
Real name: Benjamin Toll
Email address: benjam72@yahoo.com
Comment:
You selected this USER-ID:
    "Benjamin Toll <benjam72@yahoo.com>"

...
gpg> save
```

Then, if you've added another `UID`, set the primary `UID`.

```bash
$ gpg --edit-key KEYID
...
gpg> list
...
gpg> uid 2
...
gpg> primary
...
gpg> save
```

Now, on to the main event.

## Creating a Signing Subkey

Now that there's a new key, let's go about creating a new signing subkey.

```bash
$ gpg --edit-key KEYID
...
gpg> addkey
Please select what kind of key you want:
   (3) DSA (sign only)
   (4) RSA (sign only)
   (5) Elgamal (encrypt only)
   (6) RSA (encrypt only)
  (14) Existing key from card
Your selection? 4
RSA keys may be between 1024 and 4096 bits long.
What keysize do you want? (3072) 4096
Requested keysize is 4096 bits
Please specify how long the key should be valid.
         0 = key does not expire
      <n>  = key expires in n days
      <n>w = key expires in n weeks
      <n>m = key expires in n months
      <n>y = key expires in n years
Key is valid for? (0) 1y
Key expires at Fri 06 Sep 2024 12:24:32 AM UTC
Is this correct? (y/N)
```

## Removing the Primary Signing Key

In [the next article], we'll learn how to create an encrypted `USB` drive to store the main private keypair offline.

For now, we'll do some hand-waving and pretend that it's already been done.

---

First, copy the entire `.gnupg` directory to the encrypted drive.  This will ensure that the main identity isn't compromised if the laptop is stolen.

```bash
$ cp $HOME/.gnupg /media/btoll
```

> Of course, this assumes that the encrypted `USB` drive has already been mounted at `/media/btoll`.

Next, delete the private primary key from the keyring.  First, get the [keygrip]:

```bash
$ gpg --with-keygrip --list-key KEYID
$ rm $HOME/.gnupg/private-keys-v1.d/KEYGRIP.key
```

> If there's a `$HOME/.gnupg/secring.gpg`, delete it.  This is the legacy keyring, and, if present, it could contain the primary private key.

Now, when listing the primary private key, you should see `sec#` next to the primary private key, which means that it isn't in the keyring.

Congratulations, you're finished.

### Legacy Instructions

This is only for `GnuPG` versions < 2.1.

Export the master key:

```bash
$ gpg --export-secret-keys --armor ben@benjamintoll.com > benjamintoll.com.private.key
$ gpg --export --armor ben@benjamintoll.com > benjamintoll.com.public.key
```

```bash
$ mkdir /tmp/gpg
$ sudo mount -t ramfs -o size=1M ramfs /tmp/gpg
$ sudo chown $(logname):$(logname) /tmp/gpg
$ gpg --export-secret-subkeys ben@benjamintoll.com > /tmp/gpg/subkeys
```

> Creating a `ramfs` will ensure that it only resides in memory and nothing will be swapped to disk.

Delete original signing key and import the signing subkey back into the main keyring.

```bash
$ gpg --delete-secret-key ben@benjamintoll.com
$ gpg --import /tmp/gpg/subkeys
```

Finally, cleanup.

```bash
$ sudo umount /tmp/gpg
$ rmdir /tmp/gpg
```

Donzo.

## Conclusion

Go the unspiritual successor of this fine article, [On Creating an Encrypted USB Drive].

## References

- [Creating a new GPG key](https://keyring.debian.org/creating-key.html)
- [Subkeys](https://wiki.debian.org/Subkeys)
- [Creating the perfect GPG keypair](https://alexcabal.com/creating-the-perfect-gpg-keypair)

[the trust tree]: https://www.youtube.com/watch?v=hV2om9YBADI
[keygrip]: https://gnupg-users.gnupg.narkive.com/q5JtahdV/gpg-agent-what-is-a-keygrip
[the next article]: /2023/09/07/on-creating-an-encrypted-usb-drive/
[On Creating an Encrypted USB Drive]: /2023/09/07/on-creating-an-encrypted-usb-drive/

