+++
title = "On Building A Kubernetes Cluster With kubeadm"
date = "2026-10-25T23:30:05-04:00"

+++

- [Introduction](#introduction)
- [Brief Overview](#brief-overview)
- [Dependencies](#dependencies)
- [`tmux`](#tmux)
- [KVM](#kvm)
- [Preseeding](#preseeding)
- [`kubeadm`](#kubeadm)
- [Passwordless `sudo`](#passwordless-sudo)
- [Conclusion](#conclusion)
- [References](#references)

---

## Introduction

Today, I'll show you how to quickly build a local [Kubernetes] cluster using the [`kubeadm`] tool.  In actuality, you won't even see it, as everything is hidden behind shell scripts.  This is nice for someone who doesn't care how it works.  But that's not you, dear reader, so let's take a peek below the covers.

Since this is a lab experiment, shortcuts were taken that would not be acceptable in production.  I'll point these out as we go along.

A lot of the fun of doing this was determining all of the components that could be pieced together to enable a simple shell command to automate the entire process.  The process was really [moreish].

I'm not going to go in-depth and explain each component, as that would vastly increase the size of this fine article.  Instead, I'll merely give a brief explanation of each, leaving the deep research to you, my intrepid friend and fellow knowledge-seeker.

To give you a little taste of what is to come, once the [dependencies](#dependencies) are installed, here is the only command you need to build the entire Kubernetes cluster:

```bash
$ ./make_cluster.sh
```

---

Rather than going deep into any one subject, the point of this post is to show you how you can glue together the bits and bobs laying around your Linux operating system to get you up and running with Kubernetes, with as few dependencies as possible.

Thankfully, we don't need to install Docker, or have another program do it for us, like Minikube.  I avoid installing Docker at all costs and even eschew tools that use it, like the aforementiond Minikube or `kind`.  There other alternatives such as [Podman] that aren't designed as a security risk.

> In this article, a node is a virtual machine, and I may use those terms interchangeably.  Just know that the are the same.

## Brief Overview

First, let's get some housekeeping out of the way.  This was tested on a host running Debian [trixie].  Any Linux distribution kernel that supports and has the KVM module loaded will suffice, though (which I think is all of them?).  This is non-negotiable, and the demo will not work without it.

I chose Debian as the OS for the nodes because I [preseed] its installation, although I would imagine that there are similar tools with other distros (I have not verified that, though).  The Debian release is configurable.

My laptop is a cheaper model with 16GB of RAM and ~300 HDD, so I've limited the demo to three virtual machines:

- the control plane
    + 4GB RAM
    + 40GB HDD
- node1 and node2
    + 2GB RAM
    + 40GB HDD

If this doesn't work for you, the `install.sh` script takes a `json` configuration that will accept different resource limits, among other useful settings.

Briefly, here is what a node configuration looks like:

```json
[
    {
        "name": "control-plane",
        "os": "debian13",
        "network_interface": "enp2s0",
        "netmask": "255.255.255.0",
        "ip_address": "192.168.122.100",
        "gateway": "192.168.122.1",
        "nameserver": "1.1.1.1",
        "full_name": "Benjamin Toll",
        "username": "btoll",
        "memory": 4096,
        "disk": 40
    }
]
```

The [`install.sh`] script accepts input on [`stdin`].  The following examples show different ways of passing the `json` to the script:

```bash
$ cat << EOF | ./install.sh
[
    {
        "name": "control-plane",
        "os": "debian13",
        "network_interface": "enp2s0",
        "netmask": "255.255.255.0",
        "ip_address": "192.168.122.100",
        "gateway": "192.168.122.1",
        "nameserver": "1.1.1.1",
        "full_name": "Benjamin Toll",
        "username": "btoll",
        "memory": 4096,
        "disk": 40
    }
]
EOF
```

```bash
$ ./install.sh < cluster.json
```

```bash
$ ./install.sh <<< '
[
    {
        "name": "control-plane",
        "os": "debian13",
        "network_interface": "enp2s0",
        "netmask": "255.255.255.0",
        "ip_address": "192.168.122.100",
        "gateway": "192.168.122.1",
        "nameserver": "1.1.1.1",
        "full_name": "Benjamin Toll",
        "username": "btoll",
        "memory": 4096,
        "disk": 40
    }
]
'
```

Hopefully, the configuration is self-explanatory.  All of the fields are mandatory.

> The [`make_cluster.sh`] script uses [this cluster configuration](https://github.com/btoll/preseed/blob/master/post-install/kubernetes/cluster.json).

The lab demo uses the [`virt-install`] tool to install the virtual machines, using [`libvirt`] under the hood.  `virt-install` allows us to inject an arbitrary number of files into the VM creation process, including our [parameterized preseed file].

This feature of `virt-install` is incredibly powerful, and the demo takes advantage of it to do the following things:

- The preseeded `preseed.cfg` configuration to install the OS into the virtual machine.
- Add a [custom SSH config file] that is hardened with security in mind (not so important, really, for a local lab).
- Extensions to [`sudo`] that will allow for passwordless `sudo` commands.  This will aid in the automation by cutting down on the number of times a password needs to be entered (the host `sudo` extension will be removed after the script runs).
    > "Extensions" is what I'm using to mean that I'm adding these files to `/etc/sudoers.d/` rather than crowbarring them into `/etc/sudoers` (using [`visudo`], of course).
    > This means that they must be manually checked for proper syntax:
    >
    > ```bash
    > $ sudo visudo -cf /etc/sudoers.d/passwordless_host
    > ```
- A [`post_install.sh`] script that will install Kubernetes on each virtual machine.
- A `key.pub` file that will allow for SSH authentication into all VMs.
    + This **must** be named `key.pub` and be added to the `include.d/` directory.  It is a hard requirement and the cluster creation will not work without doing so, as it relies upon passwordless `ssh` remote command execution.

> `install.sh` will include anything that is placed into `kubernetes/include.d` (currently, `post_install.sh` and `key.pub`).  However, if you add another file into `kubernetes/include.d`, you must also instruct the preseeding process on how this should be included in the virtual machine in the `late_command` block in [`preseed.tpl`].

Anything a node needs will be placed into the `share` directory in a directory that is the name of the node.  The node directory, in turn, will include two directories, `include.d` and `mnt`.

> The contents of this `share` directory will be populated by the `install.sh` script and will be overwritten when it is next invoked, so don't place anything in it that you don't want removed.

The `mnt` directory is the shared mount between the host and the guest.  The `include.d` directory is the collection of files that the `install.sh` script used to create the node.  After installation, the `include.d` directory and its contents aren't needed any longer, so it could be safely deleted.  It's there for audit purposes and can be used for debugging to ensure that the templates were interpolated correctly and the files that you placed in the `kubernetes/include.d/` had been picked up by the tool and used.

```bash
share/
├── control-plane/
│   ├── include.d/
│   │   ├── key.pub
│   │   ├── passwordless_guest
│   │   ├── preseed.cfg
│   │   └── sshd_config
│   └── mnt/
│       ├── config
│       └── kubeadm-init.log
├── node1/
│   ├── include.d/
│   │   ├── key.pub
│   │   ├── passwordless_guest
│   │   ├── preseed.cfg
│   │   └── sshd_config
│   └── mnt/
└── node2/
    ├── include.d/
    │   ├── key.pub
    │   ├── passwordless_guest
    │   ├── preseed.cfg
    │   └── sshd_config
    └── mnt/

10 directories, 14 files
```

When `kubeadm init` is run in the `control-plane` node, its output is redirected to `/mnt/shared/kubeadm-init.log`, which is its shared mount point with the host (see in the output above).  Each node can then access that to extract the `kubeadm join` command from it to join the cluster.

The other file, `config`, is the `kubeconfig` file that has been copied to `$HOME/.kube/config` on the host machine.

> Of course, encapsulating all the files needed by a node in these directories makes cleanup a breeze.

## Dependencies

- [KVM], [QEMU], [`libvirt`]
    + I have an Intel processor with VT-x extensions, so I'm all set for installing KVM and the other packages I need to create VMs:
    ```bash
    $ grep -cE 'vmx|svm' /proc/cpuinfo
    16
    $ grep -oE 'vmx|svm' /proc/cpuinfo | head -1
    vmx
    $ lscpu | grep -i Virtualization
    Virtualization:                          VT-x
    $ lsmod | grep kvm
    kvm_intel             413696  12
    kvm                  1396736  7 kvm_intel
    irqbypass              12288  1 kvm
    ```
    + `sudo apt-get install --no-install-recommends -y qemu-system libvirt-daemon-system virt-install libvirt-clients virtinst ovmf`
        - This will also install `virt-install` (`virt-install` package) and `virsh` (`libvirt-clients` package) which are frontends to `libvirt`.
- [`tmux`]
    + `sudo apt-get install tmux`
- [`helm`]
    + [Helm Installation](https://helm.sh/docs/intro/install)
    + The [Cilium] CNI plugin uses `helm` to install the Kubernetes manifests.  If you use another one like [`flannel`], then `helm` is not needed.
        > Cilium is used by default.  If you want to use `flannel`, uncomment it in [`install.sh`].

Everything else will be automatically installed by the [`apt`] package manager by one of the scripts.  This includes the following:

- [`ssh`](https://www.man7.org/linux/man-pages/man1/ssh.1.html)
- [`virt-install`]
- [`virsh`](https://linux.die.net/man/1/virsh)
    + Only if the [`uninstall.sh`] script is used.
- Packages needed for a Kubernetes installation, according to their docs:
    + [`containerd.io`](https://containerd.io/)
    + [`kubeadm`](https://kubernetes.io/docs/reference/setup-tools/kubeadm/)
    + [`kubectl`](https://kubernetes.io/docs/reference/kubectl/)
    + [`kubelet`](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
    + [`apt-transport-https`](https://manpages.debian.org/trixie/apt/apt-transport-https.1.en.html)
    + [`ca-certificates`](https://manpages.debian.org/testing/ca-certificates/update-ca-certificates.8.en.html)
    + [`curl`](https://man7.org/linux/man-pages/man1/curl.1.html)
    + [`gnupg`](https://gnupg.org/)
    + [`lsb-release`](https://linux.die.net/man/1/lsb_release)

Incidentally, if you need to find the package that installed a binary that has already been downloaded, use [`apt-file`]:

```bash
$ sudo apt-get install apt-file
$ sudo apt-file update
$ apt-file search $(which virt-install)
virt-install: /usr/bin/virt-install
```

The `virt-install` package "owns" the `virt-install` binary.

## KVM

If you want to manage the virtual machines as a non-priviliged user, add your user to the `kvm` and `libvirt` groups:

```bash
$ sudo adduser $USER kvm
$ sudo adduser $USER libvirt
```

KVM is a hypervisor enabled by a kernel module that allows for hardware virtualization.  Since it is native to Linux, it is the natural choice for a hypervisor.

[`virt-install`] is a frontend tool that will create a KVM virtual machine and is used in the demo (see the [`install.sh`] script).  It manages the lifecycel of the virtual machines.

KVM is a type 1 hypervisor that is part of the Linux kernel. QEMU is also used as a type 2 hypervisor in userspace, which is used to emulate hardware (when used in conjunction with KVM).

## `tmux`

[`tmux`] is a terminal multiplexer, which means that multiple terminals can run in the same window.  If this isn't nice, I don't know what is.

It's other use is to preserve a session across disconnections and devices.  This was the *raison d'être* of its predecessor, [`screen`], and the reason I was a heavy user of `screen`.  For example, if I were working remotely, anything that I was doing would be terminated in the case of a network drop.  This is a problem, especially if writing something (it would not be saved) or compiling something (it would not finish).  Using `screen`, however, the session would be preserved, and as soon as my network connection was restored, I could log in again and resume where I had left off.

`tmux` can be thought of as a successor to `screen`, and it is much easier to script (`screen` was notoriously difficult to script, especially the status bar).  I use it every day, as it's an essential part of my development environment.

Since `tmux` allows for running multiple terminals in the same window, it naturally lends itself to concurrent jobs, such as installing multiple virtual machines.  So, it is perfect for creating the cluster in the lab environment.  Rather than creating each VM sequentially, an array of node objects can be passed to a script such as [`make_cluster.sh`], which will start a new `tmux` session and call `install.sh` in a new `tmux` window pane for each node definition in the array.  The result looks like this:

```bash
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ $ ./install.sh --name control-plane    | $ ./install.sh --name node2            +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+---------------------------------------------------------------------------------+
+ $ ./install.sh --name node1            | $ hangman                              +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+                                        |                                        +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
```

This is a single terminal window with four panes, three of which are installing a virtual machine of the cluster and the fourth that can be used for monitoring them or whatever else you want to do (like a game of [hangman]!).

> Note that there is another shell script in the project called [`cmd.sh`] that installs the nodes sequentially.
>
> Initially, I backgrounded the `install.sh` invocation for each node in an attempt to create them concurrently, but I had poor results.  I forget the details, you're just going to have either to trust me or try it yourself.

## Preseeding

[Preseeding] is a really cool way to automate the installation of an operating system.  We all have walked through one of these installations where the wizard asks for the time zone, the language, the hostname and the user, etc.  Preseeding allows you to give pre-recorded answers for all of these questions so you can automate the entire process.

It's done using a config file that is then passed to `virt-install`, as mentioned previously.  Here is a snippet:

```
#### Localization ####
d-i debian-installer/locale string en_US.UTF-8
d-i keyboard-configuration/xkb-keymap select us
d-i keyboard-configuration/xkb-layout string us
d-i keyboard-configuration/xkb-model string pc105

#### Networking ####
d-i netcfg/choose_interface select enp2s0
d-i netcfg/disable_autoconfig boolean true
d-i netcfg/get_ipaddress string IP_ADDRESS
d-i netcfg/get_netmask string NETMASK
d-i netcfg/get_gateway string GATEWAY
d-i netcfg/get_nameservers string NAMESERVER
d-i netcfg/get_hostname string HOSTNAME
d-i netcfg/get_domain string localdomain
d-i netcfg/hostname string HOSTNAME
```

> `d-i` stands for Debian installer.

From this snippet, you can see that several values will be interpolated: `IP_ADDRESS`, `HOSTNAME`, et al.  This is because the configuration is a template ([`preseed.tpl`]), and the parameterization allows for a customized version for each node (Since the file **must** be named `preseed.cfg`, this doesn't allow for us to pass them to `virt-install` as `preseed-NODENAME.cfg`.  Instead, each one is written as `preseed.cfg` to its own node directory -- see the output of `tree` above -- and passed to `virt-install` as `--initrd-inject ./NODE_NAME/include.d/preseed.cfg`).

The most important section for this lab demo is the following:

```
#### Late Command (Post-Installation) ####
d-i preseed/late_command string \
    cp -a /post_install.sh /target/root/post_install.sh; \
    cp -a /sshd_config /target/etc/ssh/sshd_config; \
    cp -a /passwordless_guest /target/etc/sudoers.d/passwordless_guest; \
    in-target /bin/bash -c 'mkdir --mode 700 --parents /home/USERNAME/.ssh'; \
    cp -a /key.pub /target/home/USERNAME/.ssh/authorized_keys; \
    in-target /bin/bash -c 'chmod 600 /home/USERNAME/.ssh/authorized_keys'; \
    in-target /bin/bash -c 'chown -R USERNAME:USERNAME /home/USERNAME/'; \
    in-target /bin/bash -c '/root/post_install.sh > /root/post_install.log 2>&1'
```

The `late_command` section allows you to run scripts to really customize your installation.  It does this by installing the operating system into a `chroot` that (the target) that allows you to copy files given to the `virt-install` command into the `chroot` and then perform any operations needed.

```bash
virt-install --connect qemu:///system \
    --name "$NAME" \
    --memory "$MEMORY" \
    --extra-args="preseed/file=/preseed.cfg console=ttyS0,115200n8" \
    "${initrd_inject[@]}" \
    --install "$OS" \
    --disk size="$DISK" \
    --filesystem type=mount,source="$PROJECT_SHARE/$NAME/mnt",target=shared,accessmode=mapped,driver.type=path,driver.wrpolicy=immediate \
    --network bridge=virbr0,model=virtio \
    --graphics none \
    --noautoconsole \
    --wait=-1
```

> I've only created the preseed configuration as a template because of my own needs.  Usually, you just create a single `preseed.cfg` file with no paramater and pass it directly to `virt-install`.
>
> In other words, tokenizing the file isn't a requirement.

In addition to `preseed.tpl`, there are two other templates in the [`tpl`] directory:

- [`passwordless_guest.tpl`]
- [`passwordless_host.tpl`]

These will grant passwordless `sudo` access to `$USER` to the commands explicitly defined in the files (this is safer than granting it to `ALL` commands) and installs them to the `/etc/sudoers.d/` directory in each node.

All of the templates will be run through `awk` and saved in the `share/NODE_NAME/include.d` directory.  Here is the simple Bash function that does it in [`install.sh`]:

```bash
parse_templates() {
    local node="$1"
    local name="$(jq --raw-output '.name' <<< "$node")"
    local username="$(jq --raw-output '.username' <<< "$node")"

    mkdir -p "$PROJECT_SHARE/$name/include.d"

    awk -v hostname="$name" \
        -v network_interface="$(jq --raw-output '.network_interface' <<< "$node")" \
        -v ip_address="$(jq --raw-output '.ip_address' <<< "$node")" \
        -v netmask="$(jq --raw-output '.netmask' <<< "$node")" \
        -v gateway="$(jq --raw-output '.gateway' <<< "$node")" \
        -v nameserver="$(jq --raw-output '.nameserver' <<< "$node")" \
        -v full_name="$(jq --raw-output '.full_name' <<< "$node")" \
        -v username="$username" '{
        gsub("HOSTNAME", hostname);
        gsub("NETWORK_INTERFACE", network_interface);
        gsub("IP_ADDRESS", ip_address);
        gsub("NETMASK", netmask);
        gsub("GATEWAY", gateway);
        gsub("NAMESERVER", nameserver);
        gsub("FULL_NAME", full_name);
        gsub("USERNAME", username);
        print
    }' ./tpl/preseed.tpl >| "$PROJECT_SHARE/$name/include.d/preseed.cfg"

    awk -v username="$username" '{
        sub("USERNAME", username);
        print
    }' ./tpl/passwordless_guest.tpl >| "$PROJECT_SHARE/$name/include.d/passwordless_guest"

    if [ "$name" == control-plane ]
    then
        printf "%b Allow sudo temporarily.\n" "$INFO"
        # This `HOSTNAME` is the env var set in the login bash scripts.
        awk -v username="$username" -v hostname="$HOSTNAME" -v project_share="$PROJECT_SHARE" '{
            gsub("USERNAME", username);
            sub("HOSTNAME", hostname);
            gsub("PROJECT_SHARE", project_share);
            print
        }' ./tpl/passwordless_host.tpl | sudo tee /etc/sudoers.d/passwordless_host > /dev/null
    fi
}

```

> By the way, if you're not familiar with [`awk`], what the hell have you been doing with your life?

## `kubeadm`

The [`post_install.sh`] script will install all of the software that each node needs to be part of the cluster, regardless of its role (control-plane or regular node).  I'm not going to go into detail about this, but it will install the following components:

- `containerd`
- [Cilium]
- `kubeadm`
- `kubectl`
- `kubelet`

You know, the usual suspects.

It follows the [Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/) guide in the official Kubernetes docs.

In the [`install.sh`] script, `kubeadm init` will be executed remotely in the `control-plane` node to initialize it, and then `kubeadm join` will be remotely executed in each node to join it to the `control-plane`.

As we'll see in the next section, passwordless [`sudo`] has been set up for all of the nodes (i.e., including `control-plane`) by installing a file int `/etc/sudoers.d` that will enable `sudo` to be used without a password for the `kubeadm` binary.

> This could be made more secure by specifying the exact arguments to `kubeadm`, but we cannot do this for the `kubeadm join` since we won't know the parameters until *after* `kubeadm init` has been run.  A production system would **not** want to do this, but again, this is a lab.  Still, it's good to know the tradeoffs.

## Passwordless `sudo`

Since this is a lab environment, let's allow some commands that require privilege escalation (aka root access) to be passwordless.  Both the guests and the host will need this to try and provide a seamless installation.

Under normal conditions, having a passwordless [`sudo`] is a really bad idea.  However, for a sandboxed lab that is meant for learning and that doesn't have access to any important data, I think it's fine.  Plus, we're only going to allow it to be passwordless for specific commands, to limit the "blast range", as the cool kids say.

How do we do this?  Let's take a look at the files that enable it:

`passwordless_guest.tpl`

```
USERNAME ALL=(ALL:ALL) NOPASSWD: /usr/bin/kubeadm, /usr/bin/cp /etc/kubernetes/admin.conf /mnt/shared/config
```

`passwordless_host.tpl`

```
USERNAME HOSTNAME=(ALL:ALL) NOPASSWD: \
    /usr/bin/mv PROJECT_SHARE/mnt/config /home/USERNAME/.kube, \
    /usr/bin/chown USERNAME\:USERNAME /home/USERNAME/.kube/config, \
    /usr/bin/grep "kubeadm join" PROJECT_SHARE/control-plane/mnt/kubeadm-init.log, \
    /usr/bin/sed -n '/kubeadm join/\,$p' PROJECT_SHARE/control-plane/mnt/kubeadm-init.log
```

After interpolation, these will be installed as `/etc/sudoers.d` in both the guest and the host, respectively:

```
btoll ALL=(ALL:ALL) NOPASSWD: /usr/bin/kubeadm, /usr/bin/cp /etc/kubernetes/admin.conf /mnt/shared/config
```

```
btoll kilgore-trout=(ALL:ALL) NOPASSWD: \
    /usr/bin/mv /home/btoll/projects/preseed/post-install/kubernetes/share/mnt/config /home/btoll/.kube, \
    /usr/bin/chown btoll\:btoll /home/btoll/.kube/config, \
    /usr/bin/grep "kubeadm join" /home/btoll/projects/preseed/post-install/kubernetes/share/control-plane/mnt/kubeadm-init.log, \
    /usr/bin/sed -n '/kubeadm join/\,$p' /home/btoll/projects/preseed/post-install/kubernetes/share/control-plane/mnt/kubeadm-init.log
```

Why are these templates?  Well, for the same reason as the `preseed.tpl`.  The `install.sh` script is creating N nodes, and this is an easy way to create N custom files per node.

Crucially, these files will be interpolated and then written into the `/etc/sudoers.d/` directory.  Here is the relevant line in `/etc/sudoers` that will parse them:

```
@includedir /etc/sudoers.d
```

Placing files in `sudoers.d` rather than surgically adding them to the `sudoers` file will enable us to automate passwordless `sudo` in a much easier and maintainable way.

> By the way, if you don't like editing `sudoers` with `nano`, you can change the editor by adding these lines to it using [`visudo`]:
>
> ```
> Defaults        env_editor
> Defaults        env_keep += "EDITOR VISUAL SUDO_EDITOR"
> ```
>
> Of course, the value of my `$EDITOR` environment variable is `vim`.
>
> Check out the article [How to Properly Set visudo/sudo's Editor: A Complete Guide](https://linuxvox.com/blog/how-to-properly-set-sudo-visudo-s-editor/) for other ways to do this as well as lots of useful information.

`install.sh` will remove `/etc/sudoers.d/passwordless_host` in the [`trap`]ped `cleanup` file on `EXIT`, so this will properly cleanup and not leave any detritus.  Note that the `EXIT` signal will be received (trapped) both on successful completion of the script and early termination (because of an error).

Notably, the [`visudo`] utility will lock the `/etc/sudoers` file and check for syntax errors when exiting.  Since we're not adding to that file, the validation check is on us.  You can check using the following method:

```bash
$ sudo visudo -cf /etc/sudoers.d/passwordless_host
/etc/sudoers.d/passwordless_host: parsed OK
```

The following is a way to quickly see what is listed for a particular user.  If running this for your own user, the `--other-user` parameter isn't needed:

```bash
$ sudo --list --other-user btoll
Matching Defaults entries for btoll on kilgore-trout:
    env_editor, env_reset, env_keep+="EDITOR VISUAL SUDO_EDITOR", mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin,
    use_pty

User btoll may run the following commands on kilgore-trout:
    (ALL : ALL) ALL
```

## Conclusion

I conclude that this article is both astounding and breathtaking.

## References

- [lab project]
- [On Ditching Vagrant](/2026/06/29/on-ditching-vagrant/)
- [On Virtualization And Virtual Machines](/2026/08/10/on-virtualization-and-virtual-machines/)

[lab project]: https://github.com/btoll/preseed/tree/master/post-install/kubernetes
[Kubernetes]: https://kubernetes.io/
[`kubeadm`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/
[Podman]: https://en.wikipedia.org/wiki/Podman
[`tmux`]: https://en.wikipedia.org/wiki/Tmux
[`make_cluster.sh`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/make_cluster.sh
[`install.sh`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/install.sh
[`uninstall.sh`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/uninstall.sh
[`post_install.sh`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/post_install.sh
[`passwordless_guest.tpl`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/tpl/passwordless_guest.tpl
[`passwordless_host.tpl`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/tpl/passwordless_host.tpl
[`virt-install`]: https://linux.die.net/man/1/virt-install
[`sudo`]: https://www.man7.org/linux/man-pages/man8/sudo.8.html
[`awk`]: https://en.wikipedia.org/wiki/AWK
[`trap`]: https://www.man7.org/linux/man-pages/man1/trap.1p.html
[`visudo`]: https://www.man7.org/linux/man-pages/man8/visudo.8.html
[Preseeding]: https://www.debian.org/releases/stable/amd64/apbs01.en.html
[preseed]: https://www.debian.org/releases/stable/amd64/apbs01.en.html
[`apt`]: https://manpages.debian.org/trixie/apt/apt.8.en.html
[`apt-file`]: https://manpages.debian.org/trixie/apt-file/apt-file.1.en.html
[`helm`]: https://helm.sh/
[trixie]: https://www.debian.org/releases/trixie/
[custom SSH config file]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/include.d/sshd_config
[KVM]: https://en.wikipedia.org/wiki/Kernel-based_Virtual_Machine
[QEMU]: https://en.wikipedia.org/wiki/QEMU
[`libvirt`]: https://en.wikipedia.org/wiki/Libvirt
[moreish]: https://www.youtube.com/watch?v=MavWEauvMm8
[parameterized preseed file]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/tpl/preseed.tpl
[`flannel`]: https://github.com/flannel-io/flannel
[Cilium]: https://cilium.io/
[`screen`]: https://www.man7.org/linux/man-pages/man1/screen.1.html
[hangman]: https://github.com/btoll/hangman
[`cmd.sh`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/cmd.sh
[`preseed.tpl`]: https://github.com/btoll/preseed/blob/master/post-install/kubernetes/tpl/preseed.tpl
[`stdin`]: https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin)
[`tpl`]: https://github.com/btoll/preseed/tree/master/post-install/kubernetes/tpl

