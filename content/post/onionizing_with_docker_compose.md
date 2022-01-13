+++
title = "On Onionizing with Docker Compose"
date = "2021-03-23T16:00:54-04:00"

+++

In [Getting Italy Back Online, Part Two], I created a multi-container application for my [Italian Dictionary website].  In the meantime, I added [my personal website] to the compose file and put them all onto a [user-defined network] and created the containers on my VPS.

Next, I wanted to create an [onion service] (formally known as a hidden service) for my personal website.  I used to run onion services before, and after much contemplation and seeking answers in the wilderness, it's time to bring sexy back.

Since my personal site is solely devoted to what interests me in tech, I felt that I didn't want to mix in anything personal (although, I would never post anything inflammatory or irreverent).  Perhaps I'll change my mind, but for now that's what I'm doing.  Deal with it.

So, what's involved in onionizing a website?  That's what this post is all about, friend.

Let's dive in.

# Pre-Onion

Before we take a look at the changes needed to onionize the site, let's take a look at what changed in the config files to get `benjamintoll.com` online.

`docker-compose.yml`

<pre class="math">
version: "3.7"

services:
  db:
    image: mysql
    restart: always
    environment:
      MYSQL_DATABASE_FILE: /run/secrets/db_name
      MYSQL_USER_FILE: /run/secrets/db_user
      MYSQL_PASSWORD_FILE: /run/secrets/db_password
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/db_root_password
    networks:                                                   (1)
      - italy_net
    secrets:
       - db_name
       - db_user
       - db_password
       - db_root_password
    volumes:
      - ./sql:/docker-entrypoint-initdb.d
      - italy_data:/var/lib/mysql

  proxy:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.nginx
    restart: always
    depends_on:
      - db
    ports:
      - 80:80
    networks:                                                   (1)
      - italy_net
    volumes:
      - ./italy:/var/www/html:ro

  italy:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.php-fpm
    restart: always
    depends_on:
      - proxy
    networks:                                                   (1)
      - italy_net
    secrets:
       - source: php_italy
         target: /var/www/italy.php
    volumes:
      - ./italy:/var/www/html:ro

  benjamintoll:                                                 (2)
    image: nginx
    restart: always
    depends_on:
      - proxy
    networks:                                                   (1)
      - italy_net
    volumes:
      - ./benjamintoll.com/public:/usr/share/nginx/html:ro

networks:                                                       (1)
  italy_net:
    name: italy_net
    driver: bridge

secrets:
  db_name:
    file: secrets/italy/db_name.txt
  db_user:
    file: secrets/italy/db_user.txt
  db_password:
    file: secrets/italy/db_password.txt
  db_root_password:
    file: secrets/italy/db_root_password.txt
  php_italy:
    file: secrets/italy/php_italy.txt

volumes:
  italy_data:
    name: italy_data
</pre>

Notes:

1. Added a user-defined networked called `italy_net` and joined each service to it.  Although [there are many reasons] for wanting this over using the default `bridge` network, I'm using it here primarily for service discovery.  Note that it is defined globally (i.e., the same indentation level as `services`, `secrets` and `volumes`) and referenced by its key, which in this case has the same name.

    The `name` field is optional, but if it is not set it is given a name by Docker: the directory name in which `docker-compose` was invoked is prepended to the value of `name` (i.e., `projects_italy_data`).  I like to keep control of the names and not have something magically generated.
1. Added the `benjamintoll` service.

Next, let's take a gander at the updated `default.conf` configuration:

<pre class="math">
server {
    listen 80;
    root /var/www/html;
    index index.php index.html index.htm;

    server_name kilgore-trout;

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/html;
    }

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+?\.php)(/.*)$;
        if (!-f $document_root$fastcgi_script_name) {
            return 404;
        }

        # Mitigate https://httpoxy.org/ vulnerabilities.
        fastcgi_param HTTP_PROXY "";

        fastcgi_pass italy:9000;
        fastcgi_index index.php;

        include fastcgi_params;

        # SCRIPT_FILENAME parameter is used for PHP FPM determining
        # the script name. If it is not set in fastcgi_params file,
        # i.e. /etc/nginx/fastcgi_params or in the parent contexts.
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}

server {                                    (1)
    listen 80;
    root /var/www/html;
    index index.html index.htm;

    server_name _;                          (2)

    location / {
        proxy_pass http://benjamintoll;     (3)
    }
}
</pre>

Notes:

1. Added a new server block to support my personal site.
1. The underscore denotes `localhost`.  As seen below, I had added an entry to `/etc/hosts` so `kilgore-trout` resolves to the loopback device.

        127.0.0.1	localhost
        127.0.1.1	kilgore-trout

1. Proxy the requests through to the `benjamintoll` service (defined in `docker-compose.yml`).

Hopefully, that makes sense and is straightforward and familiar.

Neat!

# Onion

After having done some research, I decided the best approach would be to have a new service running [Tor] that would be connected to both the `italy_net` network and a new `tor_net` network.  The latter will be an isolated network and won't have access to the public Internet by turning off [IP masquerading].  Since the Tor service belongs to both networks, it will act as a proxy for the isolated `onion` service.  This isolated container with the `onion` service is where the onion service files are served.

I've created a Dockerfile that sets up Tor.  This will include the configuration needed to get the onion service online as well as the GPG key used to verify the signature of the Tor Project's packages.

Let's check it out, ragazzi.

`Dockerfile.tor`

<pre class="math">
FROM ubuntu:focal

RUN apt-get update && \
    apt-get install -y \
        gnupg2 \
        lsb-release \
        wget

RUN wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | gpg --import && \
    gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | apt-key add - && \
    echo "deb [arch=amd64] https://deb.torproject.org/torproject.org $(lsb_release -sc) main" > /etc/apt/sources.list.d/tor.list \
    echo "deb-src [arch=amd64] https://deb.torproject.org/torproject.org $(lsb_release -sc) main" >> /etc/apt/sources.list.d/tor.list

RUN apt-get update && \
    apt-get install -y \
        apt-transport-https \
        deb.torproject.org-keyring \
        tor

RUN echo "HiddenServiceDir /var/lib/tor/benjamintoll.com" > /etc/tor/torrc
RUN echo "HiddenServicePort 80 onion:80" >> /etc/tor/torrc

ENTRYPOINT ["tor"]

</pre>

The next step is to create the two new services and the private network in the Docker Compose file.  Since much of the configuration is the same as before, only the new additions will be shown in full.

<pre class="math">
version: "3.7"

services:
  db:
    ...

  proxy:
    ...

  italy:
    ...

  benjamintoll:
    ...

  tor:                                                          (1)
    build:
      context: dockerfiles
      dockerfile: Dockerfile.tor
    restart: always
    networks:                                                   (2)
      - italy_net
      - tor_net
    volumes:                                                    (3)
      - onion_data:/var/lib/tor

  onion:                                                        (4)
    image: nginx
    restart: always
    depends_on:
      - tor
    networks:                                                   (5)
      - tor_net
    volumes:                                                    (6)
      - ./benjamintoll.com/public:/usr/share/nginx/html:ro

networks:
  italy_net:
    name: italy_net
    driver: bridge
  tor_net:                                                      (7)
    name: onion
    driver: bridge
    driver_opts:
      com.docker.network.bridge.enable_ip_masquerade: "false"   (8)

secrets:
  ...

volumes:
  italy_data:
    name: italy_data
  onion_data:                                                   (9)
    name: onion_data
</pre>

Notes:

1. The new `tor` service.
1. As described, the `tor` service belongs to both `italy_net` and `tor_net` Docker bridge networks.
1. Binding the `onion_data` named volume on the host to the location of the onion service's hidden directory will give us access to the onion service's hostname.  This allows us to find the hidden service in the Tor network.

    Also, creating the bind mount will ensure that the keys (and thus the hostname) won't change when the containers are brought up and down.  That would be bad, as we'd lose the original hostname (the `.onion` address), as it would change every time!
1. The new `onion` service.
1. Note that the `onion` service is only joined to the isolated `tor_net` network.
1. I'm using the same location for the mount as I am for my personal site on the public Internet.  I'll later change this to another location with different content.
1. The new `tor_net` Docker network.
1. Set an option on `tor_net` to turn off IP masquerading.
1. The new `onion_data` named volume.

# Post-Onion

We're all set to fire up our cluster.  Cross your fingers and toes!

```
$ docker-compose up -d
Creating network "italy_net" with driver "bridge"
Creating network "onion" with driver "bridge"
Creating projects_db_1    ... done
Creating projects_tor_1 ... done
Creating projects_onion_1 ... done
Creating projects_proxy_1 ... done
Creating projects_italy_1        ... done
Creating projects_benjamintoll_1 ... done
```

Ok, looking good.  Now, let's take a look at the Tor config file, `torrc`, that was created in the `tor` service.  We'll first look up its container name and execute a remote command:

```
$ docker ps
CONTAINER ID   IMAGE                COMMAND                  CREATED          STATUS          PORTS                 NAMES
cff222b37a28   projects_tor         "tor"                    19 minutes ago   Up 18 minutes                         projects_tor_1
6e9bd3232cd2   projects_italy       "php-fpm"                19 minutes ago   Up 18 minutes   9000/tcp              projects_italy_1
870eeaefecf1   nginx                "/docker-entrypoint.…"   19 minutes ago   Up 18 minutes   80/tcp                projects_benjamintoll_1
5c3639fe7138   projects_proxy       "/docker-entrypoint.…"   19 minutes ago   Up 18 minutes   0.0.0.0:80->80/tcp    projects_proxy_1
46e86502b54f   mysql                "docker-entrypoint.s…"   19 minutes ago   Up 18 minutes   3306/tcp, 33060/tcp   projects_db_1
590b13d0cfd5   nginx                "/docker-entrypoint.…"   19 minutes ago   Up 18 minutes   80/tcp                projects_onion_1
$
$ docker exec projects_tor_1 cat /etc/tor/torrc
HiddenServiceDir /var/lib/tor/benjamintoll.com
HiddenServicePort 80 onion:80
```

The `HiddenServiceDir` will contain the key pair and the hostname.  This hidden service directory and its contents were created when the `tor` binary was executed as soon as the container was instanced from its image (see the `ENTRYPOINT` directive in the `Dockerfile.tor` Dockerfile above).

Since I created a named volume bind mount to the `HiddenServiceDir` location called `onion_data`, the hidden directory, and most importantly its `hostname` file, is accessible and I can find the hostname and plug it into a [Tor browser], but this is a painful manual step.

But, how do I find the location of the `onion_data` mount on the Docker host?  Here you go:

```
$ docker volume inspect onion_data
[
    {
        "CreatedAt": "2021-03-23T23:24:28-04:00",
        "Driver": "local",
        "Labels": {
            "com.docker.compose.project": "projects",
            "com.docker.compose.version": "1.28.5",
            "com.docker.compose.volume": "onion_data"
        },
        "Mountpoint": "/var/lib/docker/volumes/onion_data/_data",
        "Name": "onion_data",
        "Options": null,
        "Scope": "local"
    }
]
```

The `Mountpoint` key value can be cherry-picked using a [Go template]:

```
$ docker volume inspect onion_data -f "{{.Mountpoint}}"
/var/lib/docker/volumes/onion_data/_data
```

Now I know how to retrieve the onion address.  Like the previous command, this is again run on the host.

```
$ sudo cat $(docker volume inspect -f "{{.Mountpoint}}" onion_data)/benjamintoll.com/hostname
56jmsa3xrujuaxkiw54qpvgbpu5jvlrj7qgbl6y6cdf3x7barils55id.onion
```

Just plug that into a Tor browser, and you should see the copy of the disruptive `benjamintoll.com` website.  Best of all, the hostname will remain the same across cluster restarts.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

# Generating a Custom Onion Address

You may be wondering how an onion address is generated.  From [the Tor v3 onion services protocol specification]:

>    The onion address of a hidden service includes its identity public key, a
>    version field and a basic checksum. All this information is then base32
>    encoded...

So, if the onion address is by definition random (since it is generated from the public key information), how can a company like [ProPublica] generate an address that includes keywords and is able to be remembered by humans ([`propub3r6espa33w.onion`])?

Lots of processing power!

Essentially, keys are generated and hashed until the desired pattern is computed.  [There are tools] to help with this, although I have not used them.

# Conclusion

As I've demonstrated, onionizing an existing or new site is easy.  It's a great way to obtain anonymity for your server!

I highly recommend reading through [the Tor onion service protocol] in the official Tor documentation.  I also did [a presentation] of the same material at the Leominster Code Meetup, which is now defunct.  Tor has provided an enormous level of security and privacy for onion services that is impressive.

# References

- [Tor onion service protocol](https://community.torproject.org/onion-services/overview/)
- [the Tor v3 onion services protocol specification](https://gitweb.torproject.org/torspec.git/tree/rend-spec-v3.txt)
- [torservers/onionize-docker](https://github.com/torservers/onionize-docker)

[Getting Italy Back Online, Part Two]: /2021/03/14/on-getting-italy-back-online-part-two/
[Italian Dictionary website]: http://italy.benjamintoll.com/
[my personal website]: http://www.benjamintoll.com/
[user-defined network]: https://docs.docker.com/network/
[onion service]: https://community.torproject.org/onion-services/
[there are many reasons]: https://docs.docker.com/network/bridge/#differences-between-user-defined-bridges-and-the-default-bridge
[Tor]: https://community.torproject.org/onion-services/setup/install/
[IP masquerading]: https://www.how-to-hide-ip.net/what-is-ip-masquerading/
[Tor browser]: https://www.torproject.org/download/
[Go template]: https://gowebexamples.com/templates/
[the Tor v3 onion services protocol specification]: https://gitweb.torproject.org/torspec.git/tree/rend-spec-v3.txt#n2135
[the Tor onion service protocol]: https://community.torproject.org/onion-services/overview/
[There are tools]: https://security.stackexchange.com/questions/29772/how-do-you-get-a-specific-onion-address-for-your-hidden-service
[a presentation]: http://www.benjamintoll.com/talks/tor.pdf
[ProPublica]: https://www.propublica.org/
[`propub3r6espa33w.onion`]: http://p53lf57qovyuvwsc6xnrppyply3vtqm7l6pcobkmyqsiofyeznfu5uqd.onion

