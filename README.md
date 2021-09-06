## Compile

```
docker pull btoll/hugo:0.80.0
docker run --rm -e THEME=hugo-lithium-theme -e DESTINATION=public -v $HOME/projects/benjamintoll.com:/src btoll/hugo:0.80.0
```

## Build OCI Image

```
./build_and_deploy.sh -t 20210327 -t latest
```
The date is the date of the last public post.

Usually, just tagging as the `latest` is fine.

```
./build_and_deploy.sh --tagname latest --deploy
```

## Misc

### Create a New Post

```
hugo new post/intro.md
```

