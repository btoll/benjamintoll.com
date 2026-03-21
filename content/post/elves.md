+++
title = "On Elves"
date = "2026-03-06T13:48:59-05:00"

+++

- [What is ELF?](#what-is-elf)
    + [History](#history)
    + [Example](#example)
- [Tools](#tools)
- [Go `readelf`](#go-readelf)
- [Some Considerations](#some-considerations)
    + [Why Does My Stack Trace Look Like Poo?](#why-does-my-stack-trace-look-like-poo)
- [Summary](#summary)
- [References](#references)

---

I've been a fan of [J.R.R. Tolkien](https://en.wikipedia.org/wiki/J._R._R._Tolkien) since I was eight and I saw the spine of [The Hobbit](https://en.wikipedia.org/wiki/The_Hobbit) on the library bookshelf of my elementary school.  Its cover (and spine) featured Tolkien's own artwork, and it was because of that that I picked it off the shelf and took it home.

So, [`ELF`] is right up my alley, although, at the time I had no idea what it did.  Unfortunately, it quickly became apparent that it has nothing to do with [Middle-earth](https://en.wikipedia.org/wiki/Middle-earth).  After a week of crushing disappointment and depression, I decided that it's still worth knowing about, and I believe that any technical person that works with Unix systems should be able to discuss it at a high-level.

The objective of this article will be to discuss `ELF` at a high-level and then introduce some helpful tools that work with the format to give us information that can often help us make better and informed decisions, especially when it comes to debugging.

---

## What is ELF?

First published for the [`ABI`] specification of [System V Release 4] (and later in the [Tool Interface Standard]), the Executable and Linkable Format ([`ELF`]) is a file format for executable binary files.  An `ELF` file is defined by the [ABI] that the compiler that produced it (`gcc`, `cc`, etc) adheres to.

It is not only a file format for executable files but also for many others, including:

- [shared libraries](https://en.wikipedia.org/wiki/Shared_library)
- [object code](https://en.wikipedia.org/wiki/Object_code)
- [core dumps](https://en.wikipedia.org/wiki/Core_dump)
- [device drivers](https://en.wikipedia.org/wiki/Device_driver)

Importantly, it has been defined to support differing byte ordering ([endianness]) and address sizes (32- and 64-bit).  This flexibility has allowed it be adopted by many different operating systems installed on many different hardware platforms.

`ELF` files are comprised of an `ELF` header (always at offset zero of the file) and file data (which follows the `ELF` header).  The data can include the following:

- a program header table
    + this can describe zero or more memory segments
- a section header table
    + this can describe zero or more sections

Common sections found in `ELF` files are (this is not an exhaustive list):

- [`.text`](https://en.wikipedia.org/wiki/.rodata)
    + Executable instructions (functions, startup code, etc.), bytes that the CPU marks as instructions.
    + It consists of [`opcodes`] and [`operands`], i.e., machine code.
- `.data`
    + Contains initialized data.
    + Non-executable.
- [`.bss`](https://en.wikipedia.org/wiki/.bss)
    + Uninitialized (zero‑filled) writable data: globals that start at zero.
    + Occupies no space in the file but is allocated space in memory when the program runs.
    + Non-executable.
- [`.tbss`](https://en.wikipedia.org/wiki/.bss)
    + Only present when the program contains thread-local variables.
    + Contains uninitialized thread-local data.
    + Non-executable.
- [`.rodata`](https://en.wikipedia.org/wiki/.rodata)
    + Read‑only immutable data: string literals, constant tables, compiled‑in assets.
    + Non-executable.
- `.symtab`
    + Facilitates linking and symbol resolution.
    + Maps variable and function names to their corresponding addresses.
- `.strtab`
    + Facilitates linking and symbol resolution.
    + Holds the actual names.
- `.rel.text`
- `.rel.data`
- [`.debug_info`](https://en.wikipedia.org/wiki/DWARF#.debug_info)
    + Important for debugging tools, this section contains information that helps relate machine code back to source code.
    + Contains the main debug information.
- `.debug_abbrev`
    + Holds abbreviation information for the entries in the `.debug_info` section.
    + Each abbreviation defines how to interpret the data in `.debug_info`.
- `.debug_line`
    + Contains line number information, mapping source code line numbers to machine instructions.
- `.debug_pubnames` and `debug_pubtypes`
    + Contain information about public names and types, allowing for quicker access to certain types and symbols.
- `.debug_arranges`
    + Provides information mapping ranges of addresses to compilation units in the ELF file, allowing debuggers to quickly locate debug information.
- `.debug_str`
    + Holds string literals used in the debug sections, such as variable names and types.
    + Not always present, strings could be embedded directly in the `.debug_info` section.
- `.debug_loc`
    + Contains location information for the variables, such as where they are stored in memory at different execution points.
- `.comment`
    + Just comments put there by the compiler/linker toolchain .
- `.init`
- `.fini`
- `.plt`
    + Stubs used for dynamic linking (Procedure Linkage Table).
- `.got`
    + Stubs used for dynamic linking (Global Offset Table).

When viewing the section headers of an `ELF` file, the `Flags` column designates the permissions of the particular header, i.e.:

- `A` – allocatable (loaded into memory)
- `C` – contiguous (reduces memory fragmentation, more efficient, optimized, memory access patterns)
- `T` - thread-local storage (TLS)
- `X` – executable (code)
- `W` – writable (data)

> Microsoft Windows also uses `ELF` in its [`WSL`] compatibility system.  But no one technical uses Windows, so don't worry about it.

Before we turn to a piece of code that we can use as an example using Linux tools to display information about a generated `ELF` file, it's worthwhile to understand a (very) brief history of how we go to the `ELF` binary file.

### History

It is worth briefly explaining the history of the `ELF` file format, because you'll most likely see the names of the predecessors of `ELF` elsewhere and it therefore is good to have at least some understanding of them.

- [`a.out`]
    + An abbreviation of "[assembler] output", it was the name of the file of [Ken Thompson]'s compiled binary from the output of his assembler.
    + Although compiled `C` programs will still have this name by default, it is created by the compiler as an `ELF` file.
        ```bash
        $ cat > hello.c
        #include <stdio.h>

        int main() {
            printf("Hello, World!\n");
            return 0;
        }

        $ gcc hello.c
        $ ls
        a.out*  hello.c
        $ file a.out
        a.out: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=29bc8e664f17526f62fe65fa2ded5ae127f382ac, for GNU/Linux 3.2.0, not stripped
        ```
- [`COFF`]
    + The Common Object File Format, first introduced in [UNIX System V], replaced `a.out` as the file format for an executable file.
    + There were extended specifications based upon it called [`XCOFF`](https://en.wikipedia.org/wiki/XCOFF) and [`ECOFF`](https://en.wikipedia.org/wiki/ECOFF).
    + It has largely been replaced by `ELF`.

Now let's have the example.

### Example

Here's a memoized function that generates Fibonacci numbers:

```go
package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
)

var m = make(map[int]int)

func fibonacci(n int) int {
	if n < 2 {
		return n
	}
	var f int
	if v, ok := m[n]; !ok {
		f = fibonacci(n-1) + fibonacci(n-2)
		m[n] = f
	} else {
		f = v
	}
	return f
}

func main() {
	n, err := strconv.Atoi(os.Args[1])
	if err != nil {
		log.Fatalln(err)
	}
	fmt.Println(fibonacci(n))
}
```

Here are the program headers:

```bash
$ readelf -lW fibonacci

Elf file type is EXEC (Executable file)
Entry point 0x48ba20
There are 6 program headers, starting at offset 64

Program Headers:
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  PHDR           0x000040 0x0000000000400040 0x0000000000400040 0x000150 0x000150 R   0x1000
  NOTE           0x000f78 0x0000000000400f78 0x0000000000400f78 0x000064 0x000064 R   0x4
  LOAD           0x000000 0x0000000000400000 0x0000000000400000 0x0cc471 0x0cc471 R E 0x1000
  LOAD           0x0cd000 0x00000000004cd000 0x00000000004cd000 0x0ce260 0x0ce260 R   0x1000
  LOAD           0x19c000 0x000000000059c000 0x000000000059c000 0x00a9a0 0x040780 RW  0x1000
  GNU_STACK      0x000000 0x0000000000000000 0x0000000000000000 0x000000 0x000000 RW  0x8

 Section to Segment mapping:
  Segment Sections...
   00
   01     .note.go.buildid
   02     .note.go.buildid .note.gnu.build-id .text
   03     .rodata .gopclntab .typelink .itablink
   04     .go.buildinfo .go.fipsinfo .go.module .noptrdata .data .bss .noptrbss
   05
```

Here are the section headers:

```bash
$ readelf -SW fibonacci
There are 26 section headers, starting at offset 0x190:

Section Headers:
  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  [ 1] .note.go.buildid  NOTE            0000000000400f78 000f78 000064 00   A  0   0  4
  [ 2] .note.gnu.build-id NOTE            0000000000400fdc 000fdc 000024 00   A  0   0  4
  [ 3] .text             PROGBITS        0000000000401000 001000 0cb471 00  AX  0   0 64
  [ 4] .rodata           PROGBITS        00000000004cd000 0cd000 03a522 00   A  0   0 32
  [ 5] .gopclntab        PROGBITS        0000000000507528 107528 0933ad 00   A  0   0  8
  [ 6] .typelink         PROGBITS        000000000059a8e0 19a8e0 0008c4 00   A  0   0 32
  [ 7] .itablink         PROGBITS        000000000059b1c0 19b1c0 0000a0 00   A  0   0 32
  [ 8] .go.buildinfo     PROGBITS        000000000059c000 19c000 000280 00  WA  0   0 16
  [ 9] .go.fipsinfo      PROGBITS        000000000059c280 19c280 000078 00  WA  0   0 32
  [10] .go.module        PROGBITS        000000000059c300 19c300 000250 00  WA  0   0 32
  [11] .noptrdata        PROGBITS        000000000059c560 19c560 004d62 00  WA  0   0 32
  [12] .data             PROGBITS        00000000005a12e0 1a12e0 0056b2 00  WA  0   0 32
  [13] .bss              NOBITS          00000000005a69a0 1a69a0 0207d8 00  WA  0   0 32
  [14] .noptrbss         NOBITS          00000000005c7180 1c7180 015600 00  WA  0   0 32
  [15] .debug_abbrev     PROGBITS        0000000000000000 1a7000 000160 00   C  0   0  1
  [16] .debug_line       PROGBITS        0000000000000000 1a7160 01e0af 00   C  0   0  1
  [17] .debug_frame      PROGBITS        0000000000000000 1c520f 00b296 00   C  0   0  1
  [18] .debug_gdb_scripts PROGBITS        0000000000000000 1d04a5 00002a 00      0   0  1
  [19] .debug_info       PROGBITS        0000000000000000 1d04cf 03abd5 00   C  0   0  1
  [20] .debug_loclists   PROGBITS        0000000000000000 20b0a4 0162d8 00   C  0   0  1
  [21] .debug_rnglists   PROGBITS        0000000000000000 22137c 003d63 00   C  0   0  1
  [22] .debug_addr       PROGBITS        0000000000000000 2250df 001848 00   C  0   0  1
  [23] .symtab           SYMTAB          0000000000000000 226928 0176e8 18     24 275  8
  [24] .strtab           STRTAB          0000000000000000 23e010 01a1a1 00      0   0  1
  [25] .shstrtab         STRTAB          0000000000000000 2581b1 000124 00      0   0  1
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  D (mbind), l (large), p (processor specific)
```

> Note that there isn't a `.tbss` section because the program runs in a single thread (i.e., a single goroutine).

## Tools

Let's talk about [tools](https://www.youtube.com/watch?v=ype12RuDJ4k).

Here is a non-exhaustive list of some of the tools used most commonly to inspect `ELF` files.  They are part of [GNU Binutils], a collection of programming tools for working with executable code:

- [`readelf`]
- [`hexdump`]
- [`xxd`]
- [`objdump`]
- [`file`]

> I won't be going into the use cases for many of these, so be sure to read their respective `man` pages.  Consider that your homework.  And, don't use AI.

You can use them to determine fun stuff like printing the [magic number].  The `ELF` executable loader's first step is to verify this magic number.  We'll use `hexdump` for this task, and in the process discover that it gives us (and the loader) a wealth of knowledge of what this executable file is all about:

```hex
$ hexdump -C fibonacci | head -1
00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
$ xxd fibonacci | head -1
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
```

Yep, there it is.  Since we're printing the first 16 bytes of the file in both hexadecimal and ascii, we can verify that it is indeed an `ELF` file.

> The magic number for an `ELF` file consists of 16 bytes.  The first byte is `0x7F` (the highest value in the standard 7-bit [`ascii`] character set), followed by the characters `ELF` in [`ascii`]:
> ```
> 0x7F 0x45 0x4C 0x46
> ```
> For other file types, see the [list of file signatures](https://en.wikipedia.org/wiki/List_of_file_signatures).

Let's see some more of the `ELF` file.  We'll continue to use our friend `hexdump`, but this time we'll dump the length of the `ELF` header, which is 64 bytes (52 bytes for 32-bit binaries):

```hex
$ hexdump -C fibonacci | head -4
00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
00000010  02 00 3e 00 01 00 00 00  c0 09 48 00 00 00 00 00  |..>.......H.....|
00000020  40 00 00 00 00 00 00 00  90 01 00 00 00 00 00 00  |@...............|
00000030  00 00 00 00 40 00 38 00  06 00 40 00 1a 00 19 00  |....@.8...@.....|
```

Or, without the ascii (which isn't very helpful for this example):

```hex
$ hexdump -x fibonacci | head -4
0000000    457f    464c    0102    0001    0000    0000    0000    0000
0000010    0002    003e    0001    0000    09c0    0048    0000    0000
0000020    0040    0000    0000    0000    0190    0000    0000    0000
0000030    0000    0000    0040    0038    0006    0040    001a    0019
```

Note that the bytes in the output of this second `hexdump` command are in little endian byte order starting at `0x10`.  This is determined by the value in position `0x05`, which in our case is `0x01` (little endian).

We can determine a lot of useful information about this file from these 512 bits, as laid out in this [`ELF` header table](https://wiki.osdev.org/ELF#ELF_Header) (note that the right-hand column contains the values from the dump above):

| Position | Value |
| :- | :- | :-:
| 0-3 | Magic number - 0x7F, then 'ELF' in ASCII | 7f 45 4c 46
| 4 | 1 = 32 bit, 2 = 64 bit | 02
| 5 | 1 = little endian, 2 = big endian | 01
| 6 | ELF header version | 01
| 7 | OS ABI - usually 0 for System V | 00
| 8-15 | Unused/padding | 00 00 00 00 00 00 00 00
| 16-17 | Type (1 = relocatable, 2 = executable, 3 = shared, 4 = core) | 00 02
| 18-19 | [Instruction set] | 00 3e
| 20-23 | ELF Version (currently 1) | 00 00 00 01
| 24-31 | Program entry offset | 00 00 00 00 48 09 c0
| 32-39 | Program header table offset | 00 00 00 00 00 00 00 40
| 40-47 | Section header table offset | 00 00 00 00 00 00 01 90
| 48-51 | Flags - architecture dependent; see note below | 00 00 00 00
| 52-53 | ELF Header size | 00 40
| 54-55 | Size of an entry in the program header table | 00 38
| 56-57 | Number of entries in the program header table | 00 06
| 58-59 | Size of an entry in the section header table | 00 40
| 60-61 | Number of entries in the section header table | 00 1a
| 62-63 | Section index to the section header string table | 00 19

> Note this is for a 64-bit architecture.

## Go `readelf`

I've created a simple little Go program that outputs the ELF header of a given ELF file in the same format as `readelf` with the `-h` file header switch (`--file-header` can also be used).  It only supports 64-bit addresses.  You can refer to the header specifications at the following sources:

- [Tool Interface Standard]
- [ELF header at Wikipedia](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format#ELF_header)
- [ELF header at OSDev.org](https://wiki.osdev.org/ELF#ELF_Header)

It can be found on my GitHub in the [`readelf`](https://github.com/btoll/readelf) repository.

Let's see it in action (and yes, the running executable will be its own target):

```bash
$ git clone git@github.com:btoll/readelf.git
$ cd readelf
$ go build
$ ./readelf --filename readelf
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, LittleEndian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  Version:                           0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry Point Address:               0x48b6c0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          400 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         6
  Size of section headers:           64 (bytes)
  Number of section headers:         26
  Section header string table index: 25
```

And the Linux `readelf` output:

```bash
$ readelf -h readelf
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x48b6c0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          400 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         6
  Size of section headers:           64 (bytes)
  Number of section headers:         26
  Section header string table index: 25
```

We can see this change when the binary is stripped:

```bash
$ strip --strip-all readelf
$ ./readelf --filename readelf
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, LittleEndian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  Version:                           0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry Point Address:               0x48b6c0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          2982040 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         6
  Size of section headers:           64 (bytes)
  Number of section headers:         16
  Section header string table index: 15
$ readelf -h readelf
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x48b6c0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          2982040 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         6
  Size of section headers:           64 (bytes)
  Number of section headers:         16
  Section header string table index: 15
```

For example, note that the number of section headers has decreased.

## Some Considerations

An `ELF` file is just another type of file on disk, and so it can be manipulated like any other.  For instance, it is trivial to change the [magic number] of an `ELF` file.

Consider this toy program:

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) == 1 {
		fmt.Fprintln(os.Stdin, "Not enough arguments")
		os.Exit(1)
	}
	filePath := os.Args[1]

	file, err := os.OpenFile(filePath, os.O_RDWR, 0644)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error opening file:", err)
		os.Exit(1)
	}
	defer file.Close()

	newMagic := []byte{0xDE, 0xAD, 0xBE, 0xEF}
	_, err = file.WriteAt(newMagic, 0)
	if err != nil {
		fmt.Println("Error writing magic number:", err)
		return
	}

	fmt.Println("Magic number changed successfully.")
}
```

Let's go ahead and build it and run some simple commands to verify that it's an `ELF` file as expected:

```bash
$ go build -o /tmp/fibonacci
$ readelf -h /tmp/fibonacci
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x4809c0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          400 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         6
  Size of section headers:           64 (bytes)
  Number of section headers:         26
  Section header string table index: 25
$ xxd /tmp/fibonacci | head -1
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
$ hexdump -C /tmp/fibonacci | head -1
00000000  7f 45 4c 46 02 01 01 00  00 00 00 00 00 00 00 00  |.ELF............|
$ objdump -f /tmp/fibonacci

/tmp/fibonacci:     file format elf64-x86-64
architecture: i386:x86-64, flags 0x00000112:
EXEC_P, HAS_SYMS, D_PAGED
start address 0x00000000004809c0
```

Now, let's replace the magic number with `0xdeadbeef` and run the same commands:

```bash
$ magicnumber /tmp/fibonacci
Magic number changed successfully.
$ readelf -h /tmp/fibonacci
readelf: Error: Not an ELF file - it has the wrong magic bytes at the start
$ xxd /tmp/fibonacci | head -1
00000000: dead beef 0201 0100 0000 0000 0000 0000  ................
$ hexdump -C /tmp/fibonacci | head -1
00000000  de ad be ef 02 01 01 00  00 00 00 00 00 00 00 00  |................|
$ objdump -f /tmp/fibonacci
objdump: /tmp/fibonacci: file format not recognized
```

Let's try to read it with our new `elf` Golang program above:

```bash
$ go run . --filename /tmp/fibonacci
The magic header of this file is not ELF, aborting...
exit status 1
```

Oh noes, your CD pipeline just broke.

### Why Does My Stack Trace Look Like Poo?

If there aren't any filename and or line numbers in your stack trace, it's because the `symtab` section has been stripped from the generated `ELF` file.

For example, the [`strip`] tool discards symbols and other data from object files.  Depending on the switches, it could wip out the debug symbols, symbol table and dynamic symbols which map machine code to source code, reference functions and variables and symbols used for linking and runtime resolution, respectively.

While this could be a good thing for end systems that have fewer resources like embedded systems since it may significantly reduce the size of the executable file, it can also negatively impact stack traces, since the mapping between machine code and source code has been severed.  So, any stack traces will not be helpful, as they probablyl will not be able to include meaningful symbols, filenames and line numbers.

Your CD pipelines may have a stage which strips the binaries to reduce size and make reverse engineering harder by obfuscation.

```bash
$ go build
$ ll fibonacci
14811415 -rwxr-xr-x 1 btoll btoll 2.4M Mar 19 00:29 fibonacci*
$ readelf -SW fibonacci | head -1
There are 26 section headers, starting at offset 0x190:
$ strip --strip-all fibonacci
$ ll fibonacci
14811415 -rwxr-xr-x 1 btoll btoll 1.6M Mar 19 00:29 fibonacci*
$ readelf -SW fibonacci | head -1
There are 16 section headers, starting at offset 0x193b18:
```

## Summary

In summary, this is a fantastic article.

Originally, I wanted to talk about [`DWARF`] along with [`ELF`], but it just got to be too large an article.  So, `DWARF` will be covered later, tater.

## References

- [Tool Interface Standard, ELF]
- [`ELF` man page]
- [`ELF` page from OSDev.org](https://wiki.osdev.org/ELF)
- [`ELF`]
- [ABI]
- [GNU Binutils]
- [`elfutils`](https://sourceware.org/elfutils/)
- [System V Application Binary Interface](https://refspecs.linuxbase.org/elf/x86_64-abi-0.99.pdf)

[Tool Interface Standard]: https://refspecs.linuxfoundation.org/elf/elf.pdf
[GNU Binutils]: https://en.wikipedia.org/wiki/GNU_Binutils
[ABI]: https://wiki.osdev.org/System_V_ABI
[`ELF`]: https://en.wikipedia.org/wiki/Executable_and_Linkable_Format
[`DWARF`]: https://en.wikipedia.org/wiki/DWARF
[`a.out`]: https://en.wikipedia.org/wiki/A.out
[`COFF`]: https://en.wikipedia.org/wiki/COFF
[The Lord of the Rings]: https://en.wikipedia.org/wiki/The_Lord_of_the_Rings
[`readelf`]: https://www.man7.org/linux/man-pages/man1/readelf.1.html
[`hexdump`]: https://www.man7.org/linux/man-pages/man1/hexdump.1.html
[`xxd`]: https://linux.die.net/man/1/xxd
[`file`]: https://www.man7.org/linux/man-pages/man1/file.1.html
[`objdump`]: https://man7.org/linux/man-pages/man1/objdump.1.html
[magic number]: https://en.wikipedia.org/wiki/Magic_number_(programming)
[`ascii`]: https://www.man7.org/linux/man-pages/man7/ascii.7.html
[`WSL`]: https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux
[`opcodes`]: https://en.wikipedia.org/wiki/Opcode
[`operands`]: https://en.wikipedia.org/wiki/Operand#Computer_science
[inlining]: https://en.wikipedia.org/wiki/Inline_expansion
[assembler]: https://en.wikipedia.org/wiki/Assembly_language#Assembler
[Ken Thompson]: https://en.wikipedia.org/wiki/Ken_Thompson
[UNIX System V]: https://en.wikipedia.org/wiki/UNIX_System_V
[System V Release 4]: https://en.wikipedia.org/wiki/UNIX_System_V#SVR4
[debugging data format]: https://en.wikipedia.org/wiki/Debugging_data_format
[`ELF` man page]: https://www.man7.org/linux/man-pages/man5/elf.5.html
[`strip`]: https://man7.org/linux/man-pages/man1/strip.1.html
[Instruction set]: https://en.wikipedia.org/wiki/Instruction_set_architecture
[endianness]: https://en.wikipedia.org/wiki/Endianness

