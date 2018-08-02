+++
title = "On OpenSSL"
date = "2018-07-17T12:07:56-04:00"

+++

[OpenSSL] is a crypto toolkit that has been around for thousands of years.  Its first documented use was by Julius Caesar during the [Gallic Wars] when he developed his [shift cipher].

This post is basically a cheat sheet, and it only covers a smattering of what is available.

Note that unless a filename is specified, these commands are interactive.  Send `EOF` to the program (`Ctrl-D`) when done typing the message.

What version am I using?

	~:$ openssl version
	OpenSSL 1.1.0f  25 May 2017

Help!

	~:$ openssl help

# Encoding/Encrypting
>
> ### Base64
>
> 	Encode from `stdin`:
>
> 		~:$ openssl enc -base64
> 		foo
> 		Zm9vCg==
>
> 	Decode from `stdin`:
>
> 		~:$ openssl enc -base64 -d
> 		Zm9vCg==
> 		foo
>
> ### AES
>
> 	Encrypt a file to `encrypted.bin`:
>
> 		~:$ openssl enc -aes-256-cbc -out encrypted.bin
> 		enter aes-256-cbc encryption password:
> 		Verifying - enter aes-256-cbc encryption password:
> 		hello, world!
>
> 	Decrypt the file `encrypted.bin`:
>
> 		~:$ openssl enc -aes-256-cbc -d -in encrypted.bin
> 		enter aes-256-cbc decryption password:
> 		hello world!

# Hashing
>
> Useful for verifying downloads!
>
> ### MD5
>
> 		~:$ echo foo > derp.txt
> 		~:$ openssl dgst -md5 derp.txt
> 		MD5(derp.txt)= d3b07384d113edec49eaa6238ad5ff00
>
> 		# Change the file to calculate a different hash!
> 		~:$ echo >> derp.txt
> 		~:$ openssl dgst -md5 derp.txt
> 		MD5(derp.txt)= dbb53f3699703c028483658773628452
>
> ### SHA256
>
> 		~:$ echo foo > derp.txt
> 		~:$ openssl dgst -sha256 derp.txt
> 		SHA256(derp.txt)= b5bb9d8014a0f9b1d61e21e796d78dccdf1352f23cd32812f4850b878ae4944c
>
> 		# Change the file to calculate a different hash!
> 		~:$ echo >> derp.txt
> 		~:$ openssl dgst -sha256 derp.txt
> 		SHA256(derp.txt)= 37ea8ddde63ad9042aa7f5099db7acd2a880ae3012870c29060d4b12bf2dc2e2
>
> ### Hashing Lengths
>
>		~:$ openssl dgst -md5
>		foo
>		(stdin)= d3b07384d113edec49eaa6238ad5ff00
>		~:$ openssl dgst -sha1
>		foo
>		(stdin)= f1d2d2f924e986ac86fdf7b36c94bcdf32beec15
>		~:$ openssl dgst -sha256
>		foo
>		(stdin)= b5bb9d8014a0f9b1d61e21e796d78dccdf1352f23cd32812f4850b878ae4944c
>		~:$ openssl dgst -sha512
>		foo
>		(stdin)= 0cf9180a764aba863a67b6d72f0918bc131c6772642cb2dce5a34f0a702f9470ddc2bf125c12198b1995c233c34b4afd346c54a2334c350a948a51b6e8b4e6b6
>
> ### Benchmarking
>
> To see how many checksums the computer can calculate, run the following for a particular algorithm (depends on CPU architecture, length of input, etc.):
>
>		openssl speed sha
>		openssl speed blowfish
>		etc.

# Public Key Cryptography
>
> ### [RSA]
>
>	Generate a key pair:
>
> 		~:$ openssl genrsa -out key.pem 1024
> 		Generating RSA private key, 2048 bit long modulus
> 		.........+++
> 		....................+++
> 		e is 65537 (0x010001)
>
>	Encrypt the private key (this example uses [Triple DES], use whatever you want):
>
>		~:$ openssl rsa -in key.pem -des3 -out enc-key.pem
>		writing RSA key
>		Enter PEM pass phrase:
>		Verifying - Enter PEM pass phrase:
>
>	Extract the public key from the key pair:
>
>		~:$ openssl rsa -in key.pem -pubout -out pub-key.pem
>		writing RSA key
>
>	Encrypt a file:
>
>		# This uses the key pair.
>		~:$ openssl rsautl -encrypt -inkey key.pem -in data.txt -out encrypted.bin
>
>		# This uses the public key (note the extra flag `-pubin`).
>		~:$ openssl rsautl -encrypt -pubin -inkey pub-key.pem -in data.txt -out encrypted.bin
>
>	> Note that the file to encrypt **must** be less than the block size, minus some extra bits used by the implementation.  In our example, this is 1024 bits (the block size will be the same as what was specified as the key length).  You will get an error if the file is larger than the block size.
>
>	> OpenSSL is a low-level tool, and does not slice up your text into block sizes.  This functionality is left to anything that implements the library.
>
>	Decrypt a file:
>
>		# This uses the encrypted private key.
>		~:$ openssl rsautl -decrypt -inkey enc-key.pem -in encrypted.bin -out decrypted.txt
>		Enter pass phrase for enc-key.pem:
>
>	> You can use the key pair to decrypt, but it won't prompt you for a passphrase, as it's not encrypted.  Use the private key!
>
>	Digitally sign a file (two different methods):
>
>	1. **Hash a digest of the file and sign that.**
>
>			# Create the hash.
>			~:$ openssl dgst -sha1 -out foo.dgst foo.txt
>
>			# Sign the hash.
>			~:$ openssl rsautl -sign -in foo.dgst -out foo.sig -inkey enc-key.pem
>			Enter pass phrase for enc-key.pem:
>
>	2. **Sign the file itself.**
>
>			~:$ openssl rsautl -sign -in foo.txt -out foo.sig -inkey enc-key.pem
>			Enter pass phrase for enc-key.pem:
>
>	> Again, you can use the key pair to sign, but it won't prompt you for a passphrase, as it's not encrypted.  Use the private key!
>
>	Verify the signature:
>
>		~:$ openssl rsautl -verify -pubin -inkey pub-key.pem -in foo.sig -out verified.dgst
>
>	> You'd then want to verify the hash if you signed using the first method above.
>
>	Get the fingerprint of a public key:
>
>		ssh-keygen -lf <(ssh-keygen -yf private_key)
>
>	> Note that this method avoids having to create a temporary file by using [process substitution].

# Fun
>
>	Using the key pair that we generated earlier, let's look at the bits that make up the algorithm (the ellipsis notes where the values were truncated).
>
> 		~:$ openssl rsa -in key.pem -text -noout
> 		Private-Key: (2048 bit)
> 		modulus:
>		    00:c0:cd:8b:5b:a0:23:43:09:36:fa:e4:af:98:61:
> 		    ...
> 		publicExponent: 65537 (0x10001)
> 		privateExponent:
>		    21:76:cb:9c:60:a4:1e:2b:88:46:6d:d0:e8:82:d9:
> 		    ...
> 		prime1:
>		    00:e8:5c:64:aa:74:ae:fb:f9:af:e0:46:e5:82:1c:
> 		    ...
> 		prime2:
>		    00:d4:6a:e7:13:2f:a2:d4:a9:b6:d3:9c:74:d9:f9:
> 		    ...
> 		exponent1:
>		    15:af:29:a5:ce:a5:d5:d6:03:57:c6:c5:fc:52:6c:
> 		    ...
> 		exponent2:
>		    00:c9:ad:f6:57:b1:12:d8:f7:8a:2e:c0:8d:f1:a7:
> 		    ...
> 		coefficient:
>		    00:d6:9d:0a:5a:fe:9c:43:82:55:45:37:33:e8:5b:
> 		    ...
>
>	This should make sense to those familiar with the [RSA algorithm].
>
>	What number did OpenSSL generate for the modulus?:
>
>		~:$ openssl rsa -in key.pem -modulus -noout
>		Modulus=C0CD8B5BA023430936FAE4AF986118F86FD94B40FBFE7F2A57964EDD868F7BFD1351004B056719CFC470F26276570B32D247324F789990EA6CFC24061E377D4B6E6E4C899D0F5703B060EFCFEB9B8B7AEFBFD2ECBE7B75624DD7F9CBD203768B38E8938815D5641F50527D8DACB5F1C695A23DD3B998DE5511A706463D760C13
>
>	Let's use our trusted friend `bc` to see what that number is in base 10!
>
>		~:$ echo "ibase=16; $(openssl rsa -in key.pem -modulus -noout | cut -c9-)" | bc
>		13539080606374968594676933696507556339553096890269217679724886472005\
>		08050903637135355760972124160959413478394879173567838846759891805917\
>		63282125770151505099501724487223049295609224541565594269213996582665\
>		80150446659470901019777012489546440470891737027535564768871198696466\
>		9536045975880720502650715976238500883
>
> 	Wow, try factoring out those primes with pencil and paper!
>
>	Now that we have our two primes, let's see if the product is our modulus!  We'll have to crack open our Unix tool kit to parse the output of OpenSSL.
>
>	1. **Get the two primes.**
>
>			# Set the first prime as a shell variable.
>			PRIME1=$(openssl rsa -in key.pem -text -noout |
>			sed -n '/^prime/,/^prime/{/^prime/!p}' |
>			xargs echo |
>			xargs -I % echo "'" % "'.replace(/[\s:]/g, '').replace(/([a-f])/g, (a, b) => b.toUpperCase())" |
>			node -p)
>
>			# Set the second prime as a shell variable.
>			PRIME2=$(openssl rsa -in key.pem -text -noout |
>			sed -n '/^prime2/,/^exponent1/{/^prime2/!{/^exponent1/!p}}' |
>			xargs echo |
>			xargs -I % echo "'" % "'.replace(/[\s:]/g, '').replace(/([a-f])/g, (a, b) => b.toUpperCase())" |
>			node -p)
>
>		Explanation of the (second) `sed` command:
>
>		- `/^prime2/,/^exponent1/` will match all the text between lines starting with `prime2` and `exponent1`, inclusive.
>		- `/^prime2/!` means execute the following command if start of line is not `prime2`.
>		- `/^exponent1/!` means execute the following command if start of line is not `exponent1`.
>		- `p` means print (the command to execute).
>
>		> > Note that this `sed` command won't work on Mac.  The BSD command line tools are different from the GNU/Linux ones in subtle ways, so you'll need to use the [gsed] binary instead (or not, it depends on the presence of the install flag `--with-default-names`).
>
>		> > ( You may need to add semicolons before the closing brackets, but I have not been able to test this. )
>
>	2. **Calculate the product of our two primes:**
>
>			~:$ echo "ibase=16; $PRIME1 * $PRIME2" | bc
>			13539080606374968594676933696507556339553096890269217679724886472005\
>			08050903637135355760972124160959413478394879173567838846759891805917\
>			63282125770151505099501724487223049295609224541565594269213996582665\
>			80150446659470901019777012489546440470891737027535564768871198696466\
>			9536045975880720502650715976238500883
>
>	Since the primes are in hex format, we must specify `ibase=16`.
>
>	That looks sneakily like the modulus that `openssl` reported in a prior command.
>
>		~:$ echo "ibase=16; $(openssl rsa -in key.pem -modulus -noout | cut -c9-) == $PRIME1 * $PRIME2" | bc
>		1
>
>	It is!  So what does that prove?  *Math*!  Weeeeeeeeeeeeeeeeeee.

Here's a [free book] promoted by OpenSSL.

# References

- [An Introduction to the OpenSSL Command Line Tool]
- [Wikipedia article on OpenSSL]

[OpenSSL]: https://www.openssl.org/
[Gallic Wars]: https://en.wikipedia.org/wiki/Gallic_Wars
[shift cipher]: https://en.wikipedia.org/wiki/Caesar_cipher
[RSA]: /2018/07/09/on-rsa/
[Triple DES]: https://en.wikipedia.org/wiki/Triple_DES
[process substitution]: http://www.tldp.org/LDP/abs/html/process-sub.html
[RSA algorithm]: /2018/07/09/on-rsa/
[gsed]: https://www.topbug.net/blog/2013/04/14/install-and-use-gnu-command-line-tools-in-mac-os-x/
[free book]: https://www.feistyduck.com/books/openssl-cookbook/
[An Introduction to the OpenSSL Command Line Tool]: https://users.dcc.uchile.cl/~pcamacho/tutorial/crypto/openssl/openssl_intro.html
[Wikipedia article on OpenSSL]: https://en.wikipedia.org/wiki/OpenSSL

