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
        - [`SNTP`](#sntp)
        - [`NTP`](#ntp)
        - [`chrony`](#chrony)
    + [`rsyslog`](#rsyslog)
        - [Log Types](#log-types)
            + [System Logs](#system-logs)
            + [Service Logs](#service-logs)
        - [Reading Logs](#reading-logs)
            + [Tools](#tools)
            + [Format](#format)
        - [Process of Writing Logs](#process-of-writing-logs)
        - [`rsyslog.conf`](#rsyslogconf)
            + [Examples](#examples)
            + [`logger`](#logger)
            + [`rsyslog` Remote Server](#rsyslog-remote-server)
        - [Log Rotation](#log-rotation)
        - [Kernel Ring Buffer](#kernel-ring-buffer)
    + [`systemd-journald`](#systemd-journald)
        - [`journalctl`](#journalctl)
        - [`systemd-cat`](#systemd-cat)
        - [Journal Storage](#journal-storage)
        - [Deleting Old Journals](#deleting-old-journals)
        - [Forwarding to `syslogd`](#forwarding-to-syslogd)
    + [Mail](#mail)
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

TODO

### `chrony`

TODO

## `rsyslog`

Logs are generated from the moment that the kernel is loaded into memory onwards.  Logging has traditionally been handled by [`syslog`], [`syslog-ng`] (New Generation) and [`rsyslog`] (rocket-fast syslog).  The exam seems to focus solely on `rsyslog`, so we will, too.

One of the advantages of `rsyslog` over its predecessors is its [`Reliable Event Logging Protocol`] (`RELP`) support.  It is often used in environments which cannot tolerate message loss, such as the financial industry.

`rsyslog` collects messages from services and programs and stores them in text files, usually under `/var/log/`.  Some applications, such as web servers like `nginx` and `apache`, take care of their own logs, but you'll still find them in the same location (`/var/log/`).

> The kernel writes its messages to an in-memory ring buffer.

`rsyslog` has a client-server model.  In most situations, both the client and server are on the same machine (such as the laptop in which I'm now typing), but often the logs are sent to a centralized remote server (or perhaps servers) for aggregation.  The messages themselves are in a particular format, which we'll see shortly.

> The `rsyslog` daemon works together with [`klogd`] which manages kernel messages.

### Log Types

Logs are variable data, so they'll be found in `/var` under `/var/log/`.  They can be rougly classified into system logs and service or program logs.

#### System Logs

We'll first look at some system logs:

- `/var/log/auth.log`
    + activities related to authentication processes: logged users, `sudo` information, cron jobs, failed login attempts, etc.
- `/var/log/syslog`
    + a centralized file for practically all of the logs captured by `rsyslogd`
- `/var/log/debug`
    + debug information from programs
- `/var/log/kern.log`
    + kernel messages
- `/var/log/messages`
    + informative messages which are not related to the kernel but to other services
    + also, the default remote client log destination in a centralized log server implementation
- `/var/log/daemon.log`
    + information related to daemons or services running in the background
- `/var/log/mail.log`
    + information related to the email server, e.g. `postfix`
- `/var/log/Xorg.0.log`
    + information related to the graphics card
- [`/var/run/utmp`], `/var/log/wtmp`
    + successful logins
- `/var/log/btmp`
    + failed login attempts, e.g. `ssh` brute force attacks
- [`/var/log/faillog`]
    + failed authentication attempts
- `/var/log/lastlog`
    + date and time of recent user logins

#### Service Logs

Next, let's turn our attention to service or program logs:

- `/var/log/cups/`
    + `access_log`
    + `error_log`
    + `page_log`
- `/var/log/apache2/`, `/var/log/httpd`
    + `access_log`
    + `error_log`
    + `other_vhosts_access.log`
- `/var/log/mysql`
    + `error_log`
    + `mysql.log`
    + `mysql-slow.log`
- `/var/log/samba/`
    + `log.nmbd`
    + `log.smbd`
- `/var/log/dpkg.log`
    + containing information related to dpkg packages
    + Debian-derivatives

### Reading Logs

#### Tools

`rsyslogs` are textual, so you can use the [`less`] and [`more`] pagers like you would for any text file.  For logs that have been compressed with the [`gzip`] utility, you can use [`zless`] and [`zmore`].

> By default, [`logrotate`] will use `gzip` for compression.

In addition, you can use your old friends [`head`], [`tail`] (often with the `-f|--follow` switch) and [`grep`].

#### Format

- timestamp
- hostname from which the message originated
- name of program/service that generated the message
- the PID of the program that generated the message
- description of the action that took place

For example:

```
$ sudo head -1 /var/log/daemon.log
Mar  4 01:22:54 kilgore-trout systemd[1]: rsyslog.service: Sent signal SIGHUP to main process 904 (rsyslogd) on client request.
```

The format and the respective values of the fields are:

- timestamp
    + `Mar  4 01:22:54`
- hostname from which the message originated
    + `kilgore-trout`
- name of program/service that generated the message
    + `systemd`
- the PID of the program that generated the message
    + `[1]`
- description of the action that took place
    + `rsyslog.service: Sent signal SIGHUP to main process 904 (rsyslogd) on client request.`

Most of the logs are textual, but some are binary.  Here are some examples and the tools to use to view them.

- `/var/log/wtmp`
    + [`who`] or [`w`]

- `/var/log/btmp`
    + [`utmpdump`] or [`last -f`]

- [`/var/log/faillog`]
    + [`faillog`]

- `/var/log/lastlog`
    + [`lastlog`]

> There are also graphical tools like `gnome-logs` and `KSystemLog`.

### Process of Writing Logs

1. Applications, services and the kernel write messages in special files (sockets and memory buffers), e.g. `/dev/log` or `/dev/kmsg`.

1. `rsyslogd` gets the information from the sockets or memory buffers.

1. depending on the rules found in [`/etc/rsyslog.conf`] and/or the files in `/etc/ryslog.d/`, `rsyslogd` moves the information to the corresponding log file (typically found in `/var/log`)

You can list all sockets on the system through `systemd` by issuing the following command:

```
$ systemctl list-sockets --all
```

### `rsyslog.conf`

The configuration log for `rsyslogd` can be found in [`/etc/rsyslog.conf`].  It (usually) consists of three sections:

- `MODULES
    + includes module support for logging, message capability and `UDP` and `TCP` log reception:
        ```
        #################
        #### MODULES ####
        #################

        module(load="imuxsock") # provides support for local system logging
        module(load="imklog")   # provides kernel logging support
        #module(load="immark")  # provides --MARK-- message capability

        # provides UDP syslog reception
        #module(load="imudp")
        #input(type="imudp" port="514")

        # provides TCP syslog reception
        #module(load="imtcp")
        #input(type="imtcp" port="514")
        ```
- `GLOBAL DIRECTIVES`
    + configure a number of things such as logs and log directory permissions
        ```
        ###########################
		#### GLOBAL DIRECTIVES ####
        ###########################

        #
        # Use traditional timestamp format.
        # To enable high precision timestamps, comment out the following line.
        #
        $ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat

        #
        # Set the default permissions for all log files.
        #
        $FileOwner root
        $FileGroup adm
        $FileCreateMode 0640
        $DirCreateMode 0755
        $Umask 0022

        #
        # Where to place spool and state files
        #
        $WorkDirectory /var/spool/rsyslog

        #
        # Include all config files in /etc/rsyslog.d/
        #
        $IncludeConfig /etc/rsyslog.d/*.conf
        ```

- `RULES`
    + this section tells `rsyslog` how to filter logging messages through rules and ultimately where to send them
    + this is enabled through the use of `facilities` and `priorities`
    + each log message is given a `facility` number and keyword that are associated with the Linux internal subsystem that produces the message:
        |**Number** |**Keyword** |**Description** |
        |:---|:---|:---|
        |0 |`kern` |Linux kernel messages |
        |1 |`user` |User level messages |
        |3 |`daemon` |System daemons |
        |4 |`auth`, `authpriv` |Security and Authorization messages |
        |5 |`syslog` |`syslogd` messages |
        |6 |`lpr` |Line printer subsystem |
        |7 |`news` |Network news subsystem |
        |8 |`uucp` |`UUCP` (Unix-to-Unix Copy Protocol) subsystem |
        |9 |`cron` |Clock daemon |
        |10 |`auth`, `authpriv` |Security and Authorization messages |
        |11 |`ftp` |`FTP` (File Transfer Protocol) daemon |
        |12 |`ntp` |`NTP` (Network Time Protocol) daemon |
        |13 |`security` |Log audit |
        |14 |`console` |Log alert |
        |15 |`cron` |Clock daemon |
        |16-23 |`local0`-`local7` |Local use 0-7 |
    + each log message is also assigned a `priority` level:
        |**Code** |**Severity** |**Keyword** |**Description** |
        |:---|:---|:---|:---|
        |0 |Emergency |`emerg`, `panic` |System is unusable |
        |1 |Alert |`alert` |Action must be taken immediately |
        |2 |Critical |`crit` |Critical conditions |
        |3 |Error |`err`, `error` |Error conditions |
        |4 |Warning |`warn`, `warning` |Warning conditions |
        |5 |Notice |`notice` |Normal but significant condition |
        |6 |Informational |`info` |Informational messages |
        |7 |Debug |`debug` |Debug-level messages |

		```
        ###############
        #### RULES ####
        ###############

        #
        # First some standard log files.  Log by facility.
        #
        auth,authpriv.*			/var/log/auth.log
        *.*;auth,authpriv.none		-/var/log/syslog
        #cron.*				/var/log/cron.log
        daemon.*			-/var/log/daemon.log
        kern.*				-/var/log/kern.log
        lpr.*				-/var/log/lpr.log
        mail.*				-/var/log/mail.log
        user.*				-/var/log/user.log

        #
        # Logging for the mail system.  Split it up so that
        # it is easy to write scripts to parse these files.
        #
        mail.info			-/var/log/mail.info
        mail.warn			-/var/log/mail.warn
        mail.err			/var/log/mail.err

        #
        # Some "catch-all" log files.
        #
        *.=debug;\
            auth,authpriv.none;\
            mail.none		-/var/log/debug
        *.=info;*.=notice;*.=warn;\
            auth,authpriv.none;\
            cron,daemon.none;\
            mail.none		-/var/log/messages

        #
        # Emergencies are sent to everybody logged in.
        #
        *.emerg				:omusrmsg:*
		```

So, what's the rule format?

`facility>.<priority> <action>`

Let's break down some examples:

#### Examples

```
auth,authpriv.*			/var/log/auth.log
```

Regardless of the priority (like in globbing, the asterisk matches everything), all messages from the `auth` and `authpriv` facilities are sent to `/var/log/auth.log`.

```
*.*;auth,authpriv.none		-/var/log/syslog
```

All messages, irrespective of their priority (*), from all facilities (*) (discarding those from `auth` or `authpriv` because of the `.none` suffix), will be written to `/var/log/syslog` (the hyphen `-` before the path prevents excessive disk writes).

Note the semicolon `;` to split the selector and the comma `,` to concatenate two facilities in the same rule (`auth`, `authpriv`).

```
mail.err			/var/log/mail.err
```
Messages from the `mail` facility with a priority level of `error` or higher (`critical`, `alert` or `emergency`) will be sent to `/var/log/mail.err`.

```
*.=debug;\
    auth,authpriv.none;\
    mail.none		-/var/log/debug
```

Messages from all facilities with the `debug` priority and no other `=` will be written to `/var/log/debug`, excluding any messages coming from the `auth`, `authpriv`, `news` and `mail` facilities (note the syntax: `;\`).

#### `logger`

There is a [`logger`] utility that will write directly to the `/var/log/syslog` file or to `/var/log/messages` when logging to a centralized remote log server.

```
$ logger "what's up broseph"
$ sudo tail -1 /var/log/syslog
Mar  5 01:56:55 kilgore-trout btoll: what's up broseph
```
#### `rsyslog` Remote Server

Let's check out how we can send log messages to a remote `rsyslogd` server.

- ensure that the `rsyslogd` server is running on the remote machine
- create a file that loads the module and starts the `tcp` server on port 514 (for example, `SUSE` ships with a file for this, `/etc/rsyslog.d/remote.conf`)
- restart the `rsyslogd` service
    + `systemctl restart rsyslog
- open port 514 in the firewall
- by creating a `template` and adding a `filter condition`, the logs can be written to a particular location on the remote server (instead of defaulting to `/var/log/syslog`) and be filtered by `IP` address
    + for example, the following can be added either to `/etc/rsyslog.conf` or `/etc/rsyslog.d/remote.conf` on the remote server:
        ```
        $template RemoteLogs,"/var/log/remotehosts/%HOSTNAME%/%$NOW%.%syslogseverity-text%.log"
        if $FROMHOST-IP=='192.168.1.4' then ?RemoteLogs
        & stop
        ```
- on the client, add this to its `/etc/rsyslog.conf` and afterwards restart the `rsyslog` service:
    + `*.* @@192.168.1.6:514`
    + the `IP` address is that of the remote `rsyslog` server

### Log Rotation

The system utility in charge of rotating the logs is [`logrotate`].  It generally does the following things:

- renaming log files as they age
- archiving and/or compressing them
- possibly emailing them to the system administrator
- deleting them as they outlive their usefulness

There are various conventions for (re)naming the archived log files, but a common practice is simply to append an integer to the file name which indicates their age in weeks.

For example:

TODO: remove the backslash below

```
$ ls /var/log/messages\*
/var/log/messages    /var/log/messages.2.gz  /var/log/messages.4.gz
/var/log/messages.1  /var/log/messages.3.gz
```

For the next rotation, the oldest logfile will be deleted (`/var/log/messages.4.gz`), and the others will be incremented.  All but the current and `/var/log/messages.1` will be `gzip` compressed.

`logrotate` is run as an automated process or cron job daily through the script `/etc/cron.daily/logrotate` and reads the configuration file `/etc/logrotate.conf`.

Looking at the `lograte.conf` config file, we can see it's fairly self-explanatory:

```
$ cat /etc/logrotate.conf
# see "man logrotate" for details

# global options do not affect preceding include directives

# rotate log files weekly
weekly

# keep 4 weeks worth of backlogs
rotate 4

# create new (empty) log files after rotating old ones
create

# use date as a suffix of the rotated file
#dateext

# uncomment this if you want your log files compressed
#compress

# packages drop log rotation information into this directory
include /etc/logrotate.d

# system-specific logs may also be configured here.
```

Configurations for specific packages can be installed in `/etc/logrotate.d/`.  Here is an example:

```
$ cat /etc/logrotate.d/ufw
/var/log/ufw.log
{
        rotate 4
        weekly
        missingok
        notifempty
        compress
        delaycompress
        sharedscripts
        postrotate
                invoke-rc.d rsyslog rotate >/dev/null 2>&1 || true
        endscript
}
```

### Kernel Ring Buffer

Since the kernel generates several messages before `rsyslogd` becomes available on boot, a mechanism to register those messages becomes necessary.  This is the kernel ring buffer.  It is a fixed-size data structure and as it grows with new messages, the oldest will disappear.

The [`dmesg`] utility prints the contents of the kernel ring buffer.  It can also be viewed using either `journalctl --dmesg` or `journalctl -k`.

## `systemd-journald`

Why use `systemd` for logging?

- ease of configuration: unit files as opposed to `SysV` Init script
- versatile management: apart from daemons and processes, it also manages devices, sockets and mount points
- backward compatibility with both `SysV` Init and `Upstart`
- parallel loading during boot-up: services are loaded in parallel as opposed to `Sysv` Init loading them sequentially
- it features a logging service called the journal that presents the following advantages:
    + it centralizes all logs in one place
    + it does not require log rotation
    + logs can be disabled, loaded in `RAM` or made persistent

`systemd` operates on units, whose behaviors are defined in text files in `/lib/systemd/system/`.  These unit types can be:

- `service`
- `mount`
- `automount`
- `swap`
- `timer`
- `device`
- `socket`
- `path`
- `timer`
- `snapshot`
- `slice`
- `scope`
- `target`

A `target`, on the other hand, is an aggregation of units that are conceptually and functionally like the `runlevels` of old.

[`systemd-journald`] is the logging service for `systemd`, and its `raison d'être` is that of creating and maintaining a structured and indexed journal, which are kept in binary files.

It gets its message logs from a number of sources:

- kernel messages
- simple and structured system messages
- standard output and standard error of services
- audit records from the kernel audit subsystem

Its configuration file lives in [`/etc/systemd/journald.conf`].

You can check its status like any other `systemd` service:

```
$ systemctl status systemd-journald
```

### `journalctl`

[`journalctl`] is the utility that is used to interact with the daemon and get logging information.

Here are some of its most useful options:


|**Option** |**Description**
|:---|:---
|`-D`, `--directory` |Specify a directory path to search for journal files instead of the default runtime and system locations.
|`-m`, `--merge` |Merges entries from all available journals under `/var/log/journal`, including remote ones.
|`--file` |Show the entries in a specific file.
|`--root` |A directory path where `journalctl` will search for journal files.
|`-r`, `--reverse` |Print journal messages in reverse order.
|`-f`, `--follow` |Behaves like `tail -f`.
|`-e`, `--pager-end` |Jump to the end of the journal.
|`-n`, `--lines` |Prints `n` number of most-recent messages (defaults to ten).
|`-k`, `--dmesg` |Equivalent to `dmesg`.
|`--list-boots` | Lists all available boot logs.
|`-b`, `--boot` | Shows all messages from the current boot or `n` boot.
|`-p`, `--priority` | Filter by `priority` (see above).
|`-S`, `--since`, `-U`, `--until` | Filter by time interval (see [`systemd.time`]).
|`[/path/to/binary]` | See messages generated by `/path/to/binary`.
|`-u`, `--unit` | Filter messages by `unit`.
|`PRIORITY` | Filter by `syslog` priority value as a decimal string (see above).
|`SYSLOG_FACILITY` | Filter by `syslog` facility code number as a decimal string (see above).
|`_PID` | Filter by `PID`.
|`_BOOT_ID` | Filter by `BOOT_ID`.
|`_TRANSPORT` | Filter by `TRANSPORT`.

Also, fields can be combined:

```
$ sudo journalctl PRIORITY=4 SYSLOG_FACILITY=0
```

Using the `+` operator behaves like a `logical OR`:

```
$ sudo journalctl PRIORITY=3 + SYSLOG_FACILITY=0
```

> See [`systemd.journal-fields`] for more information.

Providing two values for the same field will find all matching entries for either value:

```
$ sudo journalctl PRIORITY=1 PRIORITY=3
```

### `systemd-cat`

[`systemd-cat`] is the `logger` of `systemd`, but more powerful.  It not only allows for sending `stdin`, `stdout` and `stderr` to the journal, but it can be used in pipelines or capturing a program's output in the journal.

Let's look at some examples:

```
$ systemd-cat
This line goes into the journal.
^C
```

```
$ echo "And so does this line." | systemd-cat
```

```
$ systemd-cat echo "And so does this line too."
```

```
$ systemd-cat -p emerg echo "This is not a real emergency."
```

They can then be viewed in the journal:

```
$ journalctl -n 4
```

### Journal Storage

There are three options when it comes to keeping journaling:

- turn it off (can still be redirected to `stdout` or other facilities)
- written to volatile `RAM` in `/run/log/journal` and is thrown away upon reboot
- persisted to disk in the `/var/log/journal` directory

What is the default behavior?

- if `/var/log/journal` doesn't exist, save logs in `/run/log/journal` (will be volatile)
- the name of the directory (in either location) is the machine ID ([`/etc/machine-id`])

If you want to persist logs and `/var/log/journal` doesn't exist, create it and then restart the journal daemon.  This "tells" the `systemd-journald` service to persist the logs by writing them to `/var/log/journal`.

The `LPIC-1` docs only focus on one of the configuration fields in [`/etc/systemd/journald.conf`]: `Storage=`.  Let's look at its possible values and what they mean:

|**Storage=** |**Description**
|:---|:---
|`volatile` |Log data will be stored exclusively in memory in `/run/log/journal`.
|`persistent` |Log data will be stored on disk in `/var/log/journal` with the fallback to `RAM` during early boot stages and if the disk is not writable (both dirs are created, if needed).
|`auto` |Similar to `persistent`, but the directory `/var/log/journal` is not created, if needed (this is the default).
|`none` |All log data is discarded. Forwarding to other targets such as the console, the kernel log buffer, or a `syslog` socket are still possible, though.

> Journal files in either location have the `.journal` extension.
>
> However, if they are found to be corrupted or the daemon is stopped in an unclean fashion, they will be renamed by appending `~` (e.g. `system.journal~`) to the journal name, and the daemon will then start writing to a new, clean file.

### Deleting Old Journals

To see how much space the journals take, run:

```
$ sudo journalctl --disk-usage
```

Note that running as a privileged user will show the messages of not only all the users but those generated by the system, while running the command as a user will only show that user's journal space.

`systemd` logs default to a maximum of 10% of the size of the filesystem where they are stored.  Once that threshold is reached, old logs will start to be deleted.

Total size and other behaviors can of course be configured.  Here are some of the common ones:

- `SystemMaxUse=`, `RuntimeMaxUse=`
- `SystemKeepFree=`, `RuntimeKeepFree=`
- `SystemMaxFileSize=`, `RuntimeMaxFileSize=`
- `SystemMaxFiles=`, `RuntimeMaxFiles=`
- `MaxRetentionSec=`, `MaxFileSec=`

In addition, you can manually clean archived journal files at any time with any of the following three options:

- `--vacuum-time=`
- `--vacuum-size=`
- `--vacuum-files=`

Vacuuming only removes archived journal files.  If you want to get rid of everything (including active journal files), you need to use a signal (`SIGUSR2`) that requests immediate rotation of the journal files with the `--rotate` option.

Other important signals can be invoked with the following options:

- `--flush (SIGUSR1)`
- `--sync (SIGRTMIN+1)`

> Note to check the internal consistency of the journal file, use `journalctl` with the `--verify` option.

### Forwarding to `syslogd`

To forward messages to the socket file `/run/systemd/journal/syslog`, turn on the ForwardToSyslog=yes in `/etc/systemd/journald.conf` (it should be on by default).

Also, for the `Storage=` option, have a value other than `none`.

> You can also forward to other locations with the following options: `ForwardToKMsg` (kernel log buffer, `kmsg`), `ForwardToConsole` (the system console) or `ForwardToWall` (all logged-in users via [`wall`]).

## Mail

In a terminal, start the `MTA` ([`sendmail`]):

```
$ sudo sendmail
```

In another, use [`ncat`] (`nc`) to send an email to a user on the system:

```
$ nc 127.0.0.1 25
220 kilgore-trout.benjamintoll.com ESMTP Postfix (Debian/GNU)
HELO 127.0.0.1
250 kilgore-trout.benjamintoll.com
MAIL FROM: btoll
250 2.1.0 Ok
RCPT TO: btoll
250 2.1.5 Ok
DATA
354 End data with <CR><LF>.<CR><LF>
Subject: ello kiddies

hi btoll, this is testing your MTA
.
250 2.0.0 Ok: queued as C819E364C0E
QUIT
221 2.0.0 Bye
^C
You have new mail in /var/mail/btoll
```

> Note that I'm sending an email to myself on the same machine, so the `MTA` is local.  This isn't always the case, and often you would use `ncat` to establish a connection to a different `MTA`, perhaps on another subnet, where the recipient has an account.  The local `MTA` would be the exchange initiator.

weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

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
[`syslog`]: https://en.wikipedia.org/wiki/Syslog
[`syslog-ng`]: https://en.wikipedia.org/wiki/Syslog-ng
[`rsyslog`]: https://en.wikipedia.org/wiki/Rsyslog
[`Reliable Event Logging Protocol`]: https://en.wikipedia.org/wiki/Reliable_Event_Logging_Protocol
[`klogd`]: https://www.linuxjournal.com/article/4058
[`less`]: https://man7.org/linux/man-pages/man1/less.1.html
[`more`]: https://man7.org/linux/man-pages/man1/more.1.html
[`gzip`]: https://linux.die.net/man/1/gzip
[`zless`]: https://linux.die.net/man/1/zless
[`zmore`]: https://linux.die.net/man/1/zmore
[`/var/run/utmp`]: https://man7.org/linux/man-pages/man5/utmp.5.html
[`/var/log/faillog`]: https://man7.org/linux/man-pages/man5/faillog.5.html
[`logrotate`]: https://man7.org/linux/man-pages/man8/logrotate.8.html
[`head`]: https://man7.org/linux/man-pages/man1/head.1.html
[`tail`]: https://man7.org/linux/man-pages/man1/tail.1.html
[`grep`]: https://man7.org/linux/man-pages/man1/grep.1.html
[`who`]: https://man7.org/linux/man-pages/man1/who.1.html
[`w`]: https://man7.org/linux/man-pages/man1/w.1.html
[`utmpdump`]: https://man7.org/linux/man-pages/man1/utmpdump.1.html
[`last -f`]: https://man7.org/linux/man-pages/man1/last.1.html
[`faillog`]: https://man7.org/linux/man-pages/man8/faillog.8.html
[`lastlog`]: https://man7.org/linux/man-pages/man8/lastlog.8.html
[`/etc/rsyslog.conf`]: https://man7.org/linux/man-pages/man5/rsyslog.conf.5.html
[`logger`]: https://man7.org/linux/man-pages/man1/logger.1.html
[`logrotate`]: https://man7.org/linux/man-pages/man8/logrotate.8.html
[`dmesg`]: https://man7.org/linux/man-pages/man1/dmesg.1.html
[`systemd-journald`]: https://www.man7.org/linux/man-pages/man8/systemd-journald.service.8.html
[`/etc/systemd/journald.conf`]: https://man7.org/linux/man-pages/man5/journald.conf.5.html
[`journalctl`]: https://man7.org/linux/man-pages/man1/journalctl.1.html
[`systemd.time`]: https://man7.org/linux/man-pages/man7/systemd.time.7.html
[`systemd.journal-fields`]: https://man7.org/linux/man-pages/man7/systemd.journal-fields.7.html
[`systemd-cat`]: https://www.man7.org/linux/man-pages/man1/systemd-cat.1.html
[`/etc/machine-id`]: https://man7.org/linux/man-pages/man5/machine-id.5.html
[`wall`]: https://man7.org/linux/man-pages/man1/wall.1.html
[`sendmail`]: https://man7.org/linux/man-pages/man8/sendmail.8.html
[`ncat`]: https://man7.org/linux/man-pages/man1/ncat.1.html

