+++
title = "On Let's Encrypt and Multiple Domains"
date = "2022-01-13T13:42:25Z"

+++

[Previously], we've seen how to get a [wildly popular and disruptive Italian dictionary website] back online.  This article represents the next installment of a series of articles that the renowned author Kilgore Trout likened to the successor of Harry Potter.

We'll going to look at the following issues:

- [Installing a certificate for multiple domains and subdomains](#installing-a-certificate-for-multiple-domains-and-subdomains)
- [Cleaning up the nginx configuration](#cleaning-up-the-nginx-configuration)

---

## Installing a certificate for multiple domains and subdomains

It's time for me to come clean.  During this electrifying series, I've led you, dear audience, to believe that only `benjamintoll.com` and the subdomain [`italy.benjamintoll.com`] was hosted on my server.

However, this isn't true, it's also hosting another site, [`theowlsnest.farm`].  I can only hope with the passage of time that you'll learn to forgive me.

Anyway, like the previous two, `theowlsnest.farm` is configured as a service and is part of the same Docker cluster.  In addition, it is part of the same bridge network, and most importantly, is verified using the same [DV certificate] issued by the [Let's Encrypt] [certificate authority].

Neat.

It's very easy to add this domain with the others on the same certificate, even though it's a different base domain from `benjamintoll.com`.

For example, let's take another look at how the original certificate was issued.  For reference, I discussed this in the [previous article of the series], and in it you can see the shell script and the command that was used to generate the cert.

Here's the command:

```bash
$ ./create_cert.sh \
    -d benjamintoll.com \
    -d www.benjamintoll.com \
    -d italy.benjamintoll.com \
    -e btoll@example.com \
    -p
```

The only problem is that a new certificate needs to be created anytime a new virtual server is added (i.e, an additional domain or subdomain).  Of course, this isn't a big deal because the certificates are free, but you may run into [rate limits]!

```bash
$ ./create_cert.sh \
    -d benjamintoll.com \
    -d www.benjamintoll.com \
    -d italy.benjamintoll.com \
    -d theowlsnest.farm \
    -d www.theowlsnest.farm \
    -d theowlsnestfarm.com \
    -d www.theowlsnestfarm.com \
    -e benjam72@yahoo.com \
    -p
```

> All traffic to the `theowlsnest.farm` and `theowlsnestfarm.com` domains and their `www.` subdomains is proxied to the same location.

That's it!  Not too shabby!

In fact, since the location and names of the certs shouldn't change and they're being mounted into the container, all I need to do after generating the certificate is just restart cluster:

```bash
$ docker-compose down
$ docker-compose up -d
```

So, we're able to generate a certificate to allow for many various values to be associated with it through the [Subject Alternative Name (SAN)] [X.509] extension.  Just to be clear, this isn't a feature of the Let's Encrypt CA but a feature of the format of [public key certificates].

You can also extract information about the certificate using the `x509` subcommand of the [`openssl`] tool.  The [`openssl-x509` man page] has a lot of great examples to get you started.

For example, to view the values of the SAN extension, issue the following command:

```bash
$ sudo openssl x509 -in cert.pem -noout -ext subjectAltName
X509v3 Subject Alternative Name:
    DNS:benjamintoll.com, DNS:italy.benjamintoll.com, DNS:theowlsnest.farm, DNS:theowlsnestfarm.com, DNS:www.benjamintoll.com, DNS:www.theowlsnest.farm, DNS:www.theowlsnestfarm.com
```

Of course, you can also view the details of the certificate in the browser.

## Cleaning up the nginx configuration

Now comes one of the fun parts: refactoring the nginx configuration.  Currently, all of the `server` blocks have been dumped unceremoniously in `conf.d/default.conf`, and while this works, it makes reading and understanding harder than it should be.

For example, here is the `nginx.conf` file that was installed during the installation:

```conf
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log notice;
pid        /var/run/nginx.pid;


events {
    worker_connections  1024;
}


http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    include /etc/nginx/conf.d/*.conf;
}
```

We'll see in a bit how much of the duplicated code can be moved into this block, thereby greatly simplifying the overall configuration.

Before we do, though, note the last directive before the closing brace:

`include /etc/nginx/conf.d/*.conf;`

This is what allows configurations to be parsed nginx.  Any configurations it finds will be included here in the outermost `http` block, and this allows the `server` blocks defined in `conf.d/` to inherit from the default values in the `http` block.

In addition, each `server` block can contain one or more `location` blocks.

Here is the mental model:

```conf
http {
    ...

    server {
        ...
    }

    server {
        ...
        location {
        }
    }

    server {
        ...
        location {
        }

        location {
        }

        location {
        }
    }
}
```

---

For the refactor, there are two things that should be addressed:

1. There should be some way to separate the `server` blocks by domain.
1. There are a lot of duplicate configurations in the `server` blocks with regards to [TLS].

Before we change anything, though, it's necessary to first understand some fundamentals.  This will help inform us as to the best way to proceed.

- Inherited global default values should be placed in the outermost `http` block.  For my install, this block can be found in the `nginx.conf` configuration file in `/etc/nginx/`.

- These values are inherited by the inner `server` blocks.  Their precedence, however, is higher, so the global default can be easily overridden for any particular customization.

- Enabling the `include` directive mentioned before allows us to put as many config files in `conf.d` as we want, and they are parsed in alphabetical order.  The only stipulation is that the extension be `.conf`, although you could have it `include` any directory and file extension that you'd like.

> Bear in mind that I'm only touching on some of the functionality of the nginx web server here.

With these key points in mind, let's do some refactoring.

---

Currently, the only configuration in `conf.d/` is `default.conf`.  In that file, there are `server` blocks including:

- The only block that listens on port 80.  This rewrites any requests to use TLS.  In addition, it contains a `location` block to handle `certbot` challenge requests for certificate renewals.

- Blocks for the `benjamintoll.com` domain.  This includes the `italy` subdomain and redirects for the `www` subdomain.

- Blocks for the `theowlsnest.farm` domain.  This includes redirects for the `www` subdomain.

- Blocks for the `theowlsnestfarm.com` domain.  This includes redirects for the `www` subdomain.

Here is the file structure on disk:

```bash
$ tree conf.d/
conf.d/
├── benjamintoll.conf
├── default.conf
├── theowlsnest.conf
└── theowlsnestfarm.conf
```

The name of each config file is the domain and allows for easy understanding and configuration lookup.  Each file is parsed in alphabetical order and added to the bottom of the outer `http` server block at the bottom where the `include` directive is located.

We'll just take a look at one of the files.  No matter the file, though, it's been stripped down to include the minimal config necessary, since all of the `server` blocks with the exception of one, contained the same duplicate configuration, which was moved to the `http` block to become global default configurations.

`conf.d/theowlsnest.conf`

```conf
server {
    server_name www.theowlsnest.farm;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    return 301 https://theowlsnest.farm$request_uri;
}

server {
    server_name theowlsnest.farm;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    location / {
        proxy_pass http://owlsnestfarm;
    }
}
```

Hopefully, this is self-explanatory.

Next, we'll look at the `nginx.conf` file to see where all of the duplicated configs now reside.

`nginx.conf`

```conf
http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    gzip  on;
    gzip_disable "msie6";

    # This only hides nginx version.
    server_tokens off;

    security_headers on;

    # OCSP stapling.
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4;

    # TLS.
    ssl on;
    ssl_buffer_size 8k;
    ssl_ciphers ECDH+AESGCM:ECDH+AES256:ECDH+AES128:DH+3DES:!ADH:!AECDH:!MD5;
    ssl_dhparam /etc/ssl/certs/dhparam-4096.pem;
    ssl_ecdh_curve secp384r1;
    ssl_prefer_server_ciphers on;
    ssl_protocols TLSv1.2 TLSv1.1 TLSv1;
    ssl_session_tickets off;

    ssl_certificate /etc/letsencrypt/live/benjamintoll.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/benjamintoll.com/privkey.pem;

    include /etc/nginx/conf.d/*.conf;
}
```

Prior to the refactor, all the security header and TLS directives had existed in each `server` block.  That's no bueno!  Now, it resides in only one file and is inherited by every internal `server` block.

It makes sense to put the TLS directives globally, since we obviously want to use TLS everywhere.  The only `server` block that doesn't use it is the default block that rewrites the requests to use `https`.  In that block, I've simply turned off TLS by including the directive:

```conf
ssl off;
```

It's that easy.

## Conclusion

By now, most developers should have heard of the Let's Encrypt CA and its goal of securing the Internet.  As I've shown here and in other articles, it's very easy to generate a certificate to identify your domains and encrypt your traffic.  There's no reason not to be using it.

In addition, although I've only gone into a small portion of what nginx allows you to do, it's enough to get a fundamental understanding of how the configuration files and their containing blocks work to leverage the idea of global default values that can be overridden "locally" in nested `server` blocks.

This powerful pattern allows for simple configurations that quickly, at a glance, allow one to understand its intent.  And refactoring the configurations out of one monolithic config file into "namespaced" `server` blocks further hastens understanding and eases maintainability.

## References

- [How To Configure The Nginx Web Server On a Virtual Private Server
](https://www.digitalocean.com/community/tutorials/how-to-configure-the-nginx-web-server-on-a-virtual-private-server)

[Previously]: /2021/03/13/on-getting-italy-back-online-part-one/
[wildly popular and disruptive Italian dictionary website]: https://italy.benjamintoll.com/
[`italy.benjamintoll.com`]: https://italy.benjamintoll.com/
[`theowlsnest.farm`]: https://theowlsnest.farm/
[DV certificate]: https://en.wikipedia.org/wiki/Domain-validated_certificate
[Let's Encrypt]: https://letsencrypt.org/
[certificate authority]: https://en.wikipedia.org/wiki/Certificate_authority
[previous article of the series]: /2021/03/19/on-getting-italy-back-online-part-three#create-the-certificate
[rate limits]: https://letsencrypt.org/docs/rate-limits/
[Subject Alternative Name (SAN)]: https://en.wikipedia.org/wiki/Subject_Alternative_Name
[X.509]: https://en.wikipedia.org/wiki/X.509
[public key certificates]: https://en.wikipedia.org/wiki/Public_key_certificate
[`openssl`]: https://www.openssl.org/
[`openssl-x509` man page]: https://linux.die.net/man/1/x509
[TLS]: https://en.wikipedia.org/wiki/Transport_Layer_Security
[certbot]: https://github.com/btoll/certbot

