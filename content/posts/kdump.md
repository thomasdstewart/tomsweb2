---
title: "Kdump"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2015-05-27
aliases: [/tomsweb/Kdump/]
---

I recently had to use kdump to do some investigation into why my Lenovo W540
started crashing with recent Linux kernels. It all started when I upgraded from
Linux 3.14 to 3.16 and I started having random crashes soon after booting. Being
lazy I just ignored it and continued to use the old kernel expecting the issue
to go away. However try as I might the issue persisted in 3.17, 3.18, 3.19 and
4.0.

I tried and failed to find the issue with a git bisect, however that method led
me down a dead end as I think the issue can happen after an hour of uptime. I
think the git bisect started bisecting down the wrong side because I marked the
wrong things good and bad. I then got bored and left the issue for another few
months.

I then decided to do something about it. So I methodically compiled each kernel
by hand and ran each and recorded what worked and what didn't. I found that 3.14
was solid, 3.15 had issues with resolution but was ok, 3.16 was ok-ish and 3.17
to 4.0 were not. Sometimes booting and getting to gdm, sometimes not booting and
sometimes running for a few minutes after logging in. This confirmed what I'd
been experiencing in the past.

I decided to give kdump a try in order to capture that must be some sort of
kernel issue as the system seemed to lock up when X was running and I was
getting no output or logs.

This doubles as a quick setup guide for kdump on Debian and to document process
I went through to workaround my issue.

So, what is kexec? A very hand wavy explanation of kdump is that if the kernel
has issues, it kexecs from its current running position to a fixed area of
memory that happens to have an entire copy of Linux that's not running. With any
luck this copy of Linux runs and takes a copy of memory and saves it to disk so
that later you can look at it and see what happened. This is why I wanted it!

Arch Linux seems to have taken the spot for random Linux documentation from
Google and it's [guide](https://wiki.archlinux.org/index.php/Kdump) gives a nice
overview to complement the
[official documentation](https://www.kernel.org/doc/Documentation/kdump/kdump.txt).

Step one is to install the right packages, you need to install kdump-tools and
crash. These provide the kdump functionality and the tools to read the kernel
dumps. You also need to "-dbg" (linux-image-$(uname -r)-dbg) version of
linux-image that contains all the various debugging symbols, eg
linux-image-4.0.0-1-amd64-dbg.

Step two is to enable it. It needs some kernel parameters, so edit
/etc/default/grub and run update-grub afterwards, something like this works for
me:

```
$ grep GRUB_CMDLINE_LINUX /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash crashkernel=256M nmi_watchdog=1"
thomas@NBENG0008:~$
```

Then enabled the kdump tools by editing /etc/default/kdump-tools, without
comments I have:

```
$ egrep -v "^$|^#" /etc/default/kdump-tools
USE_KDUMP=1
KDUMP_COREDIR="/var/crash"
$
```

I also enabled sysreq by creating /etc/sysctl.d/sysrq.conf:

```
$ cat /etc/sysctl.d/sysrq.conf
kernel.sysrq = 1
$
```

Step three is to reboot to a known working kernel, check its setup ok and force
a panic to make sure it all works. So /proc/sys/kernel/sysrq and
/sys/kernel/kexec_crash_loaded should both have 1, if not then something is not
quite right.

```
$ grep . /proc/sys/kernel/sysrq /sys/kernel/kexec_crash_loaded
/proc/sys/kernel/sysrq:1
/sys/kernel/kexec_crash_loaded:1
$
```

You can trigger a panic by writing c to /proc/sysrq-trigger:

```
# echo c > /proc/sysrq-trigger
```

With any luck this will trigger panic and the system will save the Linux dump
and reboot. After the reboot you should find a new directory in /var/crash and
inside a dmesg and dump file, one is the dmesg at the panic and is the dumpfile
(eg /var/crash/201505221009/dmesg.201505221009 and
/var/crash/201505221009/dump.201505221009). Sure enough the dmesg has a panic at
the bottom:

```
$ sudo egrep "SysRq|BUG" /var/crash/201505221009/dmesg.201505221009
[  142.135864] SysRq : Trigger a crash
[  142.137034] BUG: unable to handle kernel NULL pointer dereference at           (null)
$
```

The dump file can be viewed with the crash tool:

```
$ sudo crash /usr/lib/debug/boot/vmlinux-3.14-2-amd64 /var/crash/201505221009/dump.201505221009

crash 7.0.8
Copyright (C) 2002-2014  Red Hat, Inc.
Copyright (C) 2004, 2005, 2006, 2010  IBM Corporation
Copyright (C) 1999-2006  Hewlett-Packard Co
Copyright (C) 2005, 2006, 2011, 2012  Fujitsu Limited
Copyright (C) 2006, 2007  VA Linux Systems Japan K.K.
Copyright (C) 2005, 2011  NEC Corporation
Copyright (C) 1999, 2002, 2007  Silicon Graphics, Inc.
Copyright (C) 1999, 2000, 2001, 2002  Mission Critical Linux, Inc.
This program is free software, covered by the GNU General Public License,
and you are welcome to change it and/or distribute copies of it under
certain conditions.  Enter "help copying" to see the conditions.
This program has absolutely no warranty.  Enter "help warranty" for details.

GNU gdb (GDB) 7.6
Copyright (C) 2013 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.  Type "show copying"
and "show warranty" for details.
This GDB was configured as "x86_64-unknown-linux-gnu"...

      KERNEL: /usr/lib/debug/boot/vmlinux-3.14-2-amd64
    DUMPFILE: /var/crash/201505221009/dump.201505221009  [PARTIAL DUMP]
        CPUS: 4
        DATE: Fri May 22 10:09:44 2015
      UPTIME: 00:02:22
LOAD AVERAGE: 0.45, 0.36, 0.14
       TASKS: 326
    NODENAME: NBENG0008
     RELEASE: 3.14-2-amd64
     VERSION: #1 SMP Debian 3.14.15-2 (2014-08-09)
     MACHINE: x86_64  (2693 Mhz)
      MEMORY: 15.9 GB
       PANIC: "Oops: 0002 [#1] SMP " (check log for details)
         PID: 2735
     COMMAND: "bash"
        TASK: ffff88046c5eaa60  [THREAD_INFO: ffff88046c99e000]
         CPU: 1
       STATE: TASK_RUNNING (PANIC)

crash>
```

I then rebooted to my unreliable kernel to get a dump of my issue. Sure enough
the system crashed and I got a dump! (Please note that the crash tool can be
funny about the version of Linux running, you may need to update it if it's old
and looking at a new kernel with a greater major version that it's aware of, see
Debian bug
[699367](https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=699367#51). I got a
dump!

It seems to be the PANIC and COMMAND lines that are interesting:

```
$ sudo crash /usr/lib/debug/boot/vmlinux-4.0.0-1-amd64 /var/crash/201505221035/dump.201505221035

crash 7.1.0
Copyright (C) 2002-2014  Red Hat, Inc.
Copyright (C) 2004, 2005, 2006, 2010  IBM Corporation
Copyright (C) 1999-2006  Hewlett-Packard Co
Copyright (C) 2005, 2006, 2011, 2012  Fujitsu Limited
Copyright (C) 2006, 2007  VA Linux Systems Japan K.K.
Copyright (C) 2005, 2011  NEC Corporation
Copyright (C) 1999, 2002, 2007  Silicon Graphics, Inc.
Copyright (C) 1999, 2000, 2001, 2002  Mission Critical Linux, Inc.
This program is free software, covered by the GNU General Public License,
and you are welcome to change it and/or distribute copies of it under
certain conditions.  Enter "help copying" to see the conditions.
This program has absolutely no warranty.  Enter "help warranty" for details.

GNU gdb (GDB) 7.6
Copyright (C) 2013 Free Software Foundation, Inc.
License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.  Type "show copying"
and "show warranty" for details.
This GDB was configured as "x86_64-unknown-linux-gnu"...

      KERNEL: /usr/lib/debug/boot/vmlinux-4.0.0-1-amd64
    DUMPFILE: /var/crash/201505221035/dump.201505221035  [PARTIAL DUMP]
        CPUS: 4
        DATE: Fri May 22 10:35:36 2015
      UPTIME: 00:01:16
LOAD AVERAGE: 2.44, 0.75, 0.26
       TASKS: 397
    NODENAME: NBENG0008
     RELEASE: 4.0.0-1-amd64
     VERSION: #1 SMP Debian 4.0.2-1 (2015-05-11)
     MACHINE: x86_64  (2693 Mhz)
      MEMORY: 15.9 GB
       PANIC: "BUG: unable to handle kernel paging request at ffff8805660b7ffc"
         PID: 40
     COMMAND: "kworker/0:1"
        TASK: ffff88046bb26310  [THREAD_INFO: ffff88046b528000]
         CPU: 0
       STATE: TASK_RUNNING (PANIC)

crash>
```

Next I did a little reading to try to understand what to do next! These seemed
interesting:

- http://people.redhat.com/~anderson/crash_whitepaper/
- http://www.makelinux.net/ldd3/chp-4-sect-5
- http://www.dedoimedo.com/computers/crash-analyze.html

Running a backtrace with the bt seemed interesting. It seems like the evo_wait
function inside the nouveau module dereferenced some memory causing the kernel
paging request failure (Notice that the big numbers are not just cpu registers,
some have meaning described in the above links, eg CS):

```
crash> bt
PID: 40     TASK: ffff88046bb26310  CPU: 0   COMMAND: "kworker/0:1"
 #0 [ffff88046b52b990] machine_kexec at ffffffff81050b39
 #1 [ffff88046b52b9e0] crash_kexec at ffffffff810ee06c
 #2 [ffff88046b52bab0] oops_end at ffffffff81017638
 #3 [ffff88046b52bad0] no_context at ffffffff8105c4e6
 #4 [ffff88046b52bb30] page_fault at ffffffff81566348
    [exception RIP: evo_wait+83]
    RIP: ffffffffa0406bf3  RSP: ffff88046b52bbe8  RFLAGS: 00010206
    RAX: ffff8804660b8000  RBX: 000000003fffffff  RCX: 0000000000000000
    RDX: ffff88046b52bfd8  RSI: ffff88046bb26310  RDI: ffff88046be20010
    RBP: ffff88046691f608   R8: ffff88046b528000   R9: 0000000000000000
    R10: 00000000000000ab  R11: 0000000000000450  R12: 000000004000001f
    R13: ffff88046691f708  R14: ffff880466249800  R15: 0000000000000001
    ORIG_RAX: ffffffffffffffff  CS: 0010  SS: 0018
 #5 [ffff88046b52bc10] nv50_display_init at ffffffffa04076ed [nouveau]
 #6 [ffff88046b52bc40] nouveau_display_init at ffffffffa04052da [nouveau]
 #7 [ffff88046b52bc60] nouveau_display_resume at ffffffffa0405c2a [nouveau]
 #8 [ffff88046b52bc90] nouveau_do_suspend at ffffffffa03f7e52 [nouveau]
 #9 [ffff88046b52bcd0] nouveau_pmops_runtime_suspend at ffffffffa03f86e1 [nouveau]
#10 [ffff88046b52bd00] pci_pm_runtime_suspend at ffffffff813123f0
#11 [ffff88046b52bd30] __rpm_callback at ffffffff813fa47d
#12 [ffff88046b52bd50] rpm_callback at ffffffff813fa51f
#13 [ffff88046b52bd70] rpm_suspend at ffffffff813fa675
#14 [ffff88046b52bdf0] pm_runtime_work at ffffffff813fbdaa
#15 [ffff88046b52be10] process_one_work at ffffffff81084f82
#16 [ffff88046b52be60] worker_thread at ffffffff81085ab3
#17 [ffff88046b52bed0] kthread at ffffffff8108aa41
#18 [ffff88046b52bf50] ret_from_fork at ffffffff815640d8
crash>
```

After a bit more playing I found out that you could load the module
symbols with the mod command and then show the disassembly with the c code line
numbers with the dis command:

```
crash> mod -s nouveau
     MODULE       NAME                          SIZE  OBJECT FILE
ffffffffa048d1c0  nouveau                    1298432  /lib/modules/4.0.0-1-amd64/kernel/drivers/gpu/drm/nouveau/nouveau.ko
crash>
crash> dis -l evo_wait
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 414
0xffffffffa0406ba0 <evo_wait>:  nopl   0x0(%rax,%rax,1) [FTRACE NOP]
0xffffffffa0406ba5 <evo_wait+5>:        push   %r13
0xffffffffa0406ba7 <evo_wait+7>:        push   %r12
0xffffffffa0406ba9 <evo_wait+9>:        mov    %esi,%r12d
0xffffffffa0406bac <evo_wait+12>:       push   %rbp
0xffffffffa0406bad <evo_wait+13>:       push   %rbx
0xffffffffa0406bae <evo_wait+14>:       mov    %rdi,%rbp
0xffffffffa0406bb1 <evo_wait+17>:       sub    $0x8,%rsp
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 416
0xffffffffa0406bb5 <evo_wait+21>:       mov    0x8(%rdi),%rax
0xffffffffa0406bb9 <evo_wait+25>:       mov    0x40(%rax),%rdi
0xffffffffa0406bbd <evo_wait+29>:       test   %rdi,%rdi
0xffffffffa0406bc0 <evo_wait+32>:       je     0xffffffffa0406ca8 <evo_wait+264>
0xffffffffa0406bc6 <evo_wait+38>:       callq  0xffffffff812eb2f0 <ioread32>
0xffffffffa0406bcb <evo_wait+43>:       shr    $0x2,%eax
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 418
0xffffffffa0406bce <evo_wait+46>:       lea    0x100(%rbp),%r13
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 416
0xffffffffa0406bd5 <evo_wait+53>:       mov    %eax,%ebx
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 418
0xffffffffa0406bd7 <evo_wait+55>:       mov    %r13,%rdi
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 419
0xffffffffa0406bda <evo_wait+58>:       add    %ebx,%r12d
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 418
0xffffffffa0406bdd <evo_wait+61>:       callq  0xffffffff81561cd0 <mutex_lock>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 419
0xffffffffa0406be2 <evo_wait+66>:       cmp    $0x3f7,%r12d
0xffffffffa0406be9 <evo_wait+73>:       jbe    0xffffffffa0406c78 <evo_wait+216>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 420
0xffffffffa0406bef <evo_wait+79>:       mov    0x58(%rbp),%rax
0xffffffffa0406bf3 <evo_wait+83>:       movl   $0x20000000,(%rax,%rbx,4)
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 422
0xffffffffa0406bfa <evo_wait+90>:       mov    0x8(%rbp),%rdi
0xffffffffa0406bfe <evo_wait+94>:       mov    0x40(%rdi),%rsi
0xffffffffa0406c02 <evo_wait+98>:       test   %rsi,%rsi
0xffffffffa0406c05 <evo_wait+101>:      je     0xffffffffa0406c90 <evo_wait+240>
0xffffffffa0406c0b <evo_wait+107>:      xor    %edi,%edi
0xffffffffa0406c0d <evo_wait+109>:      callq  0xffffffff812eb3c0 <iowrite32>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 423
0xffffffffa0406c12 <evo_wait+114>:      mov    0x8(%rbp),%rax
0xffffffffa0406c16 <evo_wait+118>:      xor    %ebx,%ebx
0xffffffffa0406c18 <evo_wait+120>:      mov    0x30(%rax),%rdi
0xffffffffa0406c1c <evo_wait+124>:      callq  0xffffffffa03b9970 <nv_device>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/include/nvkm/subdev/timer.h: 43
0xffffffffa0406c21 <evo_wait+129>:      mov    $0xa,%esi
0xffffffffa0406c26 <evo_wait+134>:      mov    %rax,%rdi
0xffffffffa0406c29 <evo_wait+137>:      callq  0xffffffffa036ee50 <nvkm_subdev>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 423
0xffffffffa0406c2e <evo_wait+142>:      xor    %r8d,%r8d
0xffffffffa0406c31 <evo_wait+145>:      mov    $0xffffffff,%ecx
0xffffffffa0406c36 <evo_wait+150>:      mov    $0x4,%edx
0xffffffffa0406c3b <evo_wait+155>:      mov    $0x77359400,%esi
0xffffffffa0406c40 <evo_wait+160>:      mov    %rax,%rdi
0xffffffffa0406c43 <evo_wait+163>:      callq  0xffffffffa03b6540 <nvkm_timer_wait_eq>
0xffffffffa0406c48 <evo_wait+168>:      test   %al,%al
0xffffffffa0406c4a <evo_wait+170>:      jne    0xffffffffa0406c7c <evo_wait+220>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 424
0xffffffffa0406c4c <evo_wait+172>:      mov    %r13,%rdi
0xffffffffa0406c4f <evo_wait+175>:      callq  0xffffffff81561b40 <mutex_unlock>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 425
0xffffffffa0406c54 <evo_wait+180>:      mov    0x8(%rbp),%rax
0xffffffffa0406c58 <evo_wait+184>:      mov    $0xffffffffa045fa4c,%rdx
0xffffffffa0406c5f <evo_wait+191>:      mov    $0x1,%esi
0xffffffffa0406c64 <evo_wait+196>:      mov    0x30(%rax),%rdi
0xffffffffa0406c68 <evo_wait+200>:      xor    %eax,%eax
0xffffffffa0406c6a <evo_wait+202>:      callq  0xffffffffa036ea10 <nv_printk_>
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 426
0xffffffffa0406c6f <evo_wait+207>:      xor    %eax,%eax
0xffffffffa0406c71 <evo_wait+209>:      jmp    0xffffffffa0406c83 <evo_wait+227>
0xffffffffa0406c73 <evo_wait+211>:      nopl   0x0(%rax,%rax,1)
0xffffffffa0406c78 <evo_wait+216>:      shl    $0x2,%rbx
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 432
0xffffffffa0406c7c <evo_wait+220>:      mov    %rbx,%rax
0xffffffffa0406c7f <evo_wait+223>:      add    0x58(%rbp),%rax
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 433
0xffffffffa0406c83 <evo_wait+227>:      add    $0x8,%rsp
0xffffffffa0406c87 <evo_wait+231>:      pop    %rbx
0xffffffffa0406c88 <evo_wait+232>:      pop    %rbp
0xffffffffa0406c89 <evo_wait+233>:      pop    %r12
0xffffffffa0406c8b <evo_wait+235>:      pop    %r13
0xffffffffa0406c8d <evo_wait+237>:      retq
0xffffffffa0406c8e <evo_wait+238>:      xchg   %ax,%ax
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 422
0xffffffffa0406c90 <evo_wait+240>:      xor    %ecx,%ecx
0xffffffffa0406c92 <evo_wait+242>:      xor    %edx,%edx
0xffffffffa0406c94 <evo_wait+244>:      mov    $0x4,%esi
0xffffffffa0406c99 <evo_wait+249>:      callq  0xffffffffa03681f0 <nvif_object_wr>
0xffffffffa0406c9e <evo_wait+254>:      jmpq   0xffffffffa0406c12 <evo_wait+114>
0xffffffffa0406ca3 <evo_wait+259>:      nopl   0x0(%rax,%rax,1)
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 416
0xffffffffa0406ca8 <evo_wait+264>:      xor    %edx,%edx
0xffffffffa0406caa <evo_wait+266>:      mov    $0x4,%esi
0xffffffffa0406caf <evo_wait+271>:      mov    %rax,%rdi
0xffffffffa0406cb2 <evo_wait+274>:      callq  0xffffffffa0368180 <nvif_object_rd>
0xffffffffa0406cb7 <evo_wait+279>:      jmpq   0xffffffffa0406bcb <evo_wait+43>
0xffffffffa0406cbc <evo_wait+284>:      nopl   0x0(%rax)
crash>
```

So it seems this is the point that it dies:

```
/build/linux-Xbe5gu/linux-4.0.2/drivers/gpu/drm/nouveau/nv50_display.c: 420
0xffffffffa0406bef <evo_wait+79>:       mov    0x58(%rbp),%rax
0xffffffffa0406bf3 <evo_wait+83>:       movl   $0x20000000,(%rax,%rbx,4)
```

Looking at
[nv50_display.c](http://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/tree/drivers/gpu/drm/nouveau/nv50_display.c?id=v4.0#n420)
it seems that it's this assignment that fails:

```
dmac->ptr[put] = 0x20000000;
```

dmac is actually a pointer that's passed into the evo_wait function, this is
where I stood back.

I also had a look at /var/crash/201505221035/dmesg.201505221035 and noticed that
just before the panic a nouveau error is kprintf'ed (about 60 microseconds)!

```
[   62.297649] usb 1-7: reset full-speed USB device number 2 using xhci_hcd
[   76.792370] nouveau E[     DRM] failed to idle channel 0xcccc0001 [DRM]
[   76.792430] BUG: unable to handle kernel paging request at ffff8805660b7ffc
[   76.792455] IP: [<ffffffffa0406bf3>] evo_wait+0x53/0x120 [nouveau]
```

I then did some googling for "failed to idle channel" and found freedesktop.org
bug [69488](https://bugs.freedesktop.org/show_bug.cgi?id=69488). So I added
"nouveau.runpm=0" to my boot parameters and rebooted and it's stable now!

I also filed a bug at https://bugs.freedesktop.org
[90682](https://bugs.freedesktop.org/show_bug.cgi?id=90682).
