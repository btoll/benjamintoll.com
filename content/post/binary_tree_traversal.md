+++
title = "On Binary Tree Traversal"
date = "2021-06-07T22:00:32-04:00"

+++

> This post works best while listening to [`Dogs`].

Today let's take a look at several ways to traverse a [binary tree], both iteratively and recursively.  Then, [we'll look at another algorithm](#morris-traversal) that I think will make us all piddle a bit in our trousers.

As usual, we'll be working with this TreeNode class implementation:

[`Tree.py`]

<pre class="math">
class TreeNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None
</pre>

And we'll construct the following tree for each example:

<pre class="math">
       1
     /   \
    /     \
   2       3
  / \       \
 /   \       \
4     5       6


root             = TreeNode(1)
root.left        = TreeNode(2)
root.left.left   = TreeNode(4)
root.left.right  = TreeNode(5)
root.right       = TreeNode(3)
root.right.right = TreeNode(6)
</pre>

---

Here are the three main ways of applying a [depth-first search] to order the nodes of a tree traversal that use a stack:

- [preorder](#preorder)
- [inorder](#inorder)
- [postorder](#postorder)

For each, I'll post an iterative and a recursive solution.

Lastly, we'll look at another algorithm that doesn't use either a stack or recursion:

- [Morris Traversal](#morris-traversal)

---

<!--
Recall that a tree is a non-directed acyclic graph.

Inorder traversal of BST is an array sorted in the ascending order.
-->

# Preorder

### Recursive

<pre class="math">
from Tree import TreeNode


def preorder(root, visited=[]):
    if not root:
        return

    visited.append(root.value)
    preorder(root.left, visited)
    preorder(root.right, visited)

    return visited


print(preorder(root))
# [1, 2, 4, 5, 3, 6]
</pre>

- Time complexity: O(N)
- Space complexity: O(N)

### Iterative

<pre class="math">
from Tree import TreeNode


def preorder(root):
    stack = [root]
    visited = []

    while stack:
        node = stack.pop()
        visited.append(node.value)

        if node.right:                      (1)
            stack.append(node.right)
        if node.left:
            stack.append(node.left)

    return visited


print(preorder(root))
# [1, 2, 4, 5, 3, 6]
</pre>

Notes:

1. Note that the order that we push nodes onto the stack is critical.  The right node must be pushed on before the left node to maintain the correct order, as the left node will then be popped first.

- Time complexity: O(N)
- Space complexity: O(N)

---

# Inorder

### Recursive

<pre class="math">
from Tree import TreeNode


def inorder(root, visited=[]):
    if not root:
        return

    inorder(root.left, visited)
    visited.append(root.value)
    inorder(root.right, visited)

    return visited


print(inorder(root))
# [4, 2, 5, 1, 3, 6]
</pre>

- Time complexity: O(N)
- Space complexity: O(N)

### Iterative

<pre class="math">
from Tree import TreeNode


def inorder(root):
    stack = []                              (1)
    current = root
    visited = []

    while current or stack:
        while current:                      (2)
            stack.append(current)
            current = current.left

        current = stack.pop()               (3)
        visited.append(current.value)
        current = current.right             (4)

    return visited


print(inorder(root))
# [4, 2, 5, 1, 3, 6]
</pre>

Notes:

1. Unlike other iterative traversals, we don't start with the root already in the stack.
1. Traverse as far left as we can.
1. Pop the leftmost node.
1. Assume there's a right node.  If not, the next left node will be popped, and then we'll again assume there's a right node.

- Time complexity: O(N)
- Space complexity: O(N)

---

# Postorder

### Recursive

<pre class="math">
from Tree import TreeNode


def postorder(root, visited=[]):
    if not root:
        return

    postorder(root.left)
    postorder(root.right)
    visited.append(root.value)

    return visited


print(postorder(root))
# [4, 5, 2, 6, 3, 1]
</pre>

- Time complexity: O(N)
- Space complexity: O(N)

### Iterative

<pre class="math">
from Tree import TreeNode


# Iterative, a queue and a stack.
def postorder(root):
    stack = [root]                      (1)
    queue = []

    while stack:
        node = stack.pop()
        queue.insert(0, node.value)

        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)

    return queue


print(postorder(root))
# [4, 5, 2, 6, 3, 1]
</pre>

Notes:

1. This algorithm, unlike the others, uses both a stack and a queue.

- Time complexity: O(N)
- Space complexity: O(N)

---

# Morris Traversal

> This type of traversal can be used for preorder, inorder and postorder traversals.

Let's now take a look at an implementation that does not use a stack or recursion to traverse the tree.  This is the [Morris traversal] or [threaded binary tree] traversal.  Though more advanced than the previous ways, it is well worth putting in the effort to understand how this works because it's fucking cool.

So, the key to how this works is its way of backtracking to previous nodes.  In the iterative version, we use a stack, pushing and popping and bipping and bopping, to get back to nodes higher in the tree structure (re: closer to the root) to process them.  The recursive version uses a similar method, but one that's "builtin" and doesn't require us to allocate an additional data structure:  the [call stack].

Morris traversal, on the other hand, creates links or pointers to the previous nodes, obviating the need for a stack.  For example, when traversing inorder, the algorithm creates a pointer from the inorder predecessor node to the root node.  For the root node, the inorder predecessor is the rightmost node of its left subtree.

Let's take a peek at some tree structures:

<pre class="math">
   1
  /
 /
2
</pre>

The node with the value 2 is the inorder predecessor node of the root node with the value 1.  The Morris traversal algorithm will create a pointer from node 2 to node 1.

<pre class="math">
       1
     /   \
    /     \
   2       3
  / \       \
 /   \       \
4     5       6
</pre>

The node with the value 5 is the inorder predecessor node of the root node with the value 1.  The Morris traversal algorithm will create a pointer from node 5 to node 1.

Those aren't the only pointers that are created, though.  It will create a link for every inorder predecessor node that's found in **any** left subtree.

Yes, this algorithm will temporarily mutate the tree, but it will clean up after itself and remove the pointers.

> I've seen accepted solutions on at least one major coding site that doesn't cleanup the tree after it's been mutated.  Don't use this solution, it's for chumps!  Be a hero and revert the tree back to its original state.

<pre class="math">
from Tree import TreeNode


def inorder(root):
    current = root
    visited = []

    while current:
        if not current.left:                                                (1)
            visited.append(current.value)
            current = current.right
        else:
            predecessor = current.left                                      (2)
            while predecessor.right and predecessor.right is not current:   (3)
                predecessor = predecessor.right
            if not predecessor.right:                                       (4)
                predecessor.right = current
                current = current.left
            else:
                predecessor.right = None                                    (5)
                visited.append(current.value)
                current = current.right

    return visited


print(inorder(root))
# [4, 2, 5, 1, 3, 6]
</pre>

Notes:

1. If not left, go right.  This doesn't mean that it won't go left in future iterations.  That is dependent upon the subtree of `current.right`.
1. Find the inorder predecessor node.  This is initially set to the `current.left` node, which we know is present because we just checked for its existence.  Recall that this is the node that will then have the pointer back to the root node.
1. We find the rightmost node of the left subtree.  Note that it's necessary to check that the `predecessor.right` is **not** the `current` node.  This occurs when a link/pointer has already been established.  If not for this check, we would get into an infinite loop.
1. If there is no `predecessor.right` node, than we know two things:
    - We're at the rightmost node of the left subtree.  This is the inorder predecessor.
    - We need to establish a new root.  (Re-)Setting `current` will allow us to look for more left subtrees with which to establish links.
1. Sever the link by nulling out the pointer.  This is how the cleanup occurs after we've traversed the subtree.

- Time complexity: O(N)
- Space complexity: O(1)

# References

- [Explain Morris inorder tree traversal without using stacks or recursion](https://stackoverflow.com/questions/5502916/explain-morris-inorder-tree-traversal-without-using-stacks-or-recursion)
- [Morris Inorder Tree Traversal](https://www.youtube.com/watch?v=wGXB9OWhPTg)

[`Dogs`]: https://www.youtube.com/watch?v=4QA30qkRYy8
[binary tree]: https://en.wikipedia.org/wiki/Binary_tree
[`Tree.py`]: https://github.com/btoll/howto-algorithm/blob/master/python/tree/traversal/Tree.py
[depth-first search]: https://en.wikipedia.org/wiki/Depth-first_search
[Morris traversal]: https://en.wikipedia.org/wiki/Tree_traversal#Morris_in-order_traversal_using_threading
[threaded binary tree]: https://en.wikipedia.org/wiki/Threaded_binary_tree
[call stack]: https://en.wikipedia.org/wiki/Call_stack

