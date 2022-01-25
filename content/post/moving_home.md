+++
title = "On Moving Home"
date = "2018-09-09T14:15:09-04:00"

+++

> This article was updated on January 25, 2022, to reflect improved information and to fix some bad commands.

It's been irritating me for a little while about the vulnerability of my GPG and SSH keys on my laptop.  For instance, if I'm at a coffee house and need to get in line for a refill, my laptop is exposed.  Or, imagine I need to step outside to take a phone call.  After all, I'm not that guy that annoys you with the boring details of my ultra-important phone conversation, so I go outside.  So, I'll ask some stranger to "keep an eye on it" and take my chances.  Not great.

Well, last night it finally occurred to me to put my home directory on an encrypted flash drive and then mount it.  I'm not sure what took me so long to come around to this, but I'm here now.  Now, whenever I need to get up from my laptop, I'll simply take the USB drive with me.  I'm sticking it to you, man!

I have an extra 16GB stick lying around.  They're really cheap nowadays, so it's always feasible to have several on-hand.  Let's look at the steps to do this.

Note that all commands below must be run with root privileges.

---

## Creation

1. Insert the drive and `fdisk`, baby.

	- Determine the device number that [`udev`] assigned to it:

        ```
        # mesg | tail
        ```

		+ For me, it's `/dev/sda`.

	- I usually don't partition flash drives, but I will overwrite before I do anything:

        ```
        # dd if=/dev/zero of=/dev/sda bs=100M
        ```

		+ I'll make the entire disk a primary partition.

1. Create the [`LUKS`] encrypted container.

    ```
	# cryptsetup luksFormat /dev/sda
    ```

	- You'll be asked to set a password/passphrase, make sure it's a good one!

	- `cryptsetup` is a front-end to [`dm-crypt`].

	- `luks-home` is an arbitrary name, you could use anything.  `udev` will create a mapped device, `/dev/mapper/luks-home`.

	- If you don't have it, it's only an `apt install cryptsetup` away!

	> To verify that it's a `LUKS` encrypted disk:
	>
	>	  # cryptsetup isLuks /dev/sda -v
    >     Command successful.

    If you'd like, you can now view the `LUKS` container header information and more:

    ```
    # cryptsetup luksDump /dev/sda
    ```

1. Create a backup of the `LUKS` header.

    You won't want to skip this step.  Why?  Well, if the `LUKS` container header becomes corrupted, your container will be inaccessible and the data irretrievably lost.  In other words, you're fucked.

    ```
    # cryptsetup luksHeaderBackup /dev/sda --header-backup-file sda_header_backup.img
    ```

    > Here's the inverse operation when you need to restore your backup:
    >
    >     # cryptsetup luksHeaderRestore /dev/sda --header-backup-file sda_header_backup.img

1. Open it.  If you skip this step, you'll destroy the encrypted layer that was created in step 2 when formatting!

    ```
    # cryptsetup luksOpen /dev/sda luks-home
    ```

	- It should ask you for your passphrase.

    - You'll now see the new mapped device in `/dev/mapper/`.  This is the device with the unencrypted view of the flash drive that you'll encrypt and play with.

    > List the block devices, too:
    >
    >     # lsblk -pe7 -o +fstype
    >     NAME                    MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINT FSTYPE
    >     /dev/sda                  8:0    1  14.3G  0 disk             crypto_LUKS
    >     └─/dev/mapper/luks-home 253:0    0  14.3G  0 crypt
    >     ...

1. Format that partition like there's no tomorrow, bub.

	- The filesystem should be the same type as the host system.

	- If your home directory contains symlinks, the fileystem type must support that.

    ```
    # mkfs.ext4 /dev/mapper/luks-home
    # lsblk -pe7 -o +fstype /dev/mapper/luks-home
    NAME                  MAJ:MIN RM  SIZE RO TYPE  MOUNTPOINT FSTYPE
    /dev/mapper/luks-home 253:0    0 14.3G  0 crypt            ext4
    ```

1. Create a mount point and mount!

    ```
    # mkdir /mnt/home
    # chown btoll:btoll /mnt/home
    # mount /dev/mapper/luks-home /mnt/home
    ```

1. Copy existing home directory to mount point:

    ```
    # rsync -av /home/btoll/ /mnt/home
    ```

1. Close the encrypted drive.

    ```
    # cryptsetup luksClose /dev/mapper/luks-home
    ```

	- This not only closes (encrypts) the device but will remove the device name from `/dev/mapper`.

1. Unmount and cleanup.

    ```
    # umount /mnt/home
    # rmdir /mnt/home
    ```

	> Why `rmdir` and not just `rm -rf`?  I always use it when a directory I'm to delete is supposed to be empty, because it will error and refuse to do the operation if it isn't.  The latter won't.


Now, if you're feeling **really** confident, you can delete your old home directory.

Weeeeeeeeeeeeeeeeeee

## Daily Use

Now that I've removed my home directory to an encrypted flash drive, all that's left is to list the steps to mount and unmount it on use.  This is simple, and, of course, can be automated.

### Mount

	# cryptsetup luksOpen /dev/sda luks-home
	# mount /dev/mapper/luks-home /home/btoll

### Unmount

	# cryptsetup luksClose /dev/mapper/luks-home
	# umount /home/btoll

Now, you can safely yank that bad boy and go take a leak!

# Conclusion

Of course, there is more cool stuff you can do with your encrypted `LUKS` devices, such as having the kernel decrypt your devices on boot and then mount them (or, they can be separate operations).  Look at `/etc/crypttab` and `/etc/fstab`, respectively.

Here is a nifty way to get the `UUID` of the `LUKS` device to use in either of those files:

```
# cryptsetup luksUUID /dev/sda
1c6f0d9e-8b0c-42c9-ad53-487302dcd98
```

## References

- [How to use a file as a LUKS device key](https://linuxconfig.org/how-to-use-a-file-as-a-luks-device-key)
- [How to use LUKS with a detached header](https://linuxconfig.org/how-to-use-luks-with-a-detached-header)

[`udev`]: https://en.wikipedia.org/wiki/Udev
[`LUKS`]: https://en.wikipedia.org/wiki/Linux_Unified_Key_Setup
[`dm-crypt`]: https://en.wikipedia.org/wiki/Dm-crypt

<!--
sudo blkid
sudo mkdir /mnt/home
sudo cryptsetup luksOpen /dev/sda luks-home
sudo vi /etc/fstab

	# <file system> <mount point>   <type>  <options>       <dump>  <pass>
	{block device UUID}     /media/home     vfat    gid=1000,uid=1000       0       2

sudo mount -a
-->

