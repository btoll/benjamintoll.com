+++
title = "On Merkle Trees"
date = "2018-08-08T13:18:21-04:00"

+++

I'm really excited about blockchain technology, and I recently started doing a deep dive into it.  One of the data structures that has interested me is a [Merkle tree] or hash tree, which I hadn't heard of prior to studying the blockchain and how transactions are validated in a block.  Named after [Ralph Merkle], this data structure is used for fast data lookups in a tree where every non-leaf node represents a hash of its children nodes.  The beauty of this is the entire tree doesn't need to be checked to verify that a leaf data block is stored in the tree (where the tree could be huge).

> For the purposes of this article, I will only be talking about Merkle trees as [binary trees].

The idea is fairly straightforward: because of the nature of cryptographic hash functions, the chance of a collision, where two different pieces of data would produce the same hash, is infeasible.  The parent node's value is a hash of its children, and this continues all the way to the root, known as the Merkle root, which is publicly known.  So, essentially, the root hash is a collection, in a sense, of all the hashes contained in the tree.

To verify that a piece of data, or block, is stored within the tree, one needs a proof:  essentially, this is, along with the Merkle root, all of the hashes of a sibling needed to verify that branch of the tree (and, again, the entire tree doesn't need to have been known or downloaded, as long as the branch can be reconstructed).

It's always best to see this in action, so let's look at some examples.

# A CLI Example

We'll be using the command line for our first example.  I'm on a Debian system, and I'll be using the hash program `sha256sum` to compute all the hashes:

	~:$ whereis sha256sum
	sha256sum: /usr/bin/sha256sum /usr/share/man/man1/sha256sum.1.gz

You can use [OpenSSL] just as easily.

We'll work with a simple tree, as it'll be enough to understand what is happening:

                           +---------+
                           |  Merkle |
                           |   Root  |
                           |         |
                           |   ....  |
                           +---------+
                          /           \
                         /             \
              +---------+               +---------+
              |    0    |               |    1    |
              |         |               |         |
              |   ....  |               |   ....  |
              +---------+               +---------+
                  / \                       / \
                 /   \                     /   \
        +-------+     +-------+   +-------+     +-------+
        |  0-0  |     |  0-1  |   |  1-0  |     |  1-1  |
        |       |     |       |   |       |     |       |
        |  ...  |     |  ...  |   |  ...  |     |  ...  |
        +-------+     +-------+   +-------+     +-------+
            |             |           |             |
         +----+        +----+      +----+        +----+
         | B1 |        | B2 |      | B3 |        | B4 |
         +----+        +----+      +----+        +----+

Here, we have a Merkle tree (specifically, a balanced binary hash tree) where each non-leaf node contains the hash of its children.  For example, the hash `0-0` is hash of data block `B1`, the hash `0-1` is the hash of data block `B2`, and the hash `0` is the hash of its children hashes `0-0` and `0-1`.  The Merkle root is the hash of the hashes `0` and `1`.  The leaf nodes are the data blocks.

We'll replace the ellipsis in each block with the hash (actually, only the first 7 digits to conserve space) as we compute them.

Ok, let's start by hashing each data block, the values of which are shown below:

		B1 = "Huck"
		B2 = "Utley"
		B3 = "Molly"
		B4 = "Pete"

	# Compute 0-0.
	~:$ echo -n Huck | sha256sum | cut -d\  -f1
	e2021dbb7af292fc35f9b3985384b21f3e806627fa0958a61b6520307c7b7b63

	# Compute 0-1.
	~:$ echo -n Utley | sha256sum | cut -d\  -f1
	3673ae157c18328e372b6a9cbf952c81cde8c46e93a4098cedaf0fdb391d85d1

	# Compute 1-0.
	~:$ echo -n Molly | sha256sum | cut -d\  -f1
	2683d9b5359f8fb2c5dd4588d50d7f027e816a23d6f70c9d081b5c16f6bfcc6d

	# Compute 1-1.
	~:$ echo -n Pete | sha256sum | cut -d\  -f1
	5da537f3dd4cfae897c128427e64ef2b75b6e96da3f85cdcddd9186e5b736e08

We'll update our tree below with the actual hash values:

                            +---------+
                            |  Merkle |
                            |   Root  |
                            |         |
                            |   ....  |
                            +---------+
                           /           \
                          /             \
               +---------+               +---------+
               |    0    |               |    1    |
               |         |               |         |
               |   ....  |               |   ....  |
               +---------+               +---------+
                   / \                       / \
                  /   \                     /   \
         +-------+     +-------+   +-------+     +-------+
         |  0-0  |     |  0-1  |   |  1-0  |     |  1-1  |
         |       |     |       |   |       |     |       |
         |e2021db|     |3673ae1|   |2683d9b|     |5da537f|
         +-------+     +-------+   +-------+     +-------+
             |             |           |             |
          +----+        +----+      +----+        +----+
          | B1 |        | B2 |      | B3 |        | B4 |
          +----+        +----+      +----+        +----+

Let's compute the next level:

                            +---------+
                            |  Merkle |
                            |   Root  |
                            |         |
                            |   ....  |
                            +---------+
                           /           \
                          /             \
               +---------+               +---------+
               |    0    |               |    1    |
               |         |               |         |
               | c42d6bf |               | 3a858aa |
               +---------+               +---------+
                   / \                       / \
                  /   \                     /   \
         +-------+     +-------+   +-------+     +-------+
         |  0-0  |     |  0-1  |   |  1-0  |     |  1-1  |
         |       |     |       |   |       |     |       |
         |e2021db|     |3673ae1|   |2683d9b|     |5da537f|
         +-------+     +-------+   +-------+     +-------+
             |             |           |             |
          +----+        +----+      +----+        +----+
          | B1 |        | B2 |      | B3 |        | B4 |
          +----+        +----+      +----+        +----+

	# Compute 0.
	~:$ huckutley=$(echo -n $(
	echo -n Huck | sha256sum | cut -d\  -f1
	)$(
	echo -n Utley | sha256sum | cut -d\  -f1
	) | sha256sum | cut -d\  -f1
	> )
	~:$ echo $huckutley
	c42d6bf2417149b36269893e342dea71552caa30ebed488a4136d5ef86759fd5

	# Compute 1.
	~:$ mollypete=$(echo -n $(
	echo -n Molly | sha256sum | cut -d\  -f1
	)$(
	echo -n Pete | sha256sum | cut -d\  -f1
	) | sha256sum | cut -d\  -f1
	)
	~:$ echo $mollypete 
	3a858aa74d88460d3ba79a2b51cb6ea25823241e58ac3d3fc07e5b317d53f178

                            +---------+
                            |  Merkle |
                            |   Root  |
                            |         |
                            | 6258f77 |
                            +---------+
                           /           \
                          /             \
               +---------+               +---------+
               |    0    |               |    1    |
               |         |               |         |
               | c42d6bf |               | 3a858aa |
               +---------+               +---------+
                   / \                       / \
                  /   \                     /   \
         +-------+     +-------+   +-------+     +-------+
         |  0-0  |     |  0-1  |   |  1-0  |     |  1-1  |
         |       |     |       |   |       |     |       |
         |e2021db|     |3673ae1|   |2683d9b|     |5da537f|
         +-------+     +-------+   +-------+     +-------+
             |             |           |             |
          +----+        +----+      +----+        +----+
          | B1 |        | B2 |      | B3 |        | B4 |
          +----+        +----+      +----+        +----+

Finally, we'll compute the Merkle root:

	~:$ echo -n $huckutley$mollypete | sha256sum | cut -d\  -f1
	6258f7730346d57551842b81a4366e1ba24762b3df611cc7de1a672945a5faa4

Now that we understand how the tree is constructed and why the Merkle root is important, let's present a Merkle proof and with it verify that our block is indeed stored in the tree.

Let's say that I want to know if the block `B3` is in the tree.  Since it is publicly available, I already have the Merkle root (obtained from a trusted peer, obtained from a block in the blockchain, etc.), and I obviously know the hashed value of `B3` since it is either my transaction or some data to which I have access.

I ask for a proof to verify that my block is contained in the tree, so I'm given the hashes `1-1` and `0`.  These are the sibling nodes which we wouldn't otherwise know but need to use to calculate the Merkle root hash to see if there's a match.  And, if there's a match, then we can be confident that the tree contains our block.

So, these are our component parts:

	Merkle root:
		6258f7730346d57551842b81a4366e1ba24762b3df611cc7de1a672945a5faa4

	Hash 0:
		c42d6bf2417149b36269893e342dea71552caa30ebed488a4136d5ef86759fd5

	Hash 1-1:
		5da537f3dd4cfae897c128427e64ef2b75b6e96da3f85cdcddd9186e5b736e08

	Block B3 ("Molly"):
		2683d9b5359f8fb2c5dd4588d50d7f027e816a23d6f70c9d081b5c16f6bfcc6d

Now, we simply verify the hashes!

	~:$ hash11=5da537f3dd4cfae897c128427e64ef2b75b6e96da3f85cdcddd9186e5b736e08
	~:$ hash1=$(echo -n 2683d9b5359f8fb2c5dd4588d50d7f027e816a23d6f70c9d081b5c16f6bfcc6d"$hash11" | sha256sum | cut -d\  -f1)
	~:$ echo $hash1
	3a858aa74d88460d3ba79a2b51cb6ea25823241e58ac3d3fc07e5b317d53f178
	~:$ echo -n c42d6bf2417149b36269893e342dea71552caa30ebed488a4136d5ef86759fd5"$hash1" | sha256sum | cut -d\  -f1
	6258f7730346d57551842b81a4366e1ba24762b3df611cc7de1a672945a5faa4

And, there's our root!  We were able to verify that our computation of the Merkle root hash given our proof is indeed the same root hash.  Weeeeeeeeeeeeeeeeeee


> Note that I wouldn't normally create variables here (and I wouldn't have in the other examples, either).  I'm only doing it so there's a clear delineation between the hashes, and it's easier to see the process.

# A Example in Golang

Next, let's look at an [implementation of a Merkle tree written in Go].  Wait a minute, it's mine!  Weeeeeeeeeeeeeeeeeee

There are several [good examples] out there.  I studied three or four of them and then wrote my own, incorporating ideas from each.

My Merkle tree implementation is a binary tree, as were all of the ones I studied.  This is important to keep in mind as it absolutely affected the design choices made.

I'll briefly outline the steps:

1. Create the tree from the `Tree` struct and create the blocks (the raw data) and the leaves (the `Node`s) from the byte arrays passed in the constructor and/or in the `AppendBlocks` method.  If there are an odd number of blocks, create another which is a pointer to the previous node so every parent will have two children.

2. Generate the tree from the leaf nodes.  Calculate its height and then create the `Levels` field to easily reference any node in the tree.  The recursive helper function to create the node lists for each level will also create a pointer to the previous node for any tree rows that have an odd number so every parent will have two children.

3. Verifying the Merkle root hash is simple.  We just recursively walk down the tree and verify a "parent" node's `Left` and `Right` pointers at each step.  We'll know when to stop when reaching the leaf nodes, which of course don't have any children.

4. Verifying that a value has been stored in the tree is also simple, thanks to the `Levels` field of arrays of `Node`s.  The important bit is to use the index of the block to verify and the next level integer to lookup the parent node in the `Levels` field.  This is possible because of the logarithmic properties of a binary tree, and we accomplish this lookup by using bit shifting and modular arithmetic.  The `Node` and its sibling hashes are checked against the parent, and if they are equal the tree is continued to be traversed until it reaches the root node, at which point the Merkle root hash is verified.

Some of the most interesting functions are the ones where bitwise operations are performed to calculate the height of the tree.  See the `isPowerof2`, `log2` and `nextPowerOf2` helpers (see [this article] for a ton more examples).  Bitwise operations are, of course, awesome, and I highly encourage you to dig into them to understand why they work.

> If you made it this far, here's a fun fact!
>
> As a baseball fan, I had heard before of the Merkle family.  He is the grandnephew of [Fred Merkle], a famous ballplayer.

[Merkle tree]: https://en.wikipedia.org/wiki/Merkle_tree
[Ralph Merkle]: https://en.wikipedia.org/wiki/Ralph_Merkle
[binary trees]: https://en.wikipedia.org/wiki/Binary_tree
[OpenSSL]: /2018/07/17/on-openssl/
[implementation of a Merkle tree written in Go]: https://github.com/btoll/merkle-tree
[good examples]: https://github.com/cbergoon/merkletree
[this article]: http://graphics.stanford.edu/~seander/bithacks.html
[Fred Merkle]: https://en.wikipedia.org/wiki/Fred_Merkle

