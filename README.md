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

## Git `pre-commit` Hook

Download to `.git/hooks` directory and make executable:

```
wget -P .git/hooks/ \
    https://raw.githubusercontent.com/btoll/dotfiles/master/git-hub/hooks/pre-commit
chmod 755 .git/hooks/pre-commit
```

Create the new directory and add the hook:

```
mkdir .git/hooks/pre-commit.d
wget -P .git/hooks/pre-commit.d \
    https://raw.githubusercontent.com/btoll/dotfiles/master/git-hub/hooks/pre-commit.d/link-scanner.sh
```

Finally, add the hook as a local config:

```
git config --local --add hooks.pre-commit.hook link-scanner.sh
```

## CI/CD

Uses [GitHub Actions] to scan all the embedded links in the markdown files (i.e., the articles) in the repository.  Uses the [`link-scanner`] tool.

## Starting the server

### Use a simple alias

In `.bash_aliases`:

```
alias serve="( cd $HOME/projects/benjamintoll.com/public/ ; python -m http.server &> /dev/null & ) ; echo 'Server running on http://127.0.0.1:8000/'"
```

### `systemd`

Create the service unit:

`/lib/systemd/system/benjamintoll.com.service`

```
[Unit]
Description=benjamintoll.com website

[Service]
Type=simple
Restart=always
RestartSec=5s
ExecStart=python -m http.server --directory /home/btoll/projects/benjamintoll.com/public 8000

[Install]
WantedBy=multi-user.target
```

Have `systemd` reload all of its `unit` config files.  This will "tell" it about the new service:

```
$ sudo systemctl daemon-reload
```

Start the service:

```
$ sudo systemctl start benjamintoll.com
```

Start the service on boot:

```
$ sudo systemctl enable benjamintoll.com
```

> Note that I've left off the `.service` suffix.

[GitHub Actions]: https://docs.github.com/en/actions
[`link-scanner`]: https://github.com/btoll/link-scanner

