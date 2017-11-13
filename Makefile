CC = /snap/hugo/current/bin/hugo

.PHONY: all archive build clean deploy nuke

all: clean build

archive:
	( cd .. ; rm benjamintoll.com.bz2 && tar cjvf benjamintoll.com.bz2 dev/content dev/config.toml dev/Makefile )

build:
	$(CC)

clean:
	rm -rf public

nuke:
	rm -rf ../public

copy:
	cp -r public ../public
	cp -r ../benjamintoll.com-old ../public/archive
	cp ../img/pete.jpeg ../public/img

#div.header .container .logo {
#...
#margin-right: 15px;
#border-radius: 25%; 
#...
#}
