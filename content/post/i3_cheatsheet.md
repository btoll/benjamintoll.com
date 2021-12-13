+++
title = "On i3 Cheatsheet"
date = "2021-12-13T02:09:10Z"

+++

- [Movements](#movements)
- [General](#general)
- [Workspaces](#workspaces)
- [Windows](#windows)
- [References](#references)

---

Mod key is either `Alt` or `Windows`.

Mine is `Alt`.

## Movements

- Vim bindings
    + `j`, `k`, `l`, `;`
- arrow keys
    + I've removed support for the arrow keys, just like I've disabled them in my Vim configuration.

These are often combined with the `Mod` key and others to facilitate moving focus and workspaces and windows.

When combined with an aforementioned key, I'll just refer to it as a `Move`.

## General

- Create config file
    + `i3-config-wizard` in a terminal
- Restart i3 / Refresh config file
    + `Mod + Shift + r`
- Logout
    + `Mod + Shift + e`
- Lock screen
    + `i3lock` in a terminal
    + In i3 config file:
        - `bindsym $mod+shift+x exec i3lock`
- Set background image
    + `sudo apt-get install feh`
    + In i3 config file:
        - `exec_always feh --bg-scale /home/kilgore-trout/wallpaper.jpeg`

## Workspaces

- Create a terminal
    + `Mod + Enter`
- Create a program
    + `Mod + d`
    + Opens the `dmenu` at the top of the screen
    + Type to filter the programs
- Close a workspace
    + `Mod + Shift + q`

## Windows

- Move focused window
    + `Mod + Shift + Move`
- Move focused window to another workspace
    + `Mod + Shift + Number`
- Change window focus
    + `Mod + Move`
- Create a new window vertically
    + `Mod + v`
    + `Mod + Enter` or `Mod + d`
- Create a new window horizontally
    + `Mod + h`
    + `Mod + Enter` or `Mod + d`
- Resize windows
    + `Mod + r`
    + `Move`
    + `Esc` to exit resize mode
- Stack windows
    + `Mod + s` (s == stacking)
    + `Mod + e` to undo
- Tabbed windows
    + `Mod + w`
    + `Mod + e` to undo

## References

- [i3: improved tiling wm](https://i3wm.org/)
- [i3wm: Jump Start (1/3)](https://www.youtube.com/watch?v=j1I63wGcvU4)
- [i3wm: Configuration (2/3)](https://www.youtube.com/watch?v=8-S0cWnLBKg)
- [How to change the systems volume?](https://faq.i3wm.org/question/125/how-to-change-the-systems-volume.1.html)

