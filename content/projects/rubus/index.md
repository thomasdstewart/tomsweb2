---
title: "Rubus (Raspberry Pi Cluster)"
summary: ""
authors: ["thomas"]
tags: ["pi", "openstack"]
categories: []
date: 2017-04-21
aliases: [/tomsweb/Rubus/]
showTableOfContents: true
---

## Background

There have been many Raspberry Pi clusters before, they first started when the
Raspberry Pi came out first. They are all very cool and I've wanted to try to
make my own, but never quite got round to it or could justify it or think of any
good project to run on them. Around the time the Raspberry Pi 3 came out, I was
deep into learning how OpenStack work. That is the stage after running packstack
and playing, the stage of looking at all the components and how they all fit
together. After a while I thought it would be really quite cool to run OpenStack
on a Raspberry Pi Cluster. OpenStack is quite resource intensive, dozens of
multi forking memory hungry (in Pi terms) Python daemons. So it would really
need multiple Pi's to run. However, given the whole point is to run instances,
the Raspberry Pi is quite limited regarding actual virtualisation. However I
didn't let that stop me. I didn't want to run any production instances, I just
wanted to learn.

## Parts

I decided for a nice round 8 for the number of Raspberry Pi's, it seemed to be
large enough to spread the different components, but small enough not to get too
crazy. Looking at my notes, it looks like I found
http://www.pidramble.com/wiki/hardware as a useful reference. So we need the
Pi's, some sd cards for storage, a desktop usb charger to power them, some usb
power cables, a desktop 8 port switch, some network cables and a few Raspberry
Pi stacking cases to home them all together. I slowly put together an Amazon
basket (~May 2016).

- Pi's 8\*31.09 = £248.72 Raspberry Pi 3 Model B Quad Core CPU 1.2 GHz 1 GB RAM
  Motherboard
  https://www.amazon.co.uk/gp/product/B01CCOXV34/ref=ox_sc_act_title_1?ie=UTF8&psc=1&smid=ANHA4R5DP28XU

- Storage 8\*5.67 = £45.36 SanDisk Ultra 16 GB Imaging microSDHC Class 10 Memory
  Card and SD Adapter up to 80 Mbps with UHS-I Ratings
  http://www.amazon.co.uk/SanDisk-Imaging-microSDHC-Adapter-Ratings/dp/B012VKUSIA/ref=sr_1_1?ie=UTF8&qid=1456766877&sr=8-1&keywords=6GB+Sandisk+Ultra+Class+10+Micro+SD

- Power (max 10 Pi's) 1\*20.99 = £20.99 Aukey 78W 5V/15.6A 10 Ports desktop USB
  Charging Station Wall Charger with AlPower Tech for Apple, Android Devices,
  and More USB Powered Devices (Black)
  http://www.amazon.co.uk/Aukey-desktop-Charging-Station-Charger/dp/B00S0JDWKS/ref=sr_1_2?ie=UTF8&qid=1456750384&sr=8-2-spons&keywords=usb+desktop+charger&psc=1

- Power cable (8\*3.25)+1.5 = £27.5 Keple | 1.5M / 5FT USB 2.0 A To Right Angle
  Micro B Data Sync & Charging Cable for SAMSUNG GALAXY TAB 3 10.1" (P5200 /
  P5210 / P5220) (Micro USB)
  https://www.amazon.co.uk/gp/product/B00Y1MSCIK/ref=ox_sc_act_title_1?ie=UTF8&psc=1&smid=A3RSAJ6PHJ8E3L

- Network 1\*20.71 = £20.71 NETGEAR GS308-100UKS 8 Port Gigabit Ethernet
  10/100/1000 Mbps Switch
  http://www.amazon.co.uk/NETGEAR-GS308-100UKS-Gigabit-Ethernet-Switch/dp/B00AWM7PKO/ref=sr_1_1?ie=UTF8&qid=1456767212&sr=8-1&keywords=100+switch+netgear

- Network cable (8\*1.3)+3.2 = £13.72 UTP Cat 5e Ethernet Patch Cable 0.5m Blue
  https://www.amazon.co.uk/Ethernet-Patch-Cable-0-5m-Blue/dp/B005IB0YRK/ref=sr_1_5?s=computers&ie=UTF8&qid=1462458728&sr=1-5&keywords=cat5e+0.5m

- Case 35.90+26.90 = £62.80 Mepro Raspberry Pi 3 Model B 6-layer Stack Clear
  Case Enclosure Box Support Raspberry Pi 2B/B+/B/A+
  https://www.amazon.co.uk/Mepro-Raspberry-6-layer-Enclosure-Support/dp/B01COU8Z1O/ref=sr_1_2?s=computers&ie=UTF8&qid=1462455265&sr=1-2&keywords=clear+raspberry+pi+case
  Mepro Raspberry Pi 3 Model B 4-layer Stack Clear Case Enclosure Box Support
  Raspberry Pi 2B/B+/B/A+
  https://www.amazon.co.uk/Mepro-Raspberry-4-layer-Enclosure-Support/dp/B01COTH4V2/ref=sr_1_2?ie=UTF8&qid=1462455707&sr=8-2&keywords=Mepro+Raspberry+Pi+case

I also considered getting a pair of desktop chargers to power more Pi's, which
would need a larger switch, however I decided against it as the price of the
extra Pi's started to get too much, Power (max 12 Pi's) 2\*15.99 = £31.98 iMuto
50W/10A 6-Port USB Charger Desktop Charging Station Wall Charger
http://www.amazon.co.uk/6-Port-Charger-Desktop-Charging-Station/dp/B017IIW8NI/ref=sr_1_17?ie=UTF8&qid=1456766759&sr=8-17-spons&keywords=usb+charger+small&psc=1
http://www.amazon.co.uk/NETGEAR-GS116UK-16-Port-Gigabit-Unmanaged/dp/B0007SQEPK/ref=sr_1_1?ie=UTF8&qid=1457473391&sr=8-1&keywords=16+port+netgear

## Cost

£248.72 + £45.36 + £20.99 + £27.5 + £20.71 + £13.72 + £62.80

£439.80 (yikes!)

## Post Build Parts

- Heatsink 8\*2 = £8 Raspberry Pi Heatsink
  https://thepihut.com/products/raspberry-pi-heatsink?variant=25015132360

- GPIO LED for load indication 8\*5.91 = £47.28 PI LITE JUNIOR
  https://www.amazon.co.uk/gp/product/B01186VURG/ref=oh_aui_search_detailpage?ie=UTF8&psc=1

## Construction

Actually building it was easy, just a case of screwing it all together and
cabling the cables nicely.

## Debian

There any many ways to provision software on hardware and many of the existing
Raspberry Pi guides consist of taking a Raspbian image doing a good deal of
modification by hand. I wanted to avoid any custom by hand work, I wanted
something very reproducible, something where I could wipe the lot and re-image
easily, but also I didn't want to spend all the project time on the provisioning
system without any OpenStack experimentation. While Raspbian is cool, I also
wanted to run Debian testing/unstable so that everything was as up to date as
possible to try and see off any issues when running new OpenStack software, so
for this reason I settled on running Debian on the Pi. While Debian does not
have a kernel for the Pi, it only needs a few packages from
archive.raspberrypi.org, the bootloader, kernel and firmware packages. In the
end I settled for a large notes type file that I would copy and paste from. The
process was not fully automated however it suited me fine.

## Image setup process

1. Create armhf chroot with debootstrap and get qemu-arm to finish the
   debootstrap
2. Install kernel packages from archive.raspberrypi.org
3. Populate some important files inc create /etc/network/interfaces.d/eth0 with
   interface for all the Pi's and a dodgy /etc/rc.local script to set the
   hostname
4. Run some final commands in the chroot
5. rsync the files to the 8 SD cards in turn
6. Boot the Pi's run some post setup and run a slightly modified
   openstack-deploy command from Debian

### Debootstrap

```
r=/srv/store/thomas/rubus
sudo debootstrap --arch=armhf --include=aptitude,bc,bind9-host,build-essential,crda,curl,dnsutils,fake-hwclock,git,less,locales,netcat-traditional,ntp,ntpdate,pv,screen,sudo,task-ssh-server,tcpdump,telnet,vim-gtk,wireless-tools,wpasupplicant --foreign stretch $r http://mirror.bytemark.co.uk/debian

sudo cp /usr/bin/qemu-arm-static $r/usr/bin/qemu-arm-static
sudo chroot $r /debootstrap/debootstrap --second-stage
```

### Install Kernel

```
for p in raspberrypi-kernel_1.20170303-1_armhf.deb raspberrypi-bootloader_1.20170303-1_armhf.deb firmware-brcm80211_0.43+rpi5_all.deb; do
        sudo chroot $r wget http://archive.raspberrypi.org/debian/pool/main/r/raspberrypi-firmware/$p
        sudo chroot $r wget http://archive.raspberrypi.org/debian/pool/main/f/firmware-nonfree/$p
        sudo chroot $r dpkg -i $p
        sudo rm $r/$p
done
```

### Customize Install

```
cat << EOF | sudo tee $r/boot/cmdline.txt
dwc_otg.lpm_enable=0 root=/dev/mmcblk0p2 rootfstype=ext4 rootflags=commit=100,discard,data=writeback elevator=deadline rootwait console=serial0,115200
EOF

cat << EOF | sudo tee $r/boot/config.txt
gpu_mem=16
#force_turbo=1
EOF

cat << EOF | sudo tee $r/etc/fstab
/dev/mmcblb0p2 / ext4 defaults,noatime,nodiratime,errors=remount-ro,commit=100,discard,data=writeback 0 1
/dev/mmcblk0p1 /boot vfat defaults,noatime,nodiratime 0 2
EOF

cat << EOF | sudo tee $r/etc/hostname
rubus
EOF

cat << EOF | sudo tee -a $r/etc/hosts
192.168.10.1 rubus01
192.168.10.2 rubus02
192.168.10.3 rubus03
192.168.10.4 rubus04
192.168.10.5 rubus05
192.168.10.6 rubus06
192.168.10.7 rubus07
192.168.10.8 rubus08
EOF

cat << EOF | sudo tee $r/etc/apt/sources.list
deb     http://httpredir.debian.org/debian/    stretch         main non-free contrib
deb-src http://httpredir.debian.org/debian/    stretch         main non-free contrib
deb     http://httpredir.debian.org/debian/    stretch-updates main non-free contrib
deb-src http://httpredir.debian.org/debian/    stretch-updates main non-free contrib
deb     http://httpredir.debian.org/debian/    sid             main non-free contrib
deb-src http://httpredir.debian.org/debian/    sid             main non-free contrib
deb     http://httpredir.debian.org/debian/    experimental    main non-free contrib
deb-src http://httpredir.debian.org/debian/    experimental    main non-free contrib
deb     http://security.debian.org/            stretch/updates main non-free contrib
deb-src http://security.debian.org/            stretch/updates main non-free contrib
deb     http://archive.raspberrypi.org/debian/ jessie main
EOF

cat << EOF | sudo tee $r/etc/apt/preferences
Package: *
Pin: release testing
Pin-Priority: 800

Package: *
Pin: release unstable
Pin-Priority: 700

Package: *
Pin: release experimental
Pin-Priority: 600

Package: *
Pin: origin "archive.raspberrypi.org"
Pin-Priority: -100

Package: firmware-brcm80211 raspberrypi-bootloader raspberrypi-kernel python-rpi.gpio
Pin: origin "archive.raspberrypi.org"
Pin-Priority: 1100

EOF

cat << EOF | sudo tee $r/etc/apt/apt.conf.d/99proxy
#Acquire::http::Proxy "http://192.168.11.250:3128";
EOF

cat << EOF | sudo tee $r/etc/profile.d/proxy.sh
#export http_proxy="http://192.168.11.250:3128"
#export https_proxy="http://192.168.11.250:3128"
EOF

cat << EOF | sudo tee $r/etc/network/interfaces.d/wlan0
#auto wlan0
iface wlan0 inet dhcp
        wpa-ssid foo
        wpa-psk bar
EOF

cat << EOF | sudo tee $r/etc/network/interfaces.d/eth0
allow-hotplug enxb827eb188ca6
iface enxb827eb188ca6 inet dhcp
iface enxb827eb188ca6 inet static
        address 192.168.10.1
        netmask 255.255.255.0

allow-hotplug enxb827eb1c713d
iface enxb827eb1c713d inet dhcp
iface enxb827eb1c713d inet static
        address 192.168.10.2
        netmask 255.255.255.0

allow-hotplug enxb827eb02fab8
iface enxb827eb02fab8 inet dhcp
iface enxb827eb02fab8 inet static
        address 192.168.10.3
        netmask 255.255.255.0

allow-hotplug enxb827ebb9db55
iface enxb827ebb9db55 inet dhcp
iface enxb827ebb9db55 inet static
        address 192.168.10.4
        netmask 255.255.255.0

allow-hotplug enxb827eb8898c9
iface enxb827eb8898c9 inet dhcp
iface enxb827eb8898c9 inet static
        address 192.168.10.5
        netmask 255.255.255.0

allow-hotplug enxb827ebc98d20
iface enxb827ebc98d20 inet dhcp
iface enxb827ebc98d20 inet static
        address 192.168.10.6
        netmask 255.255.255.0

allow-hotplug enxb827eb66d5fe
iface enxb827eb66d5fe inet dhcp
iface enxb827eb66d5fe inet static
        address 192.168.10.7
        netmask 255.255.255.0

allow-hotplug enxb827ebafc1db
iface enxb827ebafc1db inet dhcp
iface enxb827ebafc1db inet static
        address 192.168.10.8
        netmask 255.255.255.0
EOF

cat << EOF | sudo tee $r/etc/rc.local
#!/bin/sh -e

hostname="\$(cat /etc/hostname)"
if test "\$hostname" = "rubus"; then
        eth=\$(ip -o l | grep enx | awk '{print \$2}' | sed 's/://')
        case \$eth in
        enxb827eb188ca6) echo "rubus01" > /etc/hostname ;;
        enxb827eb1c713d) echo "rubus02" > /etc/hostname ;;
        enxb827eb02fab8) echo "rubus03" > /etc/hostname ;;
        enxb827ebb9db55) echo "rubus04" > /etc/hostname ;;
        enxb827eb8898c9) echo "rubus05" > /etc/hostname ;;
        enxb827ebc98d20) echo "rubus06" > /etc/hostname ;;
        enxb827eb66d5fe) echo "rubus07" > /etc/hostname ;;
        enxb827ebafc1db) echo "rubus08" > /etc/hostname ;;
        esac
fi

exit 0
EOF
sudo chmod +x $r/etc/rc.local

cat << EOF | sudo tee $r/etc/modprobe.d/ib_iser-blacklist.conf
blacklist ib_iser
install ib_iser /bin/true
EOF

cat << EOF | sudo tee $r/usr/local/bin/loadmon.py
#!/usr/bin/python
import time
import sys
import os
import RPi.GPIO as GPIO
from pprint import pprint as pp

leds = [4, 17, 27, 18, 22, 23, 24, 25]
off = GPIO.LOW
on = GPIO.HIGH
GPIO.setmode(GPIO.BCM)
GPIO.setup(leds, GPIO.OUT)
GPIO.output(leds, off)

def bar(n):
    onleds=leds[0:n]
    offleds=leds[n:8]
    GPIO.output(onleds, on)
    GPIO.output(offleds, off)

#8+8=16 stops
#8    seconds to do a sweep = 8/16    = 0.5  sec delay = low  load ~0.01
#0.32 seconds to do a sweep = 0.32/16 = 0.02 sec delay = high load ~4

#(1/0.5)/12 = .166
#(1/0.02)/12 = 4.166
#(1/delay)/12 = load
#delay=1/(load*12)

while True:
    load = os.getloadavg()[0]

    #Flash led 7
    #GPIO.output(leds[7], on)
    #time.sleep(0.05)
    #GPIO.output(leds[7], off)

    #show load bar
    #load = load * 2
    #bar(int(load))
    #time.sleep(5)

    delay = 1/((load*12)+0.001)
    if(delay >= 1):
        delay = 1

    for n in range(7,-1,-1):
        GPIO.output(leds[n], on)
        time.sleep(delay)
        GPIO.output(leds[n], off)

    for n in range(0,8):
        GPIO.output(leds[n], on)
        time.sleep(delay)
        GPIO.output(leds[n], off)

GPIO.output(leds, off)
GPIO.cleanup()
EOF
sudo chmod +x $r/usr/local/bin/loadmon.py

cat << EOF | sudo tee $r/etc/systemd/system/loadmon.service
[Unit]
Description=LED Load Monitor

[Service]
Type=simple
ExecStart=/usr/local/bin/loadmon.py

[Install]
WantedBy=multi-user.target

EOF
```

### Final chroot commands

```
sudo chroot $r systemctl enable loadmon

sudo chroot $r apt-get update
sudo chroot $r apt-get install firmware-misc-nonfree dbus dstat python-rpi.gpio
sudo chroot $r dpkg-reconfigure locales
sudo chroot $r apt-get clean

sudo chroot $r passwd
sudo chroot $r adduser thomas

echo "thomas ALL=(ALL:ALL) NOPASSWD: ALL" | sudo tee $r/etc/sudoers.d/thomas
sudo chmod 400 $r/etc/sudoers.d/thomas
```

### Wipe SD card and rsync

Be sure to set the device correctly!

```
r=/srv/store/thomas/rubus
dev=/dev/sde
sudo umount $dev*
sudo dd if=/dev/zero of=$dev bs=1M count=100
cat << EOF | sudo fdisk $dev
n
p
1
8192
131071
t
c
n
p
2
131072

w
EOF
sudo mkfs -t vfat /dev/sdc1
sudo mkfs -t ext4 /dev/sdc2

sudo mount ${dev}2 /mnt
sudo mkdir -p /mnt/boot
sudo mount ${dev}1 /mnt/boot

sudo rsync -vax --delete --exclude 'boot/*' $r/. /mnt/.
sudo rsync -vrtx --delete-before $r/boot/. /mnt/boot/.

sudo umount /mnt/boot
sudo umount /mnt
sync

```

### Update SD card with rsync

Be sure to set the device correctly!

```
r=/srv/store/thomas/rubus; dev=/dev/sde; sudo umount $dev*; sudo mount ${dev}2 /mnt; sudo mount ${dev}1 /mnt/boot; sudo rsync -vax --delete --exclude 'boot/*' $r/. /mnt/.; sudo rsync -vrtx --delete-before $r/boot/. /mnt/boot/.; sudo umount /mnt/boot; sudo umount /mnt
```

### Create SD card images

I didn't need this in the end, but it may prove useful. This is a way to create
sd card images (Hands up if you can spot a x8 optimization speed up somewhere).

```
sudo modprobe nbd max_part=63
for n in `seq -w 1 8`; do
        r=/srv/store/thomas/rubus
        i=/srv/store/thomas/rubus0$n.img
        qemu-img create -f qcow2 $i 6G
        sudo qemu-nbd -c /dev/nbd0 $i
        sudo parted /dev/nbd0 mklabel msdos
        sudo parted /dev/nbd0 mkpart pri fat32 1 100M
        sudo parted /dev/nbd0 mkpart pri ext2 100M 100%
        sudo mkfs -t vfat /dev/nbd0p1
        sudo mkfs -t ext4 /dev/nbd0p2
        mkdir -p $i.d
        sudo mount /dev/nbd0p2 $i.d
        sudo mkdir -p $i.d/boot
        sudo mount /dev/nbd0p1 $i.d/boot
        sudo rsync -ax --delete --exclude 'boot/*' $r/. $i.d/.
        sudo rsync -rtx --delete-before $r/boot/. $i.d/boot/.
        sudo umount $i.d/boot
        sudo umount $i.d
        sync
        sudo pkill qemu-nbd
done
```

## Pre OpenStack installation setup

If all goes well, each Pi will boot with a different 192.168.10.0/24 address, so
a quick "sudo ip addr add 192.168.10.250/24 dev eth0" on my local desktop will
get them reachable on the network.

### Make myself at home

Then I run a few final setup commands on every Pi, I used mssh to help with
this.

```
#as root
curl https://raw.githubusercontent.com/thomasdstewart/dotfiles/master/iau | bash
su - thomas
curl https://raw.githubusercontent.com/thomasdstewart/dotfiles/master/iau | bash
mkdir .ssh
chmod 700 .ssh
echo "ssh-rsa foobarfoorbar thomas@host" >> .ssh/authorized_keys
chmod 600 .ssh/authorized_keys

curl http://archive.raspberrypi.org/debian/raspberrypi.gpg.key | sudo apt-key add -

apt-get install openstack-deploy man-db mysql-client debconf-utils crudini munin
```

### Open vSwitch

The rubus02 and rubus03 Pi's will need to have their ethernet ports connected to
an Open vSwitch bridge called br-ex. To do this I comment out each Raspberry
Pi's respective interface in /etc/network/interfaces.d/eth0. If Open vSwitch
fails for some reason, it's handy to have another way into the machine, so I
also edit /etc/network/interfaces.d/wlan0 so that the Pi is also connected to
Wireless. Next I install openvswitch-switch and create a
/etc/network/interfaces.d/br-ex file for that bridge and reboot.

```
apt-get install openvswitch-switch net-tools
ip=$(/bin/ip -4 a | grep 192.168.10 | awk -F'[ /]*' '{print $3}')
link=$(/bin/ip l | grep enx | awk -F'[ :]*' '{print $2}')
cat << EOF > /etc/network/interfaces.d/br-ex
#allow-ovs br-ex
iface br-ex inet static
        address $ip
        netmask 255.255.255.0
        ovs_type OVSBridge
        ovs_ports $link

allow-br-ex $link
iface enxb827eb1c713d inet manual
        ovs_bridge br-ex
        ovs_type OVSPort
EOF
```

A slight oddity that I have yet to understand is how to get Open vSwitch ports
to come up automatically on boot and actually forward frames. There were many
times, the boot up just left the Pi's off the network, so a slight bodge to
leave br-ex down on boot and to bring it up 60 seconds after boot by appending
"(sleep 60; ifup br-ex) &" to the /etc/rc.local file.

### DNS DoS

I found that a simultaneous "apt-get update" would DoS my home router, so I used
the below hack:

```
sed -i 's/^nameserver.*/nameserver 8.8.8.8/' /etc/resolv.conf
```

The better solution would be to install resolvconf and add "dns-nameservers
8.8.8.8" to all the network stanzas.

### Add Swap

We need to supplement memory with a little swap...

```
dd if=/dev/zero of=/var/cache/swap bs=1M count=1024
chmod 0000 /var/cache/swap
sudo mkswap /var/cache/swap
echo "/var/cache/swap swap swap defaults 0 0" >> /etc/fstab
swapon -a
```

## OpenStack Install

### The Plan

I called's the Raspberry Pi's rubus01 through 08. The vague allocation:

- rubus08 - mysql for all the databases
- rubus07 - RabbitMQ for message passing for all the services
- rubus06 - Keystone via Apache WSGI
- rubus05 - Glance API and Glance Registry
- rubus04 - Nova API, Nova Console Auth, Nova Scheduler, Nova Cert, Nova
  Conductor, and Nova Spice HTML 5 Proxy
- rubus03 - Nova Compute and Neutron Open vSwitch Agent
- rubus02 - Neutron Server, Neutron Metadata-agent, Neutron L3 Agent, Neutron
  DHCP Agent and Neutron Open vSwitch Agent
- rubus01 - Horizon Dashboard via Apache

This leaves: cinder,mongodb,ceoilmeter,swift,ceph all without homes.

### preseed-lib

```
$ diff -u preseed-lib.orig preseed-lib
--- preseed-lib.orig	2016-09-20 12:39:38.000000000 +0100
+++ preseed-lib	2016-09-08 21:40:40.100606151 +0100
@@ -15,7 +15,7 @@
 	DB_NAME=${4}
 	DB_USER=${5}
 	MYSQL_PASSWORD=${6}
-	if [ -z "${7}" ] ; then
+	if [ ! -z "${7}" ] ; then
 		MYSQL_HOST=${7}
 	fi
 	echo "# automatically generated by the maintainer scripts of ${PKG_NAME}
$
```

### openstack-deploy

```
$ diff -u openstack-deploy.orig openstack-deploy
--- openstack-deploy.orig	2016-09-20 12:39:48.000000000 +0100
+++ openstack-deploy	2017-04-07 14:34:27.699504745 +0100
@@ -10,7 +10,8 @@
 	echo "Can't find /usr/share/openstack-deploy/pressed-lib: exiting"
 	exit 1
 fi
-. /usr/share/openstack-deploy/preseed-lib
+#. /usr/share/openstack-deploy/preseed-lib
+. preseed-lib

 OSINSTALL_RC=osinstallrc

@@ -498,6 +499,216 @@
 #		sahara-api sahara-engine \
 #		murano-api murano-engine
 ;;
+"db")
+        os_pressed_misc
+        osinstall_mysql_set_localhost
+        osinstall_install_if_not_installed ntp
+        osinstall_mysql_server
+        sudo sed -i 's/bind-address/#bind-address/' /etc/mysql/mysql.conf.d/mysqld.cnf
+        echo "[mysqld]" | sudo tee /etc/mysql/conf.d/local.cnf
+        echo "character-set-server = utf8" | sudo tee -a /etc/mysql/conf.d/local.cnf
+        echo "collation-server = utf8_general_ci" | sudo tee -a /etc/mysql/conf.d/local.cnf
+        echo "init-connect = 'SET NAMES utf8'" | sudo tee -a /etc/mysql/conf.d/local.cnf
+        #/usr/share/openstack-deploy/mysql-remote-root
+        SQL="mysql --defaults-file=/etc/mysql/debian.cnf -Dmysql -e"
+        ROOT_PASS=`${SQL} "SELECT authentication_string FROM user WHERE User='root' LIMIT 1;" | tail -n 1`
+        ${SQL} "REPLACE INTO user SET host='%', user='root', authentication_string='${ROOT_PASS}', Select_priv='Y', Insert_priv='Y', Update_priv='Y', Delete_priv='Y', Create_priv='Y', Drop_priv='Y', Reload_priv='Y', Shutdown_priv='Y', Process_priv='Y',  File_priv='Y', Grant_priv='Y', References_priv='Y', Index_priv='Y', Alter_priv='Y', Super_priv='Y', Show_db_priv='Y', Create_tmp_table_priv='Y', Lock_tables_priv='Y', Execute_priv='Y', Repl_slave_priv='Y', Repl_client_priv='Y', Create_view_priv='Y', Show_view_priv='Y', Create_routine_priv='Y', Alter_routine_priv='Y', Create_user_priv='Y', Event_priv='Y', Trigger_priv='Y', ssl_type='', ssl_cipher='', x509_issuer='', x509_subject='' "
+        ${SQL} "FLUSH PRIVILEGES"
+        sed -i 's|^bind-address[ \t]*=.*|bind-address = 0.0.0.0|' /etc/mysql/my.cnf
+        /etc/init.d/mysql restart
+;;
+"rabbit")
+        os_pressed_misc
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_install_if_not_installed rabbitmq-server
+        . osinstallrc
+        rabbitmqctl change_password guest $RC_RABIT_PASS
+        #maybe RC_RABIT_USER=openstack
+        #rabbitmqctl set_permissions openstack ".*" ".*" ".*"
+        echo "[{rabbit, [{loopback_users, []}]}]." > /etc/rabbitmq/rabbitmq.config
+        systemctl restart rabbitmq-server.service
+;;
+"keystone")
+        os_pressed_misc
+        osinstall_mysql_set_host
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_keystone
+;;
+"glance")
+        os_pressed_misc
+        osinstall_mysql_set_host
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_rcvalue_keystone_endpoint
+
+        osinstall_rcvalue RC_GLANCE_SQL_PASS "Glance MySQL password [generated-password]: " yes
+	osinstall_rcvalue RC_GLANCE_ENDPOINT_IP "Glance endpoint IP address: " no
+        os_preseed_glance ${RC_GLANCE_SQL_PASS} ${RC_MYSQL_PASSWORD} ${RC_MYSQL_SERVER_HOSTNAME} \
+                ${RC_KEYSTONE_ENDPOINT_IP} ${RC_KEYSTONE_REGION} ${RC_KEYSTONE_ADMINPASS} ${RC_KEYSTONE_AUTHTOKEN} \
+                ${RC_RABIT_HOST} ${RC_RABIT_USER} ${RC_RABIT_PASS}
+        echo "glance-api glance/endpoint-ip string ${RC_GLANCE_ENDPOINT_IP}" | debconf-set-selections
+        DEBIAN_FRONTEND=noninteractive ${APTGET} install glance
+;;
+"nova")
+        os_pressed_misc
+        osinstall_mysql_set_host
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_rcvalue_keystone_endpoint
+
+	osinstall_rcvalue RC_NOVA_SQL_PASS "Nova MySQL password [generated-password]: " yes
+	osinstall_rcvalue RC_NOVAAPI_SQL_PASS "Nova API MySQL password [generated-password]: " yes
+	osinstall_rcvalue RC_NOVA_ENDPOINT_IP "Nova endpoint IP address: " no
+	os_preseed_nova ${RC_NOVA_SQL_PASS} ${RC_NOVAAPI_SQL_PASS} ${RC_MYSQL_PASSWORD} ${RC_MYSQL_SERVER_HOSTNAME} \
+		${RC_KEYSTONE_ENDPOINT_IP} ${RC_KEYSTONE_REGION} ${RC_KEYSTONE_ADMINPASS} ${RC_KEYSTONE_AUTHTOKEN} \
+		${RC_RABIT_HOST} ${RC_RABIT_USER} ${RC_RABIT_PASS} ${RC_METADATA_SHARED_SECRET}
+        echo "nova-api nova/endpoint-ip string ${RC_NOVA_ENDPOINT_IP}" | debconf-set-selections
+        DEBIAN_FRONTEND=noninteractive ${APTGET} install nova-api nova-conductor nova-consoleauth nova-scheduler nova-consoleproxy nova-cert
+
+
+        sudo cp /etc/nova/nova.conf /etc/nova/nova.conf.orig
+        sudo crudini --set /etc/nova/nova.conf DEFAULT my_ip 192.168.10.4
+        sudo crudini --set /etc/nova/nova.conf DEFAULT use_neutron True
+
+        sudo crudini --set /etc/nova/nova.conf vnc vncserver_listen \$my_ip
+        sudo crudini --set /etc/nova/nova.conf vnc vncserver_proxyclient_address \$my_ip
+
+        sudo crudini --set /etc/nova/nova.conf glance api_servers http://192.168.10.5:9292
+        sudo crudini --set /etc/nova/nova.conf neutron url http://192.168.10.2:9696
+        sudo systemctl restart $(systemctl | grep -i openstack | awk '{print $1}' | xargs)
+
+
+        #? from old guide
+        #auth_strategy = keystone
+        #admin_auth_url = http://controller:35357/v2.0
+        #admin_tenant_name = service
+        #admin_username = neutron
+        #admin_password = NEUTRON_PASS
+
+        #/etc/default/nova-consoleproxy
+        #NOVA_CONSOLE_PROXY_TYPE=novnc
+
+
+;;
+"novacompute")
+        os_pressed_misc
+        osinstall_mysql_set_host
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_rcvalue_keystone_endpoint
+
+	os_preseed_nova ${RC_NOVA_SQL_PASS} ${RC_NOVAAPI_SQL_PASS} ${RC_MYSQL_PASSWORD} ${RC_MYSQL_SERVER_HOSTNAME} \
+		${RC_KEYSTONE_ENDPOINT_IP} ${RC_KEYSTONE_REGION} ${RC_KEYSTONE_ADMINPASS} ${RC_KEYSTONE_AUTHTOKEN} \
+		${RC_RABIT_HOST} ${RC_RABIT_USER} ${RC_RABIT_PASS} ${RC_METADATA_SHARED_SECRET}
+        echo "nova-api nova/endpoint-ip string ${RC_NOVA_ENDPOINT_IP}" | debconf-set-selections
+
+	osinstall_rcvalue RC_NEUTRON_SQL_PASS "Neutron MySQL password [generated-password]: " yes
+	osinstall_rcvalue RC_METADATA_SHARED_SECRET "Metadata proxy shared secret [generated-password]: " yes
+	osinstall_rcvalue RC_NEUTRON_ENDPOINT_IP "Neutron endpoint IP address: " no
+	ADMIN_TENANT_ID=`keystone --os-tenant-name admin --os-username admin --os-password ${RC_KEYSTONE_ADMINPASS} --os-auth-url http://${RC_KEYSTONE_ENDPOINT_IP}:35357/v2.0 tenant-get admin | grep id | awk '{print $4}'`
+	os_preseed_neutron ${RC_NEUTRON_SQL_PASS} ${RC_MYSQL_PASSWORD} ${RC_MYSQL_SERVER_HOSTNAME} \
+		${RC_KEYSTONE_ENDPOINT_IP} ${RC_KEYSTONE_REGION} ${RC_KEYSTONE_ADMINPASS} ${RC_KEYSTONE_AUTHTOKEN} \
+		${RC_RABIT_HOST} ${RC_RABIT_USER} ${RC_RABIT_PASS} ${RC_METADATA_SHARED_SECRET} http://192.168.10.3:8774/v2 ${ADMIN_TENANT_ID}
+
+        truncate -s 100G /var/lib/nova/instances.img
+        mkfs.ext4 /var/lib/nova/instances.img
+        echo "/var/lib/nova/instances.img /var/lib/nova/instances ext4 defaults,noatime,nodiratime,errors=remount-ro,loop 0 2" >> /etc/fstab
+        mkdir -p /var/lib/nova/instances
+        mount /var/lib/nova/instances
+
+        DEBIAN_FRONTEND=noninteractive ${APTGET} install nova-compute neutron-openvswitch-agent
+        apt-get install openvswitch-switch nova-compute-qemu
+
+        sudo cp /etc/nova/nova.conf /etc/nova/nova.conf.orig
+        sudo crudini --set /etc/nova/nova.conf DEFAULT my_ip 192.168.10.3
+        sudo crudini --set /etc/nova/nova.conf DEFAULT use_neutron True
+
+        sudo crudini --set /etc/nova/nova.conf vnc vncserver_listen 0.0.0.0
+        sudo crudini --set /etc/nova/nova.conf vnc vncserver_proxyclient_address \$my_ip
+        sudo crudini --set /etc/nova/nova.conf vnc novncproxy_base_url http://192.168.10.4:6080/vnc_auto.html
+
+        sudo crudini --set /etc/nova/nova.conf glance api_servers http://192.168.10.5:9292
+        sudo crudini --set /etc/nova/nova.conf neutron url http://192.168.10.2:9696
+        sudo crudini --set /etc/nova/nova.conf neutron region_name RegionOne
+
+        sudo cp /etc/nova/nova-compute.conf /etc/nova/nova-compute.conf.orig
+        sudo crudini --set /etc/nova/nova-compute.conf libvirt virt_type qemu
+
+        sudo cp /etc/neutron/plugins/ml2/openvswitch_agent.ini /etc/neutron/plugins/ml2/openvswitch_agent.ini.orig
+        sudo crudini --set /etc/neutron/plugins/ml2/openvswitch_agent.ini agent tunnel_types gre
+        sudo crudini --set /etc/neutron/plugins/ml2/openvswitch_agent.ini ovs local_ip 192.168.10.3
+        sudo systemctl restart $(systemctl | grep -i openstack | awk '{print $1}' | xargs)
+
+
+        #setup br-ex
+
+;;
+"neutron")
+        os_pressed_misc
+        osinstall_mysql_set_host
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_rcvalue_keystone_endpoint
+
+	osinstall_rcvalue RC_NEUTRON_SQL_PASS "Neutron MySQL password [generated-password]: " yes
+	osinstall_rcvalue RC_METADATA_SHARED_SECRET "Metadata proxy shared secret [generated-password]: " yes
+	osinstall_rcvalue RC_NEUTRON_ENDPOINT_IP "Neutron endpoint IP address: " no
+	ADMIN_TENANT_ID=`keystone --os-tenant-name admin --os-username admin --os-password ${RC_KEYSTONE_ADMINPASS} --os-auth-url http://${RC_KEYSTONE_ENDPOINT_IP}:35357/v2.0 tenant-get admin | grep id | awk '{print $4}'`
+	os_preseed_neutron ${RC_NEUTRON_SQL_PASS} ${RC_MYSQL_PASSWORD} ${RC_MYSQL_SERVER_HOSTNAME} \
+		${RC_KEYSTONE_ENDPOINT_IP} ${RC_KEYSTONE_REGION} ${RC_KEYSTONE_ADMINPASS} ${RC_KEYSTONE_AUTHTOKEN} \
+		${RC_RABIT_HOST} ${RC_RABIT_USER} ${RC_RABIT_PASS} ${RC_METADATA_SHARED_SECRET} http://192.168.10.3:8774/v2 ${ADMIN_TENANT_ID}
+        echo "neutron-server neutron/endpoint-ip string ${RC_NEUTRON_ENDPOINT_IP}" | debconf-set-selections
+        DEBIAN_FRONTEND=noninteractive ${APTGET} install neutron-server neutron-linuxbridge-agent neutron-dhcp-agent neutron-metadata-agent neutron-l3-agent neutron-openvswitch-agent
+        apt-get install openvswitch-switch
+
+        sudo cp /etc/neutron/neutron.conf /etc/neutron/neutron.conf.orig
+        sudo crudini --set /etc/neutron/neutron.conf nova auth_url http://192.168.10.6:5000/v3
+
+        sudo cp /etc/neutron/dhcp_agent.ini /etc/neutron/dhcp_agent.ini.orig
+        sudo crudini --set /etc/neutron/dhcp_agent.ini enable_isolated_metadata True
+
+        sudo cp /etc/neutron/metadata_agent.ini /etc/neutron/metadata_agent.ini.orig
+        sudo crudini --set /etc/neutron/metadata_agent.ini nova_metadata_ip 192.168.10.4
+
+        sudo cp /etc/neutron/plugins/ml2/ml2_conf.ini /etc/neutron/plugins/ml2/ml2_conf.ini.orig
+        sudo crudini --set /etc/neutron/plugins/ml2/ml2_conf.ini ml2 type_drivers flat,gre,vlan,vxlan
+        sudo crudini --set /etc/neutron/plugins/ml2/ml2_conf.ini ml2 tenant_network_types gre
+        sudo crudini --set /etc/neutron/plugins/ml2/ml2_conf.ini ml2 extension_drivers port_security
+        sudo crudini --set /etc/neutron/plugins/ml2/ml2_conf.ini ml2_type_vxlan vni_ranges 1:1000
+
+        sudo cp /etc/neutron/plugins/ml2/openvswitch_agent.ini /etc/neutron/plugins/ml2/openvswitch_agent.ini.orig
+        sudo crudini --set /etc/neutron/plugins/ml2/openvswitch_agent.ini agent tunnel_types gre,vxlan
+        sudo crudini --set /etc/neutron/plugins/ml2/openvswitch_agent.ini ovs local_ip 192.168.10.2
+
+        echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/neutron.conf
+        echo "net.ipv4.conf.all.rp_filter=0" >> /etc/sysctl.d/neutron.conf
+        echo "net.ipv4.conf.default.rp_filter=0" >> /etc/sysctl.d/neutron.conf
+
+        sudo systemctl restart $(systemctl | grep -i openstack | awk '{print $1}' | xargs)
+        systemctl disable neutron-linuxbridge-agent
+        systemctl stop neutron-linuxbridge-agent
+
+        #setup br-ex
+
+;;
+"horizon")
+        os_pressed_misc
+        osinstall_mysql_set_host
+        osinstall_rabbit_host_and_pass
+        osinstall_install_if_not_installed ntp
+        osinstall_rcvalue_keystone_endpoint
+
+        os_pressed_horizon
+        DEBIAN_FRONTEND=noninteractive ${APTGET} install openstack-dashboard-apache
+	osinstall_write_openrc
+
+        sudo cp /etc/openstack-dashboard/local_settings.py /etc/openstack-dashboard/local_settings.py.orig
+        sed -i 's/OPENSTACK_HOST = "127.0.0.1"/OPENSTACK_HOST = "192.168.10.6"/' /etc/openstack-dashboard/local_settings.py
+        echo -e "ALLOWED_HOSTS = ['*']" >> /etc/openstack-dashboard/local_settings.py
+
+;;
 *)
 	usage
 ;;
$
```

### osinstallrc

```
$ cat << EOF > osinstallrc
RC_MYSQL_SERVER_HOSTNAME=rubus08
RC_MYSQL_SERVER_PKG_NAME=mysql-server-5.7
RC_MYSQL_PASSWORD=$(pwgen 32 1)
RC_RABIT_HOST=rubus07
RC_RABIT_USER=guest
RC_RABIT_PASS=$(pwgen 32 1)
RC_KEYSTONE_ENDPOINT_IP=192.168.10.6
RC_KEYSTONE_REGION=regionOne
RC_KEYSTONE_AUTHTOKEN=$(pwgen 32 1)
RC_KEYSTONE_ADMINPASS=$(pwgen 32 1)
RC_KEYSTONE_SQL_PASS=$(pwgen 32 1)
RC_GLANCE_SQL_PASS=$(pwgen 32 1)
RC_GLANCE_ENDPOINT_IP=192.168.10.5
RC_NOVA_SQL_PASS=$(pwgen 32 1)
RC_NOVAAPI_SQL_PASS=$(pwgen 32 1)
RC_NOVA_ENDPOINT_IP=192.168.10.4
RC_NEUTRON_SQL_PASS=$(pwgen 32 1)
RC_METADATA_SHARED_SECRET=$(pwgen 32 1)
RC_NEUTRON_ENDPOINT_IP=192.168.10.2
$
```

### copy files

```
for n in $(seq 1 8); do scp preseed-lib openstack-deploy osinstallrc 192.168.10.$n; done
```

### OpenStack Install

```
thomas@rubus08 ~ $ sudo bash -x ./openstack-deploy db
thomas@rubus07 ~ $ sudo bash -x ./openstack-deploy rabbit
thomas@rubus06 ~ $ sudo bash -x ./openstack-deploy keystone
thomas@rubus05 ~ $ sudo bash -x ./openstack-deploy glance
thomas@rubus04 ~ $ sudo bash -x ./openstack-deploy nova
thomas@rubus03 ~ $ sudo bash -x ./openstack-deploy novacompute
thomas@rubus02 ~ $ sudo bash -x ./openstack-deploy neutron
thomas@rubus01 ~ $ sudo bash -x ./openstack-deploy horizon
```

## Post OpenStack install

### rabbitmq not starting at boot

It's all testing/unstable, so there are bound to be slight issues. I have no
idea why but I found that when the rubus07 rebooted that rabbitmq would not
start, I'm sorry I didn't debug it bug report it. A similar rc.local hack:

```
(sleep 10; systemctl restart rabbitmq-server.service)
```

### Stop all the services

```
sudo systemctl stop apache2 glance-api glance-registry mysql neutron-dhcp-agent neutron-l3-agent neutron-metadata-agent neutron-openvswitch-agent neutron-server nova-api nova-cert nova-compute nova-conductor nova-consoleauth nova-scheduler rabbitmq-server
```

### Neutron forward packets to Internet

When rubus02 is running Neutron will send packets out br-ex, this little SNAT
will re-write the source IP. I still need to understand if I need this with
wlan0 configured. Or if the external network should carve out some of
192.168.1.0/24.

```
ip=$(/bin/ip -o -4 addr show dev br-ex | fgrep "192.168.1." | awk -F'[ /]*' '{print $4}')
iptables -t nat -A POSTROUTING ! -d 192.168.10.0/24 -o br-ex -j SNAT --to-source $ip
```

### Manual Horizon install

At some point horizon was not installable on Debian
(https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=832338), so to manually
download it and run HEAD, first install pything-dev and clone horizon: "apt-get
-y install python-dev && git clone https://github.com/openstack/horizon.git".
Then cp openstack_dashboard/local/local_settings.py.example
openstack_dashboard/local/local_settings.py and edit to list OPENSTACK_HOST =
"192.168.10.6" and OPENSTACK_KEYSTONE_DEFAULT_ROLE = "Member". Then just add a
crontab entry: "@reboot screen -d -m -S horzon /home/thomas/horizon/run_tests.sh
--runserver 192.168.10.1:8000"

### amd64 nova compute

During testing I created an amd64 nova compute host in a vm, I followed the same
instructions as rubus03.

### Cleaning up to start again

To remove some packages:

```
sudo aptitude purge neutron-common neutron-openvswitch-agent nova-common nova-compute-qemu nova-compute dbconfig-common python-nova python-neutron nova-compute-kvm
```

Also I found it useful to be able to sometimes delete debconf entries
(http://serverfault.com/questions/332459/how-do-i-delete-values-from-the-debconf-database):

```
echo PURGE | sudo debconf-communicate neutron-server
echo PURGE | sudo debconf-communicate neutron-metadata-agent
echo PURGE | sudo debconf-communicate nova-api
echo PURGE | sudo debconf-communicate nova-consoleproxy
```

## Bugs to be reported

### openstack-deploy

- keystone scripts depend on mysql
- typo
  http://anonscm.debian.org/cgit/openstack/openstack-meta-packages.git/tree/src/preseed-lib#n18
  should be if [ ! -z "${7}" ] ; then
  http://anonscm.debian.org/cgit/openstack/openstack-meta-packages.git/tree/src/preseed-lib#n121
  assumes keystone ip is endpoint ip postrm don't remove endpoint

### qemu build deps

- qemu qemu-system-x86
- add libspice-server-dev libspice-protocol-dev as dependencies for linux-armhf
  blocked by libspice-server-dev not in armhf

```
$ dpkg --print-architecture
armhf
$ qemu-system-x86_64 -spice port=9999
qemu-system-x86_64: -spice port=9999: There is no option group 'spice'
qemu-system-x86_64: -spice port=9999: spice support is disabled
$
```

```
$ dpkg --print-architecture
amd64
$ qemu-system-x86_64 -spice port=9999
^Cqemu-system-x86_64: terminating on signal 2
$
```

## Testing

### admin-openrc.sh

```
cat << EOF > admin-openrc.sh
#export SERVICE_ENDPOINT=http://192.168.10.6:35357/v2.0/
#export SERVICE_TOKEN=$(grep RC_KEYSTONE_AUTHTOKEN osinstallrc | awk -F= '{print $2}')
export OS_PROJECT_DOMAIN_ID=default
export OS_USER_DOMAIN_ID=default
export OS_USERNAME=admin
export OS_PASSWORD=$(grep RC_KEYSTONE_ADMINPASS osinstallrc | awk -F= '{print $2}')
export OS_TENANT_NAME=admin
export OS_PROJECT_NAME=admin
export OS_AUTH_URL=http://192.168.10.6:5000/v3
export OS_IDENTITY_API_VERSION=3
export OS_AUTH_VERSION=3
export OS_PROJECT_DOMAIN_ID=default
export OS_USER_DOMAIN_ID=default
export OS_NO_CACHE=1
export OS_CLOUDNAME=rubus
EOF
```

### thomas-openrc.sh

```
cat << EOF > thomas-openrc.sh
export OS_PROJECT_DOMAIN_ID=default
export OS_USER_DOMAIN_ID=default
export OS_USERNAME=thomas
export OS_PASSWORD=foobar
export OS_TENANT_NAME=thomas
export OS_PROJECT_NAME=thomas
export OS_AUTH_URL=http://192.168.10.6:5000/v3
export OS_IDENTITY_API_VERSION=3
export OS_AUTH_VERSION=3
export OS_PROJECT_DOMAIN_ID=default
export OS_USER_DOMAIN_ID=default
export OS_NO_CACHE=1
export OS_CLOUDNAME=rubus
EOF
```

### create project and user (as admin)

```
openstack project create thomas
openstack user create thomas --project thomas --password foobar --email thomas@stewarts.org.uk
openstack role add --project thomas --user thomas Member
```

### create external network (as admin)

```
neutron net-create --shared --provider:physical_network external --provider:network_type flat --router:external external
neutron subnet-create external 192.168.10.0/24 --name external --allocation-pool start=192.168.10.100,end=192.168.10.200 --dns-nameserver 8.8.8.8 --gateway 192.168.10.2
```

### create flavor (as admin)

```
openstack flavor create --ram 256 --disk 30 --ephemeral 0 --vcpus 1 --public m1.tiny
```

### init thomas project (as thomas)

create private network, router, update security group, install key and grep
floating ip

```
neutron net-create private
neutron subnet-create private 192.168.100.0/24 --name private --dns-nameserver 8.8.8.8 --gateway 192.168.100.1
openstack router create router
neutron router-gateway-set router external
neutron router-interface-add router private
openstack security group rule create --proto icmp --src-ip 0/0 --dst-port -1 default
openstack security group rule create --proto tcp --src-ip 0/0 --dst-port 22 default
openstack keypair create --public-key ~/.ssh/id_rsa.pub thomasATdiamond
openstack ip floating create external
```

### Test of amd64 with rubus09

Downloading amd64 or x86_64 images and getting them to run on rubus09 which is a
Nova Compute VM (non Pi):

```
wget http://cdimage.debian.org/mirror/cdimage/openstack/8.6.0/debian-8.6.0-openstack-amd64.qcow2
openstack image create --disk-format qcow2 --container-format bare --public --file debian-8.6.0-openstack-amd64.qcow2 debian-8.6.0-openstack-amd64
openstack server create --image debian-8.5.0-openstack-amd64 --flavor m1.tiny --key-name thomasATdiamond --nic net-id=private tom
```

```
wget http://download.cirros-cloud.net/0.3.5/cirros-0.3.5-x86_64-disk.img
openstack image create --disk-format qcow2 --container-format bare --public --file cirros-0.3.5-x86_64-disk.img cirros-0.3.5-x86_64
openstack server create --image cirros-0.3.5-x86_64 --flavor m1.tiny --key-name thomasATdiamond --nic net-id=private tom
```

### Fail at CirrOS Arm

```
wget http://download.cirros-cloud.net/0.3.4/cirros-0.3.4-arm-kernel
wget http://download.cirros-cloud.net/0.3.4/cirros-0.3.4-arm-initramfs
wget http://download.cirros-cloud.net/0.3.4/cirros-0.3.4-arm-rootfs.img.gz
gunzip cirros-0.3.4-arm-rootfs.img.gz
openstack image create --container-format=aki --disk-format=aki --file cirros-0.3.4-arm-kernel --public cirros-0.3.4-arm-kernel
openstack image create --container-format=ari --disk-format=ari --file cirros-0.3.4-arm-initramfs --public cirros-0.3.4-arm-initramfs
kernelid=$(openstack image show cirros-0.3.4-arm-kernel | grep id | awk '{print $4}')
initramfsid=$(openstack image show cirros-0.3.4-arm-initramfs | grep id | awk '{print $4}')
openstack image create --container-format=ami --disk-format=ami --file cirros-0.3.4-arm-rootfs.img --public --property hypervisor_type=qemu --property vm_mode=hvm --property architecture=armv7l --property hw_machine_type=vexpress-a15 --property kernel_id=$kernelid --property ramdisk_id=$initramfsid --property hw_video_model=vga cirros-0.3.4-arm-rootfs.img

openstack server create --image  --flavor m1.tiny --key-name thomasATdiamond --nic net-id=private tom
```

### Test qemu actually works

Actually testing that qemu can launch and run arm images seems to be a dark art.
I can't get the CirrOS arm image to do anything! I was able to get some images
created by Aurélien Jarno to boot
(https://www.aurel32.net/info/debian_arm_qemu.php).

```
wget https://people.debian.org/~aurel32/qemu/armhf/vmlinuz-3.2.0-4-vexpress
wget https://people.debian.org/~aurel32/qemu/armhf/initrd.img-3.2.0-4-vexpress
wget https://people.debian.org/~aurel32/qemu/armhf/debian_wheezy_armhf_standard.qcow2

qemu-system-arm -M vexpress-a9 -kernel vmlinuz-3.2.0-4-vexpress -initrd initrd.img-3.2.0-4-vexpress -drive if=sd,file=debian_wheezy_armhf_standard.qcow2 -append "root=/dev/mmcblk0p2 console=ttyAMA0" -serial stdio
```

### Launch Debian

```
openstack image create --container-format=aki --disk-format=aki --property hw_machine_type=vexpress-a9 --property hypervisor_type=qemu --property vm_mode=hvm --file vmlinuz-3.2.0-4-vexpress vmlinuz-3.2.0-4-vexpress
kernelid=$(openstack image show vmlinuz-3.2.0-4-vexpress | grep id | awk '{print $4}')

openstack image create --container-format=ari --disk-format=ari --property hw_machine_type=vexpress-a9 --property hypervisor_type=qemu --property vm_mode=hvm --file initrd.img-3.2.0-4-vexpress initrd.img-3.2.0-4-vexpress
initramfsid=$(openstack image show initrd.img-3.2.0-4-vexpress | grep id | awk '{print $4}')

openstack image create --container-format=ami --disk-format=ami --file debian_wheezy_armhf_standard.qcow2 --property hypervisor_type=qemu --property vm_mode=hvm --property architecture=armv7l --property hw_machine_type=vexpress-a9 --property kernel_id=$kernelid --property ramdisk_id=$initramfsid --property hw_video_model=vga --property kernel_args="root=/dev/mmcblk0p2 console=ttyAMA0" --property hw_disk_bus=sd --property hw_vif_model=lan9118 --property os_command_line="root=/dev/mmcblk0p2 console=ttyAMA0" debian_wheezy_armhf_standard

openstack server create --image debian_wheezy_armhf_standard --flavor m1.tiny --key-name thomasATdiamond --nic net-id=private tom
```

## Links

- https://git.linaro.org/people/arnd.bergmann/flashbench.git
- https://blogofterje.wordpress.com/2012/01/14/optimizing-fs-on-sd-card/
- https://wiki.gentoo.org/wiki/SDCard
- https://github.com/djwillis/meta-raspberrypi/commit/b059c59f7192cb30799e6fead125855b057283fd
- http://openstack.alioth.debian.org/
- http://anonscm.debian.org/Aukey/cgit/openstack/
- https://wiki.debian.org/OpenStackHowto/Folsom
- http://anonscm.debian.org/cgit/openstack/openstack-meta-packages.git/tree/src/openstack-deploy
- http://anonscm.debian.org/cgit/openstack/openstack-meta-packages.git/tree/src/preseed-lib
- https://www.aurel32.net/info/debian_arm_qemu.php
- http://www.trescca.eu/index.php/2013-05-23-13-18-38/guides/118-raspberry-pi-as-compute-node-in-openstack.html
- http://docs.openstack.org/developer/horizon/quickstart.html
