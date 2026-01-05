---
title: "Playlists"
summary: ""
authors: ["thomas"]
tags: ["music", "perl", "mp3"]
categories: []
date: 2009-05-27
---

## The Fine Art of Playlists

I make my playlists with [mkplaylist](mkplaylist). You will have to edit the
script to make it work, change $base to the base dir for all your mp3s. Then
make new makeplaylist entries, each one is for each playlist, the makeplaylist
function takes directories as parameters and it recurses into them and writes a
playlist to the right file. It also writes the extended information.
