+++
title = "On Creating an Encrypted USB Drive"
date = "2023-09-07T00:58:28-04:00"

+++

This is the unspiritual successor to the article [On Creating a Signing Subkey], which is just magnificent.

Note that this article is only half-baked.  Its purpose is to serve as a `HOWTO`.  If it's not enough information for you, dear reader, there is a whole Internet out there, go explore.

---

- [Formatting](#formatting)
- [Creating](#creating)
- [Mounting](#mounting)
- [Using the Primary Private Key](#using-the-primary-private-key)
- [Unmounting](#unmounting)
- [References](#references)
- [Conclusion](#conclusion)

---

## Formatting

The following is what we want.  The device listed at `/dev/sdb` has two partions, `/dev/sdb1` and `/dev/sdb2`.

```bash
sdb
├─sdb1
└─sdb2
```

`sdb1` will be the first partition on the disk.  It will be the larger of the two partitions, and it will be encrypted with the [`LUKS`] format using the [`cryptsetup`] tool.

The second partition is not encrypted, will hold `README` with `crypt` instructions.

If needed, first install the `cryptsetup` utility:

```bash
$ sudo apt-get install cryptsetup
```

Here are the commands I used in [`fdisk`] to create the partitions:

```bash
$ sudo fdisk /dev/sdb
n -> primary -> 1 -> ENTER (2048) -> +10G
n -> primary -> 2 -> ENTER (some block number) -> ENTER (some block number)
p
Disk /dev/sdb: 14.9 GiB, 16000221184 bytes, 31250432 sectors
Disk model: USB 2.0 FD
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x00000000

Device     Boot    Start      End  Sectors  Size Id Type
/dev/sdb1           2048 20973567 20971520   10G 83 Linux
/dev/sdb2       20973568 31250431 10276864  4.9G 83 Linux
w
```

## Creating

```bash
$ sudo cryptsetup luksFormat --type=luks2 /dev/sdb1
$ sudo cryptsetup open /dev/sdb1 encrypted
$ sudo mkfs.ext4 /dev/mapper/encrypted
```

> The old way of formatting the drive was much more verbose:
>
> ```bash
> $ sudo cryptsetup -c aes-xts-plain64 --key-size 512 --hash sha512 --time 5000 --use-urandom /dev/sdb1
> ```

Do this for the unencrypted partition:

```bash
$ sudo mkfs.ext4 /dev/sdb2
```

## Mounting

```bash
$ sudo mkdir /media/btoll
$ sudo chown -R btoll: /media/btoll
$ sudo cryptsetup --type luks open /dev/sdb1 encrypted
$ sudo mount -t ext4 /dev/mapper/encrypted /media/btoll
```

## Using the Primary Private Key

```bash
$ gpg --homedir /media/btoll/.gnupg/ -k
```

## Unmounting

```bash
$ sudo umount /media/btoll
$ sudo cryptsetup close encrypted
```

## References

- [Basic Guide To Encrypting Linux Partitions With LUKS](https://linuxconfig.org/basic-guide-to-encrypting-linux-partitions-with-luks)
- [Short cryptsetup/LUKS tutorial](https://www.guyrutenberg.com/2020/08/01/short-cryptsetup-luks-tutorial/)

[On Creating a Signing Subkey]: /2023/09/06/on-creating-a-signing-subkey/
[`LUKS`]: https://en.wikipedia.org/wiki/Linux_Unified_Key_Setup
[`cryptsetup`]: https://www.man7.org/linux/man-pages/man8/cryptsetup.8.html
[`fdisk`]: https://www.man7.org/linux/man-pages/man8/fdisk.8.html

