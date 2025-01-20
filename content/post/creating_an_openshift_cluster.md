+++
title = "On Creating An OpenShift Cluster"
date = "2024-11-02T13:02:38-04:00"
draft = true

+++

`Vagrantfile`

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

CONTROL_PLANE_NODES = 3
WORKER_NODES = 2

Vagrant.configure("2") do |config|
    config.vm.box = "dongsupark/coreos-stable"
    config.vm.box_version = "1010.5.0"
    config.ssh.forward_agent = true
    config.vm.network "private_network", type: "dhcp"

    config.vm.provider :libvirt do |lv|
        lv.cpus = 4
        lv.memory = 8192
    end

    (0..CONTROL_PLANE_NODES-1).each do |i|
        config.vm.define "control-plane#{i}" do |node|
            node.vm.hostname = "control-plane#{i}.local"
#            node.vm.network "public_network", ip: "192.168.1" + ".#{100 + i}", bridge: "wlp2s0", dev: "wlp2s0", hostname: true
        end
    end

    (0..WORKER_NODES-1).each do |i|
        config.vm.define "worker#{i}" do |node|
            node.vm.hostname = "worker#{i}.local"
            node.vm.provision "shell", inline: <<-SHELL
            SHELL
        end
    end

    config.vm.define "bootstrap" do |node|
        node.vm.hostname = "bootstrap.local"
#        node.vm.network "public_network", ip: "192.168.1.200", bridge: "wlp2s0", dev: "wlp2s0"
        node.vm.network "private_network", ip: "10.0.10.200", hostname: true
        node.vm.provision "shell", inline: <<-SHELL
        SHELL
    end

    config.vm.define "nfs" do |node|
        node.vm.box = "centos/8"
        node.vm.box_version = "2011.0"
        node.vm.hostname = "nfs.local"
        node.vm.provision "shell", inline: <<-SHELL
        SHELL
    end
end

```

If you get an error similar to the following:

```bash
An error occurred while executing the action on the 'node0'
machine. Please handle this error then try again:

There are errors in the configuration of this machine. Please fix
the following errors and try again:

Libvirt Provider:
* network configuration 1 for machine node0 is a public_network referencing host device 'eth0' which does not exist, consider adding ':dev => ....' referencing one of enp3s0, wlp2s0
```

Then, map the `dev` onto the name of the wireless or wired device on the host:

```ruby
dev: "wlp2s0"
```

> Chances are that your device names are different from mine.  Run [`ip address`] to get a list of the devices on your host.

So, modify the line in the `Vagrantfile` above to add the mapping:

```ruby
node.vm.network "public_network", ip: "192.168.1" + ".#{100 + i}", bridge: "wlp2s0", dev: "wlp2s0"
```

## References

- [Bug 1908794 - static IP assignment fails with eth0: No such device ](https://bugzilla.redhat.com/show_bug.cgi?id=1908794)

[`ip address`]: https://www.man7.org/linux/man-pages/man8/ip.8.html#IP_-_COMMAND_SYNTAX

