---
title: "Last Logon"
summary: ""
authors: ["thomas"]
tags: ["windows"]
categories: []
date: 2010-07-08
---

Recently I needed to find a way to search for accounts in an active directory
that are enabled and have not logged on for a while. Fortunately there is a
lastLogon attribute, unfortunately this is not replicated across the various
domain controllers. Lord only knows why, but lastLogon is the number of 100 nano
second intervals since 1601, fortunately this is
[documented](<http://msdn.microsoft.com/en-us/library/ms676823(VS.85).aspx>).

To accomplish this I wrote a python script to do all this searching and just in
case this is useful for anyone else, I have made the [lastlogon](lastlogon)
script available. It will need editing before it works mind.

Time passes, 9 months in fact and a similar audit is scheduled. Of course I
completely forgot that I had written the above, so I set about to write a script
to do the above. It turned out as I was less rushed I ended up doing it more
efficiently. I now make one ldap bind to each dc in turn, whereas before I made
one ldap bind to each dc for each user! Plus the new version is slightly easier
to read. I present the improved
[enabled.and.not.loggedon](enabled.and.not.loggedon) script for all!
