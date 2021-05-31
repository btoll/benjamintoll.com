+++
title = "On Making a Complete Binary Tree"
date = "2021-05-22T00:36:31-04:00"

+++

A fun exercise is constructing a specific type of [binary tree] from a list or array: a [complete binary tree].  In fact, it proved to be even more fun than the time I broke my foot playing wiffle ball.

A binary tree is a tree data structure where nodes can have 0 - 2 child nodes.  A *complete* binary tree is one where every level is completely filled, with the possible exception of the last.  In addition, the nodes of the last level (the leaves) are left-aligned.

In other words, every node but the leaf nodes has exactly two children, and if one were to traverse the nodes in order from the root to the last node in a [breadth-first search](#breadth-first-search), there would be no empty nodes.

A complete binary tree:

<pre class="math">
           0
         /   \
       1       2
     /   \
    3     4
</pre>

A complete (perfect) binary tree:

<pre class="math">
           0
         /   \
       1       2
     /   \   /   \
    3     4 5     6
</pre>

Not a complete binary tree:

<pre class="math">
           0
         /   \
       1       2
     /       /   \
    3      4       5
</pre>

Not a complete binary tree:

<pre class="math">
           0
         /
       1
     /   \
    3     4
</pre>

# The Algorithm

Constructing a complete binary tree from a list is easy if the algorithm is known\*.  For every node `n`, the children will be `2n + 1` (left) and `2n + 2` (right).

> The nodes in tree levels increase exponentially (base 2).  In other words, they double in size for every level going down and are halved going back up to the root.

# A Simple Example

Let's see an example of this using Python:

`make_tree.py`

<pre class="math">
size = 9
arr = [n for n in range(size)]

print(f"Tree of {size} nodes:")

for n in range(len(arr) // 2):
    print(f"\nparent node {arr[n]}")

    print(f"left child {arr[2*i+n]}")

    if 2*n+2 < len(arr):
        print(f"right child {arr[2*n+2]}")
</pre>

```
$ python make_tree.py
Tree of 9 nodes:

parent node 0
left child 1
right child 2

parent node 1
left child 3
right child 4

parent node 2
left child 5
right child 6

parent node 3
left child 7
right child 8
```

Which looks like this:

<pre class="math">
           0
         /   \
       1       2
     /   \   /   \
    3     4 5     6
  /   \
 7     8
</pre>

> It helps to draw it out with pencil and paper.

# A Possible Implementation

Let's take a look at a `Tree.py` module.  It contains two classes, `Node` and `Tree`:

<pre class="math">
class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None
</pre>

<pre class="math">
class Tree:
    def __init__(self, nodelist):
        self.nodes = nodelist[::]                                               (1)
        self.root = None
        self.make_tree()

    def display(self):                                                          (2)
        print(self.nodes)

    def get_root(self):
        return self.root

    def make_tree(self):
        # Root must call Node, all other parents will already
        # have been instanced and can just be looked-up.
        self.nodes[0] = self.root = Node(self.nodes[0])
        for i in range(len(self.nodes) // 2):                                   (3)
            parent = self.nodes[i]
            self.nodes[2*i+1] = parent.left = Node(self.nodes[2*i+1])           (4)
            if 2*i+2 < len(self.nodes):
                self.nodes[2*i+2] = parent.right = Node(self.nodes[2*i+2])
</pre>

Notes:

1. Let's be a good citizen and make an internal copy of the list instead of mutating the one from the caller.
1. Instead of printing, make cool `ascii` art here :)
1. Integer division is used here as only the first half of the list is needed.  Why?  The parent indices are in the first half of the list and the leaves are in the latter half.  The parent indices will be able to reference their children and instance them as `Nodes` using the algorithm presented at the beginning of this article, so it's not necessary to explicitly access them by iterating over the entire range.
1. For every `Node` created, add a reference to the `parent` and overwrite the element in its respective position in the internal list (the original element is just the value which is then overwritten by the newly-instanced `Node`.  The original value can then be referenced by `Node.value`).

> Classes aren't necessary, of course, but a lot of people seem to really like them.

# Searching

Since trees are just a type of graph, the most common ways to iterate through their nodes are the same ones you'd expect of any graph:

- breadth-first search
- depth-first search

### Breadth-First Search

[Breadth-first search] (BFS) will use a queue to iterate through the nodes.  This will ensure that each node will be looked at in-order, level-by-level, instead of first going down to a leaf and backtracking (as depth-first search does, as we'll see in a moment).

Note that BFS must push the `Node.left` prior to the `Node.right` to maintain the proper search order.

`bfs.py`

<pre class="math">
from Tree import Tree


def breadth_first_search(root):
    queue = [root]
    visited = []

    while queue:
        node = queue.pop()
        visited.append(node.value)

        if node.left:
            queue.insert(0, node.left)

        if node.right:
            queue.insert(0, node.right)

    return visited


# Construct the tree from the list and print the search order.
nodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
tree = Tree(nodes)
print(breadth_first_search(tree.get_root()))
</pre>

### Depth-First Search

[Depth-first search] (DFS) takes the opposite strategy of the BFS, in the fact that it uses a stack data structure to iterate through the list of nodes.

In addition, the order in which the nodes are appended is important.  DFS must append to `Node.right` before `Node.left` to maintain proper iterative order.  As we've seen, BFS uses the opposite approach of `Node.left` before `Node.right`.

`dfs.py`

<pre class="math">
from Tree import Tree


def depth_first_search(root):
    stack = [root]
    visited = []

    while stack:
        node = stack.pop()
        visited.append(node.value)

        if node.right:
            stack.append(node.right)

        if node.left:
            stack.append(node.left)

    return visited


# Construct the tree from the list and print the search order.
nodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
tree = Tree(nodes)
print(depth_first_search(tree.get_root()))
</pre>

> Since trees are directed, acylcic graphs, there's no need to keep track of the already-visited nodes!  Weeeeeeeeeee

---

Fun fact: for a [perfect binary tree] with `n` levels, the total number of nodes can be calculated thusly:

<pre class="math">
2<sup>n</sup> - 1
</pre>

---

\* Derp.

[binary tree]: https://en.wikipedia.org/wiki/Binary_tree
[complete binary tree]: https://en.wikipedia.org/wiki/Binary_tree#Types_of_binary_trees
[perfect binary tree]: https://en.wikipedia.org/wiki/Binary_tree#Types_of_binary_trees
[Breadth-first search]: https://en.wikipedia.org/wiki/Breadth-first_search
[depth-first search]: https://en.wikipedia.org/wiki/Depth-first_search

