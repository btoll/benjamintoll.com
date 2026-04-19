+++
title = "On Dwarves"
date = "2026-03-21T01:23:31-04:00"
draft = true

+++

- [What is DWARF?](#what-is-dwarf)
- [Summary](#summary)
- [References](#references)

## What is DWARF?

[`DWARF`] is a widely used [debugging data format].  The name has no official meaning, it's just a medieval-fantasy complement to `ELF`.  Seriously.

If an `ELF` file was created by a compiler with optimizations disabled, you should be able to get information on any section that contains debugging information.  To target a specific section, use the `--debug-dump=` parameter followed by the section name (see the [`ELF` man page] for details).  For example, dump the data from the `.debug_info` section:

```bash
$ readelf --debug-dump=info /tmp/fibonacci | head -20
Contents of the .debug_info section:

  Compilation Unit @ offset 0:
   Length:        0x7e (32-bit)
   Version:       5
   Unit Type:     DW_UT_compile (1)
   Abbrev Offset: 0
   Pointer Size:  8
 <0><c>: Abbrev Number: 1 (DW_TAG_compile_unit)
    <d>   DW_AT_name        : runtime
    <15>   DW_AT_language    : 22       (Go)
    <16>   DW_AT_stmt_list   : 0
    <1a>   DW_AT_low_pc      : 0x47faa0
    <22>   DW_AT_ranges      : 0xc
    <26>   DW_AT_comp_dir    : .
    <28>   DW_AT_producer    : Go cmd/compile go1.26.0; regabi
    <48>   Unknown AT value: 2905: runtime
    <50>   DW_AT_addr_base   : 0x8
 <1><54>: Abbrev Number: 3 (DW_TAG_subprogram)
    <55>   DW_AT_name        : runtime.memclrNoHeapPointers
```

[`DWARF`]: https://en.wikipedia.org/wiki/DWARF
[`ELF` man page]: https://www.man7.org/linux/man-pages/man5/elf.5.html

