---
title: "Wide DF"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2007-01-19
---

I've written a patch to coreutils to add a "-w" option to df to make the output
wider and on one line. Patch: [coreutils-6.7-df.patch](coreutils-6.7-df.patch)
Pre-compiled binary: [df](df)

Normal output:

```
$ ./df -h /
Filesystem            Size  Used Avail Use% Mounted on
/dev/mapper/nvme0n1p3_crypt
                      468G  370G   75G  84% /
```

New output:

```
$ ./df -hw /
Filesystem                   Size  Used Avail Use% Mounted on
/dev/mapper/nvme0n1p3_crypt  468G  370G   75G  84% /
```

Update 03/06/2020: This patch never made it in, but at some point this happened
without a wide option as the standard output now looks like:

```
$ /bin/df -h /
Filesystem                   Size  Used Avail Use% Mounted on
/dev/mapper/nvme0n1p3_crypt  468G  370G   75G  84% /
```
