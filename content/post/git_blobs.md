+++
title = "On Git Blobs"
date = "2021-12-18T01:21:26Z"

+++

There are four types of objects in [Git], [the stupid content tracker]:

- blobs
- commits
- trees
- annotated tags

Today, children, we're going to take a look at only Git blob objects.

---

- [Create a Repository](#create-a-repository)
- [Blob Fun](#blob-fun)
    + [Creating](#creating)
    + [Persisting](#persisting)
    + [Indexing](#indexing)
    + [Committing](#committing)
- [Other Repository Objects](#other-repository-objects)
- [Conclusion](#conclusion)

---

At its core, Git is a key-value data store.  In the case of blob objects, you give it a chunk of text, and it hands you a key to which you can then refer to it.  All the object keys are 40 character checksum [SHA-1] hashes, which consists of the concatenation of a header and the content.

> The header consists of the name "blob" for (blob objects, of course), the length of the content in bytes and the null character.

## Create a Repository

Let's quickly set up a test repository and confirm that it begins life with an empty database:

```
$ git init git-stuff
$ cd !$
cd git-stuff
$ find .git/objects -type f
```

If there were stuff in the database, you'd see directories full of "files" and those files would be listed by their SHA-1 hashes.  More on that later.

Although, there *is* stuff in there:

```
$ find .git/objects -d
.git/objects
.git/objects/info
.git/objects/pack
```

Of course, these are just empty directories that are scaffolded by default when `git init` is ran.

Weeeeeeeeeeeeeeeeeeeee!

## Blob Fun

Blob objects, or blobs (binary large objects), are immutable objects made of up two things:

- a header
- the content

Blobs can be thought of as [`inodes`] or files in your working directory, but importantly, they **do not** store the filename (that's stored in the tree object).  Like `inodes`, blobs only the contain the contents.

It's also helpful to think of Git as a high-level filesystem, but we won't be going into that in this article.

Blob objects with the same contents will have the same hash.  If a blob that is included in more than one commit hasn't changed across commits, Git will use the same object.  Think of hard links in Linux.

The object is stored in the `./.git/objects` directory in the following format:

- The first two hex characters form the directory name.
- The rest of the hex characters form the object name within the directory.

So, if we create a new blob object:

```
$ git hash-object -w --stdin <<< "nasty, brutish and short"
ea75a95c8e8064150b40355b549aed00d78e9b2e
```

It will be stored like so:

```bash
$ find .git/objects -type f
.git/objects/ea/75a95c8e8064150b40355b549aed00d78e9b2e
```

Also, because there isn't any time-sensitive information that is included in the header (and thus the hash) such as time of creation, a hash object consisting of the same text can be easily re-created and compared to the original, as the hashes will be the same.

### Creating

Normally, a file is created in the working directory and then added to the index, at which point a blob object is created in the Git database:

```bash
$ file .git/index
.git/index: Git index, version 2, 1 entries
```

This all happens behind the scenes, and we all go merrily on with our little lives.

However, let's create these objects a different way.  We'll use the [Git plumbing commands], as this is much more instructive to understand how Git works internally.

Here, we are creating a blob using the [`git-hash-object`] plumbing command.  The [herestring] acts as input piped in from `stdin`:

```
$ git hash-object --stdin <<< "kilgore trout was here"
d122876a443f7a7e1fe443f1879ffbb47239ec6f
```

As noted previously, don't assume that the checksum is the result of only hashing the string.  You'll note that it doesn't match the same `SHA-1` checksum produced by [`openssl`]:

```
$ openssl sha1 <<< "kilgore trout was here"
(stdin)= 6651b97122b36ec77f655e9e865875513abacc1e
```

Why is that?  Well, the `git-hash-object` function also includes the aforementioned header in its output.

> Just For Fun
>
> The following two commands output the same text:
>
>     $ git cat-file -p d122876a443f7a7e1fe443f1879ffbb47239ec6f
>     $
>     $ git cat-file -p $(git hash-object -w --stdin <<< "kilgore trout was here")

### Persisting

That was unbelievably fun!  Note, though, that nothing was actually stored in the Git database.  We'll do that now by adding the `-w` write flag to persist it in `.git/objects`:

```
$ git hash-object -w --stdin <<< "kilgore trout was here"
d122876a443f7a7e1fe443f1879ffbb47239ec6f
$ find .git/objects -type f
.git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
```

We can now use the [`git-cat-file`] command to read it by giving it the `-p` flag.  This is the first we've encountered that command, as it can only read objects that are in the repository:

```
$ git cat-file -p d122
kilgore trout was here
```

> Note that I'm not using the full hash.  As long as it is unique in the repository, Git allows us to use a shortened version of the checksum, although it must be at least four characters.

Use the `-t` flag to show the object's type:

```
$ git cat-file -t d122
blob
```

At this point, we can reasonably expect that now there's only one object in the database.  Let's confirm that!

```
$ git count-objects
1 objects, 4 kilobytes
```

Nice!

### Indexing

Interestingly, we now find ourselves in a position where we have content in the database (the blob object we just created) but no actual file in the working directory:

```
$ ls
```

Clearly, this isn't the optimal way to use Git (i.e., remembering SHA hashes to reference content is infeasible), and it's certainly not the usual workflow when creating objects.  Let's remedy that by creating the file in our working directory by extracting the value of our blob from the repository and redirecting it to the new file.

```
$ git cat-file -p d122876a > kilgore.txt
$ ls
kilgore.txt
$ cat kilgore.txt
kilgore trout was here
```

Notably, the file doesn't contain the header of the blob object, just the textual content.  We can observe that's true by checking the size difference between the file and the blob:

```
$ stat --format=%s \
    kilgore.txt \
    .git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
23
39
```

### Committing

Let's now edit the new file and commit it.  We'll then inspect the contents of the database to see what Git did.

```
$ sed -i 's/.*/&!/' kilgore.txt
$ !cat
cat kilgore.txt
kilgore trout was here!
$ git add kilgore.txt
$ git status --short --branch
## No commits yet on master
A  kilgore.txt
$ git commit -m "My first commit"
[master (root-commit) 642c4f7] My first commit
 1 file changed, 1 insertion(+)
 create mode 100644 kilgore.txt
```

> Note that even before committing it, Git had added the new object to the object database.  It's added to the Git repository as soon it's added to the index (i.e., by the `git add` command).

```
$ find .git/objects -type f
.git/objects/4e/920a379168e3d6e30dfc2bb9411ae1015a69b3
.git/objects/50/619d7813b6722bdea0250d4d2489a61656c0cd
.git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
.git/objects/64/2c4f7926c29a572dd3995bda6b5e254bac3dde
$ git cat-file -p 5061
kilgore trout was here!
```

So, we see that it neither overwrote the older blob nor created a new blob with only the difference.  In this case, it created a new blob with the entire (new) text.  However, don't assume that Git always does this.  It is optimized in ways that are beyond the scope of this article so that large files with only a character difference aren't copied whole cloth to the new blob, for instance.

And, we'll also count the number of objects:

```
$ git count-objects
4 objects, 16 kilobytes
```

Don't be alarmed that Git reports that the number is four.  When committing, other objects are created and added to the repository such as commit and tree objects, as seen by the output of the `find` command above.

> Just For Fun
>
> Here's a really verbose and impractical way to get the contents of all the current blobs in the Git database!
>
>     $ for object in $(find .git/objects -type f | cut -d/ -f3,4)
>     do
>     IFS=/ read -r dir filename <<< "$object"
>     if [ "$(git cat-file -t "$dir$filename")" = blob ]
>     then
>         echo "$object -> $(git cat-file -p "$dir$filename")"
>     fi
>     done
>     50/619d7813b6722bdea0250d4d2489a61656c0cd -> kilgore trout was here!
>     d1/22876a443f7a7e1fe443f1879ffbb47239ec6f -> kilgore trout was here

When there are only a couple of blob objects in the repository it's not too painful to understand which blob is in the current commit, but is there another way to quickly and easily get a reference to it, perhaps using a Git command?  Enter [`git-rev-parse`] to the rescue!

```
$ git rev-parse HEAD:kilgore.txt
50619d7813b6722bdea0250d4d2489a61656c0cd
$ git cat-file -p $(git rev-parse HEAD:kilgore.txt)
kilgore trout was here!
```

While this is just a silly demo, it hopefully gives an insight into how Git internally stores the files that we create in our working directory.

## Other Repository Objects

This article has focused on blobs, and we won't go much into the other three repository objects that Git creates other than to take a brief look at the commit and tree objects that were created in the last sections.

Let's briefly look at the commit object and its contents.  Continuing with the little repository we created in the previous sections, we can get the commit object by referencing the `master` branch:

```
$ git cat-file -t master
commit
$ ^-t^-p
git cat-file -p master
tree 4e920a379168e3d6e30dfc2bb9411ae1015a69b3
author Benjamin Toll <benjam72@yahoo.com> 1640036903 -0500
committer Benjamin Toll <benjam72@yahoo.com> 1640036903 -0500

My first commit
```

Its contents reveal the commit message, as well as the `author`, `committer` and a tree.  The latter is the most interesting.

> There is also a `parent` field(s) that is present in every commit object except the very first.  A commit can have multiple parents, such as for a merge commit.

```
$ git cat-file -t 4e92
tree
$ git cat-file -p 4e92
100644 blob 50619d7813b6722bdea0250d4d2489a61656c0cd    kilgore.txt
$ git cat-file -p 5061
kilgore trout was here!
```

It's here that we begin gaining an understanding of how objects are linked to each other by references to their checksums.  Humans don't remember things like checksums very well, which is why we don't work directly with them, but referencing the checksums of Git database objects is how switching branches can build all the files and directories that are created in the working directory.

Here's a quick way to get a reference to the tree object referenced in a commit:
```
$ git cat-file -p master^{tree}
100644 blob 50619d7813b6722bdea0250d4d2489a61656c0cd    kilgore.txt
```

Git tree objects can contain references to not only blob objects, as in the example above, but also other trees, so the fact that there is only one blob outputted above is only because our repository is so simple.

When you checkout branches and commits, Git changes the files and folders that are in your working directory.  It doesn't care about the history of the commits.  Instead, it only cares about, or follows, the hash references it finds in tree and blob objects and then builds the working directory from all of the reachable objects.  This then becomes the working state when branches are switched (or commits are checked out, as when you're in `detached HEAD` state).

> Here's a nice rule of thumb:
> - References between commits are used to track history.
> - All other references are used to track content.

## Conclusion

Learning about Git internals is so much fun I just about can't stand it.  It's very educational, and it gives a greater understanding of how to use the stupid content tracker in any given situation.

The end.

[Git]: https://git-scm.com/
[the stupid content tracker]: https://www.man7.org/linux/man-pages/man1/git.1.html
[SHA-1]: https://en.wikipedia.org/wiki/SHA-1
[`inodes`]: /2019/11/19/on-inodes/
[`git-hash-object`]: https://git-scm.com/docs/git-hash-object
[Git plumbing commands]: https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain
[herestring]: https://tldp.org/LDP/abs/html/x17837.html
[`openssl`]: https://www.openssl.org/
[`git-cat-file`]: https://git-scm.com/docs/git-cat-file
[`git-rev-parse`]: https://git-scm.com/docs/git-rev-parse
[`git-log`]: https://www.git-scm.com/docs/git-log

