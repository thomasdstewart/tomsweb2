---
title: "Open PGP"
summary: ""
authors: ["thomas"]
tags: ["pgp"]
categories: []
date: 2014-03-19
---

I have migrated to a new Open PGP key please read my
[transition](transition.txt.asc) statement.

Old Key:

```
pub   1024D/68A70C48 2003-02-11 [expires: 2014-03-19]
      Key fingerprint = DCCD 7DCB A74A 3E3B 60D5  DF4C FC1D 1ECA 68A7 0C48
uid       [ultimate] Thomas Stewart <thomas@stewarts.org.uk>
```

New Key:

```
pub   4096R/CD617CF2 2013-03-18 [expires: 2016-03-18]
      Key fingerprint = 217D 695D ACE2 AE40 F9FE  B0C0 85C8 5556 CD61 7CF2
uid       [ultimate] Thomas Stewart <thomas@stewarts.org.uk>
```

[public-key.asc](public-key.asc) (both public keys locally hosted)
[Old Public Key (from key server)](http://pgp.surfnet.nl:11371/pks/lookup?op=get&fingerprint=on&search=0xFC1D1ECA68A70C48)
[New Public Key (from key server)](http://pgp.surfnet.nl:11371/pks/lookup?op=get&fingerprint=on&search=/0x85C85556CD617CF2)

[Key info for thomas@stewarts.org.uk](http://pgp.surfnet.nl:11371/pks/lookup?op=vindex&fingerprint=on&search=thomas@stewarts.org.uk)

[Old Key Stats](http://pgp.cs.uu.nl/mk_path.cgi?STAT=68A70C48+&STATS=statistics)
[New Key Stats](http://pgp.cs.uu.nl/mk_path.cgi?STAT=CD617CF2+&STATS=statistics)

Some excellent Open PGP resources and help:

- https://we.riseup.net/riseuplabs+paow/openpgp-best-practices
- http://ekaia.org/blog/2009/05/10/creating-new-gpgkey/
- http://www.apache.org/dev/openpgp.html
- http://www.apache.org/dev/key-transition.html
- http://www.debian-administration.org/users/dkg/weblog/48
- http://keyring.debian.org/creating-key.html
