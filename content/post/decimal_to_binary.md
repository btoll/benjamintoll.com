+++
title = "On Decimal To Binary"
date = "2023-03-20T00:41:53-04:00"

+++

Nothing gets me more hot and bothered than an opportunity to do some bit manipulation.  Just ask my wife.

Today, we're going to look at two different ways to convert a number in decimal into its binary representation.

- [Modulo](#modulo)
- [Bit Shifting](#bit-shifting)
- [Conclusion](#conclusion)
- [References](#references)

---

## Modulo

This is an interesting way of converting decimal to binary.  The idea is based on simple division and exploits the duality of binary:  a bit is either going to be a one or a zero.

Let's start with an undisputed fact: an even number will have a zero as its first bit, and an odd number will have a one.  So, now the question becomes:  what operation will always return either a one or a zero, irrespective of the *size* of the operand (the number) in binary?

The [modulo operator](https://en.wikipedia.org/wiki/Modulo).

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Here is the idea, broken down into steps:

1. Perform the modulo operation on the given decimal number.
1. Save this number in a data structure or a simple string (it will either be a one or a zero, of course).
1. Perform integer division on the decimal and divide it in half.
1. Repeat until the decimal number is less than or equal to zero.

Let's visualize this:

<pre class="math">
203 % 2  = <span style="font-weight: bold; color: red;">1</span>
203 // 2 = 101

101 % 2  = <span style="font-weight: bold; color: red;">1</span>
101 // 2 = 50

50 % 2   = <span style="font-weight: bold; color: red;">0</span>
50 // 2  = 25

25 % 2   = <span style="font-weight: bold; color: red;">1</span>
25 // 2  = 12

12 % 2   = <span style="font-weight: bold; color: red;">0</span>
12 // 2  = 6

6 % 2    = <span style="font-weight: bold; color: red;">0</span>
6 // 2   = 3

3 % 2    = <span style="font-weight: bold; color: red;">1</span>
3 // 2   = 1

1 % 2    = <span style="font-weight: bold; color: red;">1</span>
1 // 2   = 0
</pre>

Look at the results of all of the modulo operations (highlighted in red).  If we collect all of them in order and then **reverse** it, it gives the binary representation of decimal 203:

`1100 1011`

Clearly, one of the important things to remember when calculating the binary representation using this algorithm is to either reverse the final result or to have used a `queue` data structure.

Here is another way of visualizing it:

<pre class="math">
203 // 2 = 101, remainder 1
101 // 2 =  50, remainder 1
 50 // 2 =  25, remainder 0
 25 // 2 =  12, remainder 1
 12 // 2 =   6, remainder 0
  6 // 2 =   3, remainder 0
  3 // 2 =   1, remainder 1
  1 // 2 =   0, remainder 1
</pre>

Again, the result is `1100 1011`.

Let's look at a couple of implementations.

### Implementations

Here are both recursive and iterative implementations.

#### Python

```
def decimalToBinary(num, binary_string=""):
    if num == 0:
        return binary_string
    binary_string = str(num%2) + binary_string
    return r_decimalToBinary(num // 2, binary_string)


def iterativeDecimalToBinary(num):
    quotient = num
    binary_string = ""
    while True:
        binary_string = str(quotient%2) + binary_string
        quotient = quotient//2
        if quotient == 0:
            return binary_string


print(decimalToBinary(203))
print(r_decimalToBinary(203))
```

#### Golang

```
package main

import (
	"fmt"
	"strconv"
)

func DecimalToBinary(dec int, byteString string) string {
	if dec == 0 {
		return byteString
	}
	byteString = strconv.Itoa(dec%2) + byteString
	return DecimalToBinary(dec/2, byteString)
}

func IterativeDecimalToBinary(dec int) string {
	binaryString := ""
	quotient := dec
	for {
		binaryString = strconv.Itoa(quotient%2) + binaryString
		quotient /= 2
		if quotient == 0 {
			return binaryString
		}
	}
}

func main() {
	fmt.Println(DecimalToBinary(203, ""))
	fmt.Println(IterativeDecimalToBinary(203))
}
```

weeeeeeeeeeeeeeeeeeeeeeee

## Bit Shifting

Here's another look at these Go functions.  This time, we'll show another way to convert a decimal number to its binary representation using a bitwise [right shift](https://en.wikipedia.org/wiki/Arithmetic_shift).

Here is the idea, broken down into steps:

1. Decide on the number of bits that will represent the number.  For the example below, I've chosen numbers that will fit into one byte, so I use 8 bits.
    > You'll notice that only 7 bits are used in the functions below.  This is because the number actually represents the number of right shifts to make, which is `1 byte - 1 bit`.
    >
    > In a real implementation, this calculation will be made internally and not be a burden on the caller.
    >
    > See the [`asbits`](https://github.com/btoll/tools/tree/master/c/asbits) tool.  Written in C, the internal statment that calculates the number of right shifts to perform depends on the number of display bytes and the size of an `unsigned integer`:
    >
    > ```
    > int numBitsToRightShift = numDisplayBytes * sizeof(unsigned) - 1;
    > ```
1. Perform a number of right shifts on the decimal number in decreasing order and `AND` it with the number one.  This will have the desired effect of getting a one or a zero and in the correct representational order.
1. Repeat until the value of `numBitsToRightShift` is less than zero.

Let's visualize this:

<pre class="math">
/*
 * Start at the first bit and move out.
 * For each shift, only the bit in the first position is considered.
 *
 * For example:
 *
 *      asbits 203 2
 *
 *          (valueToConvert >> numBitsToRightShift) & 1
 *
 *              203 >> 7 == 1              1 & 1
 *              203 >> 6 == 3             11 & 1
 *              203 >> 5 == 6            110 & 1
 *              203 >> 4 == 12          1100 & 1
 *              203 >> 3 == 25         11001 & 1
 *              203 >> 2 == 50        110010 & 1
 *              203 >> 1 == 101      1100101 & 1
 *              203 >> 0 == 203     11001011 & 1
 *
 *      returns => 1100 1011
 *
 */
</pre>

One of the nice things about this method is that, unlike the previous method that relies upon the modulo operator, the result doesn't need to be reversed.

As each right shift is completed, the result is appended to the data structure (or string) since they are calculated in order.

### Implementations

This time we're only look at an implementation in Go, since it is the superior language.

Here is both a recursive and an iterative implementation.

#### Golang

```
package main

import (
	"fmt"
	"strconv"
)

func DecimalToBinary(dec, numBitsToRightShift int, byteString string) string {
	if numBitsToRightShift < 0 {
		return byteString
	}
	byteString += strconv.Itoa(dec >> numBitsToRightShift & 1)
	return DecimalToBinary(dec, numBitsToRightShift-1, byteString)
}

func IterativeDecimalToBinary(dec int) string {
	binaryString := ""
	numBitsToRightShift := 7
	for numBitsToRightShift >= 0 {
		binaryString += strconv.Itoa(dec >> numBitsToRightShift & 1)
		numBitsToRightShift -= 1
	}
	return binaryString
}

func main() {
	fmt.Println(DecimalToBinary(203, 7, ""))
	fmt.Println(IterativeDecimalToBinary(203))
}
```

## Conclusion

After some serious thought and contemplation, I have concluded that this is a damn fine article.

## References

- [`asbits`](https://github.com/btoll/tools/tree/master/c/asbits)


