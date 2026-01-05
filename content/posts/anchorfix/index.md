---
title: "Anchor Fix"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2009-09-01
aliases: [/tomsweb/AnchorFix/]
---

AnchorFix is a Greasemonkey script that I wrote to fix anchor links. This
script searches for links that have anchors and adds an anchor icon that links
to that anchor. Use case: sending a URL to someone without having to scroll to
the top to find an anchor link or worse reading the HTML source and hand
editing the URL to add the anchor. It also searches for links that link to an anchor on the current
page and signifies this by adding an anchor icon after the link text. Use case:
reading a page with a menu system at the top; some links are off site and some
are anchors to the current page. After reading the whole page which links are
worth clicking, the anchor indicates this.

First you need [Greasemonkey](https://addons.mozilla.org/firefox/addon/748)
installed then install the script. It is available [locally](AnchorFix.user.js)
or on the [userscripts](http://userscripts.org/scripts/show/56815) server.
