+++
title = "On Studying for the LPIC-1 Exam 102 (102-500), Part Three"
date = "2023-01-26T18:09:51-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 102 (101-500), Part One](/2023/01/22/on-studying-for-the-lpic-1-exam-102-102-500-part-one/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Two](/2023/01/25/on-studying-for-the-lpic-1-exam-102-102-500-part-two/)
- On Studying for the LPIC-1 Exam 102 (101-500), Part Three
- On Studying for the LPIC-1 Exam 102 (101-500), Part Four
- On Studying for the LPIC-1 Exam 102 (101-500), Part Five
- On Studying for the LPIC-1 Exam 102 (101-500), Part Six

And, so is this one!

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 107: Administrative Tasks].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 107: Administrative Tasks](#topic-107-administrative-tasks)
    + [`/etc/login.defs`](#etclogindefs)
    + [Users](#users)
        - [`useradd`](#useradd)
        - [`usermod`](#usermod)
        - [`userdel`](#userdel)
        - [`passwd`](#passwd)
        - [`chage`](#chage)
    + [Groups](#groups)
        - [`groupadd`](#groupadd)
        - [`groupmod`](#groupmod)
        - [`groupdel`](#groupdel)
        - [`gpasswd`](#gpasswd)
    + [Skeleton Directory](#skeleton-directory)
    + [Important User and Group Files](#important-user-and-group-files)
        - [`/etc/passwd`](#etcpasswd)
        - [`/etc/group`](#etcgroup)
        - [`/etc/shadow`](#etcshadow)
        - [`/etc/gshadow`](#etcgshadow)
    + [`getent` and `nsswitch.conf`](#getent-and-nsswitchconf)
    + [Scheduling Jobs](#scheduling-jobs)
        - [`cron`](#cron)
            + [User Crontabs](#user-crontabs)
            + [System Crontabs](#system-crontabs)
            + [Crontab Variables](#crontab-variables)
            + [Access to Cronjobs](#access-to-cronjobs)
        - [`anacron`](#anacron)
        - [`systemd.timer`](#systemdtimer)
        - [`at`](#at)
            + [Access to `at` Jobs](#access-to-at-jobs)
        - [`systemd-run`](#systemd-run)
    + [Localization](#localization)
        - [Time Zones](#time-zones)
        - [Language and Character Encoding](#language-and-character-encoding)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 107: Administrative Tasks

## `/etc/login.defs`

The [`/etc/login.defs`] file defines the configuration parameters that control both the users and the groups.

Here are some of the ones that are the most impactful:

- `UID_MIN` and `UID_MAX` - The range of user IDs that can be assigned to new ordinary users.
- `GID_MIN` and `GID_MAX` - The range of group IDs that can be assigned to new ordinary groups.
- `CREATE_HOME` - Specify whether a home directory should be created by default for new users.
- `USERGROUPS_ENAB` - Specify whether the system should by default create a new group for each new user account with the same name as the user, and whether deleting the user account should also remove the user’s primary group if it no longer contains members.
- `MAIL_DIR` - The mail spool directory.
- `PASS_MAX_DAYS` - The maximum number of days a password may be used.
- `PASS_MIN_DAYS` - The minimum number of days allowed between password changes.
- `PASS_MIN_LEN` - The minimum acceptable password length.
- `PASS_WARN_AGE` - The number of warning days before a password expires.

## Users

The default values used by both the user and group utilities are set in `/etc/default/useradd` and [`/etc/login.defs`].

### `useradd`

[`useradd`] is the lower-level utility for creating users from the command-line that allows greater flexibility and customization than its higher-level brother, [`adduser`].

By default, a same-named group will also be created.  In addition, the `UID` will be the next sequentially available number unless one is specified upon creation (with the `-u` option).

There are many options, but here are the most commonly-used ones:

- `-c`, `--comment` - create with custom comments (i,e., the full name of the user)
- `-d`, `--home-dir` - create with a custom home directory
- `-e`, `--expiredate` - create by setting a specific date on which it will be disabled
- `-f`, `--inactive` - create by setting the number of days after a password expires during which the user should update the password (otherwise the account will be disabled)
- `-g`, `--gid` - create with a specific `GID`
- `-G`, `--groups` - create by adding it to multiple secondary groups
- `-k`, `--skel` - create by copying the skeleton files from a specific custom directory (this option is only valid if the `-m` or `--create-home` option is specified)
- `-K`, `--key` - overrides `/etc/login.defs` defaults (`UID_MIN`, `UID_MAX`, `UMASK`, `PASS_MAX_DAYS` and others)
    + `-K PASS_MAX_DAYS=-1` or `-K UID_MIN=100 -K UID_MAX=499`
- `-m`, `--create-home` - create with its home directory (if it does not exist)
- `-M`, `--no-create-home` - create without its home directory
- `-s`, `--shell` - create with a specific login shell
- `-u`, `--uid` - create with a specific `UID`
    + must be unique, unless the `-o` option is used
    + the value must be non-negative
    + the default is to use the smallest `ID` value greater than or equal to `UID_MIN` and greater than every other user (defined in [`/etc/login.defs`])
- `-Z`, `--selinux-user` - the `SELinux` user for the user's login
    + the default is to leave blank and have the system select the default `SELinux` user

Also, invoking `useradd` with only the `-D` (also, `--defaults`) switch will display the default values:

```
$ sudo useradd -D
GROUP=100
HOME=/home
INACTIVE=-1
EXPIRE=
SHELL=/bin/sh
SKEL=/etc/skel
CREATE_MAIL_SPOOL=no
```

So, the newly-created user account will get these defaults plus whatever ones are specified on the command-line.  Of course, any given options will override the defaults if there is a conflict.

> Any groups to which the new user will belong **must** already exist.

Once the account is created, use [`passwd`] to set the user's password.

When using this utility, the password and group databases are updated with the new information.

### `usermod`

The [`usermod`] utility is used to change attributes of an extant account.  Here are some of the most common options:

- `-c`, `--comment` - add a brief comment to the specified user account
- `-d`, `--home` - change the home directory of the specified user account
    + when used with the `-m` (also, `--move-home`) option, the contents of the current home directory are moved to the new home directory, which is created if it does not already exist
- `-e`, `--expiredate` - set the expiration date of the specified user account
- `-f`, `--inactive` - set the number of days after a password expires during which the user should update the password (otherwise the account will be disabled)
- `-g`, `--gid` - change the primary group of the specified user account (the group must exist)
- `-G`, `--groups` - add secondary groups to the specified user account
    + each group must exist and must be separated from the next by a comma, with no intervening whitespace
    + if used alone, this option removes all existing groups to which the user belongs
    + when used with the `-a` (also, `--append`) option, it simply appends new secondary groups to the existing ones
- `-l`, `--login` - change the login name of the specified user account
- `-L`, `--lock` - lock the specified user account
    + puts an exclamation mark in front of the encrypted password within the `/etc/shadow` file
    + this disables access with a password
- `-m`, `--move-home` - move the content of the user's home directory
    + only valid when coupled with the `-d` (or `--home`) option
- `-s`, `--shell` - change the login shell of the specified user account
- `-u`, `--uid` - change the `UID` of the specified user account
- `-U`, `--unlock` - unlock the specified user account
    + this removes the exclamation mark in front of the encrypted password with the `/etc/shadow` file
- `-Z`, `--selinux-user` - the new `SELinux` user for the user's login

Many of them perform the same actions as those of the `useradd` utility.

### `userdel`

The [`userdel`] tool

When using this utility, the password and group databases remove references to this account.

Here are some common options:

- `-r`, `--remove` - files in the user's home directory will be removed along with the home directory itself and the user's mail spool
    + files located in other file systems will have to be searched for and deleted manually
    + the mail spool is defined by the `MAIL_DIR` variable in the `login.defs` file
- `-Z`, `--selinux-user` - remove any `SELinux` user mapping for the user's login.`

## `passwd`

Use the [`passwd`] utility to change a user's password.  Must be `root` to be able to change any user's password on the system.

Interestingly, the `passwd` binary has its [`SUID`](/2023/01/20/on-studying-for-the-lpic-1-exam-101-101-500-part-four/#special-permissions) bit set.  Without this, a regular user would not be able to change their own password.

```
$ ls -l $(which passwd)
-rwsr-xr-x 1 root root 63960 Feb  7  2020 /usr/bin/passwd
```

By far, the most common use case for this utility is just to call it as a regular user without any options or arguments.

However, it is possible to pass it a number of options that can change the user password expiry information, much like the [`chage`] utility:

- `-d` - delete the password of a user account (thus disabling the user)
- `-e` - force the user account to change the password
- `-i` - the number of days of inactivity after a password expires during which the user should update the password (otherwise the account will be disabled)
- `-l` - lock the user account (the encrypted password is prefixed with an exclamation mark in the `/etc/shadow` file)
- `-n` - the minimum password lifetime
- `-S` - output information about the password status of a specific user account
- `-u` - unlock the user account (the exclamation mark is removed from the password field in the `/etc/shadow` file)
- `-x` - the maximum password lifetime
- `-w` - the number of days of warning before the password expires during which the user is warned that the password must be changed

## `chage`

The [`chage`] utility stands for "change age".  This is used to change the password aging and expiry information of a given user.

Much of the same information that we just saw can be modified with the [`passwd`](#passwd) utility can also be modified with this tool.

Here are some useful options:

- `-d` - Set the last password change for a user account.
- `-E` - Set the expiration date for a user account.
- `-I` - Set the number of days of inactivity after a password expires during which the user should update the password (otherwise the account will be disabled).
- `-m` - Set the minimum password lifetime for a user account.
- `-M` - Set the maximum password lifetime for a user account.
- `-W` - Set the number of days of warning before the password expires during which the user is warned that the password must be changed.

In addition, a user can list their expiry information.  This is the only thing that a regular user can do with the [`chage`] utility.

```
$ chage -l btoll
Last password change                                    : Jan 02, 2023
Password expires                                        : never
Password inactive                                       : never
Account expires                                         : never
Minimum number of days between password change          : 0
Maximum number of days between password change          : 99999
Number of days of warning before password expires       : 7
```

## Groups

The default values used by both the user and group utilities are set in `/etc/default/useradd` and [`/etc/login.defs`].

### `groupadd`

Just as with users, when adding a group with the [`groupadd`] utility, the `GID` will be the next sequentially available number unless specfied by the `-g` option.

Here are some of the most common options used with the tool:

- `-g`, `--gid` - the numerical value of the group's ID
    + must be unique, unless the `-o` option is used
    + the value must be non-negative
    + the default is to use the smallest `ID` value greater than or equal to `GID_MIN` and greater than every other group (defined in [`/etc/login.defs`])
- `-K`, `--key` - overrides `/etc/login.defs` defaults (`GID_MIN`, `GID_MAX` and others)
   + `-K GID_MIN=100 -K GID_MAX=499`
- `-r`, `--system` - create a system group

### `groupmod`

Use the [`groupmod`] utility to change the attributes of existing groups.

- `-g`, `--gid` - the group `ID` of the given `GROUP` will be changed to `GID`
    + the value of `GID` must be a non-negative decimal integer
    + must be unique, unless the `-o` option is used.
    + users who use the group as primary group will be updated to keep the group as their primary group
    + any files that have the old group `ID` and must continue to belong to `GROUP` must have their group `ID` changed manually
- `-n`, `--new-name` - the name of the group will be changed from `GROUP` to `NEW_GROUP` name

```
$ sudo groupmod -n NEW_NAME -g NEW_GUID OLD_NAME
```

### `groupdel`

Deleting the group using the [`groupdel`] utility usually isn't passed any option (at least, in the common scenarios).  Simply, pass the group name as the sole argument:

```
$ sudo groupdel devops
```

Interestingly, a group cannot be deleted if it is the primary group of any user on the system.

### `gpasswd`

The [`gpasswd`] utility can be used to remove a password that had been assigned to a group upon its creation.  In practice, though, this is rarely a good idea, as all members of the group would need to know the password.  And as everyone knows, people can't be trusted with anything.

Additionally, `gpasswd` can be used to administer `/etc/group` by assigning and removing users to groups and adding group administrators.

Here are some common options:

- `-a`, `--add` - add the user to the named group
- `-d`, `--delete` - remove the user from the named group
- `-r`, `--remove-password` - remove the password from the named group
    + the group password will be empty
    + only group members will be allowed to use [`newgrp`] to join the named group
- `-R`, `--restrict` - restrict the access to the named group
    + the group password is set to "!"
    + only group members with a password will be allowed to use `newgrp` to join the named group
- `-A`, `--administrators` - set the list of administrative users
- `-M`, `--members` - set the list of group members

## Skeleton Directory

See [`SKEL`](/2023/01/22/on-studying-for-the-lpic-1-exam-102-102-500-part-one/#skel).

## Important User and Group Files

These files cannot be edited directly.  Instead, use either the command-line tools or the `GUI` tools.  But don't use the `GUI` tools.

### `/etc/passwd`

The [`/etc/passwd`] file contains basic information about users, formatted by seven colon-delimited fields.

Let's look at an entry in the file and break it down:

```
$ grep btoll /etc/passwd
btoll:x:1000:1000:Benjamin Toll,,,:/home/btoll:/bin/bash
```

Below is a description of each field:

              btoll  = username
                  x  = user password (the actual password is in /etc/shadow)
               1000  = UID
               1000  = GID of primary group
    Benjamin Toll,,, = gecos field (can contain multiple comma-separated values)
        /home/btoll  = home directory
        /bin/bash    = user's shell

Let's modify the [`gecos` field] using the [`chfn`] utility to fill out the entry and view the entry again:

```
$ chfn
Password:
Changing the user information for btoll
Enter the new value, or press ENTER for the default
        Full Name: Benjamin Toll
        Room Number []: 2112
        Work Phone []: 123-456-7890
        Home Phone []: 123-456-7890
$ grep btoll /etc/passwd
btoll:x:1000:1000:Benjamin Toll,2112,123-456-7890,123-456-7890:/home/btoll:/bin/bash
```

Next, with `usermod`:

```
$ sudo usermod -c "here is a little comment" btoll
$ grep btoll /etc/passwd
btoll:x:1000:1000:here is a little comment:/home/btoll:/bin/bash
```

Weeeeeeeeeeeeeeeeeeeeeeeeeee

### `/etc/group`

The [`/etc/group`] file contains basic information about groups, formatted by four colon-delimited fields.

Let's take at one of the groups in this file to which I belong, shall we?  We shall.

```
$ grep audio /etc/group
audio:x:29:pulse,btoll
```

Let's break down those four colon-separated fields:

          audio = group
              x = group password (the actual password is in /etc/gshadow)
             29 = GID
    pulse,btoll = comma-delimited list of users belonging to the group, except those for whom this is the primary group

### `/etc/shadow`

The [`/etc/shadow`] file contains encrypted user passwords, formatted by nine colon-delimited fields.  It is only readable by `root` and privileged users.

Let's take a look at an entry and do that explaining stuff for the nine fields:

```
sudo grep kilgore /etc/shadow
kilgore:$6$xyz$suIWtAFVHRykWhrUWmzhdCEWL4VvADYdUiEwjICyUkWot5jssVG/wnn9ww5ZQzhVELGhqvSVsUpVRkiqckDAp1:19359:0:99999:7:::
```

        kilgore = username
      $6$xy...  = encrypted password (locked if the first char is `!`)
          19359 = date of last password change (number of days since 01/01/1970)
              0 = minimum password age
          99999 = maximum password age
              7 = password warning period
                = password inactivity period
                = account expiration date
                = reserved field (for future use)

Note that the last three fields are empty.

### `/etc/gshadow`

The [`/etc/gshadow`] file contains encrypted group passwords, formatted by four colon-delimited fields.  It is only readable by `root` and privileged users.

```
$ sudo grep audio /etc/gshadow
audio:*::pulse,btoll
```

Let's break down those four colon-separated fields:

          audio = group
              * = the encrypted password for the group (it is used when a user, who is not a member of the group, wants to join the group using the newgrp command — if the password starts with !, no one is allowed to access the group with newgrp)
                = a comma-delimited list of the administrators of the group (they can change the password of the group and can add or remove group members with the gpasswd command)
    pulse,btoll = comma-delimited list of users belonging to the group

> From the [`/etc/gshadow`] man page:
>
> If the password field contains some string that is not a valid result of [`crypt(3)`], for instance `!` or \*, users will not be able to use a unix password to access the group (but group members do not need the password).

## `getent` and `nsswitch.conf`

Yes, we can use tools like [`grep`] and [`ag`] to get the information we want, but it'd be quicker and easier to get it using the [`getent`] utility which gets its information databases supported by the [Name Service Switch] libraries that are listed in the [`/etc/nsswitch.conf`] file.

For instance, one of the databases listed in the first column in the `nsswitch.conf` config file below is the `hosts` database.  The remaining columns for that entry describe the order of sources to query and a limited set of actions that can be performed by lookup result.

<pre class="math">
...
hosts:          files mdns4_minimal [NOTFOUND=return] dns myhostname mymachines
...
</pre>

Let's look at how we can get the same information that we got using `grep` filtering above:

```
$ getent passwd btoll
btoll:x:1000:1000:here is a little comment:/home/btoll:/bin/bash
$ getent group audio
audio:x:29:pulse,btoll
$ sudo getent shadow kilgore
kilgore:$6$xyz$suIWtAFVHRykWhrUWmzhdCEWL4VvADYdUiEwjICyUkWot5jssVG/wnn9ww5ZQzhVELGhqvSVsUpVRkiqckDAp1:19359:0:99999:7:::
$ sudo getent gshadow audio
audio:*::pulse,btoll
```

> You can pass more than one key to a database (i.e., `getent passwd btoll root ...`).

Here's the full file on my Debian `bullseye` system:

`/etc/nsswitch.conf`

<pre class="math">
# /etc/nsswitch.conf
#
# Example configuration of GNU Name Service Switch functionality.
# If you have the `glibc-doc-reference' and `info' packages installed, try:
# `info libc "Name Service Switch"' for information about this file.

passwd:         files
group:          files
shadow:         files
gshadow:        files

hosts:          files mdns4_minimal [NOTFOUND=return] dns myhostname mymachines
networks:       files

protocols:      db files
services:       db files
ethers:         db files
rpc:            db files

netgroup:       nis
</pre>

The following files are read when "files" source is specified for respective databases (the database is the first column):

```
aliases     /etc/aliases
ethers      /etc/ethers
group       /etc/group
hosts       /etc/hosts
initgroups  /etc/group
netgroup    /etc/netgroup
networks    /etc/networks
passwd      /etc/passwd
protocols   /etc/protocols
publickey   /etc/publickey
rpc         /etc/rpc
services    /etc/services
shadow      /etc/shadow
```

So, we can see that the following databases all get their information from their respective file and no other source:

- `passwd`
- `group`
- `shadow`
- `gshadow`

Lastly, the following two commands are roughly equivalent:

```
$ cat /etc/protocols
$ getent protocols
```

## Scheduling Jobs

### `cron`

The [`cron`] utility expects that the system will always be up and running.  It has no mechanism to run jobs that were missed because the system was powered off.

The `cron` daemon checks tables known as `crontab`s for jobs to run.  There are two kinds: user and system.

By default, the output will be emailed to the user that owns the `crontab`.  A common use case is to have the job redirect `stdout` to a file or even `/dev/null` and to have `stderr` sent to their email.

#### User Crontabs

A user [`crontab(5)`] is a text file in which a user can define jobs to run for any purpose that suits them.  It is managed via the [`crontab(1)`] utility and has a very specific format, which we'll look momentarily.

`crontab(1)` is the tool that acts as a frontend to the user's `crontab(5)` file.  On my system (Debian `bullseye`), this file resides in `/var/spool/cron/crontabs/`, although it may be different depending on the Linux distribution.

Common switches to `crontab(1)`:

- `-e` - edit the `crontab`
    + will create if it doesn't already exist and automatically install in `/var/spool/cron/crontabs/`
        ```
        $ sudo ls /var/spool/cron/crontabs/
        $ crontab -e
        no crontab for btoll - using an empty one
        crontab: installing new crontab
        $ sudo ls /var/spool/cron/crontabs/
        btoll
        ```
    + uses the editor specified the either `VISUAL` or `EDITOR` to edit the `crontab` (if neither are defined, then the default editor at `/usr/bin/editor` is used -- probably [`nano`])
        ```
        $ readlink -f /usr/bin/editor
        /usr/bin/nano
        $
        $ ls -l /usr/bin/editor
        lrwxrwxrwx 1 root root 24 Jan  2 16:59 /usr/bin/editor -> /etc/alternatives/editor*
        $ ls -l /etc/alternatives/editor
        lrwxrwxrwx 1 root root 9 Jan  2 16:59 /etc/alternatives/editor -> /bin/nano*
        ```
- `-i` - interactive (combine with `-r`)
    ```
    $ crontab -ir
    crontab: really delete btoll's crontab? (y/n)
    ```
- `-l` - prints `crontab` to `stdout`
- `-r` - remove the `crontab`
- `-u` - its value is the user's `crontab` to be edited (needs privileged permissions)

And here is an example of a `tar` command will run every Monday at 5am:

```
0 5 * * 1 tar -zcf /var/backups/home.tgz /home/
```
Let's look at the format of a user's `crontab` file:

- the minute of the hour (0-59)
- the hour of the day (0-23)
- the day of the month (1-31)
    + can use the first three letters of the name
- the month of the year (1-12)
    + can use the first three letters of the name
- the day of the week (0-7 with Sunday=0 or Sunday=7)
- the command to run

Multiple values can be expressed using the following special characters:

- `*` (asterisk) - refers to any value
- `,` (comma) -  a list of possible values
    + `0,15,30,45 8 * * 2 ./cmd`
        - the command is run every quarter hour at 8am every Tuesday
- `-` (dash) -  a range of possible values
    + `0 2-4,14-16 * * * ./cmd`
        - the command is run every day at the top of hours 2am-4am and 2pm-4pm
- `/` (slash) - stepped values
    + `0 0-23/2 * * * ./cmd`
        - the command is run every day at midnight, 2am, 4am, 6am, etc.

> There are nice web-based utilities like [`crontab guru`] that can assist in making sure that you get the exact time that you want.

Note that it's **always** preferable to use edit a user's `crontab` using the [`crontab(5)`] tool rather than editing them directly in  `/var/spool/cron/crontabs/` (usually, the permissions on the `crontab` files themselves only allow them to be edited using `crontab(1)`).

#### System Crontabs

Unlike, user `crontab`s, system `crontab`s can only be edited by a privileged user.  The main system `crontab` is `/etc/crontab` and others can be installed in `/etc/cron.d/`.

In addition, there are also location in which you can place scripts to be run by `cron` (and `anacron`, to be precise).  These are in the following directories:

- `/etc/cron.daily/`
- `/etc/cron.hourly/`
- `/etc/cron.monthly/`
- `/etc/cron.weekly`

These are self-explanatory.  For example, if you want something to run monthly, simply drop the script in `/etc/cron.monthly/`.  That's a bingo!

> Note that `crontabs` are in `/etc/cron.d/` but scripts are in `/etc/cron.{daily,hourly,monthly,weekly}`.

The format of the system `crontab` files is exactly the same as that of the user `crontab` except for the addition of the `user` field (the sixth field, seen below in **bold**):

- the minute of the hour (0-59)
- the hour of the day (0-23)
- the day of the month (1-31)
    + can use the first three letters of the name
- the month of the year (1-12)
    + can use the first three letters of the name
- the day of the week (0-7 with Sunday=0 or Sunday=7)
- **the name of the user account to be used when executing the command**
- the command to run

The same special characters apply as well, allowing a job to be run with the same precision as a user job.

Unlike user `crontab`s, system `crontab`s are edited directly and not through the `crontab(1)` tool.  This applies, of course, to `/etc/crontab` (the system `crontab`) and any file in `/etc/cron.d/`.

#### Crontab Variables

- `HOME` - the directory where cron invokes the commands (by default the user’s home directory)
- `MAILTO` - the name of the user or the address to which the standard output and error is mailed (by default the crontab owner). Multiple comma-separated values are also allowed and an empty value indicates that no mail should be sent
- `PATH` - the path where commands can be found
- `SHELL` - the shell to use (by default /bin/sh)

Also, there are [extensions] that are "nicknames", which replace the first five fields and represent some common cases:

From the [`crontab(5)` man page]:

<pre class="math">
<a href="https://crontab.guru/#@reboot">@reboot</a>    :    Run once after reboot.
<a href="https://crontab.guru/#@yearly">@yearly</a>    :    Run once a year, ie.  "0 0 1 1 *".
<a href="https://crontab.guru/#@annually">@annually</a>  :    Run once a year, ie.  "0 0 1 1 *".
<a href="https://crontab.guru/#@monthly">@monthly</a>   :    Run once a month, ie. "0 0 1 * *".
<a href="https://crontab.guru/#@weekly">@weekly</a>    :    Run once a week, ie.  "0 0 * * 0".
<a href="https://crontab.guru/#@daily">@daily</a>     :    Run once a day, ie.   "0 0 * * *".
<a href="https://crontab.guru/#@hourly">@hourly</a>    :    Run once an hour, ie. "0 * * * *".
</pre>

#### Access to Cronjobs

There are two files that control access to the `crontab` command.  The first is `/etc/cron.allow` and the second is `/etc/cron.deny`, although they many not exist on your system.  They don't on mine (Debian `bullseye`):

```
$ ls /etc/cron.{allow,deny}
ls: cannot access '/etc/cron.allow': No such file or directory
ls: cannot access '/etc/cron.deny': No such file or directory
```

> If one or both do exist, they should contain a list of users, one per line.

If `cron.allow` exists, then all listed users have access to `crontab`.  Note that if the same user appears in both files that they will be allowed to created cron jobs, because `cron` won't check `cron.deny` if the given user is in `cron.allow`.

Inversely, if only `cron.deny` exists, they only the listed users are denied created cron jobs.

### `anacron`

The [`anacron`] utility is more flexible than `cron` in that, unlike `cron`, `anacron` does **no** expect that the system will be continuously running.

Although `anacron` is out of scope for the `LPIC-1` certification, it's worth looking into.  Start with the man page and then look at how it's currently being used in `/etc/crontab`:

<pre class="math">
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
</pre>

Interesting how `cron` will test for the `anacron` binary for all scripts except the hourly ones, hmm?  Hmmmmmmm?

### `systemd.timer`

Of course, `systemd` would have units that to control and manage timers.  These units are called, well, *timers*, and you can see a list of all the timers currently in memory using the `list-timers` command:

```
$ systemctl list-timers
NEXT                        LEFT          LAST                        PASSED       UNIT                         ACTIVATES
Sun 2023-01-29 20:40:00 EST 4min 22s left Sun 2023-01-29 20:32:54 EST 2min 42s ago sysstat-collect.timer        sysstat-collec>
Sun 2023-01-29 21:32:27 EST 56min left    Sun 2023-01-29 20:34:37 EST 1min 0s ago  anacron.timer                anacron.service
Mon 2023-01-30 00:00:00 EST 3h 24min left Sun 2023-01-29 01:45:46 EST 18h ago      exim4-base.timer             exim4-base.ser>
Mon 2023-01-30 00:00:00 EST 3h 24min left Sun 2023-01-29 01:45:46 EST 18h ago      logrotate.timer              logrotate.serv>
Mon 2023-01-30 00:00:00 EST 3h 24min left Sun 2023-01-29 01:45:46 EST 18h ago      man-db.timer                 man-db.service
Mon 2023-01-30 00:00:00 EST 3h 24min left Sun 2023-01-29 01:45:46 EST 18h ago      mlocate.timer                mlocate.service
Mon 2023-01-30 00:07:00 EST 3h 31min left n/a                         n/a          sysstat-summary.timer        sysstat-summar>
Mon 2023-01-30 00:12:08 EST 3h 36min left Sun 2023-01-29 13:28:22 EST 7h ago       fwupd-refresh.timer          fwupd-refresh.>
Mon 2023-01-30 00:28:19 EST 3h 52min left Mon 2023-01-23 01:00:46 EST 6 days ago   fstrim.timer                 fstrim.service
Mon 2023-01-30 06:08:55 EST 9h left       Sun 2023-01-29 13:10:34 EST 7h ago       apt-daily-upgrade.timer      apt-daily-upgr>
Mon 2023-01-30 06:18:06 EST 9h left       Sun 2023-01-29 13:10:34 EST 7h ago       apt-daily.timer              apt-daily.serv>
Mon 2023-01-30 20:28:09 EST 23h left      Sun 2023-01-29 20:15:55 EST 19min ago    systemd-tmpfiles-clean.timer systemd-tmpfil>
Sun 2023-02-05 03:10:59 EST 6 days left   Sun 2023-01-29 13:10:34 EST 7h ago       e2scrub_all.timer            e2scrub_all.se>

13 timers listed.
Pass --all to see loaded but inactive timers, too.
```

You can also use `list-units`:

```
$ systemctl list-units --type timer
  UNIT                         LOAD   ACTIVE SUB     DESCRIPTION
  anacron.timer                loaded active waiting Trigger anacron every hour
  apt-daily-upgrade.timer      loaded active waiting Daily apt upgrade and clean activities
  apt-daily.timer              loaded active waiting Daily apt download activities
  e2scrub_all.timer            loaded active waiting Periodic ext4 Online Metadata Check for All Filesystems
  exim4-base.timer             loaded active waiting Daily exim4-base housekeeping
  fstrim.timer                 loaded active waiting Discard unused blocks once a week
  fwupd-refresh.timer          loaded active waiting Refresh fwupd metadata regularly
  logrotate.timer              loaded active waiting Daily rotation of log files
  man-db.timer                 loaded active waiting Daily man-db regeneration
  mlocate.timer                loaded active waiting Updates mlocate database every day
  sysstat-collect.timer        loaded active waiting Run system activity accounting tool every 10 minutes  sysstat-summary.timer        loaded active waiting Generate summary of yesterday's process accounting
  systemd-tmpfiles-clean.timer loaded active waiting Daily Cleanup of Temporary Directories

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.
13 loaded units listed. Pass --all to see loaded but inactive units, too.
To show all installed unit files use 'systemctl list-unit-files'.
```

Now, we'll take a look at one of the timers, `apt-daily-upgrade.timer`:

```
$ systemctl cat apt-daily-upgrade.timer
# /lib/systemd/system/apt-daily-upgrade.timer
[Unit]
Description=Daily apt upgrade and clean activities
After=apt-daily.timer

[Timer]
OnCalendar=*-*-* 6:00
RandomizedDelaySec=60m
Persistent=true

[Install]
WantedBy=timers.target
```

And the service that is activated when the timer expires:

```
$ systemctl cat apt-daily-upgrade
# /lib/systemd/system/apt-daily-upgrade.service
[Unit]
Description=Daily apt upgrade and clean activities
Documentation=man:apt(8)
ConditionACPower=true
After=apt-daily.service network.target network-online.target systemd-networkd.service NetworkManager.service connman.service

[Service]
Type=oneshot
ExecStartPre=-/usr/lib/apt/apt-helper wait-online
ExecStart=/usr/lib/apt/apt.systemd.daily install
KillMode=process
TimeoutStopSec=900
```

You would enable and start the timer unit like you would any other unit:

```
# systemctl enable foobar.timer
# systemctl start foobar.timer
```

Also, make sure you invoke `systemctl daemon-reload` whenever you modify a unit.

In addition to real-time timers, `systemd` also supports, monotonic timers, which are timers that define jobs that are scheduled after a previously-defined event has occurred, like system boot.

TODO an example of monotonic timers

To mimic a `cron` job, you'd want to use the `OnCalendar` field in the `[Timer]` clause, which has the following format:

<pre class="math">
DayOfWeek Year-Month-Day Hour:Minute:Second
</pre>

`DayOfWeek` is optional, and the special characters `*`, `/` and `,` have the same meaning as they do in the `crontab`, with the exception of `..`, which replaces the hyphen (`-`) as the way to select a contiguous range.

Additionally, there are similar "nicknames" for particular frequencies, very similar in kind that `cron` uses and have been enumerated above:

- `hourly`
- `daily`
- `weekly`
- `monthly`
- `yearly`

Here are a couple examples taken directly from my system:

```
$ systemctl cat logrotate.timer
...
[Timer]
OnCalendar=daily
...
```

```
$ systemctl cat apt-daily.timer
...
[Timer]
OnCalendar=*-*-* 6,18:00
...
```

> Note the hyphens separating the date and the colons separating the time.

Lastly, timers are logged to the `systemd` journal and should be viewed with `journalctl`.

### `at`

When you need to run a job only once at some point in the future, then [`at`] is your man and depends on the `atd` daemon to be running on the machine.

Here's an example to whet your whistle:

```
$ at now
warning: commands will be executed using /bin/sh
at> date
at> <EOT>
job 5 at Mon Jan 30 01:10:00 2023
```

> To exit the `at` prompt and submit the job, press `CTRL-D`.

The [`date`] command will be executed "immediately" (since the time was `now`), and the results will have been sent to my mail spool.

```
You have new mail in /var/mail/btoll
```

Yay.

> Here's something titillating.  The `/var/spool/mail` directory is a symbolic link to `/var/mail`:
>
> ```
> $ ls -l /var/spool/mail
> 3420256 lrwxrwxrwx 1 root root 7 Jan  2 16:59 /var/spool/mail -> ../mail/
> ```

Additionally, the `batch` command is very similar to `at`, only differing in that the job(s) will run only when the system load is low enough to permit it (when the load average drops below `1.5` or `0.8`, depending on the distribution's binary).

> `batch` is just a type of queue in `at`.  From the man page:
> > \``-q queue`\` uses the specified queue. A queue designation consists of a single letter; valid queue designations range from `a` to `z` and `A` to `Z`. The `a` queue is the default for `at` and the `b` queue for `batch`. Queues with higher letters run with increased niceness. The special queue "=" is reserved for jobs which are currently running.

What are some of the most common switches?  I'm glad you asked, dbag!

- `-c` - cats the jobs listed on the command line to standard output
- `-d` - deletes jobs identified by their job number (is an alias for `atrm`)
- `-f` - reads the job from file rather than standard input
- `-l` - list the user's pending jobs and all jobs if the superuser (is an alias for `atq`)
- `-m` - send mail to the user when the job has completed even if there was no output
       -t time run the job at time, given in the format [[CC]YY]MMDDhhmm[.ss]
- `-q` uses the specified queue
    + a queue designation consists of a single letter; valid queue designations range from `a` to `z` and `A` to `Z`
    + the `a` queue is the default for `at` and the `b` queue for `batch`
    + queues with higher letters run with increased niceness
    + the special queue "=" is reserved for jobs which are currently running
- `-b` - is an alias for `batch`
- `-r` - is an alias for `atrm`
- `-v` - shows the time the job will be executed before reading the job

Here are a couple of aliases to know about:

List the jobs:

```
$ atq
7       Mon Jan 30 01:57:00 2023 a btoll
$ at -l
7       Mon Jan 30 01:57:00 2023 a btoll
```

Delete a job:

```
$ atrm 8
$ at -d 8
Cannot find jobid 8
```

<!--
`man 3 timespec`
-->

#### Access to `at` Jobs

The two files that may or may not be on your system as relates to `at` and access rights are `/etc/at.allow` and `/etc/at.deny`.

On my Debian `bullseye` machine, I only have the latter, and there are quite a few entries in it by default:

```
$ sudo wc -l /etc/at.deny
24 /etc/at.deny
$ sudo head /etc/at.deny
alias
backup
bin
daemon
ftp
games
gnats
guest
irc
lp
```

The same rules apply as those described in the analogous files for `cron` in the section [Access to Cronjobs](#access-to-cronjobs).

### `systemd-run`

Lastly, we'll turn to `systemd`'s answer to `at`: [`systemd-run`].  This will create a transient service that will run only once, so you can think of it as analogous to `at`.

Creating a transient timer unit and it's corresponding service is easy:

```
$ sudo systemd-run --on-active="2m" date
Running timer as unit: run-r637233efa76940bdbe6f6598a530d776.timer
Will run service as unit: run-r637233efa76940bdbe6f6598a530d776.service
```

We can then use the output of the last command to lookup both the timer and the service:

```
$ sudo systemctl cat run-r637233efa76940bdbe6f6598a530d776.timer
# /run/systemd/transient/run-r637233efa76940bdbe6f6598a530d776.timer
# This is a transient unit file, created programmatically via the systemd API. Do not edit.
[Unit]
Description=/usr/bin/date

[Timer]
OnActiveSec=2min
RemainAfterElapse=no
$
$ sudo systemctl cat run-r637233efa76940bdbe6f6598a530d776
# /run/systemd/transient/run-r637233efa76940bdbe6f6598a530d776.service
# This is a transient unit file, created programmatically via the systemd API. Do not edit.
[Unit]
Description=/usr/bin/date

[Service]
ExecStart=
ExecStart="/usr/bin/date"
```

Once the timer expires and the command is run, both the timer and the service are removed from they system.  It's like they never even existed, just like most Republican party fever dreams.

Lastly, as usual, the output will go to the journal.

## Localization

### Time Zones

Time zones are relative to the [prime meridian], which is 0 degrees longitude and is called [Coordinated Universal Time] (UTC).  Time zones don't follow the longitudinal distance from the prime meridian exactly, instead they're drawn to reflect the borders of countries and other significant divisions.

Time zones are divided respective to their offset relative to UTC.  For example, offsets are written as `GMT-5` or `GMT+3`, where GMT is an acronym for Greenwich Mean Time, a synonym for UTC.

> UTC is the GMT+0 time zone.

The time zone can be defined either as the full descriptive name or an offset or in the [Posix TZ format].  Mine has the former:

```
$ cat /etc/timezone
America/New_York
```

If using an offset, it must be preceded by `Etc`:

```
$ cat /etc/timezone
Etc/GMT-5
```

> The [`tzselect`] tool is an easy way to find your particular time zone by its full descriptive name.

Because people move around the world frequently, both literally and virtually (think remote connections), best practice dictates that the system hardware clock be set to UTC.

Let's take a gander at some utilities to view the time zone that's set for the system.

Everybody knows the [`date`] tool.  In addition to viewing the time, you can also glean the time zone:

```
$ date
Tue 31 Jan 2023 02:59:36 PM EST
```

Here, the system is reporting as being within the [Eastern Time Zone].

[`timedatectl`] is another friendly tool.

```
$ timedatectl
               Local time: Tue 2023-01-31 15:04:05 EST
           Universal time: Tue 2023-01-31 20:04:05 UTC
                 RTC time: Tue 2023-01-31 20:04:05
                Time zone: America/New_York (EST, -0500)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

Again, we can see that the system is configured in the Eastern Time Zone (specifically, Eastern Standard Time), and by `(EST, -0500)` designation it can be determined that the system is five hours behind the Coordinated Universal Time.

So, how does one set the time zone?

You can start by setting the `TZ` environment variable.  Use the aforementioned `tzselect` for an easy way to get the value.

```
$ export TZ="America/New_York"
```

Better yet, put it in a shell startup script like `.bash_profile` or `.bashrc` or `foo-manchu`.

Another good method is to reconfigure the `tzdata` package:

```
$ sudo dpkg-reconfigure  tzdata

Current default time zone: 'America/New_York'
Local time is now:      Tue Jan 31 15:23:00 EST 2023.
Universal Time is now:  Tue Jan 31 20:23:00 UTC 2023.
```

> You can also reconfigure the `locales` package to make sure you have all of the locale package for any particular time zone in which you are interested:
>
> ```
> dpkg-reconfigure locales
> ```

Of course, I'm assuming that both the `tzdata` and the `locales` packages have already been installed.  If they haven't been, simply install them and walk through the menus.

For packages that have already been downloaded, reconfiguring allows you to reset the defaults or choose different ones without having to remove and re-install the package.

For user applications, setting the [localtime] for the system configures the system-wide time zone for the local system.  It should be a [symbolic link] pointing to one of the time zone data files in `/usr/share/zoneinfo/`.  Mine is already set up correctly, but if it wasn't I would use [`ln`] like usual to create the soft link.

Incidentally, the `timedatectl` utility changes the settings of `/etc/localtime` from the command-line during runtime.

```
$ readlink -f /etc/localtime
/usr/share/zoneinfo/America/New_York
```

### Language and Character Encoding

Most shell programs identify the language to use by the `LANG` variable:

```
$ echo $LANG
en_US.UTF-8
```

The format is *language code* underscore (`_`) *region code* period (`.`) *character encoding*.  So, in the following example, `en` is the language code, `US` is the region code and [`UTF-8`] is the character encoding.

`UTF`, of course, is intended to encompass and replace limited character encoding sets like [`ASCII`] (American Standard Code for Information Interchange), which only allow for characters that can fit in 7 bits (the eighth bit was for extended sets, and [just about everybody had their own]).

> The region code follows the [`ISO-3166`] standard.

According to the `LPIC-1` docs (which you should read), the file `/etc/locale.conf` is where system-wide settings are configured, but I don't have that on my system.

For systems that use `systemd`, you can also use the [`localectl`] utility to query and change the system locale:

```
$ localectl
   System Locale: LANG=en_US.UTF-8
                  LANGUAGE=en_US
       VC Keymap: n/a
      X11 Layout: us
       X11 Model: pc105
     X11 Options: ctrl:nocaps
$
$ localectl set-locale LANG=en_BR.UTF-8
```

Use [`locale`] to display all the relevant environment variables relating to localization:

```
$ locale
LANG=en_US.UTF-8
LANGUAGE=en_US
LC_CTYPE="en_US.UTF-8"
LC_NUMERIC="en_US.UTF-8"
LC_TIME="en_US.UTF-8"
LC_COLLATE="en_US.UTF-8"
LC_MONETARY="en_US.UTF-8"
LC_MESSAGES="en_US.UTF-8"
LC_PAPER="en_US.UTF-8"
LC_NAME="en_US.UTF-8"
LC_ADDRESS="en_US.UTF-8"
LC_TELEPHONE="en_US.UTF-8"
LC_MEASUREMENT="en_US.UTF-8"
LC_IDENTIFICATION="en_US.UTF-8"
LC_ALL=en_US.UTF-8
```

Here are some brief descriptions of each variable:

- `LC_COLLATE` - sets the alphabetical ordering
    + one of its purposes is to define the order files and directories are listed
- `LC_CTYPE` - sets how the system will treat certain sets of characters
    + it defines, for example, which characters to consider as uppercase or lowercase
- `LC_MESSAGES` - sets the language to display program messages (mostly `GNU` programs)
- `LC_MONETARY` - sets the money unit and currency format
- `LC_NUMERIC` - sets the numerical format for non-monetary values
    + its main purpose is to define the thousand and decimal separators
- `LC_TIME` - sets the time and date format
- `LC_PAPER` - sets the standard paper size
- `LC_ALL` - overrides all other variables, including `LANG`

Setting `LC_ALL` will override all of the variables, or do it piecemeal by just setting an individual variable:

```
$ date
Sat 28 Jan 2023 02:36:21 PM EST
$ env LC_ALL=pt_BR.UTF-8 date
sáb 28 jan 2023 14:36:28 EST
```

Lastly, [`iconv`] is a utility to convert from one character set encoding to another.

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 107: Administrative Tasks]: https://learning.lpi.org/en/learning-materials/102-500/107/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives
[`useradd`]: https://man7.org/linux/man-pages/man8/useradd.8.html
[`adduser`]: https://linux.die.net/man/8/adduser
[`passwd`]: https://man7.org/linux/man-pages/man1/passwd.1.html
[`/etc/login.defs`]: https://man7.org/linux/man-pages/man5/login.defs.5.html
[`usermod`]: https://man7.org/linux/man-pages/man8/usermod.8.html
[`userdel`]: https://man7.org/linux/man-pages/man8/userdel.8.html
[`chage`]: https://man7.org/linux/man-pages/man1/chage.1.html
[`groupadd`]: https://man7.org/linux/man-pages/man8/groupadd.8.html
[`groupmod`]: https://man7.org/linux/man-pages/man8/groupmod.8.html
[`groupdel`]: https://man7.org/linux/man-pages/man8/groupdel.8.html
[`gpasswd`]: https://man7.org/linux/man-pages/man1/gpasswd.1.html
[`newgrp`]: https://man7.org/linux/man-pages/man1/newgrp.1.html
[`/etc/passwd`]: https://man7.org/linux/man-pages/man5/passwd.5.html
[`gecos` field]: https://en.wikipedia.org/wiki/Gecos_field
[`chfn`]: https://man7.org/linux/man-pages/man1/chfn.1.html
[`/etc/group`]: https://man7.org/linux/man-pages/man5/group.5.html
[`/etc/shadow`]: https://man7.org/linux/man-pages/man5/shadow.5.html
[`/etc/gshadow`]: https://man7.org/linux/man-pages/man5/gshadow.5.html
[`crypt(3)`]: https://www.man7.org/linux/man-pages/man3/crypt.3.html
[`grep`]: https://man7.org/linux/man-pages/man1/grep.1.html
[`ag`]: https://github.com/ggreer/the_silver_searcher
[`getent`]: https://man7.org/linux/man-pages/man1/getent.1.html
[Name Service Switch]: https://en.wikipedia.org/wiki/Name_Service_Switch
[`/etc/nsswitch.conf`]: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
[`cron`]: https://man7.org/linux/man-pages/man8/cron.8.html
[`crontab(5)`]: https://man7.org/linux/man-pages/man5/crontab.5.html
[`crontab(1)`]: https://man7.org/linux/man-pages/man1/crontab.1.html
[`nano`]: https://nano-editor.org/
[`crontab guru`]: https://crontab.guru/
[extensions]: https://man7.org/linux/man-pages/man5/crontab.5.html#EXTENSIONS
[`crontab(5)` man page]: https://man7.org/linux/man-pages/man5/crontab.5.html#EXTENSIONS
[`anacron`]: https://man7.org/linux/man-pages/man8/anacron.8.html
[`at`]: https://linux.die.net/man/1/at
[`date`]: https://man7.org/linux/man-pages/man1/date.1.html
[`systemd-run`]: https://man7.org/linux/man-pages/man1/systemd-run.1.html
[prime meridian]: https://en.wikipedia.org/wiki/Prime_meridian
[Coordinated Universal Time]: https://en.wikipedia.org/wiki/Coordinated_Universal_Time
[`timedatectl`]: https://man7.org/linux/man-pages/man1/timedatectl.1.html
[Posix TZ format]: https://www.gnu.org/software/libc/manual/html_node/TZ-Variable.html
[Eastern Time Zone]: https://en.wikipedia.org/wiki/Eastern_Time_Zone
[`tzselect`]: https://man7.org/linux/man-pages/man8/tzselect.8.html
[`localtime`]: https://man7.org/linux/man-pages/man5/localtime.5.html
[`ln`]: https://man7.org/linux/man-pages/man1/ln.1.html
[`UTF-8`]: https://en.wikipedia.org/wiki/UTF-8
[`ASCII`]: https://en.wikipedia.org/wiki/ASCII
[just about everybody had their own]: https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/
[`ISO-3166`]: https://www.iso.org/iso-3166-country-codes.html
[`localectl`]: https://man7.org/linux/man-pages/man1/localectl.1.html
[`locale`]: https://man7.org/linux/man-pages/man1/locale.1.html
[`iconv`]: https://man7.org/linux/man-pages/man1/iconv.1.html

