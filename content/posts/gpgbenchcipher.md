---
title: "GPG Bench Cipher"
summary: ""
authors: ["thomas"]
tags: ["blog", "gpg", "openphp", "benchmark"]
categories: []
date: 2009-10-09 16:53:00
aliases: [/tomsweb/Stuff/GPGBenchCipher/]
---

After reading depesz's great
[speeding-up-dumprestore-process](http://www.depesz.com/index.php/2009/09/19/speeding-up-dumprestore-process)
blog post, I started thinking about how to securely transfer a file from one
server to another in the fastest possible way. The problem being that scp/sftp
is slow for various reasons. ftp, http, nc, cifs, rsync are all plain text so
can be quickly discounted. I don't know if ssltunnel suffers from the same
window limitations that ssh suffers from. I guess using a dedicated VPN would do
the trick. However I liked the idea of using gpg. I was not sure which cipher to
use so I decided to run a few benchmarks to see. The results are on my site.
Once the encrypted file has been created then it can be transferred using any of
the available plain text mechanisms. I think nc or ftp have the least overhead.
