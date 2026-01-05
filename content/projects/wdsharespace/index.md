---
title: "WD ShareSpace"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2009-09-01
aliases: [/tomsweb/WDShareSpace/]
---

(Update 01/09/2009 - All of the below is now not necessary as the latest
firmware has an option from the web interface to turn on remote root ssh shell
access, YAY for Western Digital!)

I recently bought a
[Western Digital ShareSpace](http://www.wdc.com/en/products/products.asp?driveid=501).
It's a larger version of the My Book World range of Products which have quite a
following at [WDMBWE](http://mybookworld.wikidot.com/start). Mine is a 4TB
version which has four 1TB drives in a raid 5 configuration giving 2.7T usable.
They all run Linux, the Share Space ones seem to have some sort of u-boot and
have the root file system on the first partition of the disks. Unfortunately
getting a shell on these boxes is a bit harder than the original devices.

Martin Hinner's method at his
[site](http://martin.hinner.info/mybook/sshaccess.php) does not work because the
firmware got a major overhaul. The original My Book World's used perl
(/auth/firmware_upgrade.pl) but the newer Share Space devices use php
(/admin/system_firmware_manual.php). My first thought was to implement a similar
hack that Martin used, amazingly Western Digital put a link to the main
[code](http://support.wdc.com/product/download.asp?groupid=901&sid=107&lang=en)
on their website. This gives all the juicy details about how the upgrade process
works.

The automatic update process gives the
[western digital webpage](http://websupport.wdc.com/firmware/list.asp?type=wda4nc&fw=2.1.1)
its version number and it returns if there is an update or not along with a link
to the
[firmware blob](http://cache.websupport.wdc.com/wda4nc40000-02.01.03.img). This
believe it or not, is a tar.gz with the 1st and 16th block swapped where blocks are
5k. Due to the way the upgrade process works there is no easy way to hook into
the upgrade process. If a manual firmware image is selected it gets downloaded and a
script on the device installs the update. If you could trick the upgrade process
into thinking it is a service pack update it will run a pre-install script
inside the firmware blob. However the service pack install file (/etc/sp) does
not exist so I abandoned this method.

## Telnet

The easiest way I found was to add a telnet service. To do this I removed the
first disk (bottom) and connected it via a SATA to USB converter to my laptop. I
did see an existing [wiki page](http://mybookworld.wikidot.com/sharespace) about
how to do this, but it missed out some large details. It is important to edit
the filesystem as a broken raid1 mirror, or else on the next boot the root
filesystem mirrors will not be in sync. The next time the device boots it will
notice one disk is more up to date and resync the other three and as it's only
200M it's very quick to sync. Something like this worked for me:

```
sudo mdadm --assemble /dev/md0 /dev/sdb1
sudo mdadm --run /dev/md0
sudo mount /dev/md0 /mnt
```

Next edit /mnt/etc/init.d/rcS and find the "Start Network" comment and add the
telnet lines in so it looks like this:

```
# Start Network && HTTPD
/etc/init.d/S40network restart
/etc/init.d/S55mini_httpd restart

echo "telnet stream tcp nowait root /usr/sbin/telnetd /usr/sbin/telnetd" >>/etc/inetd.conf
/etc/init.d/S60inetd start

FACTORY_DEFAULT_FLAG=/etc/.factory_restore
GENERAL_RESTORE_FLAG=/etc/.general_restore
```

Now you will have a working telnet daemon but no user to login as, the default
user admin does not have shell set. I just blanked the root users password by
editing /mnt/etc/passwd and making the root line look like:
`root::0:0:root:/root:/bin/sh`

Then unmount it and stop the md device with "umount /mnt" and "mdadm -S
/dev/md0". Pop the disk back in and as soon as it starts pinging you should be
able to login as root. At which point I set a new root user's password with passwd.
Then ipkg can be installed in /opt and once a reliable ssh daemon is working the
above hack in rcS can be removed.
