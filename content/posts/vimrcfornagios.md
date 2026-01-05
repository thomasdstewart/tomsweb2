---
title: "vimrc for nagios"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "nagios"]
categories: []
date: 2011-03-29 16:57:00
---

I use nagios to monitor servers. It's great. I just thought I would share a
quick snippet that I just put in my vimrc. It sorts the servers listed in
host_name lines so they are in alphabetical order. Put the following in your
vimrc, move your cursor over a host_name line and hit F2 and it will sort the
server list.

```
map #2 V:! sed 's/host_name//' \| sed 's/[ \t]//g' \| tr ',' '\n' \| sort \| uniq \| xargs \| sed 's/ /, /g' \| sed 's/^/\thost_name\t\t\t/'
```
