---
title: "Major Filesystem Corruption"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "disk", "fsck"]
categories: []
date: 2010-10-06 10:36:00
aliases: [/tomsweb/Stuff/MajorFilesystemCorruption/]
---

On Sunday (03/10/2010) my laptop had a bad crash. The screen went blank; I could
still see the cursor and move it around, but could do nothing else. I could not
even log in on a virtual console. After I typed the user name it came straight
back with a login prompt again. I rebooted, grub loaded, Linux ran, the
initramfs loaded and started and then it moaned about not being able to mount
the root filesystem and dropped me to a prompt.

After this I decided to pull out my [GRML](http://grml.org/) recovery CD. What
happened next could only be described as major filesystem corruption. I ran the
usual "sudo fsck -C -t ext3 -f -y /dev/mapper/ikaite-root" inside a script
session to capture the output. This grew to 42M (a clean fsck is about 150k of
script output). After it finally finished I ran it again and it came back clean.
After I mounted the filesystem, there were no files left, and around 6,000
entries in lost+found. Looks like I'll be reinstalling it!

I then did some minor analysis on the fsck output. First I wanted to see what
the common errors and questions were. A quick use of sed to remove numbers
enabled me to count them up with: "cat fsck.root | sed 's/[0-9][0-9]\*//g' |
sort | uniq -c | grep -v "^ 1" | sort -n | tail -10" produces:

32901 Inode has imagic flag set. Clear? yes 34415 Illegal block number passed to
extfs_test_block_bitmap # for multiply claimed block map 36479 Inode , i_size is
, should be . Fix? yes 40991 Inode has a extra size () which is invalid 41422
Inode , i_blocks is , should be . Fix? yes 41438 Inode is in use, but has dtime
set. Fix? yes 45689 Fix? yes 61402 Illegal block # () in inode . CLEARED. 73733
Clear? yes 425742

Something else I noticed was that there were many "WARNING: PROGRAMMING BUG IN E2FSCK"!
messages; there were 23 of them!
