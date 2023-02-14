+++
title = "On Studying for the LPIC-1 Exam 102 (102-500), Part Four"
date = "2023-02-01T14:22:37-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 102 (101-500), Part One](/2023/01/22/on-studying-for-the-lpic-1-exam-102-102-500-part-one/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Two](/2023/01/25/on-studying-for-the-lpic-1-exam-102-102-500-part-two/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Three](/2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/)
- On Studying for the LPIC-1 Exam 102 (101-500), Part Four
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Five](/2023/02/03/on-studying-for-the-lpic-1-exam-102-102-500-part-five/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Six](/2023/02/06/on-studying-for-the-lpic-1-exam-102-102-500-part-six/)

And, so is this one!

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 108: Essential System Services].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 108: Essential System Services](#topic-108-essential-system-services)
    + [Time](#time)
        - [`date`](#date)
        - [`hwclock`](#hwclock)
        - [`timedatectl`](#timedatectl)
    + [Network Time Protocols](#network-time-protocols)
        + [`SNTP`](#sntp)
        + [`NTP`](#ntp)
        + [`chrony`](#chrony)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 108: Essential System Services

## Time

A system starts keeping time when it boots.  The [system clock] is updated by the operating system, while the [real-time clock], also known as the hardware clock, is integrated with the motherboard and keeps time even when the machine is powered off.

The system clock is synced with the real-time clock on boot.

Both clocks, however, are synchronized to network time via the [Network Time Protocol] (`NTP`).

### `date`

The [`date`] tool will print or set the system date and time.  It will print local time, which is an offset of [Coordinated Universal Time] (UTC).

There are many cool ways to print out the local time using different formats and time zones.  In addition, you can print the date in the future or in the past.

```
$ date
Fri 03 Feb 2023 02:47:21 PM EST
```

In `UTC`:

```
$ date -u
Fri 03 Feb 2023 07:49:48 PM UTC
```

There are way too many formatting options to list here, you should see the man page.  But, here are some:

- `-I`, `--iso-8601`
    + formats in [ISO 8601]
- `-R`, `--rfc-email`
    + formats in [RFC 5322]
- `--rfc-3339`


Using formatting sequences, print the current hour and minute in military time:

```
$ date +%H:%M
15:12
```

Additionally, use `--date` to format a time that is not current:

```
$ date --date='@2564013011'
Sat 01 Apr 2051 09:50:11 PM EDT
```

In the future and the past!

```
$ date --date='TZ="America/Los_Angeles" 09:00 next Fri'
Fri 10 Feb 2023 12:00:00 PM EST
$ date --date='TZ="America/Los_Angeles" 09:00 last Fri'
Fri 27 Jan 2023 12:00:00 PM EST
```

Lastly, use the `--debug` option like a boss!

From the man page:

<pre class="math">
--debug
       annotate the parsed date, and warn about questionable usage to stderr
</pre>

> Have you heard of the [Year 2038 problem]?  At its core, 32-bit systems are not going to be able to store time after 03:14:07 UTC on January 19, 2038.  Attempting to store the time after that precise moment will cause an [integer overflow].

### `hwclock`

The [`hwclock`] utility allows one to view the time as maintained by the real-time clock.  As an administration tool, it allows a privileged user to set both the real-time clock and the system clock and more.

```
$ sudo hwclock
2023-02-03 15:28:51.042561-05:00
```

The `--verbose` option gives you more information than you know what to do with:

```
$ sudo hwclock --verbose
hwclock from util-linux 2.36.1
System Time: 1675461223.537073
Trying to open: /dev/rtc0
Using the rtc interface to the clock.
Last drift adjustment done at 1672696998 seconds after 1969
Last calibration done at 1672696998 seconds after 1969
Hardware clock is on UTC time
Assuming hardware clock is kept in UTC time.
Waiting for clock tick...
...got clock tick
Time read from Hardware Clock: 2023/02/03 21:53:44
Hw clock time : 2023/02/03 21:53:44 = 1675461224 seconds since 1969
Time since last adjustment is 2764226 seconds
Calculated Hardware Clock drift is 0.000000 seconds
2023-02-03 16:53:43.523725-05:00
```

The `Calculated Hardware Clock drift` is the amount of time the system and real-time clocks are deviating from one another.

### `timedatectl`

Use the [`timedatectl`] as yet another tool to display the system time and the hardware time (`RTC time` in the example below):

```
$ timedatectl
               Local time: Fri 2023-02-03 17:00:02 EST
           Universal time: Fri 2023-02-03 22:00:02 UTC
                 RTC time: Fri 2023-02-03 22:00:02
                Time zone: America/New_York (EST, -0500)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

It also lets you know if `NTP` is in use and has been used to synchronize the system and real-time clocks.

Use this command to set the time (and time zone) if `NTP` is unavailable or not installed.  It is recommended to use this utility and not `date` or `hwclock`.

From the man page:

<pre class="math">
set-time [TIME]
    Set the system clock to the specified time. This will also update the RTC time accordingly. The
    time may be specified in the format "2012-10-30 18:17:16".

set-timezone [TIMEZONE]
    Set the system time zone to the specified value. Available timezones can be listed with
    list-timezones. If the RTC is configured to be in the local time, this will also update the RTC
    time. This call will alter the /etc/localtime symlink. See localtime(5) for more information.
</pre>

List the time zones using `timedatectl list-timezones`.  Remember, you can use the [`tzselect`] tool to select yours.

You can also use `timedatectl set-ntp` to enable or disable `NTP`, if you feel like living on the edge.

When setting the time zone without using `timedatectl`, simply create a symlink to the appropriate file in `/usr/share/zoneinfo` to the system [`/etc/localtime`] file:

```
$ ln -s /usr/share/zoneinfo/America/Toronto /etc/localtime
```

> The `LPIC-1` docs advise setting the hardware clock from the system clock after updating the time zone in the way just described.
>
> ```
> $ sudo hwclock --systohc
> ```

Also, you can use `date` or `hwclock` to set the date and time on a system that doesn't use `systemd` for its system initialization.

Note that this is not recommended if you do use `systemd`.

```
$ sudo date --set="11 Nov 2011 11:11:11"
$ sudo date +%Y%m%d -s "20111125"
$ sudo date +%T -s "13:11:00"
```

> The `LPIC-1` docs advise setting the hardware clock from the system clock after updating the date and time in the way just described.
>
> ```
> $ sudo hwclock --systohc
> ```

For `hwclock`, you can do:

```
$ sudo hwclock --set --date "4/12/2019 11:15:19"
```

`hwclock` will report the date as local time, but note that it must be set in `UTC`.

> The `LPIC-1` docs advise setting the setting clock from the hardware clock after updating the date and time in the way just described.
>
> ```
> $ sudo hwclock --hctosys
> ```

## Network Time Protocols

The best clocks to synchronize to are a reference or [atomic clock].  [`SNTP`] (Simple Network Time Protocal) and `NTP` are both networking protocols that allow for clock synchronization with these reference clocks, although the public are not allowed direct access to them.

![X_Windows](/images/ntp_stratums.png)

### `SNTP`

If your system initialization service is `systemd`, then by default its using `SNTP`, not `NTP`.  `SNTP` is a lighter-weight protocol, and pratically it means that your system will not serve `NTP` to other machines.

`SNTP` is used only when the [`systemd-timesync`] daemon is active.  To check its status:

```
$ sudo systemctl status systemd-timesyncd
● systemd-timesyncd.service - Network Time Synchronization
     Loaded: loaded (/lib/systemd/system/systemd-timesyncd.service; enabled; vendor preset: enabled)
     Active: active (running) since Wed 2023-02-01 22:32:24 EST; 1 day 21h ago
       Docs: man:systemd-timesyncd.service(8)
   Main PID: 719 (systemd-timesyn)
     Status: "Initial synchronization to time server 104.131.155.175:123 (0.debian.pool.ntp.org)."
      Tasks: 2 (limit: 38126)
     Memory: 1.8M
        CPU: 385ms
     CGroup: /system.slice/systemd-timesyncd.service
             └─719 /lib/systemd/systemd-timesyncd

Feb 01 23:56:05 kilgore-trout systemd-timesyncd[719]: Initial synchronization to time server 208.67.72.50:123 (>
Feb 02 18:10:21 kilgore-trout systemd-timesyncd[719]: Initial synchronization to time server 23.131.160.7:123 (>
Feb 02 22:18:00 kilgore-trout systemd-timesyncd[719]: Initial synchronization to time server 65.100.46.164:123
...
```

Use `timedatectl` to check the `SNTP` synchronization status:

```
$ timedatectl show-timesync --all
LinkNTPServers=
SystemNTPServers=
FallbackNTPServers=0.debian.pool.ntp.org 1.debian.pool.ntp.org 2.debian.pool.ntp.org 3.debian.pool.ntp.org
ServerName=0.debian.pool.ntp.org
ServerAddress=104.131.155.175
RootDistanceMaxUSec=5s
PollIntervalMinUSec=32s
PollIntervalMaxUSec=34min 8s
PollIntervalUSec=8min 32s
NTPMessage={ Leap=0, Version=4, Mode=4, Stratum=2, Precision=-30, RootDelay=4.165ms, RootDispersion=3.982ms, Reference=AB400749, OriginateTimestamp=Fri 2023-02-03 19:41:30 EST, ReceiveTimestamp=Fri 2023-02-03 19:41:30 EST, TransmitTimestamp=Fri 2023-02-03 19:41:30 EST, DestinationTimestamp=Fri 2023-02-03 19:41:30 EST, Ignored=no PacketCount=115, Jitter=126.318ms }
Frequency=-3812749
```

### `NTP`

# Summary

Continue your journey with the fifth installment in this titillating series, [On Studying for the LPIC-1 Exam 102 (101-500), Part Five](/2023/02/03/on-studying-for-the-lpic-1-exam-102-102-500-part-five/)

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [TIME.IS](https://time.is/)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 108: Essential System Services]: https://learning.lpi.org/en/learning-materials/102-500/108/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives
[system clock]: https://en.wikipedia.org/wiki/System_time
[real-time clock]: https://en.wikipedia.org/wiki/Real-time_clock
[Network Time Protocol]: https://en.wikipedia.org/wiki/Network_Time_Protocol
[`date`]: https://man7.org/linux/man-pages/man1/date.1.html
[Coordinated Universal Time]: https://www.timeanddate.com/time/aboututc.html
[RFC 5322]: https://www.rfc-editor.org/rfc/rfc5322
[ISO 8601]: https://en.wikipedia.org/wiki/ISO_8601
[Year 2038 problem]: https://en.wikipedia.org/wiki/Year_2038_problem
[integer overflow]: https://en.wikipedia.org/wiki/Integer_overflow
[`hwclock`]: https://man7.org/linux/man-pages/man8/hwclock.8.html
[`timedatectl`]: https://man7.org/linux/man-pages/man1/timedatectl.1.html
[`tzselect`]: https://man7.org/linux/man-pages/man8/tzselect.8.html
[`/etc/localtime`]: https://man7.org/linux/man-pages/man5/localtime.5.html
[atomic clock]: https://en.wikipedia.org/wiki/Atomic_clock
[`SNTP`]: https://en.wikipedia.org/wiki/Network_Time_Protocol#SNTP
[`systemd-timesync`]: https://man7.org/linux/man-pages/man8/systemd-timesyncd.service.8.html

