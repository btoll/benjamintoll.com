+++
title = "On Fortunes Won and Lost"
date = "2021-04-16T23:35:41-04:00"

+++

Now that I have you here after tricking you with a gimmicky title, let's discuss something super-fun: the Unix [`fortune`] program.  This is a beauty of a program that I use to greet me every time I login or open a new terminal.  It makes me feel like I can keep going, if just for one more day.

Here are the bits from my [`.bashrc`]:

<pre class="math">
# If a fortune program is installed.
if which fortune > /dev/null
then
    if which cowsay > /dev/null
    then
        # Pipe to <a href="https://en.wikipedia.org/wiki/Cowsay">cowsay</a> for even more laughs.
        fortune -e | cowsay -W 60 -f stegosaurus
    else
        fortune
    fi
fi
</pre>

Here is a list of the installed fortune programs I have on my machine (does not print a fortune):

```
$ fortune -f
100.00% /usr/share/games/fortunes
    36.13% fortunes
    14.92% chalkboard
     5.70% starwars
    10.56% calvin
    10.73% riddles
    21.96% literature
```

Consider all fortune files equal, regardless of size, and print a fortune:

```
$ fortune -e
```

How does one acquire and create these `fortune` databases?  That's a great question, friend!

One can comb through the Internets, hunched over a keyboard and sweaty, or one can simply download them from [my GitHub `fortune` repo].

Then, follow these two simple steps.

1. Create a fortune database:

        $ strfile -c % calvin calvin.dat

2. Install the files:

        $ sudo cp calvin* /usr/share/game/fortune

That's it!  Have a nice espresso beverage and celebrate!

---

For even more "cows":

```
$ ls /usr/share/cowsay/cows
```

To choose one of those cowfiles when printing a fortune, use the `-f` flag for `cowsay`:

```
$ fortune -e | cowsay -W 60 -f pony
```

# Conclusion

Don't forget to have fun!  Learning is the spice of life!

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

```
 _________________________________________________
/ Han Solo:                                       \
|                                                 |
| Traveling through hyperspace ain't like dusting |
|                                                 |
\ crops, boy.                                     /
 -------------------------------------------------
\                             .       .
 \                           / `.   .' "
  \                  .---.  <    > <    >  .---.
   \                 |    \  \ - ~ ~ - /  /    |
         _____          ..-~             ~-..-~
        |     |   \~~~\.'                    `./~~~/
       ---------   \__/                        \__/
      .'  O    \     /               /       \  "
     (_____,    `._.'               |         }  \/~~~/
      `----.          /       }     |        /    \__/
            `-.      |       /      |       /      `. ,~~|
                ~-.__|      /_ - ~ ^|      /- _      `..-'
                     |     /        |     /     ~-.     `-. _  _  _
                     |_____|        |_____|         ~ - . _ _ _ _ _>
```

# References

- [strfile](https://linux.die.net/man/1/strfile)
- [cowsay](https://linux.die.net/man/1/cowsay)

[`fortune`]: https://en.wikipedia.org/wiki/Fortune_%28Unix%29
[`.bashrc`]: https://github.com/btoll/dotfiles/blob/master/bash/.bashrc
[my GitHub `fortune` repo]: https://github.com/btoll/fortune

