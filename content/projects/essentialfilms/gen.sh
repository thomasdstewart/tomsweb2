#!/bin/bash -x
sed -i '/|Title|/,$d' index.md
./getimdb.py >> index.md
