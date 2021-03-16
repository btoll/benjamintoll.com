+++
title = "On Getting Italy Back Online, Part Two"
date = "2021-03-14T20:02:05-04:00"

+++

In [the last article], I talked about getting [my Italian website] back online.  The strategy was to take an incremental approach, and as such the first step was to separate the technological concerns into [Ansible roles] and deploy in a [Vagrant] VM.  This was, of course, some of the most fun that I've ever had (not counting the time my brother broke my wrist in junior high), and I didn't stop there.

In this article, I'm going to talk about taking the deployment to the next level by containerizing the application using [Docker] and deploying using [Docker Compose].

Let's get started!

---

# Introducing Docker

One of the benefits of creating Ansible roles is thinking of the application not as a monolith but as separate parts in a symbiotic relationship, not unlike structuring a software project into loosely-coupled objects.  Breaking down complexity into manageable pieces makes the app much more easy to reason about and understand as well as easier to maintain and share across projects.

By its nature, Docker encourages us to think about containers as running a single process or service.  With that in mind, I want to run my application in three different containers:

- the [database](#database)
- the [webserver](#webserver)
- the [PHP-FPM](#php-fpm) service

> Though it's of course possible to run the [`PHP-FPM`] service in the same container as the [nginx] webserver, it's generally a good rule of thumb to run a single process in a container.  However, if it makes sense for a container to run multiple OS processes, then go for it.  Context is king!

## The containers

### database

Of course, since it's a PHP application, it must use MySQL.  There is no Dockerfile, as I'm using the [latest image] with no additional image layers of our own.  If you're wondering how I pass credentials to the container instance and build the database, I'll get to that when I talk about Docker Compose.

### webserver

The Dockerfile that builds the `nginx` image is very simple.  I'm using [Alpine Linux] to dramatically reduces the size of the image, and the only layer I'm adding is copying the `default.conf` to `/etc/nginx/conf.d`.  Let's first take a look at the Dockerfile:

`Dockerfile.nginx`

<pre class="math">
FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
</pre>

Two lines, not too shabby.

Now, let's look at the `default.conf` config file that defines the server blocks:

`default.conf`

<pre class="math">
server {
    listen 80;
    root /var/www/html;
    index index.php index.html index.htm;

    server_name kilgore-trout;                                              (1)

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
            return 404;                                                     (2)
        }

        # Mitigate https://httpoxy.org/ vulnerabilities.
        fastcgi_param HTTP_PROXY "";

        fastcgi_pass italy:9000;                                            (3)
        fastcgi_index index.php;

        include fastcgi_params;                                             (4)

        # SCRIPT_FILENAME parameter is used for PHP FPM determining
        # the script name. If it is not set in fastcgi_params file,
        # i.e. /etc/nginx/fastcgi_params or in the parent contexts.
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;   (5)
    }
}
</pre>

Notes:

1. Added an entry to `/etc/hosts` so `kilgore-trout` resolves to the loopback device.

        127.0.0.1	localhost
        127.0.1.1	kilgore-trout

1. Bail if the PHP script its given does not exist.
1. Pass all PHP scripts to the `PHP-FPM` process bound to port 9000 on the host `italy`.  As you'll see soon, the hostname are defined in the `docker-compose.yml` file.
1. Include all settings defined in `/etc/nginx/fastcgi_params`.
1. Define a `SCRIPT_FILENAME` setting that lets `nginx` know how to look up a file (it's not included by default in the Ubuntu distro I used for the image).

> See the notes at the bottom of the page in the [PHP FastCGI Example] for more information about all of the PHP directives above.

### PHP-FPM

With PHP development, there are multiple ways to configure the environment to interpret the scripts:

1. As an Apache module ([`mod_php`]).
    - Embedded within every thread, whether the request needs the PHP interpreter or not.
1. Using the [`PHP-CGI`] binary (usually installed via a package manager).
    - The webserver runs the PHP binary and hands it the PHP script.
    - Each time, PHP needs to read `php.ini`, set its settings and load its extensions before doing the actual work of processing the script.
1. Using the [`PHP-FPM`] service.
    - The webserver talks to `PHP-FPM` using the [FastCGI protocol].
    - There are a pool of managed workers.
    - Can communicate over `TCP`, doesn't need to be on the same server.

I'm going to be using a `PHP-FPM` server to handle the PHP requests.

Looking at the Dockerfile, it's very simple, again using an Alpine Linux image to keep the footprint light.  The only layer I'm creating is for [`mysqli` extension] support. The `PHP-FPM` server is then started.

`Dockerfile.php-fpm`

<pre class="math">
FROM php:8.0-fpm-alpine
RUN docker-php-ext-install mysqli
CMD ["php-fpm"]
</pre>

Easy peasy.

Let's now stitch everything together with [Docker Compose].

# Introducing Docker Compose

Here is what my workspace looks like, and the location from which I'll run `docker-compose up`:

    .
    ├── docker-compose.yml
    ├── dockerfiles
    │   ├── default.conf
    │   ├── Dockerfile.nginx
    │   └── Dockerfile.php-fpm
    ├── italy
    │   └── ...
    └── sql
        └── italy.sql.gz

Now, let's take a look at `docker-compose.yml`:

`docker-compose.yml`

<pre class="math">
version: "3.7"

services:
  db:
    image: mysql
    restart: always
    environment:                            (1)
      MYSQL_DATABASE: italy
      MYSQL_USER: test
      MYSQL_PASSWORD: test
      MYSQL_ROOT_PASSWORD: test
    volumes:
      - ./sql:/docker-entrypoint-initdb.d   (2)
      - italy_db_data:/var/lib/mysql

  webserver:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.nginx
    restart: always
    depends_on:
      - db
    ports:
      - 80:80
    volumes:
      - ./italy:/var/www/html:ro            (3)

  italy:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.php-fpm
    restart: always
    depends_on:
      - webserver
    volumes:
      - ./italy:/var/www/html:ro            (3)

volumes:
  italy_db_data:                            (4)
</pre>

Notes:

1. The MySQL image defines many environment variables that allow you to adjust its configuration.  For more information, see the section **Environment Variables** in the docs for the [`MySQL docker image`].
1. Any SQL contained in the `sql/` directory on the host mapped to the container's `docker-entrypoint-initdb.d/` directory will be "executed" by the `/usr/local/bin/docker-entrypoint.sh` shell script in the container.  This is how the `italy` database, created by the container, is populated when the container is started for the first time.  For more information, see the section **Initializing a fresh instance** in the docs for the [`MySQL docker image`].
1. The website location must be mounted into both the `webserver` and `italy` containers.  This is because the `webserver` must be able to know what files it's serving to be able to know to send the PHP files to the `PHP-FPM` server, and the `PHP-FPM` server needs access to those file to be able to interpret them.  Also, for security reasons, the [bind mounts], where the files are loaded out of the public root directory, are mounted as read-only.
1. By creating a [named volume], the data will persistence between container restarts (it's only created once when `docker compose up` is invoked). Note that this top-level global object must be defined.

> If you can't log into the database, you may have to change the authentication plugin to [`mysql_native_password`].  This can be done like so:
>
>       services:
>           db:
>           image: mysql
>           command: --default-authentication-plugin=mysql_native_password
>           restart: always
>           environment:
>               MYSQL_DATABASE: italy
>               MYSQL_USER: test
>               MYSQL_PASSWORD: test
>               MYSQL_ROOT_PASSWORD: test
>           volumes:
>               - ./sql:/docker-entrypoint-initdb.d
>               - italy_db_data:/var/lib/mysql

One thing you may be wondering is how do I know that the database has been created?  Well, I can see in the startup logs that the `db` service image has indeed automatically imported our SQL file to MySQL:

```
db_1            | 2021-03-16 00:15:35+00:00 [Note] [Entrypoint]: Creating database italy
db_1            | 2021-03-16 00:15:35+00:00 [Note] [Entrypoint]: Creating user test
db_1            | 2021-03-16 00:15:35+00:00 [Note] [Entrypoint]: Giving user test access to schema italy
db_1            |
db_1            | 2021-03-16 00:15:35+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/italy.sql
```

For the curious, the magical `docker-entrypoint.sh` shell script that is importing the database can be inspected by getting the container name and calling `docker exec`:

```
$ docker ps
CONTAINER ID   IMAGE                COMMAND                  CREATED          STATUS          PORTS                 NAMES
40c282514b4e   projects_italy       "docker-php-entrypoi…"   31 minutes ago   Up 28 minutes   9000/tcp              projects_italy_1
fafc13f057fe   projects_webserver   "/docker-entrypoint.…"   31 minutes ago   Up 28 minutes   0.0.0.0:80->80/tcp    projects_webserver_1
4221698a4671   mysql                "docker-entrypoint.s…"   31 minutes ago   Up 28 minutes   3306/tcp, 33060/tcp   projects_db_1
$ docker exec -it projects_db_1 cat /usr/local/bin/docker-entrypoint.sh
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

# Introducing Docker Secrets

This is great and it works perfectly, but clearly there is a pretty significant problem with this approach: the database credentials are hardcoded in the file in plaintext.  Obviously, this file cannot be checked into version control, and it's a major security flaw.

Usually, when creating [Docker secrets], the `docker secret create` command is invoked.  However, this necessitates a swarm having been created (even a one node manager swarm), and this isn't necessary for my use case.

Why?  Well, I'm creating secret files.  The secrets will still be mounted as a [`tmpfs`] in `/run/secrets/` in the container, and they'll have been securely copied to the container using [mutual TLS].

Let's see some examples.  I created five secret files.  The contents of the first four below are using the same idiotic database credentials as in the cleartext example above:

1. `db_name.txt`
    - `echo italy > secrets/italy/db_name.txt`
1. `db_user.txt`
    - `echo test > secrets/italy/db_user.txt`
1. `db_password.txt`
    - `echo test > secrets/italy/db_password.txt`
1. `db_root_password.txt`
    - `echo test > secrets/italy/db_password.txt`
1. `php_italy.txt`
    - `cp ~/italy.php secrets/italy/php_italy.txt`

Here is the contents of `php_italy.txt`:

<pre class="math">
&lt;?php
final class DB_Config {
    const DBHOST = "db";    (1)
    const DBUSER = "test";
    const DBPASS = "test";
    const DBNAME = "italy";
}
?&gt;
</pre>

Notes:

1. The `db` hostname must match the hostname in the `docker-compose.yml` file.

> You can't tell here, but the `DB_Config` PHP class is stored a level above nginx's root directory, so it's inaccessible by a rogue server process.

The commands were run in the top-level of the workspace.  Here is the new tree-view of the workspace:

    .
    ├── docker-compose.yml
    ├── dockerfiles
    │   ├── default.conf
    │   ├── Dockerfile.nginx
    │   └── Dockerfile.php-fpm
    ├── italy
    │   └── ...
    ├── secrets
    │   └── italy
    │       ├── db_name.txt
    │       ├── db_password.txt
    │       ├── db_root_password.txt
    │       ├── db_user.txt
    │       └── php_italy.txt
    └── sql
        └── italy.sql.gz

Let's now look again at the `docker-compose.yml` file with secrets support:

`docker-compose.yml`

<pre class="math">
version: "3.7"

services:
  db:
    image: mysql
    command: --default-authentication-plugin=mysql_native_password
    restart: always
    environment:                                            (1)
      MYSQL_DATABASE_FILE: /run/secrets/db_name
      MYSQL_USER_FILE: /run/secrets/db_user
      MYSQL_PASSWORD_FILE: /run/secrets/db_password
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/db_root_password
    volumes:
      - ./sql:/docker-entrypoint-initdb.d
      - italy_db_data:/var/lib/mysql
    secrets:                                                (2)
       - db_name
       - db_user
       - db_password
       - db_root_password

  webserver:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.nginx
    restart: always
    depends_on:
      - db
    ports:
      - 80:80
    volumes:
      - ./italy:/var/www/html:ro

  italy:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.php-fpm
    restart: always
    depends_on:
      - webserver
    volumes:
      - ./italy:/var/www/html:ro
    secrets:                                                (2)
       - source: php_italy
         target: /var/www/italy.php

secrets:                                                    (3)
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
  italy_db_data:
</pre>

Notes:

1. By appending `_FILE` to each of the environment variables, I'm telling the image's init script to load the sensitive secret information from the container filesystem (`/run/secrets`).  For more information, see the section **Docker Secrets** in the docs for the [`MySQL docker image`].
1. Each service is assigned its own secret(s).  I've used both the long and the short forms.  In both cases, the name of the secret maps to the global object keys.
1. The secrets must be defined at the top-level as a global object.

Finally, let's start up the app in detached mode:

```
docker-compose up -d
```

Donzo.

# Conclusion

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Next, let's look at improving the security of the application by adding a [Let's Encrypt] TLS certificate.

[the last article]: /2021/03/13/on-getting-italy-back-online-part-one/
[my Italian website]: http://italy.benjamintoll.com/
[Ansible roles]: https://docs.ansible.com/ansible/latest/user_guide/playbooks_reuse_roles.html
[Vagrant]: https://www.vagrantup.com/
[Docker]: https://docs.docker.com/
[Docker Compose]: https://docs.docker.com/compose/
[`PHP-FPM`]: https://php-fpm.org/
[nginx]: https://www.nginx.com/
[Alpine Linux]: https://www.alpinelinux.org/
[latest image]: https://hub.docker.com/_/mysql/
[`MySQL docker image`]: https://hub.docker.com/_/mysql/
[bind mounts]: https://docs.docker.com/storage/bind-mounts/
[`mod_php`]: https://www.php.net/manual/en/security.apache.php
[`PHP-CGI`]: https://www.php.net/manual/en/security.cgi-bin.php
[FastCGI protocol]: https://en.wikipedia.org/wiki/FastCGI
[`mysqli` extension]: https://www.php.net/manual/en/book.mysqli.php
[PHP FastCGI Example]: https://www.nginx.com/resources/wiki/start/topics/examples/phpfcgi/
[named volume]: https://docs.docker.com/storage/volumes/
[`mysql_native_password`]: https://dba.stackexchange.com/questions/209514/what-is-mysql-native-password
[Docker secrets]: https://docs.docker.com/engine/swarm/secrets/
[swarm]: https://docs.docker.com/engine/swarm/
[`tmpfs`]: https://en.wikipedia.org/wiki/Tmpfs
[mutual TLS]: https://en.wikipedia.org/wiki/Mutual_authentication
[Let's Encrypt]: https://letsencrypt.org/

