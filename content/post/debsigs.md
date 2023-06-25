+++
title = "On debsigs"
date = "2023-06-24T20:55:05-04:00"

+++

Today, we're going to look at another Debian tool that can be used to cryptographically sign the `deb` packages that we create.

Although it uses a `GPG` key to sign the `deb` package, we can't use the `GPG` tool itself to verify the signature.  Instead, we'll use (yet) another Debian tool to verify the specific signature that was created.

> This article could have been included in my last one, [On Creating deb Packages], but it would have made it just too dang long.

---

- [`debsigs`](#debsigs)
- [`debsig-verify`](#debsig-verify)
- [Troubleshooting](#troubleshooting)
- [References](#references)

---

> The following version of `gpg` is installed on my machine and was used for all of the examples in this post:
>
> ```bash
> $ gpg --version
> gpg (GnuPG) 2.2.27
> libgcrypt 1.8.8
> ...
> ```

## `debsigs`

The [`debsigs`] utility is used to process signatures in `deb` packages.  It is an optional layer of security that you can use in addition to other security-minded tools such as `debsign`.

Speaking of `debsign`, it is important to be clear about what `debsigs` is doing.  While the former is adding `gpg` signatures to existing files such as `.changes` and `.buildinfo`, `debsigs` is creating an additional detached signature file and adding it to the `ar` archive, thus modifying the `deb` package itself.

Let's install it:

```bash
$ sudo apt-get install debsigs
```

Here is a simple example.  Readers of [On Creating deb Packages] will recognize the same pattern of specifying the default key as an option to the [`debsigs`] command, although this obviously could be omitted in a lot of cases.

```bash
$ debsigs --sign=origin --default-key=3A1314344B0D9912 asbits_1.0.0_amd64.deb
gpg: using "3A1314344B0D9912" as default secret key for signing
```

Of course, you'd point that to wherever the `deb` package lives.  In my case, I created the package using `debuild` (not shown here), and then went up a level to where that tool had put the new package.

|**Option** |**Description** |
|:---|:---|
|`-c`, `--check`, `--verify` |Invokes [`debsig-verify`] to check the validity of the signature on this package. |
|`--default-key` |Uses a key other than the default for signing the package. |
|`--delete` |Deletes the signature of the specified type from the package. |
|`-k`, `--secret-keyring` |Uses a keyring other than the default for signing the package.  This option is passed along to `GPG` verbatim; see the discussion in the [`gpg`] manpage for information on how to specify the keyring file. |
|`--sign` |Creates a new signature of the type specified in the given file.  The signature will be created using the default key for your `GPG` keyring. |
|`-t`, `-l`, `--list` |Lists the signatures found in the specified file. |
|`-v` |Displays verbose output. |

Here are the most commonly-used signature types:
- `origin`
    + The official signature of the organization which distributes the package, usually the Debian Project or a GNU/Linux distribution derived from it.  This signature may be added automatically.
- `maint`
    + The signature of the maintainer of the Debian package.  This signature should be added by the maintainer before uploading           the package.
- `archive`
    + An automatically-added signature renewed periodically to ensure that a package downloaded from an online archive is indeed the latest version distributed by the organization.

Since the above command specified the `origin` signature type, a `_gpgorigin` signature file will be added to the `deb` package (recall, that the `deb` package is just an [`ar`] archive).  I used the type `origin` because I am the person distributing this particular `deb` package.

> If the signature type was `maint`, the file would be named `_gpgmaint`.  For the `archive` type, the file would be called `_gpgarchive`, and so on.

So, what is this new `_gpgorigin` file?  It contains the `GPG` signature of the contents of the `ar` archive, concatenated together:

- `debian-binary` file
- `control` archive
- `data` archive

> For more detail on the contents of a `deb` package, see my article [On Inspecting deb Packages].

Let's open up the archive and verify that we do indeed have that new file:

```bash
$ ar x asbits_1.0.0_amd64.deb
$ ls
asbits_1.0.0_amd64.deb  control.tar.xz  data.tar.xz  debian-binary  _gpgorigin
```

> Of course, you can list the contents without extracting it with the `t` option:
>
> ```bash
> $ ar t asbits_1.0.0_amd64.deb
> debian-binary
> control.tar.xz
> data.tar.xz
> $
> $ debsigs --sign=origin asbits_1.0.0_amd64.deb
> $
> $ ar t asbits_1.0.0_amd64.deb
> debian-binary
> control.tar.xz
> data.tar.xz
> _gpgorigin
> ```
>
> Here, we've also demonstrated how the [`ar`] archive was modified after the call to `debsigs`.

[Kool Moe Dee].

Notably, attempting to verify the file by itself won't work, because it is a detached signature:

```bash
$ gpg --verify _gpgorigin
gpg: no signed data
gpg: can't hash datafile: No data
```

To properly verify it, you'll need to include the data that was used to create the signature:

```bash
$ gpg --verify _gpgorigin debian-binary control.tar.xz data.tar.xz
gpg: Signature made Sun 25 Jun 2023 04:31:49 AM UTC
gpg:                using RSA key D81CBD13350F3BD123988DC83A1314344B0D9912
gpg: Good signature from "Debian <ben@benjamintoll.com>" [unknown]
gpg: WARNING: This key is not certified with a trusted signature!
gpg:          There is no indication that the signature belongs to the owner.
Primary key fingerprint: 63A2 9DAC 1755 B3BC E744  2C01 1215 7400 2A25 7FDE
     Subkey fingerprint: D81C BD13 350F 3BD1 2398  8DC8 3A13 1434 4B0D 9912
```

> The warning is because the user didn't assign a level of trust to the key, and it can be safely ignored.

Sometimes, you'll realize that you signed with the wrong key.  No problem, just delete the signature by specifying the signature type:

```bash
$ debsigs --delete=origin asbits_1.0.0_amd64.deb
```

You'll probably want to explicitly pick the signing key by using the `--default-key` option when (re-)creating the signature.

> Note that the order of the files is very important.  Since the signature is a concatenation of the three files `debian_binary`, `control.tar.xz` and `data.tar.xz`, they **must be** listed in that order on the command line or you will get a bad signature failure!

The next section will detail how the package user can verify the composite detached signature created by the `debsigs` tool.

## `debsig-verify`

Ok, now for the pain in the ass.

The [`debsig-verify`] tool simply verifies signatures for a Debian format package.  In order to verify the signature that was created and added to the `deb` package by the `debsigs` utility, you'll need to do some setup that's not insignificant.

Because of this, you may choose not to do it.  That's ok.  A mindful package creator will use `debsigs` to provide an additional layer of trust to their package, leaving it up to the user to verify if they want.

This would usually be done in addition to signing the `.changes`, `.buildinfo` and source package (the `.dsc` file) by the `debsign` program.

In sum, it certainly doesn't hurt to create another layer of trust and security by using the `debsigs` tool.  It won't harm or interfere with the downloading and installing of a package either way.

Essentially, there are two steps:
- install the public key that will be used to verify the signature
    + note that the man page states that a keyring should be created, but I found the verification only worked with the public key
- create a policy file definition

For the following steps, you can ust this pipeline to get the key ID, which you could stuff into a variable:

```
$ gpg --list-secret-keys --keyid-format long | grep "\[S\]" | sed -n 's/.*rsa[0-9]*\/\([A-Z0-9]*\).*/\1/p'
```

The first thing we'll do is create a subdirectory in which we'll create a new keyring in the `/usr/share/debsig/keyrings/` directory, whose name is the key ID (long format) of the public key used to verify the signature:

```bash
$ sudo mkdir /usr/share/debsig/keyrings/3A1314344B0D9912
```

Then, copy the public key into it.  The name you give it doesn't matter, but it does need to match the name you give it in the policy that you'll create next.

Here, we just name it `debsig.gpg`:

```bash
$ sudo /vagrant/public.key /usr/share/debsig/keyrings/3A1314344B0D9912/debsig.gpg
$
$ ls /usr/share/debsig/keyrings/3A1314344B0D9912
debsig.gpg
```

> Make sure that you are the keyring owner (or that you're in the owner group) and that the proper permissions are set on the keyring.

We'll now set up a policy in `XML`.  Create a new subdirectory in the `/etc/debsig/policies/` directory that is the same name as the one you just created for the new keyring, i.e., the key ID (fingerprint) of the public key used to verify the signature:

```bash
$ sudo mkdir -p /etc/debsig/policies/3A1314344B0D9912/
```

Next, the `XML` policy itself.  The one I'll use here is very simple.  The only requirement is that it has a `.pol` extension, so I've named it `sign.pol`:

`sign.pol`

```xml
<?xml version="1.0"?>
<!DOCTYPE Policy SYSTEM "https://www.debian.org/debsig/1.0/policy.dtd">
<Policy xmlns="https://www.debian.org/debsig/1.0/">
  <Origin Name="asbits" id="3A1314344B0D9912" Description="asbits package"/>

  <Selection>
    <Required Type="origin" File="debsig.gpg" id="3A1314344B0D9912"/>
  </Selection>

   <Verification MinOptional="0">
    <Required Type="origin" File="debsig.gpg" id="3A1314344B0D9912"/>
   </Verification>
</Policy>

```

Here are some brief descriptions of the `XML` policy definition tags.  See the man page for detailed information.

|**Tag** |**Description** |
|:---|:---|
|`Origin` |Information about the origin of this policy. |
|`Selection` |Rules used to decide if this policy is pertinent to this `deb`'s verification. |
|`Verification` |Rules that are used to actually verify the `deb`. |

Here are the steps of the verification process performed by `debsig-verify`.  The following is copied directly from the man page:

1. The policy files will reference keyrings by a filename. These keyrings will be looked for in a subdirectory  of the keyring directory.  The  subdirectory has the same name as the policy subdirectory (previously determined by the `Origin's Public Key ID`).

1. The program will, after first parsing the entire file, check the `Origin ID` against the `Public Key ID` of the origin signature in the `deb`.  If these match (which they should, else something is really wrong), then it will proceed to the `Selection` rules.

1. The `Selection` rules decide whether this policy is suitable for verifying this `deb`.  If these rules fail, then the program will proceed to the next policy.  If it passes, then the program commits to using this policy for verification, and no other policies will be referenced.

1. The last verification step relies on the `Verification` rules. These are similar in format to the `Selection rules, but are usually more constrained.  If these rules fail, the program exits with a non-zero status.  If they pass, then it exits with a zero status.

Again, I found this only worked by copying over the public key into the `/usr/share/debsig/keyrings/3A1314344B0D9912` directory, **not** by creating a new keyring and importing the public key into it.

> For detailed information on the policy file, see `/usr/share/doc/debsig-verify/policy-syntax.txt` and the examples in `/usr/share/doc/debsig-verify/examples`.

Let's verify it, boss:

```bash
$ debsig-verify asbits_1.0.0_amd64.deb
debsig: Verified package from 'asbits package' (asbits)
```

Whoa, it worked.

Just kidding, of course it would.

If you want the low-level [`dpkg`] tool to also verify the signatures when installing a `deb` package, you'll need to enable it to do so in the `/etc/dpkg/dpkg.cfg` file:

```bash
$ cat /etc/dpkg/dpkg.cfg
# dpkg configuration file
#
# This file can contain default options for dpkg.  All command-line
# options are allowed.  Values can be specified by putting them after
# the option, separated by whitespace and/or an `=' sign.
#

# Do not enable debsig-verify by default; since the distribution is not using
# embedded signatures, debsig-verify would reject all packages.
no-debsig

# Log status changes and actions to a file.
log /var/log/dpkg.log
```

Just comment-out the line `no-debsig`.  There's no need to restart anything.

When you install a package, [`dpkg`] will try to verify the detached signature:

```bash
$ sudo dpkg -i asbits_1.0.0_amd64.deb
Authenticating asbits_1.0.0_amd64.deb ...
passed
Selecting previously unselected package asbits.
(Reading database ... 41028 files and directories currently installed.)
Preparing to unpack asbits_1.0.0_amd64.deb ...
Unpacking asbits (1.0.0) ...
Setting up asbits (1.0.0) ...
```

The problem with enabling the verification of `debsig` on installation of `deb` packages is that it will check for everything that is installed.  This, of course, also means packaged installed with `apt-get`, since it uses the lower-level `dpkg` tool beneath the covers.

Observe:

```bash
$ sudo apt-get install dstat
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following NEW packages will be installed:
  dstat
0 upgraded, 1 newly installed, 0 to remove and 6 not upgraded.
Need to get 65.6 kB of archives.
After this operation, 474 kB of additional disk space will be used.
Get:1 https://deb.debian.org/debian bullseye/main amd64 dstat all 0.7.4-6.1 [65.6 kB]
Fetched 65.6 kB in 0s (232 kB/s)
Authenticating /var/cache/apt/archives/dstat_0.7.4-6.1_all.deb ...
debsig: Origin Signature check failed. This deb might not be signed.

dpkg: error processing archive /var/cache/apt/archives/dstat_0.7.4-6.1_all.deb (--unpack):
 verification on package /var/cache/apt/archives/dstat_0.7.4-6.1_all.deb failed!
Errors were encountered while processing:
 /var/cache/apt/archives/dstat_0.7.4-6.1_all.deb
E: Sub-process /usr/bin/dpkg returned an error code (1)
```

Oh no.

It may be possible to limit the verification to certain packages that can be controlled with one or more `XML` policies, but honestly, I don't know, and I didn't look into it.

So, if you're wanting to use `debsig-verify` to verify the signatures of signed `deb` packages, you'll want to bear this in mind.

## Troubleshooting

Here are several errors that I encountered when playing around with these tools.  They are in no particular order.  Hopefully, they will be helpful to someone (most likely me).

---

When listing the signature, you may get this error:

```bash
$ debsigs --list asbits_1.0.0_amd64.deb
GPG signatures in asbits_1.0.0_amd64.deb:
bad gpg line at /usr/share/perl5/Debian/debsigs/gpg.pm line 39, <GEN6> line 1.
```

This appears to be a bug, because it still signed the package:

```bash
$ debsig-verify asbits_1.0.0_amd64.deb
debsig: Verified package from 'asbits package' (asbits)
```

---

This error means that the package hasn't been signed yet:

```bash
$ debsig-verify asbits_1.0.0_amd64.deb
debsig: Origin Signature check failed. This deb might not be signed.
```

---

If you signed with the wrong key, i.e., **not** the key whose key ID is a subdirectory in `/etc/debsig/policies/`, you will get a warning similar to the following when verifying:

```bash
$ debsig-verify asbits_1.0.0_amd64.deb
debsig: Could not open Origin directory /etc/debsig/policies/DEADBEEFBEEFDEAD: No such file or directory
```

---

The following error means that `gpg` isn't able to raise the pinentry program to ask for your passphrase because it's not aware of a [`tty`]:

```bash
$ debsigs --sign=origin --default-key=3A1314344B0D9912 asbits_1.0.0_amd64.deb
gpg: using "3A1314344B0D9912" as default secret key for signing
gpg: signing failed: Inappropriate ioctl for device
gpg: signing failed: Inappropriate ioctl for device
Program gpg (19888) failed with code 512 (exit 2) at /usr/share/perl5/Debian/debsigs/forktools.pm line 120.
```

Set the `GPG_TTY` variable and try again.  This will raise the pinentry box and allow you to enter your passphrase:

```bash
$ export GPG_TTY=$(tty)
```

---

Getting following error:

```bash
$ debsig-verify asbits_1.0.0_amd64.deb
debsig: No applicable policy found.
$
$ ls -l /usr/share/debsig/keyrings/3A1314344B0D9912/
total 12
-rw-r--r-- 1 root root 4180 Jun  5 08:46 debsig.gpg
$ ls -l /etc/debsig/policies/3A1314344B0D9912/
total 4
-rw-r--r-- 1 root root 459 Jun  5 09:37 asbits.pol
```

---

You're getting a bad signature failure when trying to verify with `gpg`, but you're sure that you used the correct signing key:

```bash
$ gpg --verify _gpgorigin control.tar.xz data.tar.xz debian-binary
gpg: Signature made Sun 25 Jun 2023 06:07:17 PM UTC
gpg:                using RSA key D81CBD13350F3BD123988DC83A1314344B0D9912
gpg: BAD signature from "Debian <ben@benjamintoll.com>" [unknown]
```

Note that the order of the files is very important.  Since the signature is a concatenation of the three files `debian_binary`, `control.tar.xz` and `data.tar.xz`, they **must be** listed in that order on the command line or you will get a bad signature failure!

## References

- [On Creating deb Packages]
- [On Inspecting deb Packages]
- [On gpg-agent Forwarding](/2023/06/07/on-gpg-agent-forwarding/)
- [HOWTO: GPG sign and verify deb packages and APT repositories](https://blog.packagecloud.io/how-to-gpg-sign-and-verify-deb-packages-and-apt-repositories/)
- [debgsig-verify fails with gpg: no valid OpenPGP data found while gpg decrypt can verify the detached signature](https://stackoverflow.com/a/55950788)

[`debsigs`]: https://manpages.debian.org/unstable/debsigs/debsigs.1p.en.html
[`debsig-verify`]: https://manpages.debian.org/unstable/debsig-verify/debsig-verify.1.en.html
[On Creating deb Packages]: /2023/06/21/on-creating-deb-packages/
[`gpg`]: https://www.gnupg.org/documentation/manuals/gnupg24/gpg.1.html
[On Inspecting deb Packages]: /2023/06/01/on-inspecting-deb-packages/
[`tty`]: https://man7.org/linux/man-pages/man4/tty.4.html
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[`ar`]: https://man7.org/linux/man-pages/man1/ar.1.html
[`dpkg`]: https://man7.org/linux/man-pages/man1/dpkg.1.html

