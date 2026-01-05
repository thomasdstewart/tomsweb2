---
title: "Greasemonkey"
summary: ""
authors: ["thomas"]
tags: ["firefox", "greasemonkey"]
categories: []
date: 2009-05-21
aliases: [/tomsweb/Greasemonkey/]
---

[Greasemonkey](http://www.greasespot.net/) is a
[Firefox]({{< relref "firefox.md" >}}) extension that lets you edit the DOM (ie
the page) on the fly after the page is downloaded and parsed, but before it is
rendered. Thus making it very easy to tweak pages slightly. For example it could
search text for text that starts with `http://` but is not a link, and replace
the text with a link to the location. This provides a very powerful way to edit
web pages on the fly.

[Dive Into Greasemonkey](http://diveintogreasemonkey.org/) is an excellent guide
for greasemonkey. It covers installing it all the way to very complex examples.

In the start most people added their scripts to a
[Wiki](http://dunck.us/collab/GreaseMonkeyUserScripts) (Dead). This soon
exploded with user contributed scripts, hundreds of them. This soon grew very
big, fortunately help was at hand and [userscripts.org](http://userscripts.org/)
(Dead) was created. It is a much better repository.

I wrote some (UPDATE: now unmaintained) greatemonkey scripts:

DLC (Dead Link Checker) - 28/10/2005 [dlc.user.js](dlc.user.js)

ScanHDPricePerGB - 21/01/2007
[ScanHDPricePerGB.user.js](ScanHDPricePerGB.user.js) [scanppg.png](scanppg.png)

IMDBRatingAdj - 03/02/2009 [IMDBRatingAdj.user.js](IMDBRatingAdj.user.js)
