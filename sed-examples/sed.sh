#!/bin/sh
# This is a Bourne shell script that removes #-type comments
# between 'begin' and 'end' words.
sed -n '
    5,15 {
        /start/,/stop/ {
             s/#.*//
             s/[ ^I]*$//
             /^$/ d
             p
        }
	}
' <"$1"

