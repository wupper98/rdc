#!/bin/bash

for cmd in "$@"; do {
    echo "Process \"$cmd\" started";
    $cmd & pid=$!
    PID_LIST+=" $pid";
} done

trap "kill $PID_LIST" SIGINT

echo "Processes have been launched"

wait $PID_LIST
echo
echo "All processes have completed"