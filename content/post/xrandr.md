+++
title = "On xrandr"
date = "2022-12-27T16:00:08-05:00"

+++

You don't need a big bloated GUI desktop environment to manage your displays.  In this short article, we'll take a look at an easy-to-use command line tool to set up your multi-display environment.

We're going to take a look at the [`xrandr`] command line tool, but don't expect this to be anything more than an introductory article of its features.  Like, don't.

---

> And I ain't hiding from nobody<br>
> Nobody's hiding from me<br>
> Oh, that's the way it's supposed to be
> - [J.J. Cale]

- [Introduction](#introduction)
- [`xrandr`](#xrandr)
- [Examples](#examples)
    + [Version](#version)
    + [Querying Displays](#querying-displays)
    + [Mirroring Displays](#mirroring-displays)
    + [Dual Display](#dual-display)
    + [Rotating](#rotating)
    + [Disabling](#disabling)
- [Persisting](#persisting)
    + [`xinitrc`](#xinitrc)
    + [`xorg.conf.d`](#xorgconfd)
- [Other Software](#other-software)
- [Conclusion](#conclusion)
- [References](#references)

---

## Introduction

&lt;introduction>

At `benjamintoll.com`, we just have two displays, a laptop and an old TV:

```
                                +++++++++++++++++++++++++++++++++++++++++++++
                                +                                           +
                                +                                           +
                                +                                           +
                                +                                           +
                                +     ttttttttttt           v         v     +
                                +          t                 v       v      +
                                +          t                  v     v       +
                                +          t                   v   v        +
                                +          t                    v v         +
                                +          t                     v          +
                                +                                           +
      +++++++++++++++           +                                           +
      +             +           +                                           +
      + l a p t o p +           +                                           +
      +             +           +++++++++++++++++++++++++++++++++++++++++++++
      +++++++++++++++                      |                     |
       + q w e r t y +                     |                     |
        +++++++++++++++                ---------             ---------
```

&lt;/introduction>

## `xrandr`

The CLI tool `xrandr` is a front end to the [`RandR`] communication protocol, an extension of the [`X11` protocol] of the [X.Org Server].  It allows you to control the screen resolution and the refresh rate, et al., of any display you wish to connect together into a cohesive work environment.

Most people are probably familiar with this process through a GUI tool in a full blown GUI desktop environment.  But, as we'll see, `xrandr` is easy to use and script, and you'll be up and running with your multi-display environment in less time than it takes to wonder why you even need all of those monitors in the first place.

## Examples

One of the best ways to learn any tool is to see some examples.  Here they are, yo.

### Version

Print out the [`RandR`] version:

```
$ xrandr --version
xrandr program version       1.5.1
Server reports RandR version 1.6
```

### Querying Displays

Let's start getting some information on the available displays.

```
$ xrandr -q
Screen 0: minimum 320 x 200, current 1920 x 1080, maximum 16384 x 16384
eDP-1 connected primary 1920x1080+0+0 (normal left inverted right x axis y axis) 382mm x 215mm
   1920x1080     60.02*+  60.01    59.97    59.96    59.93
   1680x1050     59.95    59.88
   1600x1024     60.17
   1400x1050     59.98
   1600x900      59.99    59.94    59.95    59.82
   ...
DP-1 disconnected (normal left inverted right x axis y axis)
HDMI-1 disconnected (normal left inverted right x axis y axis)
```

> You can also just use the `xrandr` command with no options to get a list of the available displays.

After I plug in the [`HDMI`] cable to the TV, I see it appear in the list:

```
$ xrandr -q
Screen 0: minimum 320 x 200, current 1920 x 1080, maximum 16384 x 16384
eDP-1 connected primary 1920x1080+0+0 (normal left inverted right x axis y axis) 382mm x 215mm
   1920x1080     60.02*+  60.01    59.97    59.96    59.93
   1680x1050     59.95    59.88
   1600x1024     60.17
   1400x1050     59.98
   1600x900      59.99    59.94    59.95    59.82
   ...
DP-1 disconnected (normal left inverted right x axis y axis)
HDMI-1 connected (normal left inverted right x axis y axis)
   1920x1080     60.00 +  59.94    24.00    23.98
   1920x1080i    60.00    59.94
   1280x720      60.00    59.94
   1024x768      75.03    70.07    60.00
   1440x480i     59.94
   800x600       60.32
   720x480       60.00    59.94
   720x480i      60.00    59.94
   640x480       75.00    60.00    59.94
```

Note that the connected displays show many different resolutions and refresh rates (the `eDP-1` display has been clipped for brevity).  This means that you can choose from anything that's listed in the table.

Finally, we can easily list the monitors that are internal and otherwise currently connected:

```
$ xrandr --listmonitors
Monitors: 2
 0: +*eDP-1 1920/382x1080/215+1920+0  eDP-1
 1: +HDMI-1 1920/698x1080/392+0+0  HDMI-1
```

> `+` means the preferred setting, and `*` means the current one.

### Mirroring Displays

```
$ xrandr --output HDMI-1 --mode 1920x1080 --rate 60.00
```

If you'd like `xrandr` to choose the preferred resolution and rate, simply use the `--auto` switch, which also will turn on the specified output if it's off.

> The `--preferred` switch is the same as `--auto` except that it doesn't enable or disable the output.

For instance, both the `mode` and the `rate` specified above are the preferred settings, so it could be simplified to:

```
$ xrandr --output HDMI-1 --auto
```

### Dual Display

Let's set up a dual display:

```
$ xrandr --output eDP-1 --primary --mode 1920x1080 --rate 60.02 \
    --output HDMI-1 --mode 1920x1080 --rate 60.00 --right-of eDP-1
```

> The directional parameters such as `--right-of` instruct `xrandr` how the cursor should traverse the monitors.  For instance, if my laptop was to the left of the TV as shown above but to its right, I would use the `--left-of` parameter.
>
> Other values are `--above`, `--below` and `--same-as`.

Of course, if you have a third display, you could add it and use the `--left-of [DISPLAY]`, but no one has used more than two displays at one time, ever.

### Rotating

Rotation is easy peasy.  Use the parameter `rotate` and the value `left` or `right` to rotate the display for a display device that is taller than it is wider for a nice coding experience.

```
$ xrandr --output HDMI-1 --mode 1920x1080 --rate 60.00 --rotate left
```

Defaults to `normal`.

Use `--rotate inverted` to make friends!

## Disabling

To turn off, i.e., disable, and output, use the `--off` switch.

For example, in the previous examples, we've enabled and are using both the internal `eDP-1` display and the external `HDMI-1` display.  To disable the latter, simply use the following command:

```
$ xrandr --output HDMI-1 --off
```

This will then move all windows to the internal display.

## Persisting

### `xinitrc`

Any commands run at the command line will last only as long as the session.  So, how do we persist our settings across reboots?

A great way to do this is simply to put the `xrandr` commands in one or both of the X run command files that are sourced when X starts.  These files are:

- [`.xinitrc`]
    + Parsed by X when [`startx`] is called from the command line.
        - `startx` invokes [`xinit`].
- [`.xsession`]
    + Parsed by X when logging in using a GUI display manager like [`xdm`] or [`gdm3`].
        - X is launched before the login.

> One can always simplify the maintenance of these shell scripts by linking one to another.

For example, this could be a fine example of an `.xinitrc` run command file:

<pre class="math">
command -v i3 > /dev/null && i3

command -v xrandr > /dev/null && \
    xrandr --output eDP-1 --mode 1920x1080 --rate 60.02 \
    --output HDMI-1 --mode 1920x1080 --rate 60.00 --left-of eDP-1

</pre>

And, if I were so inclined:

```
$ ln .xinitrc .xsession
```

Of course, you wouldn't want to launch `i3` from `.xsession`, but you get the idea.

### `xorg.conf.d`

Another option would be to add configuration files to the `/etc/X11/xorg.conf.d/` directory.  This directory may not exist on your system, and so you may have to create it (be sure to make sure that you're using X.org and not [Wayland]).

X.org will use any files it finds with the `.conf` extension, and it uses the usual Linux practice of prefixing the filename with a number (like `10-monitors.conf`) that will be parsed in order from 0-99.

The files will then be appended to the end of what amounts to a giant X.org configuration.

> Third-parties add configuration files to `/usr/share/X11/xorg.conf.d/`.

Your Linux distribution may also include the file `/etc/xorg.conf`, but from what I've seen that has been largely superseded by the `xorg.conf.d` directory (although it should still work).

Using any of these methods is outside of the scope of this article, but you can read about it in the [xorg.conf documentation].

## Other Software

Here are two other tools that you may find delight you.  I don't use them, and I don't care enough about them to look into them.  Both are written in Python, so that kind of sucks.

- [`arandr`]
- [`autorandr`]

## Conclusion

I conclude that it's better to have a bottle in front of me than a frontal lobotomy.

## References

- [RandR Documentation](https://www.x.org/wiki/Projects/XRandR/)
- [xrandr Arch Linux docs](https://wiki.archlinux.org/title/Xrandr)
- [`Xsession` man page](https://manpages.debian.org/bullseye/x11-common/Xsession.5.en.html)

[J.J. Cale]: https://en.wikipedia.org/wiki/J._J._Cale
[`xrandr`]: https://man.archlinux.org/man/xrandr.1
[`RandR`]: https://en.wikipedia.org/wiki/X.Org_Server#Other_DDX_components
[`X11` protocol]: https://en.wikipedia.org/wiki/X_Window_System_core_protocol
[X.Org Server]: https://en.wikipedia.org/wiki/X.Org_Server
[`HDMI`]: https://en.wikipedia.org/wiki/HDMI
[`.xinitrc`]: https://wiki.debian.org/Xinitrc
[`startx`]: https://man.archlinux.org/man/startx.1.en
[`xinit`]: https://man.archlinux.org/man/xinit.1
[`.xsession`]: https://wiki.debian.org/Xsession
[`xdm`]: https://en.wikipedia.org/wiki/XDM_(display_manager)
[`gdm3`]: https://en.wikipedia.org/wiki/GNOME_Display_Manager
[Wayland]: https://en.wikipedia.org/wiki/Wayland_(display_server_protocol)
[xorg.conf documentation]: https://www.x.org/releases/current/doc/man/man5/xorg.conf.5.xhtml
[`arandr`]: https://christian.amsuess.com/tools/arandr/
[`autorandr`]: https://github.com/phillipberndt/autorandr

