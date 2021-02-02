#!/bin/sh

set -e

BASE_URL="${BASE_URL:=/}"
DESTINATION="${DESTINATION:=/out}"
SERVE="${SERVE:=false}"
THEME="${THEME:=lithium}"

echo
echo "BASE_URL: $BASE_URL"
echo "DESTINATION: $DESTINATION"
echo "SERVE: $SERVE"
echo "THEME: $THEME"
echo

HUGO=/usr/local/bin/hugo

if ! $SERVE
then
    $HUGO --source "/src" --theme "$THEME" --destination "$DESTINATION" --baseURL "$BASE_URL"
else
    $HUGO server --source "/src" --theme "$THEME" --destination "$DESTINATION" --baseURL "$BASE_URL" --bind "0.0.0.0"
fi

