+++
title = "On Getting Italy Back Online, Part Three"
date = "2021-03-19T16:42:35-04:00"

+++

This is the third installment [in the series] on getting my world-famous [Italian Dictionary website] back online.  It's riveting and suspenseful and has been picked up by a major Hollywood studio for a multi-picture run.  We'll pick up where we left off in [the last exciting episode].

[Encrypting the web] is something that we should all do and prioritize, and here at `benjamintoll.com`, it's no different.  In this article, I'll walk through setting up a [Let's Encrypt] [certificate] in the Docker Compose file that I'm using for the multi-container Italian website.

> I'm not going to go into the details of how a Let's Encrypt certificate works.  This post will only focus on its implementation in the two files that need to be updated, `docker-compose.yml` and `default.conf`.

Here are the steps that are needed to be a good citizen:

1. Create a temporary nginx container to test and then create the certificate.  This temporary container doesn't need to serve any files, it just needs to have the necessary permissions to allow [`certbot`], an [ACME] client, to create the webpage for the ACME [HTTP-01 challenge] question (the most commonly used challenge).  This proves to Let's Encrypt that we own the domain.  In addition, this container must be instanced on the server that is pointed to by the [A record], and any subdomains must have [CNAME records].  If not, you'll get a giant error and no certificate.

1. Add the bind mounts in `docker-compose.yml`.

1. Update the server blocks in `default.conf`.

1. Add a cron job that will instance a container running `certbot` for certificate renewal.

> There are other ACME clients, of course, and you can find [a list of them] in the Let's Encrypt documentation.

Grab a nice [tea] or coffee and let's get started!

---

# Create the Certificate

To begin, I first need to generate the certificate that proves the ownership of the public key and thus my domain.  Let's Encrypt makes it painless to do this; it works with any web server and only needs port 80 to be exposed and accessible on the host.  Note that for my setup and the purposes of this article, I'm containerizing the temporary nginx web server and the `certbot` agent that issues the commands.

So, how does it work?  In brief, on the server, `certbot` needs permissions to be able to write a file to the public document root.  Let's Encrypt will issue a token, and then `certbot` will create a file and append that token to the page.  Here is the location:

`http://<YOUR_DOMAIN>/.well-known/acme-challenge/<TOKEN>`

Let's Encrypt will then try to download that.  If it can, this will fulfill the needed validation and I can then go on to use `certbot` to issue the commands to download the certificate.

> Let's Encrypt only issues [Domain Validation (DV) certificates].

Let's take a peek at `docker-compose.yml` and the `letsencrypt-nginx` service:

<pre class="math">
version: "3.7"

services:
  letsencrypt-nginx:
    container_name: letsencrypt-nginx
    image: nginx:latest
    ports:
      - 80:80
    volumes:
      - $HOME/certbot/nginx.conf:/etc/nginx/conf.d/default.conf
      - $HOME/certbot/www:/usr/share/nginx/html
</pre>

> Note that it's not necessary to mount a volume to the public root where files are served by the web server as long as the permissions allow `certbot` to write to it.
>
> If you receive an error such as the following, then either mount a volume where the permissions are correctly set or otherwise `chmod` the `/usr/share/nginx/html` directory.
>
>       IMPORTANT NOTES:
>        - The following errors were reported by the server:
>
>          Domain: benjamintoll.com
>          Type:   unauthorized
>          ...

---

Let's now take a gander at the shell script that can test the correctness of the `certbot` command and then generate a production certificate:

`create_cert.sh`

```
#!/bin/bash
#shellcheck disable=2086

set -e

trap cleanup EXIT

cleanup() {
    docker-compose down
}

D=()
DRYRUN=true
EMAIL=root@localhost

usage() {
    echo "$0 -d DOMAIN [ -d DOMAIN ... ] -e EMAIL -p"
    exit "$1"
}

while getopts "c:d:e:hp" opt
do
    case "$opt" in
        d)
            D+=("$OPTARG")
            ;;
        e)
            EMAIL="$OPTARG"
            ;;
        h)
            usage 0
            ;;
        p)
            DRYRUN=false
            ;;
        ?)
            echo "Invalid option: -$OPTARG."
            exit 2
            ;;
        *)
            echo "Invalid flag: -$OPTARG."
            exit 2
            ;;
    esac
done

if [ "${#D[*]}" -eq 0 ]
then
    echo "[ERROR] Missing required parameter DOMAIN"
    usage 2
fi

if $DRYRUN
then
    OPTIONS="--staging --register-unsafely-without-email"
else
    OPTIONS="--email $EMAIL --no-eff-email"
fi

for domain in "${D[@]}"
do
    LIST_DOMAINS+="$domain "
    DOMAINS+="-d $domain "
done

echo -------------------------------
echo "DOMAINS: $LIST_DOMAINS"
echo "EMAIL:   $EMAIL"
echo "DRYRUN:  $DRYRUN"
echo -------------------------------

mkdir -p letsencrypt/{etc,var/{lib,log}}

docker-compose up -d

docker run --rm -it \
    --name letsencrypt-certbot \
    -v "$(pwd)/www:/data/letsencrypt" \
    -v "$(pwd)/letsencrypt/etc/letsencrypt:/etc/letsencrypt" \
    -v "$(pwd)/letsencrypt/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -v "$(pwd)/letsencrypt/var/log/letsencrypt:/var/log/letsencrypt" \
    certbot/certbot \
    certonly --webroot \
    --agree-tos --webroot-path=/data/letsencrypt \
    $OPTIONS $DOMAINS

docker run --rm -it \
    --name letsencrypt-certbot \
    -v "$(pwd)/www:/data/letsencrypt" \
    -v "$(pwd)/letsencrypt/etc/letsencrypt:/etc/letsencrypt" \
    -v "$(pwd)/letsencrypt/var/lib/letsencrypt:/var/lib/letsencrypt" \
    certbot/certbot \
    certificates

```

And let's look at its usage:

<pre class="math">
$ ./create_cert.sh -h
./create_cert.sh -d DOMAIN [ -d DOMAIN ... ] -e EMAIL -p

<b>-d</b>   List as many domains as needed, they will be gathered into a list.
<b>-e</b>   The email address for Let's Encrypt correspondence (recommended).
<b>-p</b>   If present, the script will generate a production certificate.
     ( The `certbot` client defaults to "--staging" to test the command, i.e., <b>-p</b> is not set. )
</pre>

> Due to [rate limits], it's important to test using the default `dryrun` mode, which in turn activates `certbot`s `--staging` mode.

---

Ok, now, let's run it in `certbot`'s `staging` mode to test the commands for correctness:

```
$ ./create_cert.sh \
    -d benjamintoll.com \
    -d www.benjamintoll.com \
    -d italy.benjamintoll.com \
    -e btoll@example.com
```

You'll see logs to `stdout` that echo your choices:

<pre class="math">
-------------------------------
DOMAINS: benjamintoll.com www.benjamintoll.com italy.benjamintoll.com
EMAIL:   btoll@example.com
DRYRUN:  true
-------------------------------
</pre>

Following a successful run, it will display logs like this:

<pre class="math">
IMPORTANT NOTES:
 - Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/benjamintoll.com/fullchain.pem
   Your key file has been saved at:
   /etc/letsencrypt/live/benjamintoll.com/privkey.pem
   Your certificate will expire on 2021-06-24. To obtain a new or
   tweaked version of this certificate in the future, simply run
   certbot again. To non-interactively renew *all* of your
   certificates, run "certbot renew"
Saving debug log to /var/log/letsencrypt/letsencrypt.log

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Found the following certs:
  Certificate Name: benjamintoll.com
    Serial Number: fa091434decbf9f2b3004954fe3bcccf987b
    Key Type: RSA
    Domains: benjamintoll.com italy.benjamintoll.com www.benjamintoll.com
    Expiry Date: 2021-06-24 02:12:18+00:00 (INVALID: TEST_CERT)
    Certificate Path: /etc/letsencrypt/live/benjamintoll.com/fullchain.pem
    Private Key Path: /etc/letsencrypt/live/benjamintoll.com/privkey.pem
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
</pre>

Note the `(INVALID: TEST_CERT)` text.  This is a sanity check to alert you to that the command was run with the `--staging` dry run flag set, and this test will not count toward your rate limit.

> If it was unsuccessful, you'll notice it immediately.  The error messages are not subtle.

This will generate a directory structure similar to the following in the directory in which the command was run:

```
$ tree -d certbot
certbot
├── dh-param
├── etc
│   └── letsencrypt
│       ├── accounts
│       ├── archive
│       ├── csr
│       ├── keys
│       ├── live
│       ├── renewal
│       └── renewal-hooks
│           ├── deploy
│           ├── post
│           └── pre
└── var
    ├── lib
    │   └── letsencrypt
    └── log
        └── letsencrypt
```

Once it completes successfully, generate the production cert by setting the `-p` flag.  This will replace the test cert with the production one:

```
$ ./create_cert.sh \
    -d benjamintoll.com \
    -d www.benjamintoll.com \
    -d italy.benjamintoll.com \
    -e btoll@example.com -p
```

And that's it for this step!  Weeeeeeeeeeeeeeeeeeee

# Update `docker-compose.yml`

Next, we'll plug the changes that are needed into `docker-compose.yml`, which are simple and straightforward.  It's just necessary to mount the volumes.

Let's view the excerpted file with the new additions in <span style="color: blue;">blue</span>.

`docker-compose.yml`

<pre class="math">
version: "3.7"

services:
  ...

  proxy:
    build:
      context: dockerfiles
      dockerfile: Dockerfile.nginx
    restart: always
    depends_on:
      - db
    ports:
      - 80:80
      <span style="color: blue;">- 443:443</span>
    volumes:
      - ./projects/italy:/var/www/html:ro
      <span style="color: blue;">- ./certbot/dh-param/dhparam-4096.pem:/etc/ssl/certs/dhparam-4096.pem</span>
      <span style="color: blue;">- ./certbot/etc/letsencrypt/live/benjamintoll.com/fullchain.pem:/etc/letsencrypt/live/benjamintoll.com/fullchain.pem</span>
      <span style="color: blue;">- ./certbot/etc/letsencrypt/live/benjamintoll.com/privkey.pem:/etc/letsencrypt/live/benjamintoll.com/privkey.pem</span>

  ...
</pre>

Notes:

- Expose default port 443 for TLS.
- Mount the `fullchain.pem` and the `privkey.pem` locations into the container.  The former is a concatenation of the `chain.pem` (the intermediary CA) and the `cert.pem` (the cert that contains, among other things, the public key).  The latter is, of course, the private key.

And that's it!  The container hasn't been started yet, so no need to restart nginx.  Let's move onto the next file!  So exciting!!!

# Update `default.conf`

Most of the changes occur in the nginx `default.conf` configuration.

Here is the current state of it:

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
</pre>

Now, the changes:

<pre class="math">
server {
    listen      80;
    listen [::]:80;
    server_name italy.benjamintoll.com;                                             (1)

    location / {
        rewrite ^ https://$host$request_uri? permanent;                             (2)
    }

    # For certbot challenges (renewal process).
    location ~ /.well-known/acme-challenge {                                        (3)
        allow all;
        root /data/letsencrypt;
    }
}

server {
    server_name italy.benjamintoll.com;                                             (1)
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_tokens off;

    ssl on;

    ssl_buffer_size 8k;
    ssl_dhparam /etc/ssl/certs/dhparam-4096.pem;

    ssl_protocols TLSv1.2 TLSv1.1 TLSv1;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDH+AESGCM:ECDH+AES256:ECDH+AES128:DH+3DES:!ADH:!AECDH:!MD5;

    ssl_ecdh_curve secp384r1;
    ssl_session_tickets off;

    # <a href="https://www.ssls.com/knowledgebase/what-is-ocsp-stapling/">OCSP stapling</a>.
    ssl_stapling on;
    ssl_stapling_verify on;

    resolver 66.70.228.164 172.98.193.62;

    ssl_certificate /etc/letsencrypt/live/benjamintoll.com/fullchain.pem;           (4)
    ssl_certificate_key /etc/letsencrypt/live/benjamintoll.com/privkey.pem;         (5)

    root /var/www/html;
    index index.php index.html index.htm;

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/html;
    }

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        fastcgi_pass italy:9000;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
</pre>

Note that there are now two server blocks for both protocols (80 and 443).  In addition:

1. The server name is using the cname alias `italy`.
1. Any request coming into the unencrypted port will be rewritten for TLS.
1. There needs to be a rule to handle the [HTTP-01 challenge] for certificate renewals every 90 days.
1. The location of the `ssl_certificate` that was mounted in `docker-compose.yml`.
1. The location of the `ssl_certificate_key` that was mounted in `docker-compose.yml`.
1. Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

So, now that all of the certification generation and server configuration is done, what does the root of my project directory look like?

<pre class="math">
$ tree -L 2
.
├── certbot
│   ├── certbot.txt
│   ├── create_cert.sh
│   ├── dh-param
│   ├── docker-compose.yml
│   ├── etc
│   ├── letsencrypt-site
│   ├── nginx.conf
│   ├── var
│   └── www
├── dh-param
│   └── dhparam-4096.pem
├── docker-compose.yml
├── dockerfiles
│   ├── Dockerfile.nginx
│   ├── Dockerfile.php-fpm
│   └── default.conf
├── projects
│   └── italy
├── secrets
│   └── italy
└── sql
    └── italy.sql
</pre>

Hey, that looks awesome!  You bet it does!!

Finally, start the production site in detached mode.

```
docker-compose up -d
```

Looks like I'm all donzo.

# Conclusion

In conclusion, this is the conclusion of this fantastically informative article.  In a future article, we'll look at how to take the multi-container Italian Dictionary app and deploy it in a Kubernetes cluster.

Okey-dokey and ciao tutti.

# References

- [How to Set Up Free SSL Certificates from Let's Encrypt using Docker and Nginx](https://www.humankode.com/ssl/how-to-set-up-free-ssl-certificates-from-lets-encrypt-using-docker-and-nginx)
- [SSL Labs - SSL Server Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)

[in the series]: /2021/03/13/on-getting-italy-back-online-part-one/
[Italian Dictionary website]: https://italy.benjamintoll.com/
[the last exciting episode]: /2021/03/14/on-getting-italy-back-online-part-two/
[Encrypting the web]: https://www.eff.org/encrypt-the-web
[Let's Encrypt]: https://letsencrypt.org/
[certificate]: https://en.wikipedia.org/wiki/Public_key_certificate
[ACME]: https://en.wikipedia.org/wiki/Automated_Certificate_Management_Environment
[challenge question]: https://letsencrypt.org/docs/challenge-types/
[A record]: https://support.dnsimple.com/articles/a-record/
[CNAME records]: https://support.dnsimple.com/articles/cname-record/
[`certbot`]: https://certbot.eff.org/
[a list of them]: https://letsencrypt.org/docs/client-options/#other-client-options
[tea]: https://oliveology.co.uk/
[Domain Validation (DV) certificates]: https://letsencrypt.org/docs/faq/#general
[HTTP-01 challenge]: https://letsencrypt.org/docs/challenge-types/#http-01-challenge
[rate limits]: https://letsencrypt.org/docs/rate-limits/

