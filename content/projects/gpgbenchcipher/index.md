---
title: "GPG Bench Cipher"
summary: ""
authors: ["thomas"]
tags: ["linux", "pgp"]
categories: []
date: 2009-10-09
---

I benchmarked a few of the gpg ciphers. I created a 1GB file from /dev/urandom
with dd. Running "gpg --version" gives a list of available ciphers. I then ran
"time cat test | gpg --symmetric --cipher-algo TWOFISH > test.enc" for each
cipher to see how fast they all were. It's not amazingly accurate but it gave a
good indication which one to avoid! I ran this on my "Intel(R) Core(TM)2 CPU
6400 @ 2.13GHz", 2.6.30 gives this 4256 bogomips for what it's worth. Anyway, on
with the results.

| Cipher   | Time      |
| -------- | --------- |
| 3DES     | 2m26.740s |
| CAST5    | 1m29.993s |
| BLOWFISH | 1m31.629s |
| AES      | 1m26.921s |
| AES192   | 1m31.041s |
| AES256   | 1m33.717s |
| TWOFISH  | 1m28.190s |

I also ran a new file of the same size but just zeros. The results were all more
or less the same, I'm not sure why the times are so much shorter, I guess all the
algorithms are good at optimizing zeros. Also dd takes about 15 seconds to write
a 1G file "time echo $(dd if=/dev/zero bs=1M count=1024 of=test; sync)", this
equates to about 70MB/s write speed which sounds in the right ballpark.

| Cipher   | Time      |
| -------- | --------- |
| 3DES     | 0m25.998s |
| CAST5    | 0m26.112s |
| BLOWFISH | 0m25.927s |
| AES      | 0m27.275s |
| AES192   | 0m27.265s |
| AES256   | 0m26.926s |
| TWOFISH  | 0m27.481s |

So don't use 3DES, otherwise they are all pretty much the same. To improve it
more I should probably make an effort to idle the CPU and make the file a
lot bigger or store the file in ram, but I can't be bothered.
