---
title: "Extra IDE"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2009-11-04
aliases: [/tomsweb/ExtraIDE/]
---

ExtraIDE is a patch to the Linux kernel to enable more than the standard 20 IDE
disk drives in a Linux system, as each IDE controller that is driven by the old
style drivers be it PATA or SATA (ie not libata). Each IDE channel takes up two
drive slots and letters even if the physical card has only one sata disk per
channel attached. This severely limits the total IDE disks in one system. This
patch adds four extra major device numbers and the necessary bits to extend past
ide[0-9] and hda[a-t] to ide[0-9a-d] and hda[a-zA]. The real fix is to improve
the libata drivers to include support for my old broken controllers or upgrade
to new sata controllers. In any case I have actually run with some form of this
patch for the best part of 3 years. It was never really worth submitting to the
main line, but I did [post](http://thread.gmane.org/gmane.linux.kernel/392817)
it to the LKML.

- [extraide-2.6.15.patch](extraide-2.6.15.patch)
- [extraide-2.6.29.4.patch](extraide-2.6.29.4.patch)
