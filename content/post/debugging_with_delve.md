+++
title = "On Debugging With Delve"
date = "2026-04-04T23:00:43-04:00"
draft = true

+++

Here is the text file that will be sourced by Delve.  It contains the setup commands for a particular debug session:

`delve_commands.txt`

```txt
break main.selection
display -a i
display -a minIndex
display -a j
display -a a[minIndex]
```

```
$ dlv debug
Type 'help' for list of commands.
(dlv) source delve_commands.txt
Breakpoint 1 set at 0x4be384 for main.selection() ./main.go:5
0: i = error could not find symbol value for i
1: minIndex = error could not find symbol value for minIndex
2: j = error could not find symbol value for j
3: a[minIndex] = error could not find symbol value for a
(dlv) c
START=[10 9 8 7 6 5 1 3 2 4]
> [Breakpoint 1] main.selection() ./main.go:5 (hits goroutine(1):1 total:1) (PC: 0x4be384)
     1: package main
     2:
     3: import "fmt"
     4:
=>   5: func selection(a []int) {
     6:         for i := 0; i < len(a); i++ {
     7:                 minIndex := i
     8:                 for j := i + 1; j < len(a); j++ {
     9:                         if a[j] < a[minIndex] {
    10:                                 minIndex = j
0: i = error could not find symbol value for i
1: minIndex = error could not find symbol value for minIndex
2: j = error could not find symbol value for j
3: a[minIndex] = error could not find symbol value for minIndex
(dlv)
```

After submitting the `next` command several times, we see that the watched variables come into scope:

```
(dlv)
> main.selection() ./main.go:9 (PC: 0x4be3e9)
     4:
     5: func selection(a []int) {
     6:         for i := 0; i < len(a); i++ {
     7:                 minIndex := i
     8:                 for j := i + 1; j < len(a); j++ {
=>   9:                         if a[j] < a[minIndex] {
    10:                                 minIndex = j
    11:                         }
    12:                 }
    13:                 a[i], a[minIndex] = a[minIndex], a[i]
    14:         }
0: i = 0
1: minIndex = 1
2: j = 2
3: a[minIndex] = 9
(dlv)
```
