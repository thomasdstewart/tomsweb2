---
title: "Big Disk"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "mdadm", "aoe"]
categories: []
date: 2009-09-15 22:40:00
---

So today I played a bit with some big cheap disks. I have 3 fairly old desktops
each with 4\*1TB disks, all exported via ATA over Ethernet to a much more modern
sort of disk head. Basically it's a "build a large store on half a shoe string"
project. I've not quite got the network side of it sorted yet. Currently the
disk head's gigabit card is being saturated. On a single disk node each disk can
do about 80M read sustained. If all 4 are read at the same time it goes down to
about 50M, which is 200M in total. Which seems quite amazing for a Pentium 4
3.0Ghz. Also this seems a bit high as the PCI bus can only do 133M, I'm guessing
that the onboard sata ports are somehow separated from the extra pci sata card I
added. Interestingly one disk node can sustain 80M read from disk to the disk
head. Again this backs down to 30M if all 4 disks are read, that's 120M total, no
surprise this is saturating the gigabit link. So the major bottleneck is the
disk head. Currently max raid sync speed is 10M, ie 120M total for 12 disks.
Ideally 3 nics in the disk head would be best, but then there is no way for the
data to get to the disk head.

The /proc/mdstat seems quite impressive (slow rate due to mkfs):

```
md0 : active raid5 etherd/e3.12[12] etherd/e3.11[10] etherd/e3.10[9] etherd/e3.9[8] etherd/e2.8[7] etherd/e2.7[6] etherd/e2.6[5] etherd/e2.5[4] etherd/e1.4[3] etherd/e1.3[2] etherd/e1.2[1] etherd/e1.1[0]
      10721828480 blocks level 5, 64k chunk, algorithm 2 [12/11] [UUUUUUUUUUU_]
      [==>..................]  recovery = 13.4% (130652288/974711680) finish=158828.3min speed=87K/sec

The mkfs looks like it won't finish for ages, also there's still no definitive information about stride, stripe and other random things.

$ sudo mkfs -t ext3 -E stride=16,stripe-width=176 /dev/soda/store
mke2fs 1.41.3 (12-Oct-2008)
Filesystem label=
OS type: Linux
Block size=4096 (log=2)
Fragment size=4096 (log=2)
670121984 inodes, 2680456192 blocks
134022809 blocks (5.00%) reserved for the super user
First data block=0
Maximum filesystem blocks=0
81802 block groups
32768 blocks per group, 32768 fragments per group
8192 inodes per group
Superblock backups stored on blocks:
        32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632, 2654208,
        4096000, 7962624, 11239424, 20480000, 23887872, 71663616, 78675968,
        102400000, 214990848, 512000000, 550731776, 644972544, 1934917632,
        2560000000

Writing inode tables:  3351/81802
```
