#!/bin/sh

set -e

BASE_URL="${BASE_URL:=/}"
DESTINATION="${DESTINATION:=/out}"
THEME="${THEME:=lithium}"

echo
echo "BASE_URL: $BASE_URL"
echo "DESTINATION: $DESTINATION"
echo "THEME: $THEME"
echo

/usr/local/bin/hugo --source "/src" --theme "$THEME" --destination "$DESTINATION" --baseURL "$BASE_URL"

