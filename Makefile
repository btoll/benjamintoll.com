CC = /snap/hugo/current/bin/hugo

.PHONY: all archive build clean copy deploy

all: clean build

archive:
	( cd .. ; rm -f benjamintoll.com.bz2 && tar cjvf benjamintoll.com.bz2 dev/content dev/config.toml dev/Makefile )

build:
	$(CC)

clean:
	rm -rf public

#cp -r ../benjamintoll.com-old ../public/archive
copy:
	rsync -avz --progress public/ /var/www/public

deploy: build copy

