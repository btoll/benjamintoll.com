+++
title = "On What's Up, g?"
date = "2024-04-15T13:07:11-04:00"

+++

This is just a fun little post about Vim and the commands starting with `g`.  This was inspired by the video [Vim Tips You Probably Never Heard of].

One of the great things about Vim is that I am always learning something new (or remembering something I'd forgotten).  It's a great editor that is both intellectually stimulating and fun.

Here's a little cheat sheet for the commands starting with `g`:

- `gj`
    + like "j", but when 'wrap' on go N screen lines down
- `gk`
    + like "k", but when 'wrap' on go N screen lines up
- `g0`
    + when 'wrap' off go to leftmost character of the current line that is on the screen; when 'wrap' on go to the leftmost character of the current screen line
- `g$`
    + when 'wrap' off go to rightmost character of the current line that is on the screen; when 'wrap' on go to the rightmost character of the current screen line
- `gq`
    + switch to "Ex" mode with Vim editing
- `gu`
    + make Nmove text lowercase
- `gU`
    + make Nmove text uppercase
- `g~`
    + swap case for Nmove text
- `gf`
    + start editing the file whose name is under the cursor
    + `^` to return to previous file
- `gv`
    + reselect the previous Visual area (the last highlighted text)
- `gJ`
    + join lines without inserting space
- `gx`
    + execute application for file name under the cursor
    + can use it to open links in a browser
- `g&`
    + repeat last ":s" on all lines
    + runs changes made to a single line globally across the entire document (use case: test substitution on a single line and then if successful do it across the whole document)
- `g;`
    + go to N older position in change list
    + go to last edit
- `g8`
    + print hex value of bytes used in UTF-8 character under the cursor
- `ga`
    + print ascii value of character under the cursor
- `g?`
    + Rot13 encoding operator
    + `g??` Rot13 encode current line
- `gE`
    + go backwards to the end of the previous WORD
- `gI`
    + like "I" but always start in column 1
- `gm`
    + go to character at middle of the screenline
- `gM`
    + go to character at middle of the text line

Find all the things in the Vim docs:

```vim
:help g
```

Of course, there's loads more, check it out for yourself.

[Vim Tips You Probably Never Heard of]: https://www.youtube.com/watch?v=bQfFvExpZDU

