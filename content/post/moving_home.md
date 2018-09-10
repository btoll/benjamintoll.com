+++
title = "On Moving Home"
date = "2018-09-09T14:15:09-04:00"

+++

It's been irritating me for a little while about the vulnerability of my GPG and SSH keys on my laptop.  For instance, if I'm at a coffee house and need to get in line for a refill, my laptop is exposed.  Or, imagine I need to step outside to take a phone call.  After all, I'm not that guy that annoys you with the boring details of my ultra-important phone conversation, so I go outside.  So, I'll ask some stranger to "keep an eye on it" and take my chances.  Not great.

Well, last night it finally occurred to me to put my home directory on an encrypted flash drive and then mount it.  I'm not sure what took me so long to come around to this, but I'm here now.  Now, when ever I need to get up from my laptop, I'll simply take the USB drive with me.  I'm sticking it to you, man!

I have an extra 16GB stick lying around.  They're really cheap nowadays, so it's always feasible to have several on-hand.  Let's look at the steps to do this.

Note that all commands below must be run with root privileges.

---

## Creation

1. Insert the drive and `fdisk`, baby.

	- Determine the device number that [`udev`] assigned to it:

			mesg | tail

		+ For me, it's `/dev/sdb1`.  

	- Partition it:

			fdisk /dev/sdb

		+ I'll make the entire disk a primary partition.

2. Create the [`LUKS`] encrypted container.

		cryptsetup luksFormat /dev/sdb1 LUKS001

	- You'll be asked to set a password/passphrase, make sure it's a good one!
	- `cryptsetup` is a front-end to [`dm-crypt`].
	- `LUKS001` is an arbitrary name, you could use anything.  `udev` will create a mapped device, `/dev/mapper/LUKS001`.
	- If you don't have it, it's only an `apt-get install cryptsetup` away!

	> To verify that it's a `LUKS` encrypted disk:
	>
	>		file /dev/sdb1

3. Open it.  If you skip this step, you'll destroy the encrypted layer that was created in step 2 when formatting!

		cryptsetup luksOpen /dev/mapper/LUKS001

	- It should ask you for your passphrase.

4. Format that partition like there's no tomorrow.

		mkfs.ext4 /dev/mapper/LUKS001

	- The filesystem should be the same type as the host system.
	- If your home directory contains symlinks, the fileystem type must support that.

5. Create a mount point and mount!

		mkdir /media/home
		chown btoll:btoll home
		mount /dev/mapper/LUKS001 home

6. Copy existing home directory to mount point:

		rsync -aC /home/btoll /media/home
	
7. Close the encrypted drive.

		cryptsetup luksClose /dev/mapper/LUKS001

	- This not only closes (encrypts) the device but will remove the device name from `/dev/mapper`.

8. Unmount and cleanup.

		umount /media/home
		rmdir /media/home

	> Why `rmdir` and not just `rm -rf`?  I always use it when a directory I'm to delete is supposed to be empty, because it will error and refuse to do the operation if it isn't.  The latter won't.


Now, if you're feeling **really** confident, you can delete your old home directory.

Weeeeeeeeeeeeeeeeeee

## Daily Use

Now that I've removed my home directory to an encrypted flash drive, all that's left is to list the steps to mount and unmount it on use.  This is simple, and, of course, can be automated.

### Mount

	cryptsetup luksOpen /dev/sdb1 LUKS001
	mount /dev/mapper/LUKS001 /home/btoll

### Unmount

	cryptsetup luksClose /dev/mapper/LUKS001
	umount /home/btoll

Now, you can safely yank that bad boy and go take a leak!

[`udev`]: https://en.wikipedia.org/wiki/Udev
[`LUKS`]: https://en.wikipedia.org/wiki/Linux_Unified_Key_Setup
[`dm-crypt`]: https://en.wikipedia.org/wiki/Dm-crypt

<!--
sudo blkid
sudo mkdir /media/home
sudo cryptsetup luksOpen /dev/sdb1 LUKS001
sudo vi /etc/fstab

	# <file system> <mount point>   <type>  <options>       <dump>  <pass>
	{block device UUID}     /media/home     vfat    gid=1000,uid=1000       0       2

sudo mount -a
-->

