CC      	= hugo
FLAGS		= -D
TARGET		= public

.PHONY: build clean deploy serve

build:
	$(CC)

clean:
	rm -rf $(TARGET)

deploy: $(TARGET)
	rsync -azP $(TARGET)/ btoll@onf:/var/www/www.benjamintoll.com/

serve:
	$(CC) serve $(FLAGS)

