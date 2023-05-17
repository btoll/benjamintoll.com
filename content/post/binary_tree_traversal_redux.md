+++
title = "On Binary Tree Traversal, Redux"
date = "2023-03-13T01:58:06-04:00"

+++

This is a companion piece to an article I did a few years ago called [`On Binary Tree Traversal`](/2021/06/07/on-binary-tree-traversal/) in which I coded example of `preorder`, `inorder` and `postorder` depth-first search binary tree traversal algorithms in Python, both iteratively and recursively.

In this follow-up, I'd like to do the same in Go and add a few more traversal algorithms.

- [Introduction](#introduction)
    + [Stack](#stack)
    + [Queue](#queue)
- [Tree Traversal Properites](#tree-traversal-properties)
- [Queue Implementation](#queue-implementation)
- [Binary Tree Traversal](#binary-tree-traversal)
    + [Depth-First Search](#depth-first-search)
        - [Preorder](#preorder)
        - [Inorder](#inorder)
        - [Postorder](#postorder)
    + [Breadth-First Search](#breadth-first-search)
        - [Level Order](#level-order)
- [Common Algorithms](#common-algorithms)
    + [Tree Height](#tree-height)
    + [Validate Binary Search Tree](#validate-binary-search-tree)
- [References](#references)

---

# Introduction

One of the reasons why I wanted to revisit tree traversal algorithms is because I understand them better now and can explicate them better than I could before.

For example, everybody regurgitates the same things about tree strategies, such as, "use a stack for depth-first search" and "use a queue for breadth-first search", and not much more information is offered.

Now, this isn't wrong, but it's rote.  We should all strive to do better.  Let's begin now.

## Stack

Why is a stack a preferred data structure for [depth-first search](https://en.wikipedia.org/wiki/Depth-first_search) (`DFS`)?  It's generally because the child nodes are to be inspected first in a `DFS` traversal algorithm, notably [`inorder`](#inorder) and [`postorder`](#preorder).

Recall that the order in which an element is added to or removed from a [stack data structure](https://en.wikipedia.org/wiki/Stack_(abstract_data_type)) is **last in, first out** (`LIFO`).

This is crucial for `DFS` because the child nodes need to be inspected first, and the way to do this is to push the parent node onto the stack before its child nodes.  This guarantees that when the node elements are popped off of the stack that they will be retrieved in the reverse order in which they were pushed onto the stack, thus allowing us to reach the child nodes first.

Let's try to visualize this.  Here is a complete binary search tree (of course, not all binary trees will be complete or will be binary search trees):

<pre style="background: #fff; color: black;">
       10
     /    \
    /      \
   7        25
  / \
 /   \
4     8
</pre>

When traversing a [binary search tree](https://en.wikipedia.org/wiki/Binary_search_tree) (`BST`), the order of the visited nodes will depend upon what you're trying to accomplish.  However, notably, and in stark contrast with a breadth-first search, a node will have its direct child nodes traversed *before* its sibling nodes (again, this is most apparent in the `inorder` and `postorder` traversals).

So, using the tree above, the nodes will be pushed onto the stack in the following order for a classic `preorder` `DFS` traversal:

`push(10)` -> `push(25)` -> `push(7)` -> `push(8)` -> `push(4)`

If the stack were an array, it would look like this:

`[10, 25, 7, 8, 4]`

Note that this isn't the final result.  Instead, this order guarantees the of the `preorder` `DFS` traversal, which is `parent -> left child -> right child`.

How is that?  Again, recall that a tree is made up of a number of smaller subtrees.  If we want to access the parent node's left child *before* the right child, which data structure will allow for it?  Think about how the nodes need to be positioned in the stack.

For a **last in, first out** ordered data structure, the left child node **must** be pushed onto the stack **after** the right child node:

`push(10)` -> `push(25)` -> `push(7)`

Thinking this through even further, it means that once this particular subtree has been inspected and pushed onto the stack, and more subtrees (for instance, where the left child node of the root node is now the parent node of its **own** child nodes), will be traversed in the same way, guaranteeing that all of the left subtrees will be traversed *before* any of the right subtrees.

> The ordering of the elements in the (`LIFO`) stack is the **opposite** order of a breadth-first search.

So, when someone says that a stack is the perfect data structure for a `DFS`, they're really saying all of the above, too.

> Note that recursive functions are perfect for `DFS` traversals, because the [function call stack](https://en.wikipedia.org/wiki/Call_stack) **is** a stack data structure.

## Queue

Right-o.  Now, let's take a look at a **first in, first out** (`FIFO`) data structure, the [queue](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)).  This is the go-to data structure for doing a [breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search) (`BFS`) traversal.

Now, using the tree above, the nodes will be pushed into the queue in the following order for a classic `level order` `BFS` traversal:

`push(10)` -> `push(7)` -> `push(25)` -> `push(4)` -> `push(8)`

If the queue were an array, it would look like this:

`[10, 7, 25, 4, 8]`

This reads the tree from left to right, level by level.  Notably, it is not possible to descended into the children of a node (the subtree) **before** the level is fully traversed.  This is why the queue is reached for when implementing a `BFS` traversal.

So, when someone says that a queue is the perfect data structure for a `BFS`, they're really saying all of the above, too.

# Tree Traversal Properites

The most important thing to do when approaching an algorithm is to stop and *think*.  Spend time ensuring that you know **exactly** what is being asked of you.  Spend time thinking about the inherent qualities of the data structures and the traversal strategies that you are thinking of employing in your solution.

> The *why* is often more important than the *how*.  Indeed, feeling confident in the former is often the key to the latter.

Here are some properties of different tree traversal strategies that are helpful to know:

- `preorder`
    + begins at the root and ends at the right-most node
    + will explore the roots before the leaves
    + can be used to create a copy of the tree as it traverses the tree nodes in order of insertion
        - in other words, create a copy of the tree by appending the nodes to an array in the order of traversal followed by inserting them into a new tree
- `inorder`
    + begins at the left-most node and ends at the right-most node
    + will get the values of the nodes in increasing order for a `BST`
- `postorder`
    + begins at the left-most node and ends at the root
    + will explore the leaves before the roots
        - can be used to delete an entire tree since it first visits the leaves

# Queue Implementation

The traversals that perform a breadth-first traversal will use the following queue implementation:

[`queue.go`](https://github.com/btoll/howto-go/blob/master/queue/queue.go)

```go
package queue

type Node struct {
	Data any
	Next *Node
}

type Queue struct {
	First  *Node
	Last   *Node
	Length int
}

func New() *Queue {
	return &Queue{
		First:  nil,
		Last:   nil,
		Length: 0,
	}
}

func (q *Queue) Dequeue() *Node {
	if q.First == nil {
		return nil
	}
	node := q.First
	if q.Length == 1 {
		q.First = nil
		q.Last = nil
	} else {
		q.First = q.First.Next
		node.Next = nil
	}
	q.Length -= 1
	return node
}

func (q *Queue) Enqueue(data any) *Node {
	node := &Node{
		Data: data,
		Next: nil,
	}
	if q.First == nil {
		q.First = node
		q.Last = node
	} else {
		q.Last.Next = node
		q.Last = node
	}
	q.Length += 1
	return node
}

func (q *Queue) IsEmpty() bool {
	if q.Length == 0 {
		return true
	}
	return false
}
```

# Binary Tree Traversal

All of the examples will use the following types and helper function(s):

```go
package tree

type Node struct {
	Value int
	Left  *Node
	Right *Node
}

type NodeStack []*Node
type Visited []int

func CreateNode(value int) *Node {
	return &Node{
		Value: value,
		Left:  nil,
		Right: nil,
	}
}
```

> Although the examples here are operating on [binary *search* trees](https://en.wikipedia.org/wiki/Binary_search_tree), they can be used on all binary trees.

## Depth-First Search

### Preorder

#### Recursive

```go
func __preorder(node *Node, visited []int) Visited {
	if node == nil {
		return visited
	}
	visited = append(visited, node.Value)
	visited = __preorder(node.Left, visited)
	visited = __preorder(node.Right, visited)
	return visited
}

func Preorder(node *Node) Visited {
	return __preorder(node, []int{})
}
```

- Time complexity: O(N)
- Space complexity: O(N)

#### Iterative

```go
func Preorder(node *Node) Visited {
	if node == nil {
		return nil
	}
	stack := NodeStack{node}
	visited := Visited{}
	var current *Node
	for len(stack) > 0 {
		current, stack = stack[len(stack)-1], stack[:len(stack)-1]
		visited = append(visited, current.Value)
		if current.Right != nil {
			stack = append(stack, current.Right)
		}
		if current.Left != nil {
			stack = append(stack, current.Left)
		}
	}
	return visited
}
```

Notes:

1. Note that the order that we push nodes onto the stack is critical.  The right node must be pushed on before the left node to maintain the correct order, as the left node will then be popped first.

- Time complexity: O(N)
- Space complexity: O(N)

### Inorder

#### Recursive

```go
func __inorder(node *Node, visited []int) Visited {
	if node == nil {
		return visited
	}
	visited = __inorder(node.Left, visited)
	visited = append(visited, node.Value)
	visited = __inorder(node.Right, visited)
	return visited
}

func Inorder(node *Node) Visited {
	return __inorder(node, []int{})
}
```

- Time complexity: O(N)
- Space complexity: O(N)

#### Iterative

```go
func Inorder(node *Node) Visited {
	if node == nil {
		return nil
	}
	stack := NodeStack{}
	visited := Visited{}
	current := node
	for {
		for current != nil {
			stack = append(stack, current)
			current = current.Left
		}
		if len(stack) == 0 {
			break
		}
		current, stack = stack[len(stack)-1], stack[:len(stack)-1]
		visited = append(visited, current.Value)
		current = current.Right
	}
	return visited
}
```

Notes:

1. Unlike other iterative traversals, we don't start with the root already in the stack.
1. Traverse as far left as we can.
1. Pop the leftmost node.
1. Assume there's a right node.  If not, the next left node will be popped, and then we'll again assume there's a right node.

- Time complexity: O(N)
- Space complexity: O(N)

### Postorder

#### Recursive

```go
func __postorder(node *Node, visited []int) Visited {
	if node == nil {
		return visited
	}
	visited = __postorder(node.Left, visited)
	visited = __postorder(node.Right, visited)
	visited = append(visited, node.Value)
	return visited
}

func Postorder(node *Node) Visited {
	return __postorder(node, []int{})
}
```

- Time complexity: O(N)
- Space complexity: O(N)

#### Iterative

```go
func Postorder(node *Node) Visited {
	if node == nil {
		return nil
	}
	stack := NodeStack{node}
	q := queue.New()
	var current *Node
	for len(stack) > 0 {
		current, stack = stack[len(stack)-1], stack[:len(stack)-1]
		q.Enqueue(current.Value)
		if current.Left != nil {
			stack = append(stack, current.Left)
		}
		if current.Right != nil {
			stack = append(stack, current.Right)
		}
	}
	return q.ToArray()
}
```

Notes:

1. This algorithm, unlike the others, uses both a stack and a queue.

- Time complexity: O(N)
- Space complexity: O(N)

## Breadth-First Search

```go
func Bfs(node *Node) Visited {
	if node == nil {
		return nil
	}
	q := queue.New()
	q.Enqueue(node)
	visited := Visited{}
	var current *Node
	for !q.IsEmpty() {
		current = q.Dequeue().Data.(*Node)
		visited = append(visited, current.Value)
		if current.Left != nil {
			q.Enqueue(current.Left)
		}
		if current.Right != nil {
			q.Enqueue(current.Right)
		}
	}
	return visited
}
```

### Level Order

#### Recursive

```go
func __levelorder(node *Node, levels [][]int, level int) [][]int {
	if node == nil {
		return levels
	}
	levels[level] = append(levels[level], node.Value)
	levels = __levelorder(node.Left, levels, level+1)
	levels = __levelorder(node.Right, levels, level+1)
	return levels
}

func Levelorder(node *Node) [][]int {
	return __levelorder(node, [][]int{}, 0)
}
```

#### Iterative

```go
func Levelorder(node *Node) []Visited {
	if node == nil {
		return nil
	}
	q := queue.New()
	q.Enqueue(node)
	levels := []Visited{}
	var current *Node
	for !q.IsEmpty() {
		size := q.Length
		level := Visited{}
		for i := 0; i < size; i += 1 {
			current = q.Dequeue().Data.(*Node)
			level = append(level, current.Value)
			if current.Left != nil {
				q.Enqueue(current.Left)
			}
			if current.Right != nil {
				q.Enqueue(current.Right)
			}
		}
		levels = append(levels, level)
	}
	return levels
}
```

The important part of this is the inner loop that iterates through the *current* size of the queue.  That is, anything pushed into the queue within the inner loop will **not** influence the size, since it's been saved to a local variable.

If the size variable was dynamic, for instance `g.Length`, then this approach would not work, as the algorithm would not be able to differentiate between pushing nodes into the queue that were direct children of the `current` node and those that were grandchildren and great-grandchildren, etc. (so to speak).

By limiting the size to that of the queue before the inner loop is (again) iterated, we're guaranteeing that those nodes "collected" during the subsequent loop will **only** be those that are direct children.

This, of course, is what is necessary to collect for *level* order traversal.

An interesting trait of this algorithm is that the queue, prior to the inner loop, will be logarithmic.  For instance:

|**Level** |**Maximum Number Of Direct Child Nodes**
|:---|:---|
|0 | 1 (root node)
|1 (root node) |2 |
|2 |4 |
|3 |8 |
|4 |16 |
|5 |32 |
|6 |64 |

> Recall that the maximum number of nodes in a *perfect* tree can be calculated by the formula `2^k - 1` (that's for the entire tree, not by level).

Just as the `level` variable in the recursive version is acting as a lookup for the particular level that is being executed on the stack (i.e, the stack frame), calculating the length of the `levels` list of lists in the iterative version can be used to determine what level of the tree is currently being enumerated.

Also notably, the number of nodes can never exceed the logarithm of the current level.  For example, if the current level is four, the number of direct child nodes that can be pushed into the queue can never exceed 16.

# Common Algorithms

> Note that I'm not using Go's [`math.Max`](https://pkg.go.dev/math#Max) method because it returns a `float64`, and I want to consistently return an `int`.

## Tree Height

### Recursive

```go
func Height(node *tree.Node) int {
	if node == nil {
		return 0
	}
	left := Height(node.Left) + 1
	right := Height(node.Right) + 1
	if left > right {
		return left
	}
	return right
}
```

### Iterative

Here is an implementation using a stack.  It uses the classic [depth-first search `preorder` traversal](#iterative):

```go
type N struct {
	Node   *tree.Node
	Height int
}

func IterativeHeight(node *tree.Node) int {
	if node == nil {
		return 0
	}
	stack := []*N{&N{
		Node:   node,
		Height: 1,
	}}
	max := -(1 << 63)
	var current *N
	for len(stack) > 0 {
		current, stack = stack[len(stack)-1], stack[:len(stack)-1]
		if max < current.Height {
			max = current.Height
		}
		node = current.Node
		if node.Right != nil {
			stack = append(stack, &N{
				Node:   node.Right,
				Height: current.Height + 1,
			})
		}
		if node.Left != nil {
			stack = append(stack, &N{
				Node:   node.Left,
				Height: current.Height + 1,
			})
		}
	}
	return max
}
```

And, here is an implementation using a queue.  Note that it uses the [iterative level order traversal idiom](#iterative-3):

```go
func IterativeHeight(node *tree.Node) int {
	if node == nil {
		return 0
	}
	q := queue.New()
	q.Enqueue(node)
	max := -(1 << 63)
	height := 0
	var current *tree.Node
	for !q.IsEmpty() {
		size := q.Length
		height += 1
		for i := 0; i < size; i += 1 {
			current = q.Dequeue().Data.(*tree.Node)
			if current.Left != nil {
				q.Enqueue(current.Left)
			}
			if current.Right != nil {
				q.Enqueue(current.Right)
			}
		}
		if max < height {
			max = height
		}
	}
	return max
}
```

## Validate Binary Search Tree

### Recursive

```go
var min *int
var max *int

func _validate(node *tree.Node, min, max *int) bool {
	if node == nil {
		return true
	}
	if (min != nil && node.Value <= *min) || (max != nil && node.Value > *max) {
		return false
	}
	if !_validate(node.Left, min, &node.Value) || !_validate(node.Right, &node.Value, max) {
		return false
	}
	return true
}

func ValidateBST(nums []int) bool {
	t := tree.CreateBST(nums)
	return _validate(t.Root, min, max)
}
```

### Iterative

This implementation does a [depth-first `inorder` traversal](#iterative-1), which will return the values, well, in order.  Simply ensuring the current value is larger than the last is enough to validate the binary search tree.

```go
func ValidateBST(node *tree.Node) bool {
	if node == nil {
		return false
	}
	stack := tree.NodeStack{}
	current := node
	lastNodeValue := -(1 << 63)
	for {
		for current != nil {
			stack = append(stack, current)
			current = current.Left
		}
		if len(stack) == 0 {
			return true
		}
		current, stack = stack[len(stack)-1], stack[:len(stack)-1]
		if current.Value < lastNodeValue {
			return false
		}
		lastNodeValue = current.Value
		current = current.Right
	}
}
```

# References

- [On Binary Tree Traversal](/2021/06/07/on-binary-tree-traversal/)
- [On Making A Complete Binary Tree](/2021/05/22/on-making-a-complete-binary-tree/)
- [On Getting Started with Go](/2022/08/05/on-getting-started-with-go/)

