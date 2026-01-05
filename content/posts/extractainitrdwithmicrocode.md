---
title: "How to extract a initrd with a microcode header"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2014-07-14
aliases: [/tomsweb/Stuff/ExtractInitrdWithMicrocode/]
---

If you try to extract a initrd and only file some uncompressed cpio:

```
$ file /boot/initrd.img-3.14-1-amd64
/boot/initrd.img-3.14-1-amd64: ASCII cpio archive (SVR4 with no CRC)
$ cat /boot/initrd.img-3.14-1-amd64 | cpio -t
kernel
kernel/x86
kernel/x86/microcode
kernel/x86/microcode/GenuineIntel.bin
42 blocks
$
```

Don't fear, the real initrd is stored just after that in the same file. Extract
as follows:

```
$ cat /boot/initrd.img-3.14-1-amd64 | cpio -t | grep blocks
42 blocks
$
$ dd if=/boot/initrd.img-3.14-1-amd64 bs=1 skip=$(( 41*512 )) count=512 2> /dev/null | hd | grep "1f 8b 08"
00000090  1f 8b 08 00 b4 00 bd 53  00 03 ec 5b 7d 78 53 55  |.......S...[}xSU|
$
$ dd if=/boot/initrd.img-3.14-1-amd64 bs=1 skip=$(( 41*512 + 0x90 )) | file -
/dev/stdin: gzip compressed data, last modified: Wed Jul  9 09:43:32 2014, from Unix
$
$ grep COMPRESS= /etc/initramfs-tools/initramfs.conf
COMPRESS=gzip
$
$ dd if=/boot/initrd.img-3.14-1-amd64 bs=1 skip=$(( 41*512 + 0x90 )) | gunzip | cpio -i
$
$ ls
bin  conf  etc  init  lib  lib64  run  sbin  scripts
$
```
