+++
title = "On Scale Buddy"
date = "2022-10-26T00:36:08Z"

+++

## What the ... ?

Do you ever feel blue?  Ever feel like you don't have a pal in the whole, wide world?  I know I do.

Well, I have great news!  Scale Buddy is here, and he is a comfort!  Also, he's pretty good at answering questions about scales.

Currently, Scale Buddy is in beta.  I'll update here as the project progresses, because I'm not done, just done for now.

## About

I get tired of looking shit up online.  Also, I'm a command-line geek.  So, like I have many times before, I employed technology in the service of learning.

Learning what?  Well, scales, dummy!  Scale Buddy currently supports the following scales:

- Major
- Harmonic minor
- Melodic minor
- Natural minor (Aeolian mode)
- Major pentatonic
- Minor pentatonic

It's written in Python.  Why?  [Who knows!]

There are plans to add more, as time allows.

## Installing

Since it's a command-line tool, it's not as convenient as web application.  Deal with it!  If that's what you want, there are plenty already available online, so use one of them.  After all, I really don't care if you use this, because I didn't do it for you.  How self-centered you are.  Disgusting.

Anyway, you can use crappy old Docker if you don't want to install it on your system.  Using a container is generally a good option if you want to keep from having to install other people's shitty little programs.

```
docker pull btoll/scale_buddy:beta
```

Or, you can clone [the GitHub repository] and install it that way.  There are no official release versions, just `beta`.  It's not on PyPi.

## Examples

```
$ docker run --init --rm scale_buddy:beta G
G major:
G  A  B  C  D  E  F♯
```

```
$ docker run --init --rm scale_buddy:beta G --with-minor
G major:
G  A  B  C  D  E  F♯

G natural minor (Aeolian):
G  A  B♭  C  D  E♭  F

G harmonic minor:
G  A  B♭  C  D  E♭  F♯

G melodic minor:
G  A  B♭  C  D  E  F♯
```

```
$ docker run --init --rm scale_buddy:beta G --with-minor --with-pentatonic
G major:
G  A  B  C  D  E  F♯

G natural minor (Aeolian):
G  A  B♭  C  D  E♭  F

G harmonic minor:
G  A  B♭  C  D  E♭  F♯

G melodic minor:
G  A  B♭  C  D  E  F♯

G major pentatonic:
G    A    B    D    E

G minor pentatonic scale:
G    B♭    C    D    F
```

For sharps and flats, there are the `--sharp` and `--flat` switches, respectively:

```
$ docker run --init --rm scale_buddy:beta --sharp F
F♯ major:
F♯  G♯  A♯  B  C♯  D♯  E♯
```

```
$ docker run --init --rm scale_buddy:beta --flat E
E♭ major:
E♭  F  G  A♭  B♭  C  D
```

## Algorithm

The algorithm is fairly simple.  Which means that I went through several more complex iterations before I worked out the current simplified algorithm, of course.

Basically, the tonic, or starting point, of the scale doesn't matter.  Rather, the intervals are what is important, as long as the algorithm has access to it.  Here is the `dict` that contains the current scale intervals:

<pre class="math">
scale_intervals = {
    "major": ( 2, 2, 1, 2, 2, 2, 1 ),
    "harmonic_minor": ( 2, 1, 2, 2, 1, 3, 1 ),
    "melodic_minor": ( 2, 1, 2, 2, 2, 2, 1 ),
    "natural_minor": ( 2, 1, 2, 2, 1, 2, 2 ), # aeolian
}
</pre>

The integer refers to the number of [semitones] between the diatonic notes of the scale.

There is a lookup table that returns the number of semitones between two adjacent notes, and these semitones are then compared to the semitones of the scale interval `tuple` for the given scale type (i.e., major, harmonic minor, etc.).

Then, it's simply a matter of adjusting the lookup table by adding or subtracting by the number of semitones needed to satisfy the scale interval `tuple`.

For example, for the `E` major scale, the first interval is a whole note, or two semitones.  However, there is only one semitone between the notes `E` and `F`, so the `E` must be raised (i.e., sharped `♯`) and then the next note in the lookup table would be subtracted by one to accomodate this.  One can think of it as "taking" a semitone from the next pair of notes and giving it the current ones to satisfy the interval specified by the scale interval `tuple`.

Note a couple of things:

- The identity of the next pair of notes that is giving up or having a semitone taken from it doesn't need to be known for this to work.

- Also, this has a cascading effect if the next pair of notes is two semitones.  For instance, now that it had a semitone subtracted from its total, it will need to take a semitone from **its** next pair of notes.  This will be repeated until the scale interval type reaches a pair of notes that is only separated by one semitone, such as the `B`/`C` and `E`/`F` note pairs in a `C` major scale, at which point the stealing of semitones stops.

- A very cool property of scales are inversions.  For instance, the key of `B` contains five sharps: `C`, `D`, `F`, `G` and `A`, in order.  Inversely, how many flats does the key of `B♭` contain?  Well, `B` and `E`, which are the only notes that aren't raised in a `B` major scale.  This works for all scales.  Check out the [circle of fifths] for proof.  So, because of this neat property, we don't need to work out any scales for which the tonic is sharp or flat; we just need to find its inverse!  So cool!

## Bonus

Scale Buddy even has its own theme song:

"Scale Buddy, Scale Buddy, more than meets the eye!"

## References

- [Scale Buddy](https://github.com/btoll/scale_buddy)
- [Circle of Fifths](https://en.wikipedia.org/wiki/Circle_of_fifths#/media/File:Circle_of_fifths_deluxe_4.svg)

[Who knows!]: https://en.wikipedia.org/wiki/The_Shadow
[the GitHub repository]: https://github.com/btoll/scale_buddy
[semitones]: https://en.wikipedia.org/wiki/Semitone
[circle of fifths]: https://en.wikipedia.org/wiki/Circle_of_fifths

