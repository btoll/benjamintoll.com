+++
title = "On fallocate"
date = "2021-07-30T15:49:40-04:00"

+++

The [`fallocate`] tool is quite nifty and is used to preallocate or deallocate space to a file.  It is much faster than traditional tools like [`dd`], because it doesn't write zeroes or any garbage to the file, which can take a lot of time, depending upon the size of the file.

From the man page:

> `fallocate` is used to manipulate the allocated disk space for a file, either to deallocate or preallocate it. For filesystems which support the `fallocate` system call, preallocation is done quickly by allocating blocks and marking them as uninitialized, requiring no IO to the data blocks. This is much faster than creating a file by filling it with zeroes.

Let's compare the two and create a 1GiB file.

Using `dd`:

```
$ time dd if=/dev/zero of=file.out bs=1024 count=1024000
1024000+0 records in
1024000+0 records out
1048576000 bytes (1.0 GB, 1000 MiB) copied, 2.0432 s, 513 MB/s

real    0m2.047s
user    0m0.529s
sys     0m1.518s
```

Using `fallocate`:

```
$ time fallocate -l 1GiB file.out

real    0m0.017s
user    0m0.001s
sys     0m0.005s
```

That's a pretty significant difference!

> Of course, there are ways to use `dd` [that can mitigate this].  I'm using what I feel is the most common way of using the tool for file creation.

Let's now look at some examples.

---

- [Adjusting Swap Space](#adjusting-swap-space)
- [`nuts`](#nuts)

# Adjusting Swap Space

It seems that the canonical example for `fallocate` is that of resizing swap space.  My distro is a good candidate for using `fallocate` to resize the swap space as the space is a file, not a partition:

```
$ swapon --show
NAME      TYPE SIZE USED PRIO
/swapfile file   2G 5.6M   -2
```

2GB seems a bit low (it's the default for Ubuntu), as I've 15GB of RAM, and it's been recommended that swap space should double that of memory for when the system hibernates, among other things.

I've also plenty of available disk space, so there's no reason why I can't increase the size of the swap file.

> How can you find the size of your hard disk(s)?  Well, here are some ways!
>
>       $ lsblk | ag sda
>       sda      8:0    0 232.9G  0 disk
>       ├─sda1   8:1    0   512M  0 part /boot/efi
>       └─sda2   8:2    0 232.4G  0 part /
>       $
>       $ df -h | ag sda
>       /dev/sda2       228G   57G  160G  27% /
>       /dev/sda1       511M  6.7M  505M   2% /boot/efi
>       $
>       $ sudo parted -l
>       Model: ATA WDC WDS250G2B0B- (scsi)
>       Disk /dev/sda: 250GB
>       Sector size (logical/physical): 512B/512B
>       Partition Table: gpt
>       Disk Flags:
>
>       Number  Start   End    Size   File system  Name                  Flags
>        1      1049kB  538MB  537MB  fat32        EFI System Partition  boot, esp
>        2      538MB   250GB  250GB  ext4
>
> Weeeeeeeeeeeeeeeeeeeeeeeeeeeee!

This advice isn't as applicable today as it was in the bad old days, because a machine can have hundreds of gigabytes of RAM, and it would be infeasible (and unnecessary) to double that as swap space.  In fact, with the amount of memory that most modern machines support, technically you could run your machine without the need for any swap space (granting, that is, that you'll never put the machine into hibernation).

Different Linux distributions have different recommendations concerning the size of the swap space.  I'll go with what Ubuntu recommends; for machines with more than 1GB, the swap size should be at least the square root of the system memory and not more than double.  In my case, with 16GB of RAM, I'll be increasing the swap file from 2GB to 4GB.

I'm quivering with excitement!!

Turn off the swap file:

```
$ sudo swapoff /swapfile
```

Reallocate:

```
$ sudo fallocate -l 4G /swapfile
```

Mark it:

```
$ sudo mkswap /swapfile
mkswap: /swapfile: warning: wiping old swap signature.
Setting up swapspace version 1, size = 4 GiB (4294963200 bytes)
no label, UUID=056fad59-c719-4904-89bb-322709649727
```

Finally, re-enable it:

```
$ sudo swapon /swapfile
```

And witness the fruits of your labor:

```
$ swapon --show
NAME      TYPE SIZE USED PRIO
/swapfile file   4G   0B   -2
$
$ free -h
              total        used        free      shared  buff/cache   available
Mem:            15G        6.3G        5.8G        483M        3.3G        8.3G
Swap:          4.0G          0B        4.0G
```

Time to get a nice coffee, that was exhausting!

---

# `nuts`

Like Vanessa Williams, I've gone and saved the best for last.

The [`nuts`] program was developed as a simple\* replacement for programs such as [`TrueCrypt`], which was suddenly and mysteriously discontinued.  An audit was undertaken to ensure that there were no backdoors or security holes in the program, and it was [found to be generally safe to use].

As a casual user of `TrueCrypt`, I followed the story closely.I wrote `nuts` to give me the behavior that I desired from `TrueCrypt` and similar programs: a locked vault with strong encryption that I controlled.

Here's the basic idea:  create a filesystem, store stuff in it and encrypt with [GPG].  This can then be backed up anywhere I have access to storage.

- `fallocate` to (quickly) create a large file
- [`mkfs.ext4`], [`mkfs.btrfs`], et al., to create a filesystem
- `GPG` for security

Here's [a snippet of C] where I'm using the `fallocate` to preallocate a large file:

<pre class="math">
if ((r = execlp("fallocate", "fallocate", "-l", fsize, filename, NULL)) == -1) {
    perror("fallocate operation");
    free(fsize);
    return 1;
}
</pre>

The result is then mounted and treated as any mount point.  I've used it before for storing client information, invoices and receipts, and it works very nicely as `nuts` handles the tedium of creating and removing mount points and mounting and unmounting.

Let's look at some examples from the project repository.

Create a file and mount point:

```
$ ./nuts open foo.bar mnt_here
[WARN] There is no filename `foo.bar`... Create? [Y/n]:

Size of file [250MB]: 500MB
Select the filesystem type:

        1. ext2
        2. ext3
        3. ext4
        4. fat

Select: 3

[snipped for brevity]

Mounting to mnt_here/
Done!
```

Close a file and remove mount point:

```
$ ./nuts close foo.bar mnt_here
Encrypt? [Y/n] n
Unmounting mnt_here/
Done!
```

Building is easy:

```
$ make
```

# Conclusion

I conclude that you should use `fallocate` liberally, as necessary.  I also conclude that the `nuts` program is sweet, and that you should give it a whirl.

---

\* Emphasis on **simple**, as I am in no position to speak authoritatively on cryptographic algorithms and mathematics.

# References

- [How Much Swap Should You Use in Linux?](https://itsfoss.com/swap-size/)

[`fallocate`]: https://www.man7.org/linux/man-pages/man1/fallocate.1.html
[`dd`]: https://www.man7.org/linux/man-pages/man1/dd.1.html
[that can mitigate this]: https://en.opensuse.org/SDB:Create_10_GB_file_instantly_with_%22dd%22
[`nuts`]: https://github.com/btoll/nuts
[`TrueCrypt`]: https://en.wikipedia.org/wiki/TrueCrypt
[found to be generally safe to use]: https://blog.cryptographyengineering.com/2015/04/02/truecrypt-report/
[GPG]: https://gnupg.org/
[`mkfs.ext4`]: https://www.man7.org/linux/man-pages/man8/mkfs.8.html
[`mkfs.btrfs`]: https://www.man7.org/linux/man-pages/man8/mkfs.btrfs.8.html
[a snippet of C]: https://github.com/btoll/nuts/blob/master/nuts.c

