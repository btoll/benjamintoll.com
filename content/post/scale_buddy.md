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
- Modes of the major scale
    + Ionian
    + Dorian
    + Phrygian
    + Lydian
    + Mixolydian
    + Aeolian
    + Locrian
- Modes of the melodic scale
    + Melodic minor
    + Dorian ♭2 / Phrygian ♯6
    + Lydian augmented / Lydian ♯5
    + Lydian dominant / Lydian ♭7
    + Mixolydian ♭6
    + Locrian ♯2 / Aeolian ♭5
    + Super Locrian / altered dominant / altered

It's written in both Go and Python.  Why?  [Who knows!]

There are plans to add more, as time allows.

## Installing

Since it's a command-line tool, it's not as convenient as web application.  Deal with it!  If that's what you want, there are plenty already available online, so use one of them.  After all, I really don't care if you use this, because I didn't do it for you.  How self-centered you are.  Disgusting.

Anyway, you can use [Podman] or crappy old Docker if you don't want to install it on your system.  Using a container is generally a good option if you want to keep from having to install other people's shitty little programs.

```bash
podman pull btoll/scale-buddy:beta
```

Or, you can clone [`scale-buddy`] and install it that way.  There are no official release versions, just `beta`.  It's not on PyPi.

## Examples

```bash
$ podman run --init --rm scale-buddy:beta G
G major:
G  A  B  C  D  E  F♯
```

```bash
$ podman run --init --rm scale-buddy:beta G --with-minor
G major:
G  A  B  C  D  E  F♯

G natural minor (Aeolian):
G  A  B♭  C  D  E♭  F

G harmonic minor:
G  A  B♭  C  D  E♭  F♯

G melodic minor:
G  A  B♭  C  D  E  F♯
```

```bash
$ podman run --init --rm scale-buddy:beta G --with-minor --with-pentatonic
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

```bash
$ podman run --init --rm scale-buddy:beta --sharp F
F♯ major:
F♯  G♯  A♯  B  C♯  D♯  E♯
```

```bash
$ podman run --init --rm scale-buddy:beta --flat E
E♭ major:
E♭  F  G  A♭  B♭  C  D
```

## Algorithm

The algorithm is fairly simple.  Which means that I went through several more complex iterations before I worked out the current simplified algorithm, of course.

Basically, the tonic, or starting point, of the scale doesn't matter.  Rather, the intervals are what is important, as long as the algorithm has access to it.  Here is the `dict` that contains the current scale intervals:

<pre class="math">
var scaleIntervals = map[string][]int{
	"major":           {2, 2, 1, 2, 2, 2, 1},
	"dorian":          {2, 1, 2, 2, 2, 1, 2},
	"phrygian":        {1, 2, 2, 2, 1, 2, 2},
	"lydian":          {2, 2, 2, 1, 2, 2, 1},
	"mixolydian":      {2, 2, 1, 2, 2, 1, 2},
	"locrian":         {1, 2, 2, 1, 2, 2, 2},
	"harmonicMinor":   {2, 1, 2, 2, 1, 3, 1},
	"melodicMinor":    {2, 1, 2, 2, 2, 2, 1}, // jazz minor
	"naturalMinor":    {2, 1, 2, 2, 1, 2, 2}, // Aeolian
	"alteredDominant": {1, 2, 1, 2, 2, 2, 2},
}
</pre>

The integer refers to the number of [semitones] between the diatonic notes of the scale.

There is a lookup table that returns the number of semitones between two adjacent notes, and these semitones are then compared to the semitones of the scale interval `tuple` for the given scale type (i.e., major, harmonic minor, etc.).

Based upon simple comparisons, there is a `current_accidental` local variable that is updated and appended to the current note.  For example, if the interval between the number of semitones between the diatonic of the scale notes being compared is equal to that of the interval of the intended scale to create, then the accidental isn't changed (if the previous note is sharp, then the current note is also raised).

If the comparison is greater or less than, the note is raised or flattened, accordingly.  It's pretty simple, but as previously stated, it took me a while to get to this simplicity.  As usual, I complicate it, but then further iterations whittle it down to the least number of moving parts.

> For example, for the `E` major scale, the first interval is a whole note, or two semitones.  However, there is only one semitone between the notes `E` and `F`, so the `E` must be raised (i.e., sharped `♯`).

Note that a very cool property of scales are inversions.  For instance, the key of `B` contains five sharps: `C`, `D`, `F`, `G` and `A`, in order.  Inversely, how many flats does the key of `B♭` contain?  Well, `B` and `E`, which are the only notes that aren't raised in a `B` major scale.  This works for all scales.  Check out the [circle of fifths] for proof.  Also, [there are many great resources] on the Internets for more in-depth explanations of this neat property.

## Bonus

Scale Buddy even has its own theme song:

"Scale Buddy, Scale Buddy, more than meets the eye!"

## References

- [`scale-buddy`](https://github.com/btoll/scale-buddy)
- [Circle of Fifths](https://en.wikipedia.org/wiki/Circle_of_fifths#/media/File:Circle_of_fifths_deluxe_4.svg)

[Who knows!]: https://en.wikipedia.org/wiki/The_Shadow
[semitones]: https://en.wikipedia.org/wiki/Semitone
[circle of fifths]: https://en.wikipedia.org/wiki/Circle_of_fifths
[there are many great resources]: https://www.youtube.com/watch?v=-fErw8WPvw0
[Podman]: https://podman.io/

