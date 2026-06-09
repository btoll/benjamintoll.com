+++
title = "On Creating Binary Trees From Arrays"
date = "2026-06-07T22:43:12-04:00"

+++


- [Introduction](#introduction)
- [Preorder and Inorder](#preorder-and-inorder)
- [Postorder and Inorder](#postorder-and-inorder)
- [Complete Binary Tree](#complete-binary-tree)
- [Summary](#summary)
- [References](#references)

---

## Introduction

This article is one of a series which focuses on simple algorithms and data structures.  The series has won many industry awards, and my mom likes it.

Today we're going to build binary trees from simple arrays.  This is very interesting stuff.  It may also come handy in an interview, I don't know, and who can know, those interviewers are so dang smart.

Let's begin.

## Preorder and Inorder

We'll start by creating the [binary tree] from a `preorder` and an `inorder` array.  Both are necessary, and you can't build the tree with just one.  Tars.

Recall that there are three ways to traverse the nodes of a tree:

- `preorder`
    + root -> left child -> right child
- `inorder`
    + left child -> root -> right child
- `postorder`
    + left child -> right child -> root

This knowledge will come in handy when we later verify our algorithms.

Here are some interesting properties about the `preorder` array.  Since we've just seen that the `root` node is the first visited, this will always be the first element of the `preorder` array.  In other words, `preorder[0]` is the (will be) root of the binary tree, and subsequent calls will always have the root of any subtree as the first element in these smaller arrays.

Note that with just the `preorder` array alone you cannot determine the shape of the binary tree.  In fact, without the presence of the `inorder` array, the `preorder` array is meaningless.  That's right, I said it.

For example, take a gander at this `preorder` array:

```go
[1, 2, 3, 4]
```

It could look like this:

        1
       / \
      2   3
     /
    4

Or, this:

        1
         \
          2
         / \
        3   4

Or, even this:

        1
         \
          2
           \
            3
             \
              4

Without the needed context of the `inorder` array, nobody knows, not even [The Shadow]!

Holy zap!

----

Ok, now we've established that there also has to be an `inorder` array to build a binary tree, let's turn to why the `inorder` array is so important.  Given a root value, it can be used to determine all of the left and right children of the root value.  Let's look at how to do that now.

> Since we're using Go, we'll now refer to the arrays as slices, since that is what we'll be using.  For all other languages, you can continue to think of them as array.

Let's look at all of the information we'd be given in an interview to create the trees.  Here are the slices in Go format:

```go
preorder := []int{1, 2, 4, 5, 3, 6, 7}
inorder := []int{4, 2, 5, 1, 6, 3, 7}
```

And, here is what the constructed tree will look like, although you probably wouldn't be given this info (it's just nice to look at, and it took me ages to draw):

        1
       / \
      2   3
     / \ / \
    4  5 6  7

Looking at both slices and the shape of the tree, we can start to extract the information from the two slices that will help guide us to write our algorithm to build this particular binary tree.

1. Locate the root (`preorder[0]`) in the `preorder` slice.
1. Traverse the `inorder` slice until the value is located and save the slice index (called the `inorderIndex` in the algorithms below).
1. Everything to the left of that element in the `inorder` slice belongs to the left subtree, and everything to the right belongs to the right subtree.  These slices of the `inorder` slice are passed to each recursive call.
1. Use the saved index to further slice up the `preorder` slice and pass to each recursive call.

Pretty cool.

The crux of the entire thing is the index of the root node in the `inorder` slice, the `inorderIndex`.  Let's demonstrate it!

Here is the code that builds the binary tree:

```go
package main

import "fmt"

type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

func buildBinaryTree(preorder []int, inorder []int) *TreeNode {
    if len(preorder) == 0 || len(inorder) == 0 {
        return nil
    }
    root := preorder[0]
    inorderIndex := 0
    for i, val := range inorder {
        if root == val {
            inorderIndex = i
            break
        }
    }
    return &TreeNode{
        Val:   root,
        Left:  buildBinaryTree(preorder[1:inorderIndex+1], inorder[:inorderIndex]),
        Right: buildBinaryTree(preorder[inorderIndex+1:], inorder[inorderIndex+1:]),
    }
}

func main() {
    preorder := []int{1, 2, 4, 5, 3, 6, 7}
    inorder := []int{4, 2, 5, 1, 6, 3, 7}
    root := buildBinaryTree(preorder, inorder)
    fmt.Printf("%#v\n", root)
}
```

Note the return value of each call (`*TreeNode`), and each of the slices for both invocations of the `buildBinaryTree` function use the `inorderIndex` to further slice up each respective slice, reducing the number of elements in each new slice until the base case is matched.

Here are all of the recursive calls:

```go
buildBinaryTree([1 2 4 5 3 6 7], [4 2 5 1 6 3 7])
root  -> 1
left  -> buildBinaryTree([2 4 5], [4 2 5])
right -> buildBinaryTree([3 6 7], [6 3 7])

buildBinaryTree([2 4 5], [4 2 5])
root  -> 2
left  -> buildBinaryTree([4], [4])
right -> buildBinaryTree([5], [5])

buildBinaryTree([4], [4])
root  -> 4
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---

buildBinaryTree([5], [5])
root  -> 5
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---

buildBinaryTree([3 6 7], [6 3 7])
root  -> 3
left  -> buildBinaryTree([6], [6])
right -> buildBinaryTree([7], [7])

buildBinaryTree([6], [6])
root  -> 6
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---

buildBinaryTree([7], [7])
root  -> 7
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---
```

This will produce:

```go
&main.TreeNode{Val:1, Left:(*main.TreeNode)(0x2e053bf282e8), Right:(*main.TreeNode)(0x2e053bf284e0)}
```

This is illustrative, but it's not helpful when needing to validate the actual tree structure.  Let's now bring this full circle and do both a `preorder` and an `inorder` traversal, capturing the output of both operations:

```go
func preorderTraversal(node *TreeNode, res []int) []int {
    if node == nil {
        return res
    }
    res = append(res, node.Val)
    res = preorderTraversal(node.Left, res)
    return preorderTraversal(node.Right, res)
}

func inorderTraversal(node *TreeNode, res []int) []int {
    if node == nil {
        return res
    }
    res = inorderTraversal(node.Left, res)
    res = append(res, node.Val)
    return inorderTraversal(node.Right, res)
}
```

We'll add that to our program and expand our entry point:

```go
func main() {
    preorder := []int{1, 2, 4, 5, 3, 6, 7}
    inorder := []int{4, 2, 5, 1, 6, 3, 7}
    root := buildBinaryTree(preorder, inorder)
    fmt.Printf("preorder=%#v\n", preorderTraversal(root, nil))
    fmt.Printf("inorder=%#v\n", inorderTraversal(root, nil))
}
```

Let's look at the result of the traversals:

```go
preorder=[]int{1, 2, 4, 5, 3, 6, 7}
inorder=[]int{4, 2, 5, 1, 6, 3, 7}
```

That looks familiar!  What we've essentially done, besides proving the correctness of our code, is serialize the binary tree so that it can later be recreated.  For example, you could put it in your pocket and then go get a nice coffee.  But, I can't tell you how to live your life.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Postorder and Inorder

Building a binary tree from a `postorder` array is very similar to building one from a `preorder` array, both in theory and in practice.  For instance, instead of the first element, the root is always the last, and the `inorderIndex` will be the key to understanding the algorithm.

We'll use the following slices, which is the same `inorder` slice as before.  As we'll see, this will construct the same binary tree:

```go
postorder=[]int{4, 5, 2, 6, 7, 3, 1}
inorder=[]int{4, 2, 5, 1, 6, 3, 7}
```

Here are the steps that we'll take to construct the algorithm, which is very similar to the previous one:

1. Locate the root (`postorder[len(postorder)-1]`) in the `postorder` slice.
1. Traverse the `inorder` slice until the value is located and save the slice index (`inorderIndex`).
1. Everything to the left of that element in the `inorder` slice belongs to the left subtree, and everything to the right belongs to the right subtree.  These slices of the `inorder` slice are passed to each recursive call.
1. Use the saved index to further slice up the `postorder` slice and pass to each recursive call.

Essentially the same steps, just slightly different ways of slicing up the slices when calling each recursion.

Here is the code that builds the binary tree:

```go
func buildBinaryTree(postorder []int, inorder []int) *TreeNode {
    if len(postorder) == 0 || len(inorder) == 0 {
        return nil
    }
    root := postorder[len(postorder)-1]
    inorderIndex := 0
    for i, val := range inorder {
        if root == val {
            inorderIndex = i
            break
        }
    }
    return &TreeNode{
        Val:   root,
        Left:  buildBinaryTree(postorder[:inorderIndex], inorder[:inorderIndex]),
        Right: buildBinaryTree(postorder[inorderIndex:len(postorder)-1], inorder[inorderIndex+1:]),
    }
}
```

Here are all of the recursive calls:

```go
buildBinaryTree([4 5 2 6 7 3 1], [4 2 5 1 6 3 7])
root  -> 1
left  -> buildBinaryTree([4 5 2], [4 2 5])
right -> buildBinaryTree([6 7 3], [6 3 7])

buildBinaryTree([4 5 2], [4 2 5])
root  -> 2
left  -> buildBinaryTree([4], [4])
right -> buildBinaryTree([5], [5])

buildBinaryTree([4], [4])
root  -> 4
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---

buildBinaryTree([5], [5])
root  -> 5
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---

buildBinaryTree([6 7 3], [6 3 7])
root  -> 3
left  -> buildBinaryTree([6], [6])
right -> buildBinaryTree([7], [7])

buildBinaryTree([6], [6])
root  -> 6
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---

buildBinaryTree([7], [7])
root  -> 7
left  -> buildBinaryTree([], [])
right -> buildBinaryTree([], [])
--- base case ---
--- base case ---
```

This will produce:

```go
&main.TreeNode{Val:1, Left:(*main.TreeNode)(0x3a63a1802240), Right:(*main.TreeNode)(0x3a63a1802438)}
```

And, here is the simple recursive function we can use to verify the correctness of the binary tree:

```go
func postorderTraversal(node *TreeNode) []int {
    res := []int{}
    var dfs func(*TreeNode)
    dfs = func(node *TreeNode) {
        if node == nil {
            return
        }
        dfs(node.Left)
        dfs(node.Right)
        res = append(res, node.Val)
    }
    dfs(node)
    return res
}
```

The entry point:

```go
func main() {
    postorder := []int{4, 5, 2, 6, 7, 3, 1}
    inorder := []int{4, 2, 5, 1, 6, 3, 7}
    root := buildBinaryTree(postorder, inorder)
    fmt.Printf("preorder=%#v\n", postorderTraversal(root, nil))
    fmt.Printf("inorder=%#v\n", inorderTraversal(root))
}
```

And, the result:

```go
inorder=[]int{4, 2, 5, 1, 6, 3, 7}
postorder=[]int{4, 5, 2, 6, 7, 3, 1}
```

> Yes, the `postorderTraversal` has a different structure than the previous two depth-first search traversals, and, as such, has a different function prototype.

## Complete Binary Tree

Here's a bonus section for you, little fella.

We *can* create a complete binary tree from only a single array.  Of course, the word **complete** is very important in this context.  If it's not a complete binary tree, you must have more information than one array will provide to construct the binary tree, as we've seen in the previous sections.

But, what is a [complete binary tree], you ask breathlessly?  From Wikipedia:

> A complete binary tree is a binary tree in which every level, except possibly the last, is completely filled, and all nodes in the last level are as far left as possible. It can have between 1 and 2h nodes at the last level h.  A perfect tree is therefore always complete but a complete tree is not always perfect.

This algorithm uses a simple formula to determine each node's children:

- left child
    + 2i + 1
- right child
    + 2i + 2

> If the array were 1-based, it would be `2i` and `2i + 1`, respectively.

```go
func makeCompleteBinaryTree(nodes []int) *TreeNode {
	if len(nodes) == 0 {
		return nil
	}
	treeNodes := make([]*TreeNode, len(nodes))
	for i, v := range nodes {
		treeNodes[i] = &TreeNode{Val: v}
	}
	for i := range nodes {
		left := 2*i + 1
		right := 2*i + 2
		if left < len(nodes) {
			treeNodes[i].Left = treeNodes[left]
		}
		if right < len(nodes) {
			treeNodes[i].Right = treeNodes[right]
		}
	}
	return treeNodes[0]
}
```

We can verify the correctness of the above algorithm by doing a breadth-first search on the resulting root node.  This we walk level-by-level, and, if correct, will return the same slice that we used to make the complete binary tree:

```go
func bfs(root *TreeNode) []int {
	q := []*TreeNode{root}
	nodes := []int{root.Val}
	for len(q) > 0 {
		node := q[0]
		q = q[1:]
		if node.Left != nil {
			nodes = append(nodes, node.Left.Val)
			q = append(q, node.Left)
		}
		if node.Right != nil {
			nodes = append(nodes, node.Right.Val)
			q = append(q, node.Right)
		}
	}
	return nodes
}
```

## Summary

This article was so good that I think I may have piddled in my trousers.

## References

- [binary tree]
- [binary search tree]

[binary tree]: https://en.wikipedia.org/wiki/Binary_tree
[binary search tree]: https://en.wikipedia.org/wiki/Binary_search_tree
[The Shadow]: https://en.wikipedia.org/wiki/The_Shadow
[complete binary tree]: https://en.wikipedia.org/wiki/Binary_tree#complete

