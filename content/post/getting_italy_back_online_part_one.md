+++
title = "On Getting Italy Back Online, Part One"
date = "2021-03-13T00:30:14-05:00"

+++

Now that I have some time on my hands, I've decided to dust off my old [Italian dictionary website] and get it back online.

The [$64,000 question]: why was it knocked offline?

Well, friends, that is a long story filled with many twists and turns, replete with shifty characters with hidden daggers in dark alleys where betrayals were whispered amongst the shadows.

The truth is much more alarming: my web hoster upgraded PHP from version 5.x to 7.x.  The older MySQL API used in version 5.x was no longer supported and so the whole site broke.

After much contemplation and a change of web hosts, I feel the Internet is ready for its return.

---

This is a series of articles that describes different methods of deploying the Italian dictionary website using different tools:

1. Vagrant and Ansible (this article)
1. [Docker and Docker Compose]
1. Kubernetes

---

# All'inizio...

The site itself was started in 2003 and has since seen at least two rewrites.  All the words and phrases in the database have been entered by yours truly and have come from books and comics in Italian that I have read.  These run the gamut from [The Catcher in the Rye] to [Dylan Dog].  Like most of my personal projects, it served its purpose dually, both as a way to learn a new technology (at the time, it was object-oriented PHP) and a way to further my personal interests (the Italian language).

So, the next $64,000 question: how to go about getting the site back online?

I wanted to take an incremental approach rather than making big, sweeping changes at all at once.  To this end, I thought a good first step would be to separate the concerns and make the bootstrapping of the app much easier.

As it stands, it would take doing multiple steps and running multiple commands to get the site up and running, so let's automate this into a push-button solution using [Vagrant] and [Ansible].

Let's get started!

> This will only be the first step.  I'll follow up with probably two more posts about other setups that will make this site not only easy to deploy but easy to scale and maintain.

# Andiamo!

I'm a fan of Vagrant.  It makes it simple to manage the lifecycle of one or more virtual machines and configuration is easy.  And for this first step, I want a potentially long-living machine for my development work until I deploy it in containers using Docker.  So, a VM it is.

> I'm going to assume a working knowledge of Vagrant and Ansible, as well as experience using VirtualBox, so I'm not going to go into any details pertaining to those technologies.

### Vagrant

I'm using a bridge network and specifying the interface so I'm not asked when bringing up the box, although port mapping could just as easily be used.

`Vagrantfile`:

<pre class="math">
Vagrant.configure("2") do |config|
    config.vm.box = "ubuntu/bionic64"
    config.vm.hostname = "italy"
    config.vm.network "public_network", ip: "192.168.1.100", bridge: "wlp3s0"

    config.vm.provider "virtualbox" do |vb|
        vb.memory = 8192
        vb.name = "italy"
    end

    config.vm.provision :ansible do |ansible|
        ansible.become = true                   (1)
        ansible.groups = {
            "webservers" => ["default"]         (2)
        }

        ansible.compatibility_mode = "2.0"
        ansible.playbook = "playbook.yml"       (3)
        ansible.version = "latest"
        ansible.extra_vars = {                  (4)
            ansible_python_interpreter: "/usr/bin/python3"
        }
    end
end
</pre>

Notes:

1. Activates privilege escalation, i.e., become superuser.
2. The set of inventory groups to be used in the auto-generated inventory file (yes, this means that it's not necessary to include your own).
    - Also, even though the hostname has been assigned as "italy", the Vagrant box will probably be called "default" since there are not multiple machines configured in the `Vagrantfile`.
3. Of course, without specifying the location and name of the Ansible playbook, nothing will get installed.
4. Ubuntu 18.04 doesn't ship with Python 2.x, so it's necessary to specify the correct version.  Otherwise, you'll receive an error similar to: `/usr/bin/python: not found` when bringing up the box.

### Ansible

Why bring in Ansible for one VM?  In other words, I could use Vagrant's [shell provisioner], but then I wouldn't be able to reuse those bits, and I wanted to get some reuse out of this project.  That had me think of Ansible and [roles].  For instance, I could put each technology into its own role where it would be general enough to be used across projects.  The final selling point is that Vagrant already has [provisioning support for Ansible].

So, Ansible it is.  I like the tool because it is intuitive and easy to use.  Further, as mentioned, defining functionality in roles makes it easy to share them across projects and maintain.  Simply list the pre-defined roles in a `requirements.yml` file and install via the [`ansible-galaxy`] tool.  It supports downloading from multiple repositories, and in my case, it's fetching them from GitHub:

    ansible-galaxy install --role-file=requirements.yml --roles-path=roles

Obviously, this command must be run before the box is brought up.  If not, you'll get an error alerting you to the missing role.

> There are Vagrant `galaxy_*` Ansible provision configs, although I didn't have luck dowloading the roles by using them.  At some point, I'll revisit this.

And here is the `requirements.yml` file.  I put it in the top-level directory of my project:

`requirements.yml`:

<pre class="math">
---
- src: https://github.com/btoll/ansible-role-mysql
  version: main
  name: mysql

- src: https://github.com/btoll/ansible-role-nginx
  version: main
  name: nginx

- src: https://github.com/btoll/ansible-role-php
  version: main
  name: php

- src: https://github.com/btoll/ansible-role-italy
  version: main
  name: italy
</pre>

> See [Ansible Galaxy] for a repository of shared community created roles.  For more information about how the `requirements.yml` file should be structured, [view the docs].

The next piece is to define the playbook, which is simple, just needing to tell Ansible the hosts that should be targeted and the roles that will be used:

`playbook.yml`:

<pre class="math">
---
- name: Italian Dictionary website
  hosts: webservers
  become: true

  roles:
    - mysql
    - nginx
    - php
    - italy
</pre>

Remember, the [inventory file] is auto-generated by Ansible when given the `ansible.groups` provisioner config, so there's no need to add your own inventory file.

> By the way, all of the roles except for `italy` are very simple, essentially just downloading the packages and starting the services.  Still, it was a good idea to encapsulate each respective functionality into its own role, and I'll probably keep adding to them as necessary.
>
> You can [find them on my GitHub].

Ok, now that both our Vagrant and Ansible configurations are defined, let's start it up!

```
vagrant up
```

# Insomma

And that's really it.  As you can see, there's really not much going on here.  It's installing all the software onto the same machine, just as the original solution, but with a very important distinction: the technologies have now been separated into their own roles.  This encapsulation allows us to not only more easily reuse the roles but to make it the site and its composite parts easier to reason about.

[Next], let's use [Docker] and [Docker Compose] to improve on this as I take our next incremental step to our end goal.

[Italian dictionary website]: http://italy.benjamintoll.com
[$64,000 question]: https://en.wikipedia.org/wiki/The_$64,000_Question
[Docker and Docker Compose]: /2021/03/14/on-getting-italy-back-online-part-two/
[The Catcher in the Rye]: https://en.wikipedia.org/wiki/The_Catcher_in_the_Rye
[Dylan Dog]: https://en.wikipedia.org/wiki/Dylan_Dog
[VirtualBox]: https://www.virtualbox.org/
[Vagrant]: https://www.vagrantup.com/
[Ansible]: https://www.ansible.com/
[Kubernetes]: https://kubernetes.io/
[shell provisioner]: https://www.vagrantup.com/docs/provisioning/shell
[roles]: https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html
[provisioning support for Ansible]: https://www.vagrantup.com/docs/provisioning/ansible_intro
[`ansible-galaxy`]: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
[Ansible Galaxy]: https://galaxy.ansible.com/
[inventory file]: https://docs.ansible.com/ansible/2.3/intro_inventory.html
[find them on my GitHub]: https://github.com/btoll?tab=repositories&q=ansible-role
[view the docs]: https://galaxy.ansible.com/docs/using/installing.html
[Docker]: https://docs.docker.com/
[Docker Compose]: https://docs.docker.com/compose/
[Next]: /2021/03/14/on-getting-italy-back-online-part-two/

