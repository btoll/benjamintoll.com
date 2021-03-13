+++
title = "On Rsync"
date = "2019-11-17T15:08:57-05:00"

+++

I found myself writing a [`Makefile`] for several tasks to manage this website, which uses [Hugo].  Of course, I use [`rsync`], a truly tremendous tool, to deploy the files to my remote server.

This will be a short article about it.

# Definition

`rsync` stands for remote sync and is used to transfer files from a source location to a destination location.  The destination can be either local or remote, and it uses [`ssh`] as its remote shell by default, although it can use others such as [`rsh`].

Its algorithm ensures that only the files that have changed since the last sync will be copied over, which it determines by looking at a file's modification time.

# Examples

- [Copying](#copying)
- [Verbosity](#verbosity)
- [Syncing](#syncing)
- [Remote Transfer](#remote-transfer)

> Here are the flags used in these examples:
>
> **-a** - Archive mode; equals `-rlptgoD` (no `-H`,`-A`,`-X`).
>
> **-z** - Compress file data during the transfer.
>
> **-P** - Same as `--partial --progress`.
>
> **-v** - Increase verbosity.
>
> **--delete** - Delete files from the destination directory if they are removed from the source.

Let's create our workspace:

    $ mkdir -p tmp/{foo,bar}
    $ cd tmp
    $ touch bar/file_{0..4}

This creates a directory structure like the following:

    $ tree tmp
    tmp
    ├── bar
    │   ├── file_0
    │   ├── file_1
    │   ├── file_2
    │   ├── file_3
    │   ├── file_4
    └── foo

    2 directories, 5 files

### Copying

Now, let's copy all of the files from `bar` to `foo`:

    ~/tmp:$ rsync -az bar/ foo
    ~:$ tree ../tmp
    ../tmp
    ├── bar
    │   ├── file_0
    │   ├── file_1
    │   ├── file_2
    │   ├── file_3
    │   ├── file_4
    └── foo
        ├── file_0
        ├── file_1
        ├── file_2
        ├── file_3
        ├── file_4

    2 directories, 10 files

The forward slash (/) after the source location tells `rsync` to copy only the contents of `bar`.  If the slash is omitted, it will copy the directory, too.

    ~/tmp:$ tree ../tmp
    ../tmp
    ├── bar
    │   ├── file_0
    │   ├── file_1
    │   ├── file_2
    │   ├── file_3
    │   ├── file_4
    └── foo
        └── bar
            ├── file_0
            ├── file_1
            ├── file_2
            ├── file_3
            ├── file_4

    3 directories, 10 files

### Verbosity

There's verbose mode:

    ~/tmp:$ rsync -avz bar/ foo
    sending incremental file list
    ./
    file_0
    file_1
    file_2
    file_3
    file_4

    sent 314 bytes  received 114 bytes  856.00 bytes/sec
    total size is 0  speedup is 0.00

And running again without having modified any of the files won't transfer anything:

    ~/tmp:$ rsync -avz bar/ foo
    sending incremental file list

    sent 127 bytes  received 12 bytes  278.00 bytes/sec
    total size is 0  speedup is 0.00

Now, let's modify a file:

    ~/tmp:$ touch bar/file_2
    ~/tmp:$ rsync -avz bar/ foo
    sending incremental file list
    file_2

    sent 175 bytes  received 35 bytes  420.00 bytes/sec
    total size is 0  speedup is 0.00

Weeeeeeeeeeeeeeeeeeeeeeeeeeeee

### Syncing

Adding the `--delete` switch will keep the directories truly in sync:

    ~/tmp:$ rm bar/file_3
    ~/tmp:$ rsync -avz --delete bar/ foo
    sending incremental file list
    deleting file_3

    sent 125 bytes  received 22 bytes  294.00 bytes/sec
    total size is 0  speedup is 0.00
    ~/tmp:$ tree ../tmp
    ../tmp
    ├── bar
    │   ├── file_0
    │   ├── file_1
    │   ├── file_2
    │   └── file_4
    └── foo
        ├── file_0
        ├── file_1
        ├── file_2
        └── file_4

    2 directories, 8 files

### Remote Transfer

    rsync -azP --delete bar/ kilgoretrout@vonnegut:/var/www/foo/

# Makefile

Here be a simple `Makefile`:

    CC              = hugo
    FLAGS           = -D

    DEST            = /path/to/document_root/
    SYSTEM          = kilgoretrout@vonnegut
    TARGET          = public

    .PHONY: build clean deploy serve

    build:
            $(CC)

    clean:
            rm -rf $(TARGET)

    deploy: $(TARGET)
            rsync -azP --delete $(TARGET)/ $(SYSTEM):$(DEST)

    serve:
            $(CC) $(FLAGS) serve

[`Makefile`]: https://www.gnu.org/software/make/
[Hugo]: https://gohugo.io/
[`rsync`]: https://rsync.samba.org/
[`ssh`]: https://www.ssh.com/ssh/
[`rsh`]: https://www.ssh.com/ssh/rsh

