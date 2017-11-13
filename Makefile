CC = /snap/hugo/current/bin/hugo

.PHONY: all archive build clean deploy nuke

all: clean build nuke copy archive

archive:
	( cd .. ; tar cjvf benjamintoll.com.bz2 dev )

build:
	$(CC)

clean:
	rm -rf public

nuke:
	rm -rf ../public

copy:
	cp -r public ../public
	cp -r ../archive ../public/
	cp ../img/pete.jpeg ../public/img

