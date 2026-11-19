#!/bin/bash
cd "$(dirname "$0")"

# Source - https://stackoverflow.com/a/22432604
# Posted by caktux, modified by community. See post 'Timeline' for change history
# Retrieved 2026-11-19, License - CC BY-SA 4.0

declare -a paths=("P2/Maths/SM301" "P2/Maths/SM302" "P2/Physique/SP303")

arraylength=${#paths[@]}

for (( i=0; i<${arraylength}; i++ ));
do
  echo "copying ${paths[$i]}"
  cp "../cours/${paths[$i]}/images/"* "P${paths[$i]:1:1}/images"
done
