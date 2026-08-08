+++
title = "On Rsync"
date = "2019-11-17T15:08:57-05:00"

+++

I found myself writing a [`Makefile`] for several tasks to manage this website, which uses [Hugo].  Of course, I use [`rsync`], a truly tremendous tool, to deploy the files to my remote server.

This will be a short article about it.  Just the basics, really, and probably not even worth an article.

> UPDATE: 2026/8/9
>
> I don't use `rsync` any longer to deploy my website and haven't for years.  Instead, I've been using containers.  I still use `rsync`, but perhaps for not much longer if the maintainer continues to use AI and cause regressions.
>
> Truth be told, even if there weren't any regressions, I still don't like the idea of AI being used for anything.
>
> - [Please Do Not Vibe Fuck Up This Software](https://github.com/RsyncProject/rsync/issues/929)
> - [Tridgell: rsync and outrage](https://lwn.net/Articles/1076040/)
> - [Rsync opens the slopgates, regressions and bugs ensue](https://www.osnews.com/story/145198/rsync-opens-the-slopgates-regressions-and-bugs-ensue/)

## Definition

`rsync` stands for remote sync and is used to transfer files from a source location to a destination location.  The destination can be either local or remote, and it uses [`ssh`] as its remote shell by default, although it can use others such as [`rsh`] (although, it shouldn't because it is not secure).

Its algorithm ensures that only the files that have changed since the last sync will be copied over, which it determines by looking at a file's modification time and its size (this is an over-simplified explanation, of course).

## Examples

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

```bash
$ mkdir -p tmp/{foo,bar}
$ touch tmp/bar/file_{0..4}
```

This creates a directory structure like the following:

```bash
$ tree tmp
tmp
├── bar
│   ├── file_0
│   ├── file_1
│   ├── file_2
│   ├── file_3
│   ├── file_4
└── foo

3 directories, 5 files
```

### Copying

Now, let's copy all of the files from `bar` to `foo`:

```bash
$ rsync -az tmp/bar/ tmp/foo
$ tree tmp
tmp/
├── bar/
│   ├── file_0
│   ├── file_1
│   ├── file_2
│   ├── file_3
│   ├── file_4
└── foo/
    ├── file_0
    ├── file_1
    ├── file_2
    ├── file_3
    ├── file_4

3 directories, 10 files
```

The forward slash (/) after the source location (i.e., `tmp/bar/`) tells `rsync` to copy only the *contents* of `bar`.  If the slash had been omitted, it would have copied the directory, too, which is not what we want.

Observe:

```bash
$ rsync -az tmp/bar tmp/foo
$ tree tmp
tmp/
├── bar/
│   ├── file_0
│   ├── file_1
│   ├── file_2
│   ├── file_3
│   └── file_4
└── foo/
    └── bar/
        ├── file_0
        ├── file_1
        ├── file_2
        ├── file_3
        └── file_4

4 directories, 10 files
```

BT no likey.

### Verbosity

There's verbose mode (this is assuming the content of `foo/` is empty):

```bash
$ rsync -avz tmp/bar/ tmp/foo
sending incremental file list
./
file_0
file_1
file_2
file_3
file_4

sent 315 bytes  received 114 bytes  858.00 bytes/sec
total size is 0  speedup is 0.00
```

And, running again without having modified any of the files won't transfer anything:

```bash
$ rsync -avz tmp/bar/ tmp/foo
sending incremental file list

sent 128 bytes  received 12 bytes  280.00 bytes/sec
total size is 0  speedup is 0.00
```

Now, let's modify a file by updating its last access and modification time:

```bash
$ touch tmp/bar/file_2
```

`rsync` will spring into action and copy the updated file metadata to `foo/`.

```bash
$ rsync -avz tmp/bar/ tmp/foo
sending incremental file list
file_2

sent 176 bytes  received 35 bytes  422.00 bytes/sec
total size is 0  speedup is 0.00
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeee

### Syncing

Adding the `--delete` switch will keep the directories truly in sync by removing any file from the destination location that has already been removed from the source:

```bash
$ rm tmp/bar/file_3
tmp/
├── bar/
│   ├── file_0
│   ├── file_1
│   ├── file_2
│   └── file_4
└── foo/
    ├── file_0
    ├── file_1
    ├── file_2
    ├── file_3
    └── file_4

3 directories, 8 files
$ rsync -avz --delete tmp/bar/ tmp/foo
sending incremental file list
deleting file_3

sent 127 bytes  received 22 bytes  298.00 bytes/sec
total size is 0  speedup is 0.00
$ tree tmp
tmp/
├── bar/
│   ├── file_0
│   ├── file_1
│   ├── file_2
│   └── file_4
└── foo/
    ├── file_0
    ├── file_1
    ├── file_2
    └── file_4

3 directories, 8 files
```

### Remote Transfer

```bash
$ rsync -azP --delete bar/ kilgoretrout@vonnegut:/var/www/foo/
```

## Makefile

Here be a simple `Makefile`:

```makefile
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

```

[`Makefile`]: https://www.gnu.org/software/make/
[Hugo]: https://gohugo.io/
[`rsync`]: https://rsync.samba.org/
[`ssh`]: https://www.ssh.com/ssh/
[`rsh`]: https://www.ssh.com/ssh/rsh

