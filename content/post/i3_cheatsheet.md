+++
title = "On i3 Cheatsheet"
date = "2021-12-13T02:09:10Z"

+++

- [General](#general)
- [Movements](#movements)
- [Workspaces](#workspaces)
- [Windows](#windows)
- [Scratchpad](#scratchpad)
- [Conclusion](#conclusion)
- [References](#references)

---

My `i3` config file resides in `$HOME/.config/i3/`.

> I've tried to call out everywhere I've changed the `i3` defaults, but I may have missed some.

Use [`xmodmap`], a utility for modifying keymaps and pointer button mappings in [`X`], to see all the values for the modifier key:

```
$ xmodmap
xmodmap:  up to 4 keys per modifier, (keycodes in parentheses):

shift       Shift_L (0x32),  Shift_R (0x3e)
lock        Caps_Lock (0x42)
control     Control_L (0x25),  Caps_Lock (0x42),  Control_R (0x69)
mod1        Alt_L (0x40),  Alt_R (0x6c),  Meta_L (0xcd)
mod2        Num_Lock (0x4d)
mod3
mod4        Super_L (0x85),  Super_R (0x86),  Super_L (0xce),  Hyper_L (0xcf)
mod5        ISO_Level3_Shift (0x5c),  Mode_switch (0xcb)

```

I'm using `mod1` because I'm using the `Alt` key as my modifier key (`$mod`).

You can use `xmodmap -pke` to see a mapping of symbols to keycodes.

> ### A note about the `--no-startup-id` switch:
>
> [From the `i3` docs]:
>
> "The --no-startup-id parameter disables startup-notification support for this particular exec command. With startup-notification, `i3` can make sure that a window appears on the workspace on which you used the exec command.
>
> Also, it will change the X11 cursor to watch (a clock) while the application is launching. So, if an application is not startup-notification aware (most GTK and Qt using applications seem to be, though), you will end up with a watch cursor for 60 seconds."
>
> ( In other words, it will display the cursor instead of the spinner, which is especially noticeable when setting a desktop background using `feh` and then going to an empty workspace. )

## General

- Create config file
    + `i3-config-wizard` in a terminal
- Reload config file
    + `$mod + Shift + c`
- Restart `i3`
    + `$mod + Shift + r`
- Logout
    + `$mod + Shift + e`
    + Or, use `dmenu`:
        - `$mod + d`
        - `ie-msg exit`
- Lock screen
    + `i3lock` in a terminal
    + Add to `i3` config:
        <pre class="math">
        # Set a background for the lock screen (only PNG is supported).
        set $i3lockwall i3lock -i $HOME/bulldog.png
        bindsym $mod+shift+x exec --no-startup-id $i3lockwall</pre>
- Set background image
    + `sudo apt-get install feh`
    + Add to `i3` config file:
        <pre class="math">
        exec_always feh --bg-scale $HOME/wallpaper.jpeg</pre>

## Movements

- Vim bindings
    + `h`, `j`, `k`, `l`
- arrow keys
    + I've removed support for the arrow keys, just like I've disabled them in my Vim configuration.

These are often combined with the `$mod` key and others to facilitate moving focus and workspaces and windows.

For example:

Modify `i3` config file:

<pre class="math">
# change focus
bindsym $mod+h focus left
bindsym $mod+j focus down
bindsym $mod+k focus up
bindsym $mod+l focus right

# move focused window
bindsym $mod+Shift+h move left
bindsym $mod+Shift+j move down
bindsym $mod+Shift+k move up
bindsym $mod+Shift+l move right
</pre>

> Note that these have been changed from `i3`'s defaults.

When combined with an aforementioned key, I'll just refer to it as a `Move`.

## Workspaces

- Create a terminal
    + `$mod + Enter`
- Launch a program using `dmenu` (`dmenu` is opened at the top of the screen):
    + `$mod + d`
    + Type to filter the programs
- Close a workspace
    + `$mod + Shift + q`

## Windows

- Move focused window
    + `$mod + Shift + Move`
- Move focused window to another workspace
    + `$mod + Shift + Number`
- Change window focus
    + `$mod + Move`
- Create a new window vertically
    + `$mod + Ctrl + v` (changed from `i3` default)
    + `$mod + Enter` or `$mod + d`
- Create a new window horizontally
    + `$mod + Ctrl + h` (changed from `i3` default)
    + `$mod + Enter` or `$mod + d`
- Resize windows
    + `$mod + r`
    + `Move`
    + `Esc` to exit resize mode
- Stack windows
    + `$mod + s` (s == stacking)
    + `$mod + e` to undo
- Tabbed windows
    + `$mod + w`
    + `$mod + e` to undo

## Scratchpad

- Turn a regular workspace into a scratchpad:
    + `$mod + Shift + minus`

- Revert a scratchpad back into a workspace:
    + `$mod + Shift + space`

- Start an application as a scratchpad when `i3` starts:
    + In `i3` config file:

      <pre class="math">
      <a href="https://i3wm.org/docs/userguide.html#for_window">for_window</a> [class="thunderbird-default"] move window to scratchpad, scratchpad show
      exec --no-startup-id thunderbird</pre>

      > Note that the `[class="thunderbird-default"]` bits were determined by [`xprop`].

## Conclusion

Whether it be `i3`, `vim`, `tmux`, etc., I find it's always a good idea to revisit your config files and remove what you don't use to keep them as simple as possible.  There's nothing worse than an overly-complex config filled with garbage that is never used.

## References

- [i3: improved tiling wm](https://i3wm.org/)
- [i3wm: Jump Start (1/3)](https://www.youtube.com/watch?v=j1I63wGcvU4)
- [i3wm: Configuration (2/3)](https://www.youtube.com/watch?v=8-S0cWnLBKg)
- [Configuring i3 Window Manager: a Complete Guide](https://thevaluable.dev/i3-config-mouseless/)
- [How to change the systems volume?](https://faq.i3wm.org/question/125/how-to-change-the-systems-volume.1.html)

[`xmodmap`]: https://man.archlinux.org/man/xmodmap.1
[`X`]: https://en.wikipedia.org/wiki/X_Window_System
[From the `i3` docs]: https://i3wm.org/docs/userguide.html#exec
[`xprop`]: https://linux.die.net/man/1/xprop

