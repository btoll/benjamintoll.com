+++
title = "On Enabling Autocompletion In Vim"
date = "2024-11-13T22:43:23-05:00"

+++

1. Compile [`Vim`] from source for Python3 support:

    ```bash
    $ git clone https://github.com/vim/vim
    $ cd vim
    $ ./configure \
        --with-features=huge \
        --enable-python3interp \
        --with-python3-config-dir=/usr/lib/python3.11/config-3.11-x86_64-linux-gnu/
    $ make
    $ sudo make install
    ```

    > To see all of the options available for configuring the binary:
    > ```bash
    > $ ./configure --help
    > ```

1. Install the packages needed to install all completers:

    ```bash
    $ sudo apt-get install build-essential cmake vim-nox python3-dev -y
    ```

    > The official docs recommend the following command to get all runtimes:
    >
    > ```bash
    > $ sudo apt-get install mono-complete golang nodejs openjdk-17-jdk openjdk-17-jre npm
    > ```

    Since I only want to get autocompletion for Go, I am not using the package manager to install it, since I want the latest.  This is a manual step that I've already done.

1. Use [`vim-plug`] to download and install the [`YouCompleteMe`] package.  Add the following line to the appropriate Vim config file (usually `.vimrc`):

    ```vim
    Plug 'ycm-core/YouCompleteMe'
    ```

    Then, still in the vim configuration file, download the plugin using the `ed` command:

    ```vim
    :PlugInstall
    ```

1. Install the Go completer:

    ```bash
    $ cd ~/.vim/plugged/YouCompleteMe/
    $ python3 install.py --go-completer
    ```

    > To install all completers:
    > ```bash
    > $ python3 install.py --all
    > ```

That's it!

## References

- [`Vim`]
- [`YouCompleteMe`]
- [`vim-plug`]

[`Vim`]: https://github.com/vim/vim
[`vim-plug`]: https://github.com/junegunn/vim-plug
[`YouCompleteMe`]: https://github.com/ycm-core/YouCompleteMe


