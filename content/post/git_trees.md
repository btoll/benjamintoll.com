+++
title = "On Git Trees"
date = "2021-12-18T01:21:26Z"
draft = true

+++

Today, children, we're going to take a ~~brief~~ look at Git blob objects.

There are four types of objects in [Git]:

- blob
    + The file contents.
    + Blob objects (files) with the same contents will have the same hash.  It re-uses the same object.
- commit
    + Contains the hash of the tree of objects in the commit.
    + Except for the initial commit, will contain a reference to the parent commit.
    + Commits are linked.
    + Will always contain a reference to a tree object, even if only one object (file) has been committed.
    + Are small.
- tree
    + A directory containing the object hashes of a commit.
    + The root directory of a project.
    + Contains a list of the hashes of the commit.
    + Stores the filename and the file permissions of the blobs.
    + Are small.
- annotated tags
    + Points to a commit.

- [Create Repository](#create-repository)
- [Fun with Objects](#fun-with-objects)

---

At it's core, Git is a key-value data store.  You give it a chunk of text, and it hands you a key to which you can refer to for the rest of your life.  All the object keys are 40 character checksum [`SHA1`] hashes.

## Create Repository

Let's quickly set up a test repository and confirm that it begins life as an empty database:

```
$ git init git-stuff
$ cd !$
$ find .git/objects -type f
```

Although, there *is* stuff in there:

```
$ find .git/objects
.git/objects
.git/objects/info
.git/objects/pack
```

Weeeeeeeeeeeeeeeeeeeee!

## Fun with Objects

The object is stored in the `./.git/objects/` directory in the following format:

- The first two hex characters form the directory name.
- The rest of the hex characters form the object name within the directory.

So the blob object above will be stored like so:

<pre class="math">
.git/objects/23/991897e13e47ed0adb91a0082c31c82fe0cbe5
</pre>

Here is an example using the [`git-hash-object`] [plumbing command]:

```
$ git hash-object --stdin <<< "kilgore trout was here"
d122876a443f7a7e1fe443f1879ffbb47239ec6f
```

You'll note, though, that it doesn't match the same `SHA1` chucksum produced by [`openssl`]:

```
$ openssl sha1 <<< "kilgore trout was here"
(stdin)= 6651b97122b36ec77f655e9e865875513abacc1e
```

Why is that?  Well, the `git-hash-object` function also includes a header in its output.

The following two commands output the same text:

```
$ git cat-file -p 23991897e13e47ed0adb91a0082c31c82fe0cbe5
$
$ git cat-file -p $(git hash-object --stdin -w <<< "Apple Pie")
```

Let's now store that in Git's object database by adding the `-w` write flag to persist it in `.git/objects`:

```
$ git hash-object -w --stdin <<< "kilgore trout was here"
d122876a443f7a7e1fe443f1879ffbb47239ec6f
$ find .git/objects -type f
.git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
```

We can now use [`git-cat-file`] to read it:

```
$ git cat-file -p d122876a
kilgore trout was here
```

Show object type:

```
$ git cat-file -t 23991897e13e47ed0adb91a0082c31c82fe0cbe5
blob
```

At this point, we can reasonably expect that now there's only one object in the database.  Let's confirm that!

```
$ git count-objects
1 objects, 4 kilobytes
```

Interestingly, we now find ourselves in a position where we have a "file" in the database (the blob object we just created) but no file in the working directory:

```
$ ls
```

Clearly, this isn't the optimal way to use Git, and it's certainly not the usual workflow when creating objects.  Now, let's remedy that by creating the file in our working directory.

```
$ git cat-file -p d122876a > kilgore.txt
$ ls
kilgore.txt
$ cat kilgore.txt
kilgore trout was here
```

Notably, the file doesn't contain the header of the blob object, just the textual content.  Check out the differences the size difference between the two:

```
$ stat --format=%s \
    kilgore.txt \
    .git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
23
39
```

Let's edit the file and commit it.  Will it overwrite the same object or create a new one?  And, if the latter, will it only contain the difference between the two?

Who knows!

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
```

> Note that even before committing it, Git had added the new object to the object database.

```
$ find .git/objects -type f
.git/objects/50/619d7813b6722bdea0250d4d2489a61656c0cd
.git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
$ git cat-file -p 5061
kilgore trout was here!
```

Here's a really verbose and impractical way to get the contents of all the current objects in the Git database!

```
$ for object in $(find .git/objects -type f | cut -d/ -f3,4)
do
IFS=/ read -r dir filename <<< $object
echo "contents of blob object $object" $(git cat-file -p $dir$filename)
done
contents of blob object 50/619d7813b6722bdea0250d4d2489a61656c0cd kilgore trout was here!
contents of blob object d1/22876a443f7a7e1fe443f1879ffbb47239ec6f kilgore trout was here
```

Just for fun, let's create one more object.

```
sed -i 's/.*/&?/' kilgore.txt
$ cat kilgore.txt
kilgore trout was here!?
```

This will dirty the working directory:

```
$ git status --short --branch
## No commits yet on master
AM kilgore.txt
```

First, let's take a look at the capital letters before the filename, `AM`.  These represent the states of the file in two different "areas" in Git: index (or staging) and the working directory, respectively.

- The **`A`** is the status of the index.  The object has already been added.
- The **`M`** is the status of the working directory.  The object has been modified.

This is a nice way of succinctly showing us what we've just done, i.e., changing an already-persisted file.

If we then add this, we'll see that two operations will occur:

- The working directory will be clean/empty.
- The contents of the file will have been added as a new blob entry in the database.

Before we add, let's see the current contents of the database:

```
$ find .git/objects -type f
.git/objects/50/619d7813b6722bdea0250d4d2489a61656c0cd
.git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
```

As we expected, just making changes in the working directory doesn't persist anything.  This makes sense.  Remember, one of the only ways (only way?) to actually lose data in a Git repository is to not persist or save the contents of the working directory.

Now, we add to the index:

```
$ git add kilgore.txt
$ git status --short --branch
## No commits yet on master
A  kilgore.txt
```

And check the Git object database:

```
$ !find
find .git/objects -type f
.git/objects/50/619d7813b6722bdea0250d4d2489a61656c0cd
.git/objects/d1/22876a443f7a7e1fe443f1879ffbb47239ec6f
.git/objects/59/d2458960b2dc8491d58e5ec4e1c21c08fe02fb
$ git cat-file -p 59d2
kilgore trout was here!?
```

And there we have it.  A clean working directory and an updated database.

Lastly, we expect now to have three blob objects in the database:

```
$ git count-objects
3 objects, 12 kilobytes
```

Indeed.

# Conclusion

It's helpful to think of each blob, commit and tree as separate files.  These are hashed and then stored in the database in `.git/objects`.

In addition, it's helpful to think of Git as a high-level filesystem, with the objects acting as inodes and the trees acting as directories.  And just as with inodes, objects don't store a filename, that is stored in its tree (directory).

Q. What type of commits have more than one parent?
A. Merge commits!

References between commits are used to track history.
All other references are used to track content.

When you move between commits/branches, Git changes the files and folders that are in your working directory.  It doesn't care about the history of the commits, and it only cares about, or follows, the references to blob objects that are stored in the tree objects.

It will look at the tree in the commit and all of the reachable objects, and that is the working directory, or state, when branches are switched.

[Git]: https://git-scm.com/
[SHA1]: https://en.wikipedia.org/wiki/SHA-1
[`git-hash-object`]: https://git-scm.com/docs/git-hash-object
[plumbing command]: https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain
[`openssl`]: https://www.openssl.org/
[`git-cat-file`]: https://git-scm.com/docs/git-cat-file

