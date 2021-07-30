+++
title = "On YubiKey and OTP"
date = "2021-07-21T16:14:59-04:00"

+++

A [one-time password] (OTP) is a password that is only valid once.  It can be used as an additional factor in [multi-factor authentication] and can be delivered in many ways, often via SMS.  For example, you'd login with a username and password as usual, but then you'd be texted a time-sensitive one-time password to provide to the service before you're authenticated.

Sometimes, OTP is used by itself.  They are a great improvement over a simple password, owing to their use of (pseudo-) randomness, cryptographic hash functions and invulnerability to [replay attacks].

In this post, I'm going to address only a single use of [YubiKey], a hardware authentication device from [Yubico]; its one-time password implementation.  I'll (very) briefly address the following:

- [Yubico OTP](#yubico-otp)
- [General YubiKey Questions](#general-yubikey-questions)
- [Parsing the OTP for Fun](#parsing-the-otp-for-fun)

---

# Yubico OTP

So, what does a Yubico one-time password look like?  Here's an example:

<pre class="math">
<b>cccjgjgkhcbb</b>irdrfdnlnghhfgrtnnlgedjlftrbdeut
</pre>

The first part in bold is the public id of the YubiKey itself, and it never changes.  This can be viewed as the "username", and since it is embedded in the OTP it doesn't need to be transmitted on its own.  That's nice.  It's one of the advantages of using an OTP.

The remaining characters make up the bits of the unique one-time password which is generated using the following information:

- Private ID (6 bytes)
- Usage Counter (2 bytes)
- Timestamp (3 bytes)
- Session Usage Counter (1 bytes)
- Random number (2 bytes)
- Checksum (2 bytes)

The hardware token acts like a keyboard and outputs the OTP as a 44-character string that is then verified by [YubiCloud] Yubico's web service (or a custom authentication server for when users [want their own auth server]).

It's really that simple: you place your cursor in a text box, touch the Yubikey, and, like magic, the one-time password character string is outputted from the device into the text box.  All the identifying information and proof of ownership is transmitted in that mighty string.  Of course, [the server has to implement the functionality] to then take this string and authenticate it, but that's beyond the scope of this introductory post.

# General YubiKey Questions

I had several questions concerning YubiKeys and their use.  Here are some.

---

### How is the OTP validated?

I understood that Yubico uses 128-bit [AES] symmetric keys to encrypt the OTP in the device and decrypt in the YubiCloud, but I didn't understand how the verification server had access to the key.  Well, it turns out that the symmetric key is loaded onto the token at the factory and is located in slot 1.

Interestingly, the factory-generated OTP credentials begin with the `cc` modhex (modified hexadecimal) encoding scheme prefix.  You can see an example of that above (note that the prefix starts the public id portion of the one-time password).

It is possible to delete this and/or create new credentials, and in a bit we'll see an example of the latter.  When doing so, the user-generated OTP credentials begin with the `vv` prefix.

Either way, the authentication, either Yubicloud or another, will use the same AES symmetric key to decrypt the encrypted OTP and then verify the one-time password using the checksum.

The counters are used to guard against a replay attack.  In other words, the OTP is immediately rejected if the counter values in the one-time password are less than the counter values on the authenticating server.

The image below is taken from the Yubico documentation:

![OTP Details](/images/otp_details.png)

---

### Is there a command line tool?

Thankfully, yes.  On Ubuntu systems, install the following tool:

```
$ sudo apt install -y yubikey-manager
```

> From what I've read, the `yubikey-manager` package has since supplanted the `yubikey-personalization-gui` package which contains the personalization tool, which has been (or will) be deprecated.  In any case, the latter is no longer being actively developed, which is not a good sign.

If you're like me and you reasonably expected the package to install a `yubikey-manager` binary, it doesn't.  Instead, it installs the `ykman` binary:

```
$ dpkg -L yubikey-manager
/.
/usr
/usr/bin
/usr/bin/ykman
[snipped for brevity]
$
$ ykman -v
YubiKey Manager (ykman) version: 3.1.1
Libraries:
   libykpers 1.19.0
   libusb 1.0.23
```

---

### How can I interact with my YubiKey from the command line?

To list all connected YubiKeys:

```
$ ykman list --serials
10358814
```

To manage the connection modes:

```
$ ykman mode
Current connection mode is: OTP+FIDO+CCID
Supported USB interfaces are: OTP, FIDO, CCID
```

To inspect the device:

```
$ ykman info
Device type: YubiKey 5 NFC
Serial number: 10358814
Firmware version: 5.1.2
Form factor: Keychain (USB-A)
Enabled USB interfaces: OTP+FIDO+CCID
NFC interface is enabled.

Applications    USB     NFC
OTP             Enabled Enabled
FIDO U2F        Enabled Enabled
OpenPGP         Enabled Enabled
PIV             Enabled Enabled
OATH            Enabled Enabled
FIDO2           Enabled Enabled
```

> A synonym would be:
>
>       $ ykman --device $(ykman list --serials) info
>

Check the status of the slots:

```
$ ykman otp info
Slot 1: programmed
Slot 2: empty
```

[Visit the docs] for all OTP commands and examples.

---

### How can I read the information already programmed into the slots on my YubiKey?

You can't.

---

### How can I program the second slot?

To program the second slot for OTP, we want to use the `yubiotp` subcommand.  View its help menu:

```
$ ykman otp yubiotp -h
Usage: ykman otp yubiotp [OPTIONS] [1|2]

 Program a Yubico OTP credential.

Options:
 -P, --public-id MODHEX     Public identifier prefix.
 -p, --private-id HEX       6 byte private identifier.
 -k, --key HEX              16 byte secret key.
 --no-enter                 Don't send an Enter keystroke after emitting the OTP.
 -S, --serial-public-id     Use YubiKey serial number as public ID. Conflicts with --public-id.
 -g, --generate-private-id  Generate a random private ID. Conflicts with --private-id.
 -G, --generate-key         Generate a random secret key. Conflicts with --key.
 -u, --upload               Upload credential to YubiCloud (opens in browser). Conflicts with --force.
 -f, --force                Confirm the action without prompting.
 -h, --help                 Show this message and exit.
```

To make it as easy as possible for this demo, we'll set the following flags to auto-generate the credentials instead of setting them manually:

- `--serial-public-id`
- `--generate-private-id`
- `--generate-key`

```
$ ykman otp yubiotp 2 --serial-public-id --generate-private-id --generate-key
Using YubiKey serial as public ID: vvcccckubcbu
Using a randomly generated private ID: 43c91024f0d1
Using a randomly generated secret key: a9ac6ee995ac33deb61166cf13c34648
Upload credential to YubiCloud? [y/N]: y
Upload to YubiCloud initiated successfully.
Program an OTP credential in slot 2? [y/N]: y
Opening upload form in browser: https://upload.yubico.com/proceed/019b6220-18e9-48b8-b7e7-5e8a1672c848
```

> Setting the `--upload` flag wouldn't have prompted us to upload in the example above.

Verify that the second slot has indeed been programmed:

```
$ ykman otp info
Slot 1: programmed
Slot 2: programmed
```

---

### How can I delete and upload new credentials from a slot?

Deleting is easy.  Here we're deleting the contents we just added in the previous question:

```
$ ykman otp delete 2
Do you really want to delete the configuration of slot 2? [y/N]: y
Deleting the configuration of slot 2...
```

However, if intending to upload it to YubiCloud, we'll have to create another public id.  Unfortunately, you can't delete a public id from Yubicloud.  No big deal, we'll just create the new credentials without the `--serial-public-id` flag which will force us to enter a new one:

```
$ ykman otp yubiotp 2 --generate-private-id --generate-key
Enter public ID: vvcccckubcbb
Using a randomly generated private ID: 1aa8db0e8853
Using a randomly generated secret key: 99a35e0fb81a1ded6e44112517ff2257
Upload credential to YubiCloud? [y/N]: y
Upload to YubiCloud initiated successfully.
Program an OTP credential in slot 2? [y/N]: y
```

# Parsing the OTP for Fun

> The following idea and C code is influenced and inspired by [What does this button do? Demystifying the Yubikey!].

`yubikey.c`

<pre class="math">
#include &lt;stdio.h&gt;

#define LEN_YK 45
#define LEN_ID 13
#define LEN_OTP 33

struct YK {
   char key[LEN_YK];
   char id[LEN_ID];
   char otp[LEN_OTP];
};

void get_yk(struct YK *yk) {
   printf("Touch YubiKey: ");
   scanf("%s", yk->key);

   int i;
   for (i = 0; i < LEN_ID - 1; i++) {  // Subtract 1 to not include null char.
       yk->id[i] = yk->key[i];
   }
   yk->id[i] = '\0';

   int j;
   for (j = 0; yk->key[i] != '\0';) {
       yk->otp[j++] = yk->key[i++];
   }
   yk->otp[j] = '\0';
}

int main() {
   struct YK yk;
   get_yk(&yk);

   printf("\nYubiKey encoded string %s\n", yk.key);
   printf("YubiKey id %s\n", yk.id);
   printf("YubiKey OTP private id %s\n", yk.otp);

   return 0;
}
</pre>

```
$ gcc -o yubikey yubikey.c
$ ./yubikey
Touch YubiKey: vvbbbbbbbbbbkjdkhrjvfefkccceghkdbevnherdkcnr
YubiKey encoded string vvbbbbbbbbbbkjdkhrjvfefkccceghkdbevnherdkcnr
YubiKey id vvbbbbbbbbbb
YubiKey OTP kjdkhrjvfefkccceghkdbevnherdkcnr
~/yubikey:$ python yubikey.py
```

> A logical next step would be to parse the OTP string into its respective parts (see the [OTP generation algorithm](#yubico-otp) above).  This could be gathered using another struct.

---

Here's the same program written in Python:

`yubikey.py`

<pre class="math">
def yubikey():
    id_length = 12
    yubikey = input("Touch YubiKey: ")

    print("YubiKey encoded string", yubikey)
    print("YubiKey ID", yubikey[:id_length])
    print("YubiKey OTP", yubikey[id_length:])


if __name__ == "__main__":
    yubikey()
</pre>

```
$ python yubikey.py
Touch YubiKey: vvbbbbbbbbbbnbffgebhcgkrbdjblvgvicvkjrbigvit
YubiKey encoded string vvbbbbbbbbbbnbffgebhcgkrbdjblvgvicvkjrbigvit
YubiKey ID vvbbbbbbbbbb
YubiKey OTP nbffgebhcgkrbdjblvgvicvkjrbigvit
```

> Clearly, the Python program is a lot easier to implement.  However, you don't learn anything about memory management by using these high-level interpreted languages.

# References

- [ArchLinux YubiKey Docs](https://wiki.archlinux.org/title/YubiKey#One-time_password) ( As usual, the Arch docs are superb. )
- [Installing Yubico Software on Linux](https://support.yubico.com/hc/en-us/articles/360016649039-Enabling-the-Yubico-PPA-on-Ubuntu)
- [Modhex Converter](https://developers.yubico.com/OTP/Modhex_Converter.html)
- [OTP Commands](https://docs.yubico.com/software/yubikey/tools/ykman/OTP_Commands.html)
- [Resetting the OTP Applet on the YubiKey](https://support.yubico.com/hc/en-us/articles/360013647680-Resetting-the-OTP-Applet-on-the-YubiKey)
- [What does this button do? Demystifying the Yubikey!](https://www.youtube.com/watch?v=P77V34_m5CM)
- [What is Yubico OTP?](https://developers.yubico.com/OTP/)
- [YubiKey Static Password Function (White Paper)](https://resources.yubico.com/53ZDUYE6/as/9hccqgx9bwwqq96mhkk8jb4h/Static_Password_Function.pdf)

[one-time password]: https://en.wikipedia.org/wiki/One-time_password
[YubiKey]: https://en.wikipedia.org/wiki/YubiKey
[Yubico]: https://www.yubico.com/
[multi-factor authentication]: https://en.wikipedia.org/wiki/Multi-factor_authentication
[replay attacks]: https://en.wikipedia.org/wiki/Replay_attack
[Yubico OTP]: https://developers.yubico.com/OTP/OTPs_Explained.html
[YubiCloud]: https://www.yubico.com/products/yubicloud/
[want their own auth server]: https://developers.yubico.com/Software_Projects/Yubico_OTP/YubiCloud_Validation_Servers/
[the server has to implement the functionality]: https://developers.yubico.com/OTP/Libraries/
[AES]: https://en.wikipedia.org/wiki/Advanced_Encryption_Standard
[Visit the docs]: https://docs.yubico.com/software/yubikey/tools/ykman/OTP_Commands.html
[What does this button do? Demystifying the Yubikey!]: https://www.youtube.com/watch?v=P77V34_m5CM

