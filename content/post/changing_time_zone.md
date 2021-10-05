+++
title = "On Changing the Time Zone"
date = "2021-10-04T20:06:59Z"

+++

With any luck, this will be one of my shortest posts.

I'm currently in the middle of a tour and driving across the United States.  When I'm done, it will be well over 4,000 miles.  It's nice, playing to packed stadiums every night.

However, I needed to change my time zone as I journeyed, which seemed odd to me.  Why wasn't it doing so automatically?

Let's get down to brass tacks.

---

The service we'll be briefly looking at today is [`systemd-timesyncd`], and its purpose is self-explanatory.

[Its configuration file] is located at `/etc/systemd/timesyncd.conf`.  In it, you can add time servers (it defaults to `ntp.ubuntu.com`) and other settings.  You can see the current default values by running the following command:

```
$ timedatectl show-timesync --all
LinkNTPServers=
SystemNTPServers=
FallbackNTPServers=ntp.ubuntu.com
ServerName=ntp.ubuntu.com
ServerAddress=2001:67c:1560:8003::c8
RootDistanceMaxUSec=5s
PollIntervalMinUSec=32s
PollIntervalMaxUSec=34min 8s
PollIntervalUSec=8min 32s
NTPMessage={ Leap=0, Version=4, Mode=4, Stratum=2, Precision=-23, RootDelay=1.083ms, RootDispersion=16.052ms, Reference=11FD227B, OriginateTimestamp=Mon 2021-10-04 17:15:03 CDT, ReceiveTimestamp=Mon 2021-10-04 17:15:03 CDT, TransmitTimestamp=Mon 2021-10-04 17:15:03 CDT, DestinationTimestamp=Mon 2021-10-04 17:15:03 CDT, Ignored=yes PacketCount=4, Jitter=18.822ms }
Frequency=-1950886
```

To see the machine's current time zone configuration, simply run the [`timedatectl`] binary:

```
$ timedatectl
               Local time: Mon 2021-10-04 15:23:08 CDT
           Universal time: Mon 2021-10-04 20:23:08 UTC
                 RTC time: Mon 2021-10-04 20:23:08
                Time zone: America/Chicago (CDT, -0500)
System clock synchronized: yes
              NTP service: inactive
          RTC in local TZ: no
```

> The same information can be listed by running:
>
>       timedatectl status

Here's another useful command to view even more information:

```
$ timedatectl timesync-status
       Server: 2001:67c:1560:8003::c8 (ntp.ubuntu.com)
Poll interval: 8min 32s (min: 32s; max 34min 8s)
         Leap: normal
      Version: 4
      Stratum: 2
    Reference: 11FD227B
    Precision: 1us (-23)
Root distance: 24.268ms (max: 5s)
       Offset: +56.987ms
        Delay: 203.256ms
       Jitter: 31.747ms
 Packet count: 5
    Frequency: +25.883ppm
```

List all of the time zones of which the machine is aware:

```
$ timedatectl list-timezones
Africa/Abidjan
Africa/Accra
Africa/Addis_Ababa
Africa/Algiers
Africa/Asmara
Africa/Asmera
Africa/Bamako
Africa/Bangui
Africa/Banjul
Africa/Bissau
Africa/Blantyre
Africa/Brazzaville
Africa/Bujumbura
Africa/Cairo
Africa/Casablanca
...
```

Set the time zone to Mountain time:

```
$ sudo timedatectl set-timezone America/Denver
$ timedatectl
               Local time: Mon 2021-10-04 15:50:36 MDT
           Universal time: Mon 2021-10-04 21:50:36 UTC
                 RTC time: Mon 2021-10-04 21:50:36
                Time zone: America/Denver (MDT, -0600)
System clock synchronized: yes
              NTP service: inactive
          RTC in local TZ: no
```

However, what's up with this line?

`NTP service: inactive`

Could this be the reason that it's not automatically changing zones when it communciates with the [NTP] server?  I have a sneaking suspicion that that should be set to `active`.  If I were to activate that, I bet that manually setting the time zone would no longer be needed.

Let's see what `systemd` has to tell us:

```
$ systemctl status systemd-timesyncd.service
● systemd-timesyncd.service - Network Time Synchronization
     Loaded: loaded (/lib/systemd/system/systemd-timesyncd.service; enabled; vendor preset: enabled)
     Active: inactive (dead) since Mon 2021-10-04 15:32:36 MDT; 22min ago
       Docs: man:systemd-timesyncd.service(8)
    Process: 977 ExecStart=/lib/systemd/systemd-timesyncd (code=exited, status=0/SUCCESS)
   Main PID: 977 (code=exited, status=0/SUCCESS)
     Status: "Shutting down..."
...
```

Hmm, that doesn't look right.  Let's start the service:

```
$ sudo systemctl restart systemd-timesyncd.service
$ systemctl status systemd-timesyncd.service
● systemd-timesyncd.service - Network Time Synchronization
     Loaded: loaded (/lib/systemd/system/systemd-timesyncd.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2021-10-04 15:58:16 MDT; 4s ago
       Docs: man:systemd-timesyncd.service(8)
   Main PID: 63116 (systemd-timesyn)
     Status: "Initial synchronization to time server [2001:67c:1560:8003::c8]:123 (ntp.ubuntu.com)."
      Tasks: 2 (limit: 18731)
     Memory: 1.8M
     CGroup: /system.slice/systemd-timesyncd.service
             └─63116 /lib/systemd/systemd-timesyncd
...
$
$ timedatectl
               Local time: Mon 2021-10-04 15:59:09 MDT
           Universal time: Mon 2021-10-04 21:59:09 UTC
                 RTC time: Mon 2021-10-04 21:59:09
                Time zone: America/Denver (MDT, -0600)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

Ok, that's it, I'm good to go!  Easy peasy!

> You can also use the `set-ntp` subcommand to enable/disable the `systemd-timesyncd` service:
>
>       sudo timedatectl set-ntp [true|false]

[`systemd-timesyncd`]: https://wiki.archlinux.org/title/Systemd-timesyncd
[Its configuration file]: https://www.man7.org/linux/man-pages/man5/timesyncd.conf.5.html
[`timedatectl`]: https://www.man7.org/linux/man-pages/man1/timedatectl.1.html
[NTP]: https://en.wikipedia.org/wiki/Network_Time_Protocol

