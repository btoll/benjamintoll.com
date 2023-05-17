+++
title = "On Opaque Data Types in C"
date = "2022-08-31T04:00:27Z"

+++

- [The Big Intro](#the-big-intro)
- [Compiling](#compiling)
- [One Big Program](#one-big-problem)
- [Breaking It Apart](#breaking-it-apart)
    + [The Interface](#the-interface)
    + [The Library](#the-library)
    + [The User Program](#the-user-program)
- [Low-hanging Fruit](#low-hanging-fruit)
    + [Remove Private Functions from the Interface](#remove-private-functions-from-the-interface)
    + [Creating a `typedef`](#creating-a-typedef)
- [Creating the Opaque Data Type](#creating-the-opaque-data-type)
- [Summary](#summary)
- [References](#references)

## The Big Intro

[Opaque data types] are a method of [information hiding].

For example, it's good practice to expose a stable API to the world that won't change, and then behind this interface hide all of the complexity of the implementation of those APIs.  The implementations can then frequently change as needed without impacting the user code, because it is using the well-defined and stable public API that **does not** change.

Object-oriented languages do this through data abstraction and data encapsulation of private data members variables, methods and classes.  The C language does this through an opaque data type, where any data manipulation details are hidden and only accessible through the declared subroutines that are exposed as the public API in the header file (the interface).

One of the niceties of this pattern is that the application (user code), doesn't need to be re-compiled, as the implementation that changed is most likely going to be in a shared object.

The canonical example of an opaque data type in C is [the `FILE` type].

> Just to be clear, if someone is really determined to see what's behind the opaque data type, they will.  It's a deterrent rather than a guarantee.

Before we dig into some code, let's take a look at the `Makefile` that we'll use to compile the program.

## Compiling

`Makefile`

```make
CC=clang
CFLAGS=-g -Wall
MAIN=main.c
OBJS=person.o
BIN=person

all: $(BIN)

%.o: %.c %.h
        $(CC) $(CFLAGS) -c $< -o $@

%.o: %.c
        $(CC) $(CFLAGS) -c $< -o $@

$(BIN): $(MAIN) $(OBJS)
        $(CC) $(CFLAGS) $^ -o $@

clean:
        $(RM) -r $(OBJS) $(BIN)

```

Ok, now, let's see some code!

## One Big Program

We'll just going to use a little toy program that is intentionally small so the ideas are clearly expressed without a lot of extraneous noise.

The program is expecting to get two pieces of data from the user: name and age.  It is going to create a local variable to store this information and then print a nice message to the terminal.

The interface that the program exposes are:

- structs
    + `person`
- functions
    + `make_person`
    + `destroy_person`
    + `error`
    + `reverse`
    + `say_hello`
    + `slen`

> Yes, I know that there is a `strlen` function defined in `strings.h`.

`program.c`

```c
#include <stdlib.h>
#include <stdio.h>
#include <time.h>

struct person {
    char *name;
    int age;
    int token;
};

int generate_token() {
    srand(time(NULL));
    return rand();
}

struct person* make_person(char *name, int age) {
    struct person *p = malloc(sizeof(struct person));

    p->name = name;
    p->age = age;
    p->token = generate_token();

    return p;
}

void error(char *msg) {
    fprintf(stderr, "%s\n", msg);
    exit(-1);
}

void destroy_person(struct person *p) {
    if (p != NULL)
        free(p);
}

int slen(struct person *p) {
    if (p == NULL)
        error("slen()");

    char *s = p->name;
    int i = 0;

    while (s[i] != '\0')
        ++i;

    return i;
}

int reverse(struct person *p) {
    if (p == NULL)
        error("reverse()");

    char *s = p->name;
    int swap, i, j;
    int l = slen(p);

    for (i = 0, j = l - 1; i < j; ++i, --j) {
        swap = s[i];
        s[i] = s[j];
        s[j] = swap;
    }

    return l;
}

void say_hello(struct person *p) {
    if (p == NULL)
        error("say_hello()");

    printf("Hi %s, you are %d years of age!  Your token is %d.\n", p->name, p->age, p->token);
}

int main(int argc, char **argv) {
    if (argc != 3)
        error("Not enough arguments.");

    struct person *p = make_person(argv[1], atoi(argv[2]));
    say_hello(p);
    reverse(p);
    say_hello(p);
    destroy_person(p);
}

```

```bash
$ clang -o program program.orig.c
$ ./program
Not enough arguments.
$ ./program "Fred Moseley" 42
Hi Fred Moseley, you are 42 years of age!  Your token is 1595752298.
Hi yelesoM derF, you are 42 years of age!  Your token is 1595752298.
```

Exciting stuff.

The problem with this implementation is that there is no data abstraction.  This means that the internal workings of the `person` struct can be directly modified by the user.

For instance, the user could define a main function like this:

```c
int main(int argc, char **argv) {
    if (argc != 3)
        error("Not enough arguments.");

    struct person *p = make_person(argv[1], atoi(argv[2]));
    p->token = 55555555;

    say_hello(p);
    destroy_person(p);
}

```

```bash
$ ./program "Kilgore Trout" 42
Hi Kilgore Trout, you are 42 years of age!  Your token is 55555555.
```

Here the `person` type is exposed, so the developer can supply their own `token`, which may or may not be a problem.

Admittedly, this may not be a big deal, but it's good practice to hide these kinds of implementation details behind an opaque data type.  After all, we want them to use the code paths (the API) that we've established, not the least because it allows us to change the interface implementations without any disruption to the user (and without having to recompile the program).

Let's now look at how we can start improving the program.

## Breaking It Apart

### The Interface

The first change we'll make is to create a header file that will define the interface.  We'll move the `person` struct into it, as well as create function prototypes for all of the publicly exposed APIs:

`person.h`

```c
#ifndef PERSON_H
#define PERSON_H

struct person {
    char *name;
    char *token;
    int age;
};

struct person* make_person(char *, int);
void destroy_person(struct person *);
int generate_token(void);
void error(char *);
int reverse(struct person *);
void say_hello(struct person *);
int slen(struct person *);

#endif

```

### The Library

Secondly, we'll move the implementation into its own file:

`person.c`

```c
#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include "person.h"

int generate_token(void) {
    srand(time(NULL));
    return rand();
}

struct person* make_person(char *name, int age) {
    struct person *p = malloc(sizeof(struct person));

    p->name = name;
    p->age = age;
    p->token = generate_token();

    return p;
}

void destroy_person(struct person *p) {
    if (p != NULL)
        free(p);
}

void error(char *msg) {
    fprintf(stderr, "%s\n", msg);
    exit(-1);
}

void say_hello(struct person *p) {
    if (p == NULL)
        error("say_hello()");

	printf("Hi %s, you are %d years of age!  Your token is %d.\n", p->name, p->age, p->token);
}

int slen(struct person *p) {
    if (p == NULL)
        error("slen()");

    char *s = p->name;
    int i = 0;

    while (s[i] != '\0')
        ++i;

    return i;
}

int reverse(struct person *p) {
    if (p == NULL)
        error("reverse()");

    char *s = p->name;
    int swap, i, j;
    int l = slen(p);

    for (i = 0, j = l - 1; i < j; ++i, --j) {
        swap = s[i];
        s[i] = s[j];
        s[j] = swap;
    }

    return l;
}

```

## The User Program

Lastly, remove everything from the main program except for the `main` function entry point:

`main.c`

```c
#include <stdlib.h>
#include <stdio.h>
#include "person.h"

int main(int argc, char **argv) {
    if (argc != 3)
        error("Not enough arguments.");

    struct person *p = make_person(argv[1], atoi(argv[2]));
    say_hello(p);
    reverse(p);
    say_hello(p);
    destroy_person(p);
}

```

Looking much better:

```bash
$ tree
.
├── main.c
├── person.c
└── person.h

0 directories, 3 files
```

## Low-hanging Fruit

### Remove Private Functions from the Interface

In `person.h`, remove the `generate_token` and `slen` function prototypes.  The complete header file then looks like the following:

```c
#ifndef PERSON_H
#define PERSON_H

struct person {
    char *name;
    int age;
    int token;
};

struct person* make_person(char *, int);
void destroy_person(struct person *);
void error(char *);
int reverse(struct person *);
void say_hello(struct person *);

#endif

```

Then, in `person.c`, add the `static` keyword to the `slen` function to make it only available to that library file:

```c
static int slen(struct person *p) {
    if (p == NULL)
        error("slen()");

    char *s = p->name;
    int i = 0;

    while (s[i] != '\0')
        ++i;

    return i;
}

```

Recompile and run:

```bash
$ make
clang -g -Wall -c person.c -o person.o
clang -g -Wall main.c person.o -o person
$ ./person "Kilgore Trout" 93
Hi Kilgore Trout, you are 93 years of age!
Hi tuorT erogliK, you are 93 years of age!
```

### Creating a `typedef`

Let's name our `person` struct so we can just reference it by the name `person` instead of always prefacing it with the `struct` keyword.

So:

```c
struct person {
    char *name;
    int age;
    int token;
};

```

Becomes:

```c
typedef struct {
    char *name;
    int age;
    int token;
} person;

```

This allows us to remove the `struct` keyword everywhere it prefaces `person`.  For instance, the header file will now look like this:

```c
#ifndef PERSON_H
#define PERSON_H

typedef struct {
    char *name;
    int age;
    int token;
} person;

person* make_person(char *, int);
void destroy_person(person *);
void error(char *);
int reverse(person *);
void say_hello(person *);

#endif

```

In other words, you can remove the keyword `struct` before any instance of `person`:

<pre class="math">
<strike>struct</strike> person *p = make_person(argv[1], atoi(argv[2]));

...

<strike>struct</strike> person* make_person(char *name, int age) {
    <strike>struct</strike> person *p = malloc(sizeof(<strike>struct</strike> person));

...

int reverse(<strike>struct</strike> person *p) {

...

Etc.

</pre>

> To save space, I won't print the other two files, but make sure that you also change `main.c` and `person.c`.

## Creating the Opaque Data Type

Now that the program has been restructured and improved, creating the opaque data type is only a couple of extra simple steps.

The first is to move the `person` struct definition into the `program.c` library file and give it a name `p`:

`person.c`

```c
#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include "person.h"

typedef struct p {
    char *name;
    int age;
    int token;
} person;

int generate_token(void) {
    srand(time(NULL));
    return rand();
}

...
```

Next, remove the body of the `struct` and give it the same name `p` as we just did in the library file.  This is enough so that the function definitions will still compile.  The `p` name could have been anything, it's not going to affect the functionality of the program.

`person.h`

```c
#ifndef PERSON_H
#define PERSON_H

typedef struct p person;

person* make_person(char *, int);
void destroy_person(person *);
void error(char *);
int reverse(person *);
void say_hello(person *);

#endif

```

So, it's at this point that `person` can now be considered an opaque data type.  It's also what's known as an [incomplete type], as the compiler knows it's a type and that it's a `struct`, but it can't know its definition, as there is no `struct` body.

Recompile and run:

```bash
$ make
clang -g -Wall -c person.c -o person.o
clang -g -Wall main.c person.o -o person
$ ./person "Kilgore Trout" 93
Hi Kilgore Trout, you are 93 years of age!
Hi tuorT erogliK, you are 93 years of age!
```

Interestingly, if a developer tried futzing with the internals of the `person` type as they did before, they'll get a giant error when compiling:

```c
int main(int argc, char **argv) {
    if (argc != 3)
        error("Not enough arguments.");

    struct person *p = make_person(argv[1], atoi(argv[2]));
    p->token = 55555555;

    say_hello(p);
    destroy_person(p);
}

```

```bash
$ make
clang -g -Wall -c person.c -o person.o
clang -g -Wall main.c person.o -o person
main.c:10:6: error: incomplete definition of type 'struct p'
    p->token = 333333;
    ~^
./person.h:4:16: note: forward declaration of 'struct p'
typedef struct p person;
               ^
1 error generated.
make: *** [Makefile:16: person] Error 1
```

> The incomplete type error is because the compiler cannot figure out the size of the identifier.  This will force the user of your library to use your carefully crafted API.

Weeeeeeeeeeeeeeeeeeeeeeeeeeee

## Summary

This is an important summary and should not be skipped.

## References

- [Make your Data Type more Abstract with Opaque Types in C](https://www.youtube.com/watch?v=TsUOhPsZk6k)

[Opaque data types]: https://en.wikipedia.org/wiki/Opaque_data_type
[information hiding]: https://en.wikipedia.org/wiki/Information_hiding
[the `FILE` type]: https://www.tutorialspoint.com/what-is-data-type-of-file-in-c
[incomplete type]: https://docs.microsoft.com/en-us/cpp/c-language/incomplete-types

