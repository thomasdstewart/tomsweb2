---
title: "Linux MD"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2009-05-27
---

## /proc/mdstat information

Linux has a software RAID subsystem and it is called md. It is generally quite well
documented. However the md status file in the proc pseudo filesystem is not
documented at all. So this is one of those cases where you have to
[read the source](http://lxr.linux.no/linux/drivers/md/md.c#L4922) to understand
what's going on. I'll jump right in, this is what my mdstat looks like:

```
$ cat /proc/mdstat
Personalities : [raid1]
md1 : active raid1 hde2[0] hdg2[1]
        224187008 blocks [2/2] [UU]

md0 : active raid1 hde1[0] hdg1[1]
        20008832 blocks [2/2] [UU]

unused devices: < none >
$
```

- The first line is just a list of personalities that the kernel supports, and
  by personalities it means what RAID methods are available. If md is compiled
  into the kernel this list will be static, but if md is compiled as modules the
  list can change as you insert the various modules. The available personalities
  in Linux are linear, raid0, raid1, raid5 and raid6.
- The file then consists of a number of stanzas, where each one represents each
  md device. The above example shows md0 and md1.
- The array can then be either "active" or "inactive". For instance if it's raid1
  it can be active with one block device, whereas if it's raid0 and the array
  consists of two devices it will be inactive if only one is added. It can also
  have a "read-only" attribute
- In md0 section in this example the "raid1" signifies what personality the
  array is
- Next is the complete list of block devices that make up the array, in square
  brackets is the device number in the arrays superblock. There can also be an
  optional (F) next to the device, this signifies the device has failed either
  due to a read failure or manually failed with an mdadm command.
- The first thing on the next line if the arrays size in blocks.
- The rest of the line is personality dependent, for linear and raid0 it just
  shows the rounding in k and the chunk*size in k respectfully. When using raid1
  you get more useful information. First is a set of square brackets with 2
  numbers in. The first number is the number of devices in the mirror and the
  second number is the number of working devices. Next is another set of square
  brackets, this time each character represents a block device. If the character
  is a "U" then the devices is up to date, however if the character is a "*" the
  devices is not up to date. Raid5 and raid6 are similar but I can't test that.
- If the array has an available device that needs to sync, then more lines are
  shown, if not then the stanza finishes. Linux is clever about syncing devices,
  it does not interrupt normal operation or impact on performance. If arrays are
  on the same device it will only sync them one at a time. And for this reason
  "resync=DELAYED" appears when the array is queued for a sync. If the device
  happens to be re-syncing there is a little progress bar, the eta and a speed
  current speed. As a side note if you reboot before the sync is done, it is
  just started from scratch again on the next boot.

A little scary, but this is what a mdstat look like when there are failed
devices:-

```
$ cat /proc/mdstat
Personalities : [raid1]
md2 : active raid1 hde1[0] hdi1[1]
        244195904 blocks [2/2] [UU]

md1 : active raid1 hda2[0]
        2168704 blocks [2/1] [U_]

md0 : active raid1 hda1[0]
        7823552 blocks [2/1] [U_]

unused devices: < none >
$
```

This is less scary; this is sample output when an array is syncing

```
Personalities : [raid1]
md1 : active raid1 sdb3[2] sda3[0]
      214178496 blocks [2/1] [U_]
        resync=DELAYED
md0 : active raid1 sdb2[2] sda2[0]
      20008832 blocks [2/1] [U_]
      [==>..................]  recovery = 13.6% (2728704/20008832) finish=9.5min speed=30003K/sec
unused devices:
```

This is what's logged to syslog

```
Feb 17 19:13:49 localhost kernel: md: trying to hot-add unknown-block(22,1) to md0 ...
Feb 17 19:13:49 localhost kernel: md: bind
Feb 17 19:13:49 localhost kernel: RAID1 conf printout:
Feb 17 19:13:49 localhost kernel:  --- wd:1 rd:2
Feb 17 19:13:49 localhost kernel:  disk 0, wo:0, o:1, dev:hda1
Feb 17 19:13:49 localhost kernel:  disk 1, wo:1, o:1, dev:hdc1
Feb 17 19:13:49 localhost kernel: md: syncing RAID array md0
Feb 17 19:13:49 localhost kernel: md: minimum _guaranteed_ reconstruction speed: 1000 KB/sec/disc.
Feb 17 19:13:49 localhost kernel: md: using maximum available idle IO bandwidth (but not more than 200000 KB/sec) for reconstruction.
Feb 17 19:13:49 localhost kernel: md: using 128k window, over a total of 15007488 blocks.
Feb 17 19:26:15 localhost kernel: md: md0: sync done.
Feb 17 19:26:15 localhost kernel: RAID1 conf printout:
Feb 17 19:26:15 localhost kernel:  --- wd:2 rd:2
Feb 17 19:26:15 localhost kernel:  disk 0, wo:0, o:1, dev:hda1
Feb 17 19:26:15 localhost kernel:  disk 1, wo:0, o:1, dev:hdc1
```

Here is large raid5 which uses aoe components.

```
Personalities : [raid6] [raid5] [raid4]
md0 : active raid5 etherd/e1.1p1[0] sdb1[5] sda1[4] etherd/e1.3p1[3] etherd/e1.2p1[2] sdd1[1]
      4883799680 blocks level 5, 64k chunk, algorithm 2 [6/6] [UUUUUU]
      bitmap: 2/233 pages [8KB], 2048KB chunk

unused devices: <none>
```

As a side note the documentation has improved since I wrote this, the
[Linux Raid wiki](http://linux-raid.osdl.org/index.php/Linux_Raid) has some more
useful information about [mdstat](http://linux-raid.osdl.org/index.php/Mdstat).
