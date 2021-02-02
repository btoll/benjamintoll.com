CC = docker
CMD = run
CWD = $(shell pwd)
FLAGS = --rm -it
BUILD_IMAGE_NAME = my_hugo
SERVE_IMAGE_NAME = my_nginx
TARGET = public

.PHONY: build clean deploy serve

build:
	$(CC) $(CMD) $(FLAGS) -v $(CWD):/src -e DESTINATION=$(TARGET) $(BUILD_IMAGE_NAME)

clean:
	rm -rf $(TARGET)

deploy: $(TARGET)
	rsync -azP $(TARGET)/ btoll@onf:/var/www/www.benjamintoll.com/

serve:
	$(CC) $(CMD) $(FLAGS) --name $(SERVE_IMAGE_NAME) -v $(CWD)/$(TARGET):/usr/share/nginx/html -p 8888:80 -d nginx

