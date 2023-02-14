+++
title = "On Studying for the LPIC-1 Exam 102 (102-500), Part Two"
date = "2023-01-25T23:26:35-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 102 (101-500), Part One](/2023/01/22/on-studying-for-the-lpic-1-exam-102-102-500-part-one/)
- On Studying for the LPIC-1 Exam 102 (101-500), Part Two
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Three](/2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Four](/2023/02/01/on-studying-for-the-lpic-1-exam-102-102-500-part-four/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Five](/2023/02/03/on-studying-for-the-lpic-1-exam-102-102-500-part-five/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Six](/2023/02/06/on-studying-for-the-lpic-1-exam-102-102-500-part-six/)

And, so is this one!

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 106: User Interfaces and Desktops].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 106: User Interfaces and Desktops](#topic-106-user-interfaces-and-desktops)
    + [X Window System](#x-window-system)
        - [Architecture](#architecture)
    + [Wayland](#wayland)
    + [Desktop Environment](#desktop-environment)
    + [Libraries](#libraries)
        - [`GTK+`](#gtk+)
        - [`Qt`](#qt)
    + [Desktop Interoperability](#desktop-interoperability)
    + [Remote Desktops](#remote-desktops)
    + [Accessibility](#accessibility)
        - [Universal Access](#universal-access)
        - [`AccessX`](#accessx)
            + [Sticky Keys](#sticky-keys)
            + [Bounce Keys](#bounce-keys)
            + [Slow Keys](#slow-keys)
            + [Mouse Keys](#mouse-keys)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 106: User Interfaces and Desktops

## X Window System

The `X` Window System is a [windowing system] on Unix machines for [bitmap] displays.  It started in 1984 at MIT as a part of [Project Athena].

At its heart, its purpose is to display text and graphics on a screen.  They are two-dimensional, and there are extensions through which three dimensional shapes are achieved.

The architecture is client-server, and each client, be it a terminal emulator, game, or web browser, manages its own look and feel, independent of the server.

The protocol is at version 11 since 1987, and the [X.Org Foundation] leads its development.  [`X.org Server`] is its current reference implementation.

### Architecture

Here is a visual image of the `X` Window system architecture:

![X_Windows](/images/x_windows.png)

In addition to logging in a user, the [display manager] is also the component that is starts the `X` server.  It is also responsible for keeping it up and running.

Each instance of a running `X` server has a display name to identify it.  Here is its format:

<pre class="math">
hostname:displaynumber.screennumber
</pre>

```
$ printenv DISPLAY
:0
```

To display an application on a specific screen:

```
$ DISPLAY=:0.1 thunderbird &
```

Examples of `X` extensions:

- [`libXrandr`](https://www.x.org/wiki/libraries/libxrandr/)
- [`libXcursor`](https://gitlab.freedesktop.org/xorg/lib/libxcursor)
- [`libX11`](https://en.wikipedia.org/wiki/Xlib)
- [`libxkbfile`](https://gitlab.freedesktop.org/xorg/lib/libxkbfile)

Use [`xdpyinfo`] to print information about a running `X` server.

```
$ xdpyinfo | head
name of display:    :0
version number:    11.0
vendor string:    The X.Org Foundation
vendor release number:    12011000
X.Org version: 1.20.11
maximum request size:  16777212 bytes
motion buffer size:  256
bitmap unit, bit order, padding:    32, LSBFirst, 32
image byte order:    LSBFirst
number of supported pixmap formats:    7
```

To create a new `xorg.conf` file:

```
$ sudo Xorg :1 -configure
```

This will put this in `/root` under the name `xorg.conf.new` and to test the server run:

```
$ sudo X -config /root/xorg.conf.new
```

> `X` is symlinked to `Xorg`.

```
$ loginctl show-session $XDG_SESSION_ID | head
Id=1
User=1000
Name=btoll
Timestamp=Thu 2023-01-26 02:18:18 EST
TimestampMonotonic=41904485
VTNr=1
Seat=seat0
TTY=tty1
Remote=no
Service=login
```

## Wayland

## Desktop Environment

Popular desktop environments:
- [`GNOME`](https://www.gnome.org/)
- [`KDE`](https://kde.org/)
- [`Xfce`](https://xfce.org/)
- [`LXDE`](http://www.lxde.org/get/)

# Summary

Continue your journey with the third installment in this titillating series, [On Studying for the LPIC-1 Exam 102 (101-500), Part Three](/2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/).

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [xorg.conf](https://www.x.org/releases/current/doc/man/man5/xorg.conf.5.xhtml)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 106: User Interfaces and Desktops]: https://learning.lpi.org/en/learning-materials/102-500/106/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives
[windowing system]: https://en.wikipedia.org/wiki/Windowing_system
[bitmap]: https://en.wikipedia.org/wiki/Bitmap
[Project Athena]: https://en.wikipedia.org/wiki/Project_Athena
[X.Org Foundation]: https://en.wikipedia.org/wiki/X.Org_Foundation
[`X.org Server`]: https://en.wikipedia.org/wiki/X.Org_Server
[display manager]: https://wiki.archlinux.org/title/Display_manager
[`xdpyinfo`]: https://www.x.org/releases/X11R7.7/doc/man/man1/xdpyinfo.1.xhtml

