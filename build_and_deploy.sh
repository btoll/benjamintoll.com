#!/usr/bin/env bash
#shellcheck disable=1087

# Example: ./build_and_deploy.sh --tagname latest --deploy

GREEN_FG=$(tput setaf 2 2>/dev/null)
RED_FG=$(tput setaf 1 2>/dev/null)
END_FG_COLOR=$(tput sgr0 2>/dev/null)

DEPLOY=false
DOCKER_ID=btoll
FULL_IMAGE_NAME=
IMAGE_NAME=benjamintoll.com
TAG_NAME=()

while [ "$1" != "" ]; do
    case "$1" in
        -n | --name)
            shift
            IMAGE_NAME="$1"
            ;;
        -d | --deploy)
            DEPLOY=true
            ;;
        -t | --tagname)
            shift
            TAG_NAME+=("$1")
            ;;
        *)
            echo "Unknown option" "$1"
            exit 1
            ;;
    esac
    shift
done

build_image () {
    # Get the effective user ID and pass it as the USER env var in the container:
    #     $ id -u $USER
    #     1000
    # The container doesn't have a `btoll` user, for example, so it will use 1000
    # as the owner in the container which will map to the `btoll` user on the host.
    if ! docker run --rm -it -e USER="$(id -u "$USER")" -v "$(pwd)":/src btoll/hugo:0.80.0
#    if ! systemd-nspawn --machine hugo --quiet
    then
        echo -e "\n$RED_FG[$0]$END_FG_COLOR The $FULL_IMAGE_NAME site could not be generated."
        exit 1
    fi

    if ! docker build -t "$FULL_IMAGE_NAME" .
    then
        echo -e "\n$RED_FG[$0]$END_FG_COLOR The image $FULL_IMAGE_NAME could not be built."
        exit 1
    fi

    echo -e "\n$GREEN_FG[$0]$END_FG_COLOR Successfully built $FULL_IMAGE_NAME."
}

for item in ${TAG_NAME[*]}
do
    FULL_IMAGE_NAME="$DOCKER_ID/$IMAGE_NAME:$item"

    build_image

    if $DEPLOY
    then
        if ! docker push "$FULL_IMAGE_NAME"
        then
            echo -e "\n$RED_FG[$0]$END_FG_COLOR \`docker push\` failed for $FULL_IMAGE_NAME"
            exit 1
        fi
        echo -e "\n$GREEN_FG[$0]$END_FG_COLOR Successfully pushed $FULL_IMAGE_NAME to Docker Hub."
    fi
done

if $DEPLOY
then
    if ! ssh onf "docker-compose pull && docker-compose up -d"
    then
        echo -e "\n$RED_FG[$0]$END_FG_COLOR Remote command execution failed to pull new image(s)."
        exit 1
    else
        echo -e "\n$GREEN_FG[$0]$END_FG_COLOR Remote command execution successfully pulled new image(s)."
    fi
fi

echo "$GREEN_FG[$0]$END_FG_COLOR Operations completed with no failures."

