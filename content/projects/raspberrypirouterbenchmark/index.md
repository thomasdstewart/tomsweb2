---
title: "Raspberry Pi Router Benchmark"
summary: ""
authors: ["thomas"]
tags: ["pi"]
categories: []
date: 2015-02-25
aliases: [/tomsweb/RaspberryPiRouterBenchmark/]
showTableOfContents: true
---

## Introduction

My ISP doesn't provide IPv6 and the wireless router they give out does not work
with IPv6 Tunnels. So I set up a [Raspberry Pi](http://www.raspberrypi.org/) as a
[router on a stick](https://en.wikipedia.org/wiki/One-armed_router) to route
IPv6 on my home network to my IPv6 tunnel provider over IPv4. I mostly did this
to start getting familiar with IPv6; it does work and my home computers and
phone get IPv6 addresses on the Internet. I occasionally do a netstat and see a
bunch of tcp6 connections established to google, facebook and youtube. My one
worry was the performance of the Raspberry Pi, it's a single core Arm v6 running
at 700Mhz with a 100M ethernet that sits on the USB bus. I have in the past
noticed that when the Raspberry Pi is busy (mostly with cron) the ability for it
to forward packets does slow down. Very occasionally it drops packets and makes
the connection unusable for a short while. My internet connection is
[FTTC/fiber to the cabinet](https://en.wikipedia.org/wiki/Fiber_to_the_x#Fiber_to_the_curb.2Fcabinet)
and +100M, so I'm already limiting my connection speed if they go over the
Raspberry Pi. I always meant to run some benchmarks on the Pi to see just how
fast it can ship packets. With the advent of the newer Raspberry Pi 2 with its
quad Core Arm v8 running at 900Mhz I decided to do some proper testing.

## Setup

I used a
[Dlink DGS-1008D](http://www.dlink.com/uk/en/business-solutions/switching/unmanaged-switches/desktop/dgs-1008d-8-port-10-100-1000mbps-gigabit-switch)
unmanaged switch to connect my desktop, a laptop Lenovo X220 (Intel Core
i5-2520), a Raspberry Pi Model B and a Raspberry 2 Pi Model B. I also configured
the test laptop to use its ethernet port as a bridge and installed a new
virtual machine which connects to that bridge also. So all 4 test machines are
bridged together at layer 2. I installed all the machines with Debian
testing/sid and updated them all. I wanted to first see what the hardware can
do, so I have a fairly stripped down setup. Almost no processes are running and
the iptable modules are not loaded. So on all 4 machines "iptables-save"
produces nothing. The test laptop was running Gnome 3, however during the
testing the test laptop and virtual machine were practically idle. Both machines
are capable of saturating a 1G link. Any background processes running should not
interfere with saturating a 100M link with tcp.

The plan was to use iperf to test networking from the laptop to virtual machine
via a layer 3 router, in this case a Raspberry Pi router on a stick. This is not
the same test as my original usage, ie routing IPv6 traffic to an IPv6 tunnel
over IPv4. However I wanted to see how fast it would route and forward packets.
Also to make sure everything went via the Raspberry Pi I turned off ICMP
redirects on all 4 machines using:

```
echo 0 | tee /proc/sys/net/ipv4/conf/*/accept_redirects /proc/sys/net/ipv4/conf/*/send_redirects
```

### Addresses

So all 4 machines are connected to the same layer 2 bridge. The 192.168.1.0/24
addresses are given out by my home Internet router. I chose the 10.0.0.0/8
addresses to test with. For the IPv6 addresses I generated 4 address ranges from
the simple [dns](http://www.simpledns.com/private-ipv6.aspx) generator.

They were allocated as follows:

| Device          | IPv4 Address                                    | IPv6 Address                                            |
| --------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Laptop          | 192.168.1.64/24<br> 10.0.0.5/24<br> 10.0.2.5/24 | fd2b:656a:6fdb:a3a8::5/64<br> fd57:d1b1:9c79:40af::5/64 |
| Virtual Machine | 192.168.1.65/24<br> 10.0.1.5/24<br> 10.0.3.5/24 | fd14:9aa4:e604:ec36::1/64<br> fd45:64bf:295c:5631::1/64 |
| Raspberry Pi    | 10.0.0.1/24 <br> 10.0.1.1/24                    | fd2b:656a:6fdb:a3a8::1/64<br> fd14:9aa4:e604:ec36::2/64 |
| Raspberry Pi 2  | 10.0.2.1/24 <br> 10.0.3.1/24                    | fd57:d1b1:9c79:40af::1/64<br> fd45:64bf:295c:5631::2/64 |

The routing tables look as follows:

| Device          | Route                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laptop          | 10.0.0.0/24 dev br0 proto kernel scope link src 10.0.0.5 <br>10.0.1.0/24 via 10.0.0.1 dev br0 <br>10.0.2.0/24 dev br0 proto kernel scope link src 10.0.2.5 <br>10.0.3.0/24 via 10.0.2.1 dev br0 <br>                                                                               |
| Virtual Machine | 10.0.0.0/24 via 10.0.1.1 dev eth0 <br>10.0.1.0/24 dev eth0 proto kernel scope link src 10.0.1.5 <br>10.0.2.0/24 via 10.0.3.1 dev eth0 <br>10.0.3.0/24 dev eth0 proto kernel scope link src 10.0.3.5 <br>                                                                           |
| Laptop          | fd14:9aa4:e604:ec36::/64 via fd2b:656a:6fdb:a3a8::1 dev br0 metric 1024<br> fd2b:656a:6fdb:a3a8::/64 dev br0 proto kernel metric 256<br> fd45:64bf:295c:5631::/64 via fd57:d1b1:9c79:40af::1 dev br0 metric 1024<br> fd57:d1b1:9c79:40af::/64 dev br0 proto kernel metric 256 <br> |
| Virtual Machine | fd14:9aa4:e604:ec36::/64 via fd2b:656a:6fdb:a3a8::1 dev br0 metric 1024<br> fd2b:656a:6fdb:a3a8::/64 dev br0 proto kernel metric 256<br> fd45:64bf:295c:5631::/64 via fd57:d1b1:9c79:40af::1 dev br0 metric 1024<br> fd57:d1b1:9c79:40af::/64 dev br0 proto kernel metric 256<br>  |
| Raspberry Pi    | fd14:9aa4:e604:ec36::1 dev ipv6tun metric 1024<br> fd14:9aa4:e604:ec36::/64 dev ipv6tun proto kernel metric 256<br> fd2b:656a:6fdb:a3a8::/64 dev eth0 proto kernel metric 256<br>                                                                                                  |
| Raspberry Pi 2  | fd45:64bf:295c:5631::1 dev ipv6tun metric 1024<br> fd45:64bf:295c:5631::/64 dev ipv6tun proto kernel metric 256<br> fd57:d1b1:9c79:40af::/64 dev eth0 proto kernel metric 256<br>                                                                                                  |

### General info (version, arch, cpuinfo, memory)

I decided that during the write up I would not obscure the machines when pasting
commands. The laptop is known as lenovo, the virtual machine is debian, the
raspberry pi is lace and the raspberry pi 2 is jessie-rpi. This is just some
general information about the machines. Also note that the machines are not
running NTP, so timestamps sometimes look odd.

#### Laptop

```
root@lenovo:~# cat /etc/debian_version
8.0
root@lenovo:~#
```

```
root@lenovo:~# uname -a
Linux lenovo 3.16.0-4-amd64 #1 SMP Debian 3.16.7-ckt4-3 (2015-02-03) x86_64 GNU/Linux
root@lenovo:~#
```

```
root@lenovo:~# dpkg-architecture | grep DEB_HOST_ARCH
DEB_HOST_ARCH=amd64
DEB_HOST_ARCH_BITS=64
DEB_HOST_ARCH_CPU=amd64
DEB_HOST_ARCH_ENDIAN=little
DEB_HOST_ARCH_OS=linux
root@lenovo:~#
```

```
root@lenovo:~# cat /proc/cpuinfo
processor       : 0
vendor_id       : GenuineIntel
cpu family      : 6
model           : 42
model name      : Intel(R) Core(TM) i5-2520M CPU @ 2.50GHz
stepping        : 7
microcode       : 0x29
cpu MHz         : 2538.964
cache size      : 3072 KB
physical id     : 0
siblings        : 2
core id         : 0
cpu cores       : 2
apicid          : 0
initial apicid  : 0
fpu             : yes
fpu_exception   : yes
cpuid level     : 13
wp              : yes
flags           : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx rdtscp lm constant_tsc arch_perfmon pebs bts nopl xtopology nonstop_tsc aperfmperf eagerfpu pni pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ssse3 cx16 xtpr pdcm pcid sse4_1 sse4_2 x2apic popcnt tsc_deadline_timer aes xsave avx lahf_lm ida arat epb xsaveopt pln pts dtherm tpr_shadow vnmi flexpriority ept vpid
bogomips        : 4984.14
clflush size    : 64
cache_alignment : 64
address sizes   : 36 bits physical, 48 bits virtual
power management:

processor       : 1
vendor_id       : GenuineIntel
cpu family      : 6
model           : 42
model name      : Intel(R) Core(TM) i5-2520M CPU @ 2.50GHz
stepping        : 7
microcode       : 0x29
cpu MHz         : 2579.589
cache size      : 3072 KB
physical id     : 0
siblings        : 2
core id         : 1
cpu cores       : 2
apicid          : 2
initial apicid  : 2
fpu             : yes
fpu_exception   : yes
cpuid level     : 13
wp              : yes
flags           : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx rdtscp lm constant_tsc arch_perfmon pebs bts nopl xtopology nonstop_tsc aperfmperf eagerfpu pni pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ssse3 cx16 xtpr pdcm pcid sse4_1 sse4_2 x2apic popcnt tsc_deadline_timer aes xsave avx lahf_lm ida arat epb xsaveopt pln pts dtherm tpr_shadow vnmi flexpriority ept vpid
bogomips        : 4984.14
clflush size    : 64
cache_alignment : 64
address sizes   : 36 bits physical, 48 bits virtual
power management:

root@lenovo:~#
```

```
root@lenovo:~# free -m
             total       used       free     shared    buffers     cached
Mem:         15966       1325      14641         90         42        563
-/+ buffers/cache:        719      15246
Swap:         7590          0       7590
root@lenovo:~#
```

#### Virtual Machine

```
root@debian:~# cat /etc/debian_version
8.0
root@debian:~#
```

```
root@debian:~# uname -a
Linux debian 3.16.0-4-amd64 #1 SMP Debian 3.16.7-ckt4-3 (2015-02-03) x86_64 GNU/Linux
root@debian:~#
```

```
root@debian:~# dpkg-architecture | grep DEB_HOST_ARCH
DEB_HOST_ARCH=amd64
DEB_HOST_ARCH_BITS=64
DEB_HOST_ARCH_CPU=amd64
DEB_HOST_ARCH_ENDIAN=little
DEB_HOST_ARCH_OS=linux
root@debian:~#
```

```
root@debian:~# cat /proc/cpuinfo
processor       : 0
vendor_id       : GenuineIntel
cpu family      : 6
model           : 42
model name      : Intel Xeon E312xx (Sandy Bridge)
stepping        : 1G
microcode       : 0x1
cpu MHz         : 2491.904
cache size      : 4096 KB
physical id     : 0
siblings        : 1
core id         : 0
cpu cores       : 1
apicid          : 0
initial apicid  : 0
fpu             : yes
fpu_exception   : yes
cpuid level     : 13
wp              : yes
flags           : fpu de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 syscall nx rdtscp lm constant_tsc rep_good nopl eagerfpu pni pclmulqdq ssse3 cx16 sse4_1 sse4_2 x2apic popcnt tsc_deadline_timer aes xsave avx hypervisor lahf_lm xsaveopt
bogomips        : 4983.80
clflush size    : 64
cache_alignment : 64
address sizes   : 40 bits physical, 48 bits virtual
power management:

root@debian:~#
```

```
root@debian:~# free -m
             total       used       free     shared    buffers     cached
Mem:          1000         84        915          4          6         36
-/+ buffers/cache:         41        959
Swap:          707          0        707
root@debian:~#
```

#### Raspberry Pi

```
root@lace:~# cat /etc/debian_version
8.0
root@lace:~#
```

```
root@lace:~# uname -a
Linux lace 3.18.7+ #755 PREEMPT Thu Feb 12 17:14:31 GMT 2015 armv6l GNU/Linux
root@lace:~#
```

```
root@lace:~# dpkg-architecture | grep DEB_HOST_ARCH
DEB_HOST_ARCH=armel
DEB_HOST_ARCH_BITS=32
DEB_HOST_ARCH_CPU=arm
DEB_HOST_ARCH_ENDIAN=little
DEB_HOST_ARCH_OS=linux
root@lace:~#
```

```
root@lace:~# cat /proc/cpuinfo
processor       : 0
model name      : ARMv6-compatible processor rev 7 (v6l)
BogoMIPS        : 2.00
Features        : half thumb fastmult vfp edsp java tls
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xb76
CPU revision    : 7

Hardware        : BCM2708
Revision        : 000e
Serial          : 00000000364a1b21
root@lace:~#
root@lace:~# free -m
             total       used       free     shared    buffers     cached
Mem:           435         56        379          4          7         30
-/+ buffers/cache:         17        417
Swap:          255          0        255
root@lace:~#
```

#### Raspberry Pi 2

```
root@jessie-rpi:~# cat /etc/debian_version
8.0
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# uname -a
Linux jessie-rpi 3.18.0-trunk-rpi2 #1 SMP PREEMPT Debian 3.18.5-1~exp1.co1 (2015-02-02) armv7l GNU/Linux
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# dpkg-architecture | grep DEB_HOST_ARCH
DEB_HOST_ARCH=armhf
DEB_HOST_ARCH_BITS=32
DEB_HOST_ARCH_CPU=arm
DEB_HOST_ARCH_ENDIAN=little
DEB_HOST_ARCH_OS=linux
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# cat /proc/cpuinfo
processor       : 0
model name      : ARMv7 Processor rev 5 (v7l)
BogoMIPS        : 38.40
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt vfpd32 lpae evtstrm
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xc07
CPU revision    : 5

processor       : 1
model name      : ARMv7 Processor rev 5 (v7l)
BogoMIPS        : 38.40
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt vfpd32 lpae evtstrm
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xc07
CPU revision    : 5

processor       : 2
model name      : ARMv7 Processor rev 5 (v7l)
BogoMIPS        : 38.40
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt vfpd32 lpae evtstrm
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xc07
CPU revision    : 5

processor       : 3
model name      : ARMv7 Processor rev 5 (v7l)
BogoMIPS        : 38.40
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt vfpd32 lpae evtstrm
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xc07
CPU revision    : 5

Hardware        : BCM2709
Revision        : 0000
Serial          : 0000000000000000
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# free -m
             total       used       free     shared    buffers     cached
Mem:           925         62        863          6          8         27
-/+ buffers/cache:         25        899
Swap:            0          0          0
root@jessie-rpi:~#
```

### Network Settings

Next follows the actual network settings I used.

#### Laptop

```
root@lenovo:~# cat /etc/network/interfaces
iface eth0 inet manual
auto br0
iface br0 inet dhcp
        bridge_ports eth0
        bridge_maxwait 0

auto br0:1
iface br0:1 inet static
        address 10.0.0.5
        netmask 255.255.255.0
        post-up  /sbin/ip route add 10.0.1.0/24 via 10.0.0.1 dev br0
        pre-down /sbin/ip route del 10.0.1.0/24 via 10.0.0.1 dev br0

auto br0:2
iface br0:2 inet static
        address 10.0.2.5
        netmask 255.255.255.0
        post-up  /sbin/ip route add 10.0.3.0/24 via 10.0.2.1 dev br0
        pre-down /sbin/ip route del 10.0.3.0/24 via 10.0.2.1 dev br0

root@lenovo:~#
```

```
root@lenovo:~# ip -4 addr show br0
5: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    inet 192.168.1.64/24 brd 192.168.1.255 scope global br0
       valid_lft forever preferred_lft forever
    inet 10.0.0.5/24 brd 10.0.0.255 scope global br0:1
       valid_lft forever preferred_lft forever
    inet 10.0.2.5/24 brd 10.0.2.255 scope global br0:2
       valid_lft forever preferred_lft forever
root@lenovo:~#
```

```
root@lenovo:~# ip route
default via 192.168.1.254 dev br0
10.0.0.0/24 dev br0  proto kernel  scope link  src 10.0.0.5
10.0.1.0/24 via 10.0.0.1 dev br0
10.0.2.0/24 dev br0  proto kernel  scope link  src 10.0.2.5
10.0.3.0/24 via 10.0.2.1 dev br0
169.254.0.0/16 dev br0  scope link  metric 1000
192.168.1.0/24 dev br0  proto kernel  scope link  src 192.168.1.64
root@lenovo:~#
```

```
root@lenovo:~# brctl show
bridge name     bridge id               STP enabled     interfaces
br0             8000.f0def1db3597       no              eth0
                                                        vnet0
root@lenovo:~#
```

#### Virtual Machine

```
root@debian:~# cat /etc/network/interfaces
auto eth0
iface eth0 inet dhcp

auto eth0:1
iface eth0:1 inet static
        address 10.0.1.5
        netmask 255.255.255.0
        post-up  /sbin/ip route add 10.0.0.0/24 via 10.0.1.1 dev eth0
        pre-down /sbin/ip route del 10.0.0.0/24 via 10.0.1.1 dev eth0

auto eth0:2
iface eth0:2 inet static
        address 10.0.3.5
        netmask 255.255.255.0
        post-up  /sbin/ip route add 10.0.2.0/24 via 10.0.3.1 dev eth0
        pre-down /sbin/ip route del 10.0.2.0/24 via 10.0.3.1 dev eth0

root@debian:~#
```

```
root@debian:~# ip -4 addr show eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 192.168.1.65/24 brd 192.168.1.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet 10.0.1.5/24 brd 10.0.1.255 scope global eth0:1
       valid_lft forever preferred_lft forever
    inet 10.0.3.5/24 brd 10.0.3.255 scope global eth0:2
       valid_lft forever preferred_lft forever
root@debian:~#
```

```
root@debian:~# ip route
default via 192.168.1.254 dev eth0
10.0.0.0/24 via 10.0.1.1 dev eth0
10.0.1.0/24 dev eth0  proto kernel  scope link  src 10.0.1.5
10.0.2.0/24 via 10.0.3.1 dev eth0
10.0.3.0/24 dev eth0  proto kernel  scope link  src 10.0.3.5
192.168.1.0/24 dev eth0  proto kernel  scope link  src 192.168.1.65
root@debian:~#
```

#### Raspberry Pi

```
root@lace:~# cat /etc/network/interfaces
auto eth0:0
iface eth0:0 inet static
        address 10.0.0.1
        netmask 255.255.255.0

auto eth0:1
iface eth0:1 inet static
        address 10.0.1.1
        netmask 255.255.255.0

root@lace:~#
```

```
root@lace:~# ip -4 addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 10.0.0.1/24 brd 10.0.0.255 scope global eth0:0
       valid_lft forever preferred_lft forever
    inet 10.0.1.1/24 brd 10.0.1.255 scope global eth0:1
       valid_lft forever preferred_lft forever
root@lace:~#
```

```
root@lace:~# ip route
10.0.0.0/24 dev eth0  proto kernel  scope link  src 10.0.0.1
10.0.1.0/24 dev eth0  proto kernel  scope link  src 10.0.1.1
root@lace:~#
```

```
root@lace:~# cat /proc/sys/net/ipv4/ip_forward
1
root@lace:~#
```

#### Raspberry Pi 2

```
root@jessie-rpi:~# cat /etc/network/interfaces
auto eth0:0
iface eth0:0 inet static
        address 10.0.2.1
        netmask 255.255.255.0

auto eth0:1
iface eth0:1 inet static
        address 10.0.3.1
        netmask 255.255.255.0

root@jessie-rpi:~#
```

```
root@jessie-rpi:~# ip -4 addr show eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    inet 10.0.2.1/24 brd 10.0.2.255 scope global eth0:0
       valid_lft forever preferred_lft forever
    inet 10.0.3.1/24 brd 10.0.3.255 scope global eth0:1
       valid_lft forever preferred_lft forever
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# ip route
10.0.2.0/24 dev eth0  proto kernel  scope link  src 10.0.2.1
10.0.3.0/24 dev eth0  proto kernel  scope link  src 10.0.3.1
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# cat /proc/sys/net/ipv4/ip_forward
1
root@jessie-rpi:~#
```

### IPv6 Network Settings

#### Lenovo

section in /etc/network/interfaces:

```
auto br0:3
iface br0:3 inet6 static
	address fd2b:656a:6fdb:a3a8::5
	netmask 64
	post-up  /sbin/ip route add fd14:9aa4:e604:ec36::/64 via fd2b:656a:6fdb:a3a8::1 dev br0
	pre-down /sbin/ip route del fd14:9aa4:e604:ec36::/64 via fd2b:656a:6fdb:a3a8::1 dev br0

auto br0:4
iface br0:4 inet6 static
	address fd57:d1b1:9c79:40af::5
	netmask 64
	post-up  /sbin/ip route add fd45:64bf:295c:5631::/64 via fd57:d1b1:9c79:40af::1 dev br0
	pre-down /sbin/ip route del fd45:64bf:295c:5631::/64 via fd57:d1b1:9c79:40af::1 dev br0

```

```
root@lenovo:~# ip -6 addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
5: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet6 fd57:d1b1:9c79:40af::5/64 scope global deprecated
       valid_lft forever preferred_lft 0sec
    inet6 fd2b:656a:6fdb:a3a8::5/64 scope global deprecated
       valid_lft forever preferred_lft 0sec
    inet6 fe80::f2de:f1ff:fedb:3597/64 scope link
       valid_lft forever preferred_lft forever
6: vnet0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qlen 500
    inet6 fe80::fc54:ff:fe99:771d/64 scope link
       valid_lft forever preferred_lft forever
root@lenovo:~#
```

```
root@lenovo:~# ip -6 route
fd14:9aa4:e604:ec36::/64 via fd2b:656a:6fdb:a3a8::1 dev br0  metric 1024
fd2b:656a:6fdb:a3a8::/64 dev br0  proto kernel  metric 256
fd45:64bf:295c:5631::/64 via fd57:d1b1:9c79:40af::1 dev br0  metric 1024
fd57:d1b1:9c79:40af::/64 dev br0  proto kernel  metric 256
fe80::/64 dev br0  proto kernel  metric 256
fe80::/64 dev vnet0  proto kernel  metric 256
root@lenovo:~#
```

#### Virtual Machine

section in /etc/network/interfaces:

```
auto ipv6tun
iface ipv6tun inet6 v4tunnel
	address fd14:9aa4:e604:ec36::1
	netmask 64
	endpoint 10.0.1.1
	local 10.0.1.5
	ttl 255
	post-up  /sbin/ip route add fd2b:656a:6fdb:a3a8::/64 via fd14:9aa4:e604:ec36::2 dev ipv6tun
	pre-down /sbin/ip route del fd2b:656a:6fdb:a3a8::/64 via fd14:9aa4:e604:ec36::2 dev ipv6tun

auto ipv6tun2
iface ipv6tun2 inet6 v4tunnel
	address fd45:64bf:295c:5631::1
	netmask 64
	endpoint 10.0.3.1
	local 10.0.3.5
	ttl 255
	post-up  /sbin/ip route add fd57:d1b1:9c79:40af::/64 via fd45:64bf:295c:5631::2 dev ipv6tun2
	pre-down /sbin/ip route del fd57:d1b1:9c79:40af::/64 via fd45:64bf:295c:5631::2 dev ipv6tun2
```

```
thomas@debian:~$ ip -6 addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qlen 1000
    inet6 fe80::5054:ff:fe99:771d/64 scope link
       valid_lft forever preferred_lft forever
10: ipv6tun@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1480
    inet6 fd14:9aa4:e604:ec36::1/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::a00:105/64 scope link
       valid_lft forever preferred_lft forever
11: ipv6tun2@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1480
    inet6 fd45:64bf:295c:5631::1/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::a00:305/64 scope link
       valid_lft forever preferred_lft forever
thomas@debian:~$
```

```
thomas@debian:~$ ip -6 route
fd14:9aa4:e604:ec36::/64 dev ipv6tun  proto kernel  metric 256
fd2b:656a:6fdb:a3a8::/64 via fd14:9aa4:e604:ec36::2 dev ipv6tun  metric 1024
fd45:64bf:295c:5631::/64 dev ipv6tun2  proto kernel  metric 256
fd57:d1b1:9c79:40af::/64 via fd45:64bf:295c:5631::2 dev ipv6tun2  metric 1024
fe80::/64 dev eth0  proto kernel  metric 256
fe80::/64 dev ipv6tun  proto kernel  metric 256
fe80::/64 dev ipv6tun2  proto kernel  metric 256
thomas@debian:~$
```

#### Raspberry Pi

section in /etc/network/interfaces:

```
auto eth0:2
iface eth0:2 inet6 static
	address fd2b:656a:6fdb:a3a8::1
	netmask 64

auto ipv6tun
iface ipv6tun inet6 v4tunnel
	address fd14:9aa4:e604:ec36::2
	netmask 64
	endpoint 10.0.1.5
	local 10.0.1.1
	ttl 255
	gateway fd14:9aa4:e604:ec36::1

```

```
root@lace:~# ip -6 addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qlen 1000
    inet6 fd2b:656a:6fdb:a3a8::1/64 scope global deprecated
       valid_lft forever preferred_lft 0sec
    inet6 fe80::ba27:ebff:fe4a:1b21/64 scope link
       valid_lft forever preferred_lft forever
7: ipv6tun@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1480
    inet6 fd14:9aa4:e604:ec36::2/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::a00:101/64 scope link
       valid_lft forever preferred_lft forever
root@lace:~#
```

```
root@lace:~# ip -6 route
fd14:9aa4:e604:ec36::1 dev ipv6tun  metric 1024
fd14:9aa4:e604:ec36::/64 dev ipv6tun  proto kernel  metric 256
fd2b:656a:6fdb:a3a8::/64 dev eth0  proto kernel  metric 256
fe80::/64 dev eth0  proto kernel  metric 256
fe80::/64 dev ipv6tun  proto kernel  metric 256
default via fd14:9aa4:e604:ec36::1 dev ipv6tun  metric 1024
root@lace:~#
```

```
root@lace:~# cat /proc/sys/net/ipv6/conf/all/forwarding
1
root@lace:~#
```

#### Raspberry Pi 2

section in /etc/network/interfaces:

```
auto eth0:2
iface eth0:2 inet6 static
        address fd57:d1b1:9c79:40af::1
        netmask 64

auto ipv6tun
iface ipv6tun inet6 v4tunnel
        address fd45:64bf:295c:5631::2
        netmask 64
        endpoint 10.0.3.5
        local 10.0.3.1
        ttl 255
        gateway fd45:64bf:295c:5631::1
```

```
root@jessie-rpi:~# ip -6 addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qlen 1000
    inet6 fd57:d1b1:9c79:40af::1/64 scope global deprecated
       valid_lft forever preferred_lft 0sec
    inet6 fe80::ba27:ebff:fe27:51b9/64 scope link
       valid_lft forever preferred_lft forever
4: ipv6tun@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1480
    inet6 fd45:64bf:295c:5631::2/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::a00:301/64 scope link
       valid_lft forever preferred_lft forever
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# ip -6 route
fd45:64bf:295c:5631::1 dev ipv6tun  metric 1024
fd45:64bf:295c:5631::/64 dev ipv6tun  proto kernel  metric 256
fd57:d1b1:9c79:40af::/64 dev eth0  proto kernel  metric 256
fe80::/64 dev eth0  proto kernel  metric 256
fe80::/64 dev ipv6tun  proto kernel  metric 256
default via fd45:64bf:295c:5631::1 dev ipv6tun  metric 1024
root@jessie-rpi:~#
```

```
root@jessie-rpi:~# cat /proc/sys/net/ipv6/conf/all/forwarding
1
root@jessie-rpi:~#
```

### Process tables

As I mentioned the Raspberry machines were fairly simple without many background
tasks running that could potentially effect the results. Next is the full
process listing from both.

#### Raspberry Pi

```
root@lace:~# ps auxww
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.4  0.8   5324  3840 ?        Ss   11:16   0:05 /sbin/init
root         2  0.0  0.0      0     0 ?        S    11:16   0:00 [kthreadd]
root         3  0.0  0.0      0     0 ?        S    11:16   0:00 [ksoftirqd/0]
root         5  0.0  0.0      0     0 ?        S<   11:16   0:00 [kworker/0:0H]
root         7  0.0  0.0      0     0 ?        S    11:16   0:00 [rcu_preempt]
root         8  0.0  0.0      0     0 ?        S    11:16   0:00 [rcu_sched]
root         9  0.0  0.0      0     0 ?        S    11:16   0:00 [rcu_bh]
root        10  0.0  0.0      0     0 ?        S<   11:16   0:00 [khelper]
root        11  0.0  0.0      0     0 ?        S    11:16   0:00 [kdevtmpfs]
root        12  0.0  0.0      0     0 ?        S<   11:16   0:00 [netns]
root        13  0.0  0.0      0     0 ?        S<   11:16   0:00 [perf]
root        14  0.0  0.0      0     0 ?        S    11:16   0:00 [khungtaskd]
root        15  0.0  0.0      0     0 ?        S<   11:16   0:00 [writeback]
root        16  0.0  0.0      0     0 ?        S<   11:16   0:00 [crypto]
root        17  0.0  0.0      0     0 ?        S<   11:16   0:00 [bioset]
root        18  0.0  0.0      0     0 ?        S<   11:16   0:00 [kblockd]
root        20  0.0  0.0      0     0 ?        S<   11:16   0:00 [rpciod]
root        21  0.0  0.0      0     0 ?        S    11:16   0:00 [kswapd0]
root        22  0.0  0.0      0     0 ?        S    11:16   0:00 [fsnotify_mark]
root        23  0.0  0.0      0     0 ?        S<   11:16   0:00 [nfsiod]
root        29  0.0  0.0      0     0 ?        S<   11:16   0:00 [kthrotld]
root        30  0.0  0.0      0     0 ?        S<   11:16   0:00 [VCHIQ-0]
root        31  0.0  0.0      0     0 ?        S<   11:16   0:00 [VCHIQr-0]
root        32  0.0  0.0      0     0 ?        S<   11:16   0:00 [VCHIQs-0]
root        33  0.0  0.0      0     0 ?        S<   11:16   0:00 [iscsi_eh]
root        34  0.0  0.0      0     0 ?        S<   11:16   0:00 [dwc_otg]
root        35  0.0  0.0      0     0 ?        S<   11:16   0:00 [DWC Notificatio]
root        36  0.0  0.0      0     0 ?        S    11:16   0:00 [kworker/u2:1]
root        37  0.0  0.0      0     0 ?        S    11:16   0:00 [VCHIQka-0]
root        38  0.0  0.0      0     0 ?        S<   11:16   0:00 [SMIO]
root        39  0.0  0.0      0     0 ?        S<   11:16   0:00 [deferwq]
root        40  0.0  0.0      0     0 ?        S    11:16   0:00 [kworker/u2:2]
root        42  0.0  0.0      0     0 ?        S    11:16   0:00 [mmcqd/0]
root        43  0.0  0.0      0     0 ?        S    11:16   0:00 [scsi_eh_0]
root        44  0.0  0.0      0     0 ?        S<   11:16   0:00 [scsi_tmf_0]
root        45  0.0  0.0      0     0 ?        S    11:16   0:00 [usb-storage]
root        46  0.0  0.0      0     0 ?        S<   11:16   0:00 [kworker/0:1H]
root        47  0.0  0.0      0     0 ?        S    11:16   0:00 [jbd2/sda1-8]
root        48  0.0  0.0      0     0 ?        S<   11:16   0:00 [ext4-rsv-conver]
root        49  0.0  0.0      0     0 ?        S<   11:16   0:00 [ipv6_addrconf]
root        80  0.0  0.5   8132  2520 ?        Ss   11:17   0:00 /lib/systemd/systemd-journald
root        81  0.0  0.0      0     0 ?        S    11:17   0:00 [kauditd]
root        91  0.0  0.6  11116  2716 ?        Ss   11:17   0:00 /lib/systemd/systemd-udevd
root       272  0.0  0.9   7896  4368 ?        Ss   11:17   0:00 /usr/sbin/sshd -D
root       275  0.0  0.4   3348  2092 ?        Ss   11:17   0:00 /lib/systemd/systemd-logind
root       315  0.0  0.3   3976  1708 tty1     Ss+  11:17   0:00 /sbin/agetty --noclear tty1 linux
root       317  0.0  0.4   3796  1980 ttyAMA0  Ss+  11:17   0:00 /sbin/agetty --keep-baud 115200 38400 9600 ttyAMA0 vt102
root       413  0.0  0.0      0     0 ?        S    11:22   0:00 [kworker/0:0]
root       425  0.0  0.0      0     0 ?        S    11:32   0:00 [kworker/0:1]
root       426  0.3  1.1  11468  5312 ?        Ss   11:35   0:00 sshd: root@pts/0
root       428  0.4  0.9   6088  4192 pts/0    Ss   11:35   0:00 -bash
root       450  0.0  0.0      0     0 ?        S    11:37   0:00 [kworker/0:2]
root       623  0.0  0.4   4668  2104 pts/0    R+   11:39   0:00 ps auxww
root@lace:~#
```

#### Raspberry Pi 2

```
root@jessie-rpi:~# ps auxww
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.2  0.3   4364  3056 ?        Ss   00:16   0:04 /sbin/init
root         2  0.0  0.0      0     0 ?        S    00:16   0:00 [kthreadd]
root         3  0.0  0.0      0     0 ?        S    00:16   0:00 [ksoftirqd/0]
root         5  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/0:0H]
root         6  0.0  0.0      0     0 ?        S    00:16   0:00 [kworker/u8:0]
root         7  0.0  0.0      0     0 ?        S    00:16   0:00 [rcu_preempt]
root         8  0.0  0.0      0     0 ?        S    00:16   0:00 [rcu_sched]
root         9  0.0  0.0      0     0 ?        S    00:16   0:00 [rcu_bh]
root        10  0.0  0.0      0     0 ?        S    00:16   0:00 [migration/0]
root        11  0.0  0.0      0     0 ?        S    00:16   0:00 [watchdog/0]
root        12  0.0  0.0      0     0 ?        S    00:16   0:00 [watchdog/1]
root        13  0.0  0.0      0     0 ?        S    00:16   0:00 [migration/1]
root        14  0.0  0.0      0     0 ?        S    00:16   0:00 [ksoftirqd/1]
root        16  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/1:0H]
root        17  0.0  0.0      0     0 ?        S    00:16   0:00 [watchdog/2]
root        18  0.0  0.0      0     0 ?        S    00:16   0:00 [migration/2]
root        19  0.0  0.0      0     0 ?        S    00:16   0:00 [ksoftirqd/2]
root        21  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/2:0H]
root        22  0.0  0.0      0     0 ?        S    00:16   0:00 [watchdog/3]
root        23  0.0  0.0      0     0 ?        S    00:16   0:00 [migration/3]
root        24  0.0  0.0      0     0 ?        S    00:16   0:00 [ksoftirqd/3]
root        26  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/3:0H]
root        27  0.0  0.0      0     0 ?        S<   00:16   0:00 [khelper]
root        28  0.0  0.0      0     0 ?        S    00:16   0:00 [kdevtmpfs]
root        29  0.0  0.0      0     0 ?        S<   00:16   0:00 [netns]
root        30  0.0  0.0      0     0 ?        S<   00:16   0:00 [perf]
root        31  0.0  0.0      0     0 ?        S    00:16   0:00 [khungtaskd]
root        32  0.0  0.0      0     0 ?        S<   00:16   0:00 [writeback]
root        33  0.0  0.0      0     0 ?        SN   00:16   0:00 [ksmd]
root        34  0.0  0.0      0     0 ?        S<   00:16   0:00 [crypto]
root        35  0.0  0.0      0     0 ?        S    00:16   0:00 [kworker/1:1]
root        36  0.0  0.0      0     0 ?        S<   00:16   0:00 [kintegrityd]
root        37  0.0  0.0      0     0 ?        S<   00:16   0:00 [bioset]
root        38  0.0  0.0      0     0 ?        S<   00:16   0:00 [kblockd]
root        39  0.0  0.0      0     0 ?        S<   00:16   0:00 [devfreq_wq]
root        40  0.0  0.0      0     0 ?        S<   00:16   0:00 [rpciod]
root        41  0.0  0.0      0     0 ?        S    00:16   0:00 [kswapd0]
root        42  0.0  0.0      0     0 ?        S    00:16   0:00 [fsnotify_mark]
root        43  0.0  0.0      0     0 ?        S<   00:16   0:00 [nfsiod]
root        53  0.0  0.0      0     0 ?        S<   00:16   0:00 [kthrotld]
root        54  0.0  0.0      0     0 ?        S    00:16   0:00 [kworker/0:1]
root        55  0.0  0.0      0     0 ?        S<   00:16   0:00 [VCHIQ-0]
root        56  0.0  0.0      0     0 ?        S<   00:16   0:00 [VCHIQr-0]
root        57  0.0  0.0      0     0 ?        S<   00:16   0:00 [VCHIQs-0]
root        58  0.0  0.0      0     0 ?        S<   00:16   0:00 [iscsi_eh]
root        59  0.0  0.0      0     0 ?        S<   00:16   0:00 [dwc_otg]
root        60  0.0  0.0      0     0 ?        S<   00:16   0:00 [DWC Notificatio]
root        62  0.0  0.0      0     0 ?        S<   00:16   0:00 [ipv6_addrconf]
root        63  0.0  0.0      0     0 ?        S    00:16   0:00 [mmcqd/0]
root        64  0.0  0.0      0     0 ?        S    00:16   0:00 [VCHIQka-0]
root        65  0.0  0.0      0     0 ?        S<   00:16   0:00 [SMIO]
root        66  0.0  0.0      0     0 ?        S<   00:16   0:00 [deferwq]
root        67  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/0:1H]
root        68  0.0  0.0      0     0 ?        S    00:16   0:00 [jbd2/mmcblk0p2-]
root        69  0.0  0.0      0     0 ?        S<   00:16   0:00 [ext4-rsv-conver]
root        70  0.0  0.0      0     0 ?        S    00:16   0:00 [kworker/2:1]
root        84  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/2:1H]
root        94  0.0  0.2   9196  2156 ?        Ss   00:16   0:00 /lib/systemd/systemd-journald
root        95  0.0  0.0      0     0 ?        S    00:16   0:00 [kauditd]
root        97  0.0  0.0      0     0 ?        S<   00:16   0:00 [kworker/3:1H]
root       109  0.0  0.0      0     0 ?        S    00:17   0:00 [kworker/0:2]
root       112  0.0  0.0      0     0 ?        S<   00:17   0:00 [kworker/1:1H]
root       115  0.0  0.2  10692  2388 ?        Ss   00:17   0:00 /lib/systemd/systemd-udevd
root       121  0.0  0.0      0     0 ?        S    00:17   0:00 [kworker/3:2]
root       143  0.0  0.0      0     0 ?        S<   00:17   0:00 [bcm2708_spi.0]
root       149  0.0  0.0      0     0 ?        S    00:17   0:00 [kworker/u8:2]
root       262  0.0  0.3   6524  3700 ?        Ss   00:17   0:00 /usr/sbin/sshd -D
root       267  0.0  0.1   2672  1660 ?        Ss   00:17   0:00 /lib/systemd/systemd-logind
root       286  0.0  0.2   4280  2592 ?        Ss   00:17   0:00 /usr/sbin/irqbalance --pid=/var/run/irqbalance.pid
root       297  0.0  0.1   3544  1300 tty1     Ss+  00:17   0:00 /sbin/agetty --noclear tty1 linux
root       298  0.0  0.1   3364  1608 ttyAMA0  Ss+  00:17   0:00 /sbin/agetty --keep-baud 115200 38400 9600 ttyAMA0 vt102
root       356  0.0  0.0      0     0 ?        S    00:22   0:00 [kworker/2:0]
root       376  0.0  0.0      0     0 ?        S    00:32   0:00 [kworker/1:0]
root       377  0.0  0.0      0     0 ?        S    00:32   0:00 [kworker/3:0]
root       384  0.2  0.4  10060  4420 ?        Rs   00:36   0:00 sshd: root@pts/0
root       386  0.0  0.2   4516  2672 pts/0    Ss   00:37   0:00 -bash
root       432  0.0  0.0      0     0 ?        S    00:39   0:00 [kworker/0:0]
root       435  0.0  0.0      0     0 ?        S    00:39   0:00 [kworker/1:2]
root       501  0.0  0.0      0     0 ?        S    00:39   0:00 [kworker/2:2]
root       533  0.0  0.2  31596  2260 ?        Ssl  00:40   0:00 /usr/sbin/rsyslogd -n
root       591  0.0  0.0      0     0 ?        S    00:40   0:00 [kworker/3:1]
root       610  0.0  0.1   4220  1728 pts/0    R+   00:41   0:00 ps auxww
root@jessie-rpi:~#
```

## Testing the Setup

I wanted to make sure that my setup worked.

### Ping test Raspberry Pi

```
root@lenovo:~# ping -n -c 1 10.0.1.5
PING 10.0.1.5 (10.0.1.5) 56(84) bytes of data.
64 bytes from 10.0.1.5: icmp_seq=1 ttl=63 time=1.05 ms

--- 10.0.1.5 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 1.058/1.058/1.058/0.000 ms
root@lenovo:~#
root@debian:~# ping -n -c 1 10.0.0.5
PING 10.0.0.5 (10.0.0.5) 56(84) bytes of data.
64 bytes from 10.0.0.5: icmp_seq=1 ttl=63 time=1.17 ms

--- 10.0.0.5 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 1.174/1.174/1.174/0.000 ms
root@debian:~#
```

on lace:

```
15:36:22.694730 IP 10.0.0.5 > 10.0.1.5: ICMP echo request, id 6361, seq 1, length 64
15:36:22.694839 IP 10.0.0.5 > 10.0.1.5: ICMP echo request, id 6361, seq 1, length 64
15:36:22.695393 IP 10.0.1.5 > 10.0.0.5: ICMP echo reply, id 6361, seq 1, length 64
15:36:22.695466 IP 10.0.1.5 > 10.0.0.5: ICMP echo reply, id 6361, seq 1, length 64
15:39:08.508467 IP 10.0.1.5 > 10.0.0.5: ICMP echo request, id 617, seq 1, length 64
15:39:08.508573 IP 10.0.1.5 > 10.0.0.5: ICMP echo request, id 617, seq 1, length 64
15:39:08.509071 IP 10.0.0.5 > 10.0.1.5: ICMP echo reply, id 617, seq 1, length 64
15:39:08.509145 IP 10.0.0.5 > 10.0.1.5: ICMP echo reply, id 617, seq 1, length 64
```

```
root@lenovo:~# ping6  -n -c 1 fd14:9aa4:e604:ec36::1
PING fd14:9aa4:e604:ec36::1(fd14:9aa4:e604:ec36::1) 56 data bytes
64 bytes from fd14:9aa4:e604:ec36::1: icmp_seq=1 ttl=63 time=1.81 ms

--- fd14:9aa4:e604:ec36::1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 1.815/1.815/1.815/0.000 ms
root@lenovo:~#
```

```
16:50:59.673220 IP6 fd2b:656a:6fdb:a3a8::5 > fd14:9aa4:e604:ec36::1: ICMP6, echo request, seq 1, length 64
16:50:59.673591 IP 10.0.1.1 > 10.0.1.5: IP6 fd2b:656a:6fdb:a3a8::5 > fd14:9aa4:e604:ec36::1: ICMP6, echo request, seq 1, length 64
16:50:59.674247 IP 10.0.1.5 > 10.0.1.1: IP6 fd14:9aa4:e604:ec36::1 > fd2b:656a:6fdb:a3a8::5: ICMP6, echo reply, seq 1, length 64
16:50:59.674526 IP6 fd14:9aa4:e604:ec36::1 > fd2b:656a:6fdb:a3a8::5: ICMP6, echo reply, seq 1, length 64
```

```
root@debian:~# ping6 -n -c 1 fd2b:656a:6fdb:a3a8::5
PING fd2b:656a:6fdb:a3a8::5(fd2b:656a:6fdb:a3a8::5) 56 data bytes
64 bytes from fd2b:656a:6fdb:a3a8::5: icmp_seq=1 ttl=63 time=1.59 ms

--- fd2b:656a:6fdb:a3a8::5 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 1.592/1.592/1.592/0.000 ms
root@debian:~#
```

```
16:52:24.635238 IP 10.0.1.5 > 10.0.1.1: IP6 fd14:9aa4:e604:ec36::1 > fd2b:656a:6fdb:a3a8::5: ICMP6, echo request, seq 1, length 64
16:52:24.635535 IP6 fd14:9aa4:e604:ec36::1 > fd2b:656a:6fdb:a3a8::5: ICMP6, echo request, seq 1, length 64
16:52:24.636044 IP6 fd2b:656a:6fdb:a3a8::5 > fd14:9aa4:e604:ec36::1: ICMP6, echo reply, seq 1, length 64
16:52:24.636270 IP 10.0.1.1 > 10.0.1.5: IP6 fd2b:656a:6fdb:a3a8::5 > fd14:9aa4:e604:ec36::1: ICMP6, echo reply, seq 1, length 64
```

### Ping test Raspberry Pi 2

```
root@lenovo:~# ping -n -c 1 10.0.3.5
PING 10.0.3.5 (10.0.3.5) 56(84) bytes of data.
64 bytes from 10.0.3.5: icmp_seq=1 ttl=63 time=0.938 ms

--- 10.0.3.5 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.938/0.938/0.938/0.000 ms
root@lenovo:~#
root@debian:~# ping -n -c 1 10.0.2.5
PING 10.0.2.5 (10.0.2.5) 56(84) bytes of data.
64 bytes from 10.0.2.5: icmp_seq=1 ttl=63 time=0.948 ms

--- 10.0.2.5 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.948/0.948/0.948/0.000 ms
root@debian:~#
```

on jessie-rpi:

```
04:41:49.288131 IP 10.0.2.5 > 10.0.3.5: ICMP echo request, id 6432, seq 1, length 64
04:41:49.288194 IP 10.0.2.5 > 10.0.3.5: ICMP echo request, id 6432, seq 1, length 64
04:41:49.288634 IP 10.0.3.5 > 10.0.2.5: ICMP echo reply, id 6432, seq 1, length 64
04:41:49.288664 IP 10.0.3.5 > 10.0.2.5: ICMP echo reply, id 6432, seq 1, length 64
04:42:29.480065 IP 10.0.3.5 > 10.0.2.5: ICMP echo request, id 619, seq 1, length 64
04:42:29.480147 IP 10.0.3.5 > 10.0.2.5: ICMP echo request, id 619, seq 1, length 64
04:42:29.480540 IP 10.0.2.5 > 10.0.3.5: ICMP echo reply, id 619, seq 1, length 64
04:42:29.480577 IP 10.0.2.5 > 10.0.3.5: ICMP echo reply, id 619, seq 1, length 64
```

```
root@lenovo:~# ping6 -n -c 1 fd45:64bf:295c:5631::1
PING fd45:64bf:295c:5631::1(fd45:64bf:295c:5631::1) 56 data bytes
64 bytes from fd45:64bf:295c:5631::1: icmp_seq=1 ttl=63 time=1.30 ms

--- fd45:64bf:295c:5631::1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 1.301/1.301/1.301/0.000 ms
root@lenovo:~#
```

```
05:55:27.640219 IP6 fd57:d1b1:9c79:40af::5 > fd45:64bf:295c:5631::1: ICMP6, echo request, seq 1, length 64
05:55:27.640458 IP 10.0.3.1 > 10.0.3.5: IP6 fd57:d1b1:9c79:40af::5 > fd45:64bf:295c:5631::1: ICMP6, echo request, seq 1, length 64
05:55:27.641028 IP 10.0.3.5 > 10.0.3.1: IP6 fd45:64bf:295c:5631::1 > fd57:d1b1:9c79:40af::5: ICMP6, echo reply, seq 1, length 64
05:55:27.641146 IP6 fd45:64bf:295c:5631::1 > fd57:d1b1:9c79:40af::5: ICMP6, echo reply, seq 1, length 64
```

```
root@debian:~# ping6 -n -c 1 fd57:d1b1:9c79:40af::5
PING fd57:d1b1:9c79:40af::5(fd57:d1b1:9c79:40af::5) 56 data bytes
64 bytes from fd57:d1b1:9c79:40af::5: icmp_seq=1 ttl=63 time=1.41 ms

--- fd57:d1b1:9c79:40af::5 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 1.411/1.411/1.411/0.000 ms
root@debian:~#
```

```
05:56:18.711525 IP 10.0.3.5 > 10.0.3.1: IP6 fd45:64bf:295c:5631::1 > fd57:d1b1:9c79:40af::5: ICMP6, echo request, seq 1, length 64
05:56:18.711745 IP6 fd45:64bf:295c:5631::1 > fd57:d1b1:9c79:40af::5: ICMP6, echo request, seq 1, length 64
05:56:18.712165 IP6 fd57:d1b1:9c79:40af::5 > fd45:64bf:295c:5631::1: ICMP6, echo reply, seq 1, length 64
05:56:18.712290 IP 10.0.3.1 > 10.0.3.5: IP6 fd57:d1b1:9c79:40af::5 > fd45:64bf:295c:5631::1: ICMP6, echo reply, seq 1, length 64
```

### iperf to test 1G links on Laptop and Virtual machine

These iperf tests were run from another machine on my network and show that both
the laptop and the virtual machine are capable of handling the traffic.

```
homas@diamond:~$ iperf3 -c 192.168.1.64 -i 1 -t 10
Connecting to host 192.168.1.64, port 5201
[  4] local 192.168.1.149 port 53778 connected to 192.168.1.64 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-1.00   sec   112 MBytes   943 Mbits/sec    0    147 KBytes
[  4]   1.00-2.00   sec   112 MBytes   941 Mbits/sec    0    160 KBytes
[  4]   2.00-3.00   sec   112 MBytes   942 Mbits/sec    0    160 KBytes
[  4]   3.00-4.00   sec   112 MBytes   941 Mbits/sec    0    165 KBytes
[  4]   4.00-5.00   sec   112 MBytes   941 Mbits/sec    0    168 KBytes
[  4]   5.00-6.00   sec   112 MBytes   941 Mbits/sec    0    168 KBytes
[  4]   6.00-7.00   sec   112 MBytes   941 Mbits/sec    0    168 KBytes
[  4]   7.00-8.00   sec   112 MBytes   941 Mbits/sec    0    174 KBytes
[  4]   8.00-9.00   sec   101 MBytes   848 Mbits/sec    0    178 KBytes
[  4]   9.00-10.00  sec   101 MBytes   849 Mbits/sec    0    182 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-10.00  sec  1.07 GBytes   923 Mbits/sec    0             sender
[  4]   0.00-10.00  sec  1.07 GBytes   923 Mbits/sec                  receiver

iperf Done.
thomas@diamond:~$ iperf3 -c 192.168.1.65 -i 1 -t 10
Connecting to host 192.168.1.65, port 5201
[  4] local 192.168.1.149 port 44367 connected to 192.168.1.65 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-1.00   sec   112 MBytes   940 Mbits/sec    0    194 KBytes
[  4]   1.00-2.00   sec   112 MBytes   942 Mbits/sec    0    238 KBytes
[  4]   2.00-3.00   sec   112 MBytes   941 Mbits/sec    0    260 KBytes
[  4]   3.00-4.00   sec   112 MBytes   939 Mbits/sec    0    301 KBytes
[  4]   4.00-5.00   sec   112 MBytes   941 Mbits/sec    0    321 KBytes
[  4]   5.00-6.00   sec   112 MBytes   942 Mbits/sec    0    338 KBytes
[  4]   6.00-7.00   sec   112 MBytes   940 Mbits/sec    0    366 KBytes
[  4]   7.00-8.00   sec   112 MBytes   942 Mbits/sec    0    382 KBytes
[  4]   8.00-9.00   sec   112 MBytes   941 Mbits/sec    0    390 KBytes
[  4]   9.00-10.00  sec   112 MBytes   941 Mbits/sec    0    397 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-10.00  sec  1.10 GBytes   941 Mbits/sec    0             sender
[  4]   0.00-10.00  sec  1.09 GBytes   941 Mbits/sec                  receiver

iperf Done.
thomas@diamond:~$
```

### iperf to test internal laptop bridge

```
root@lenovo:~# iperf3 -c 192.168.1.65 -i 1 -t 10
Connecting to host 192.168.1.65, port 5201
[  4] local 192.168.1.64 port 45713 connected to 192.168.1.65 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-1.00   sec  1.82 GBytes  15.6 Gbits/sec    0   2.27 MBytes
[  4]   1.00-2.00   sec  1.84 GBytes  15.8 Gbits/sec    0   3.00 MBytes
[  4]   2.00-3.00   sec  1.80 GBytes  15.5 Gbits/sec    0   3.01 MBytes
[  4]   3.00-4.00   sec  1.75 GBytes  15.0 Gbits/sec    0   3.01 MBytes
[  4]   4.00-5.00   sec  1.83 GBytes  15.7 Gbits/sec    0   3.01 MBytes
[  4]   5.00-6.00   sec  1.79 GBytes  15.4 Gbits/sec    0   3.01 MBytes
[  4]   6.00-7.00   sec  1.78 GBytes  15.3 Gbits/sec    0   3.01 MBytes
[  4]   7.00-8.00   sec  1.83 GBytes  15.7 Gbits/sec    0   3.01 MBytes
[  4]   8.00-9.00   sec  1.83 GBytes  15.7 Gbits/sec    0   3.01 MBytes
[  4]   9.00-10.00  sec  1.82 GBytes  15.6 Gbits/sec    0   3.01 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-10.00  sec  18.1 GBytes  15.5 Gbits/sec    0             sender
[  4]   0.00-10.00  sec  18.1 GBytes  15.5 Gbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

## Tests

### IPv4

#### No Monitoring

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c 10.0.1.5 -i 30 -t 900
Connecting to host 10.0.1.5, port 5201
[  4] local 10.0.0.5 port 43257 connected to 10.0.1.5 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   236 MBytes  66.1 Mbits/sec  254   1.19 MBytes
[  4]  30.00-60.00  sec   233 MBytes  65.0 Mbits/sec  128   1.58 MBytes
[  4]  60.00-90.00  sec   234 MBytes  65.4 Mbits/sec  210   1.19 MBytes
[  4]  90.00-120.00 sec   231 MBytes  64.7 Mbits/sec  130   1.87 MBytes
[  4] 120.00-150.00 sec   235 MBytes  65.7 Mbits/sec  273   1.23 MBytes
[  4] 150.00-180.00 sec   235 MBytes  65.7 Mbits/sec  334   1.08 MBytes
[  4] 180.00-210.00 sec   234 MBytes  65.3 Mbits/sec  116   1.25 MBytes
[  4] 210.00-240.00 sec   235 MBytes  65.6 Mbits/sec  317   1.18 MBytes
[  4] 240.00-270.00 sec   235 MBytes  65.7 Mbits/sec  110   1.36 MBytes
[  4] 270.00-300.00 sec   230 MBytes  64.4 Mbits/sec  248   1.16 MBytes
[  4] 300.00-330.00 sec   235 MBytes  65.7 Mbits/sec   86   1.68 MBytes
[  4] 330.00-360.00 sec   236 MBytes  66.1 Mbits/sec  358   1.21 MBytes
[  4] 360.00-390.00 sec   236 MBytes  66.1 Mbits/sec  171   1.95 MBytes
[  4] 390.00-420.00 sec   234 MBytes  65.4 Mbits/sec  272   1.21 MBytes
[  4] 420.00-450.00 sec   236 MBytes  66.0 Mbits/sec  291   1.11 MBytes
[  4] 450.00-480.00 sec   236 MBytes  66.1 Mbits/sec  186   1.28 MBytes
[  4] 480.00-510.00 sec   236 MBytes  66.1 Mbits/sec  302   1.17 MBytes
[  4] 510.00-540.00 sec   234 MBytes  65.3 Mbits/sec  137   1.36 MBytes
[  4] 540.00-570.00 sec   233 MBytes  65.2 Mbits/sec  184   1.16 MBytes
[  4] 570.00-600.00 sec   235 MBytes  65.7 Mbits/sec  119   1.56 MBytes
[  4] 600.00-630.00 sec   236 MBytes  66.1 Mbits/sec  480   1.05 MBytes
[  4] 630.00-660.00 sec   235 MBytes  65.7 Mbits/sec   52   1.21 MBytes
[  4] 660.00-690.00 sec   236 MBytes  66.0 Mbits/sec  336   1.18 MBytes
[  4] 690.00-720.00 sec   236 MBytes  66.0 Mbits/sec  184   1.43 MBytes
[  4] 720.00-750.02 sec   235 MBytes  65.8 Mbits/sec  293   1.19 MBytes
[  4] 750.02-780.00 sec   235 MBytes  65.8 Mbits/sec  167   1.62 MBytes
[  4] 780.00-810.00 sec   234 MBytes  65.4 Mbits/sec  202   1.21 MBytes
[  4] 810.00-840.00 sec   236 MBytes  66.0 Mbits/sec  339   1.25 MBytes
[  4] 840.00-870.00 sec   235 MBytes  65.8 Mbits/sec  334   1.18 MBytes
[  4] 870.00-900.00 sec   233 MBytes  65.1 Mbits/sec  114   1.36 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  6.88 GBytes  65.6 Mbits/sec  6727             sender
[  4]   0.00-900.00 sec  6.88 GBytes  65.6 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c 10.0.1.5 -i 30 -t 900 -R
Connecting to host 10.0.1.5, port 5201
Reverse mode, remote host 10.0.1.5 is sending
[  4] local 10.0.0.5 port 43738 connected to 10.0.1.5 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   222 MBytes  62.2 Mbits/sec
[  4]  30.00-60.00  sec   225 MBytes  62.9 Mbits/sec
[  4]  60.00-90.00  sec   222 MBytes  62.2 Mbits/sec
[  4]  90.00-120.00 sec   223 MBytes  62.4 Mbits/sec
[  4] 120.00-150.00 sec   223 MBytes  62.3 Mbits/sec
[  4] 150.00-180.00 sec   223 MBytes  62.4 Mbits/sec
[  4] 180.00-210.00 sec   222 MBytes  62.2 Mbits/sec
[  4] 210.00-240.00 sec   225 MBytes  62.9 Mbits/sec
[  4] 240.00-270.00 sec   225 MBytes  62.8 Mbits/sec
[  4] 270.00-300.00 sec   225 MBytes  62.8 Mbits/sec
[  4] 300.00-330.00 sec   223 MBytes  62.3 Mbits/sec
[  4] 330.00-360.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 360.00-390.00 sec   224 MBytes  62.5 Mbits/sec
[  4] 390.00-420.00 sec   222 MBytes  62.2 Mbits/sec
[  4] 420.00-450.00 sec   227 MBytes  63.5 Mbits/sec
[  4] 450.00-480.00 sec   227 MBytes  63.4 Mbits/sec
[  4] 480.00-510.00 sec   223 MBytes  62.3 Mbits/sec
[  4] 510.00-540.00 sec   224 MBytes  62.8 Mbits/sec
[  4] 540.00-570.00 sec   225 MBytes  62.9 Mbits/sec
[  4] 570.00-600.00 sec   227 MBytes  63.6 Mbits/sec
[  4] 600.00-630.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 630.00-660.00 sec   227 MBytes  63.5 Mbits/sec
[  4] 660.00-690.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 690.00-720.00 sec   227 MBytes  63.4 Mbits/sec
[  4] 720.00-750.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 750.00-780.00 sec   227 MBytes  63.4 Mbits/sec
[  4] 780.00-810.00 sec   227 MBytes  63.4 Mbits/sec
[  4] 810.00-840.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 840.00-870.00 sec   227 MBytes  63.3 Mbits/sec
[  4] 870.00-900.00 sec   226 MBytes  63.2 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  6.59 GBytes  62.9 Mbits/sec  817             sender
[  4]   0.00-900.00 sec  6.59 GBytes  62.9 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c 10.0.3.5 -i 30 -t 900
Connecting to host 10.0.3.5, port 5201
[  4] local 10.0.2.5 port 33128 connected to 10.0.3.5 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   322 MBytes  90.1 Mbits/sec  175   1.89 MBytes
[  4]  30.00-60.00  sec   321 MBytes  89.8 Mbits/sec  165   1.26 MBytes
[  4]  60.00-90.00  sec   320 MBytes  89.4 Mbits/sec   68   1.51 MBytes
[  4]  90.00-120.00 sec   320 MBytes  89.4 Mbits/sec  192   1.25 MBytes
[  4] 120.00-150.00 sec   320 MBytes  89.4 Mbits/sec   56   1.39 MBytes
[  4] 150.00-180.00 sec   320 MBytes  89.4 Mbits/sec  194   1.17 MBytes
[  4] 180.00-210.00 sec   321 MBytes  89.8 Mbits/sec   55   1.35 MBytes
[  4] 210.00-240.00 sec   320 MBytes  89.4 Mbits/sec  104   1.15 MBytes
[  4] 240.00-270.00 sec   320 MBytes  89.4 Mbits/sec   64   1.32 MBytes
[  4] 270.00-300.00 sec   320 MBytes  89.5 Mbits/sec  176   1.07 MBytes
[  4] 300.00-330.00 sec   320 MBytes  89.4 Mbits/sec   88   1.26 MBytes
[  4] 330.00-360.00 sec   319 MBytes  89.1 Mbits/sec  209   1.50 MBytes
[  4] 360.00-390.00 sec   320 MBytes  89.5 Mbits/sec  134   1.18 MBytes
[  4] 390.00-420.00 sec   320 MBytes  89.5 Mbits/sec  104   1.32 MBytes
[  4] 420.00-450.00 sec   319 MBytes  89.1 Mbits/sec  149   1.16 MBytes
[  4] 450.00-480.00 sec   320 MBytes  89.5 Mbits/sec   73   1.32 MBytes
[  4] 480.00-510.00 sec   316 MBytes  88.4 Mbits/sec  114   2.53 MBytes
[  4] 510.00-540.00 sec   316 MBytes  88.4 Mbits/sec  226   1.14 MBytes
[  4] 540.00-570.00 sec   318 MBytes  89.0 Mbits/sec  107   1.32 MBytes
[  4] 570.00-600.00 sec   320 MBytes  89.4 Mbits/sec  178   1.19 MBytes
[  4] 600.00-630.00 sec   321 MBytes  89.8 Mbits/sec   78   1.31 MBytes
[  4] 630.00-660.00 sec   319 MBytes  89.1 Mbits/sec  160   1.10 MBytes
[  4] 660.00-690.00 sec   321 MBytes  89.8 Mbits/sec  120   1.26 MBytes
[  4] 690.00-720.00 sec   317 MBytes  88.7 Mbits/sec  145   1.08 MBytes
[  4] 720.00-750.00 sec   320 MBytes  89.5 Mbits/sec   98   1.27 MBytes
[  4] 750.00-780.00 sec   320 MBytes  89.4 Mbits/sec   45   2.07 MBytes
[  4] 780.00-810.00 sec   318 MBytes  88.8 Mbits/sec  178   1.31 MBytes
[  4] 810.00-840.00 sec   320 MBytes  89.5 Mbits/sec   88   2.12 MBytes
[  4] 840.00-870.00 sec   320 MBytes  89.5 Mbits/sec  150   1.27 MBytes
[  4] 870.00-900.00 sec   319 MBytes  89.1 Mbits/sec   49   1.79 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  9.36 GBytes  89.3 Mbits/sec  3742             sender
[  4]   0.00-900.00 sec  9.36 GBytes  89.3 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c 10.0.3.5 -i 30 -t 900 -R
Connecting to host 10.0.3.5, port 5201
Reverse mode, remote host 10.0.3.5 is sending
[  4] local 10.0.2.5 port 33581 connected to 10.0.3.5 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   280 MBytes  78.2 Mbits/sec
[  4]  30.00-60.00  sec   279 MBytes  77.9 Mbits/sec
[  4]  60.00-90.00  sec   279 MBytes  78.0 Mbits/sec
[  4]  90.00-120.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 120.00-150.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 150.00-180.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 180.00-210.00 sec   278 MBytes  77.9 Mbits/sec
[  4] 210.00-240.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 240.00-270.00 sec   278 MBytes  77.9 Mbits/sec
[  4] 270.00-300.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 300.00-330.00 sec   278 MBytes  77.6 Mbits/sec
[  4] 330.00-360.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 360.00-390.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 390.00-420.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 420.00-450.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 450.00-480.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 480.00-510.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 510.00-540.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 540.00-570.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 570.00-600.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 600.00-630.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 630.00-660.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 660.00-690.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 690.00-720.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 720.00-750.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 750.00-780.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 780.00-810.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 810.00-840.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 840.00-870.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 870.00-900.00 sec   279 MBytes  78.0 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  8.17 GBytes  78.0 Mbits/sec   40             sender
[  4]   0.00-900.00 sec  8.17 GBytes  78.0 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

#### With dstat Monitoring

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c 10.0.1.5 -i 30 -t 900
Connecting to host 10.0.1.5, port 5201
[  4] local 10.0.0.5 port 43319 connected to 10.0.1.5 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   235 MBytes  65.7 Mbits/sec  390   1.19 MBytes
[  4]  30.00-60.00  sec   234 MBytes  65.4 Mbits/sec  253   1.18 MBytes
[  4]  60.00-90.00  sec   233 MBytes  65.3 Mbits/sec  298   1.05 MBytes
[  4]  90.00-120.00 sec   232 MBytes  65.0 Mbits/sec   71   1.22 MBytes
[  4] 120.00-150.00 sec   234 MBytes  65.3 Mbits/sec  319   1.16 MBytes
[  4] 150.00-180.00 sec   235 MBytes  65.6 Mbits/sec  299   1.17 MBytes
[  4] 180.00-210.00 sec   235 MBytes  65.6 Mbits/sec  170   1.94 MBytes
[  4] 210.00-240.00 sec   235 MBytes  65.7 Mbits/sec  323   1.22 MBytes
[  4] 240.00-270.00 sec   235 MBytes  65.7 Mbits/sec  318   1.05 MBytes
[  4] 270.00-300.00 sec   231 MBytes  64.7 Mbits/sec  112   1.22 MBytes
[  4] 300.00-330.00 sec   231 MBytes  64.7 Mbits/sec  314   1.65 MBytes
[  4] 330.00-360.00 sec   234 MBytes  65.4 Mbits/sec  262   1.23 MBytes
[  4] 360.00-390.00 sec   231 MBytes  64.6 Mbits/sec  214   1.14 MBytes
[  4] 390.00-420.00 sec   232 MBytes  64.9 Mbits/sec  107   1.31 MBytes
[  4] 420.00-450.00 sec   234 MBytes  65.4 Mbits/sec  296   1.88 MBytes
[  4] 450.00-480.00 sec   234 MBytes  65.3 Mbits/sec  232   1.24 MBytes
[  4] 480.00-510.00 sec   235 MBytes  65.7 Mbits/sec  332   1.60 MBytes
[  4] 510.00-540.00 sec   235 MBytes  65.7 Mbits/sec  288   1.19 MBytes
[  4] 540.00-570.00 sec   233 MBytes  65.1 Mbits/sec  134   1.68 MBytes
[  4] 570.00-600.00 sec   231 MBytes  64.7 Mbits/sec  226   1.21 MBytes
[  4] 600.00-630.00 sec   235 MBytes  65.7 Mbits/sec  167   2.01 MBytes
[  4] 630.00-660.00 sec   231 MBytes  64.7 Mbits/sec  412   1.81 MBytes
[  4] 660.00-690.00 sec   235 MBytes  65.7 Mbits/sec  256   1.21 MBytes
[  4] 690.00-720.00 sec   233 MBytes  65.0 Mbits/sec  142   1.98 MBytes
[  4] 720.00-750.00 sec   234 MBytes  65.4 Mbits/sec  459   1.15 MBytes
[  4] 750.00-780.00 sec   232 MBytes  65.0 Mbits/sec  162   1.35 MBytes
[  4] 780.00-810.00 sec   231 MBytes  64.7 Mbits/sec  269   1.11 MBytes
[  4] 810.00-840.00 sec   234 MBytes  65.4 Mbits/sec  324   1.70 MBytes
[  4] 840.00-870.00 sec   231 MBytes  64.7 Mbits/sec  297   1.60 MBytes
[  4] 870.00-900.00 sec   231 MBytes  64.6 Mbits/sec  231   1.10 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  6.83 GBytes  65.2 Mbits/sec  7677             sender
[  4]   0.00-900.00 sec  6.83 GBytes  65.2 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lace:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@lace:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  90   0   0  10|ksoftirqd/0  9.7|   0     0
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  20B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  26B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  54B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  24B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  29B   12B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  22B   11B
0.16 0.05 0.06|  0   0  54   0   0  45|ksoftirqd/0   42|3951k 3999k
0.49 0.14 0.08|  0   0   0   0   0 100|ksoftirqd/0   93|8450k 8612k
0.80 0.25 0.12|  0   0   0   0   0  99|ksoftirqd/0   92|8315k 8486k
1.14 0.39 0.17|  0   0   0   0   0 100|ksoftirqd/0   93|8485k 8663k
1.20 0.48 0.21|  0   0   0   0   0  99|ksoftirqd/0   92|8324k 8487k
1.32 0.57 0.25|  0   0   1   0   0  99|ksoftirqd/0   92|8408k 3968M
1.25 0.63 0.28|  0   0   0   0   0 100|ksoftirqd/0   94|3968M 8589k
1.15 0.67 0.30|  0   0   0   0   0 100|ksoftirqd/0   94|8573k 8748k
1.23 0.73 0.34|  0   0   0   0   0 100|ksoftirqd/0   92|8351k 8511k
1.07 0.74 0.35|  0   0   0   0   0 100|ksoftirqd/0   91|8396k 8561k
1.04 0.76 0.37|  0   0   0   0   0 100|ksoftirqd/0   93|8501k 8670k
1.27 0.85 0.41|  0   0   0   0   0 100|ksoftirqd/0   92|8280k 8451k
1.16 0.86 0.43|  0   0   0   0   0 100|ksoftirqd/0   92|8343k 8499k
1.10 0.88 0.45|  0   0   0   0   0 100|ksoftirqd/0   92|8382k 8561k
1.08 0.89 0.47|  0   0   0   0   0 100|ksoftirqd/0   93|8316k 8485k
1.05 0.90 0.48|  0   0   0   0   0 100|ksoftirqd/0   93|8465k 8631k
1.03 0.91 0.50|  0   0   0   0   0 100|ksoftirqd/0   94|8397k 8560k
1.08 0.93 0.52|  0   0   0   0   0 100|ksoftirqd/0   94|8478k 8644k
1.12 0.96 0.54|  0   0   0   0   0 100|ksoftirqd/0   93|8507k 8674k
1.07 0.96 0.56|  0   0   0   0   0 100|ksoftirqd/0   91|8241k 8406k
1.05 0.96 0.57|  0   0   0   0   0 100|ksoftirqd/0   92|8369k 8543k
1.03 0.96 0.59|  0   0   0   0   0 100|ksoftirqd/0   94|8534k 3968M
1.07 0.98 0.60|  0   0   0   0   0 100|ksoftirqd/0   91|8306k 8475k
1.04 0.99 0.62|  0   0   0   0   0 100|ksoftirqd/0   93|3968M 8649k
1.03 0.99 0.63|  0   0   0   0   0 100|ksoftirqd/0   93|8409k 8573k
1.02 0.99 0.64|  0   0   0   0   0 100|ksoftirqd/0   93|8406k 8563k
1.01 0.99 0.65|  0   0   0   0   0 100|ksoftirqd/0   92|8358k 8526k
1.13 1.02 0.67|  0   0   1   0   0  99|ksoftirqd/0   91|8288k 8453k
1.13 1.03 0.69|  0   0   0   0   0 100|ksoftirqd/0   93|8447k 8621k
1.08 1.03 0.70|  0   0   0   0   0  99|ksoftirqd/0   92|8262k 8419k
0.83 0.98 0.69|  0   0  44   0   0  56|ksoftirqd/0   51|4485k 4597k
0.50 0.88 0.67|  0   0 100   0   0   0|kworker/0:1  0.1|  19B   11B
0.30 0.80 0.65|  0   0 100   0   0   0|kworker/0:1  0.0|  22B   11B
0.18 0.72 0.63|  0   0 100   0   0   0|kworker/0:1  0.0|  22B   11B
0.11 0.65 0.61|  0   0 100   0   0   0|kworker/0:1  0.1|  26B   11B
root@lace:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c 10.0.3.5 -i 30 -t 900
Connecting to host 10.0.3.5, port 5201
[  4] local 10.0.2.5 port 33166 connected to 10.0.3.5 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   321 MBytes  89.9 Mbits/sec  234   1.28 MBytes
[  4]  30.00-60.00  sec   321 MBytes  89.8 Mbits/sec   88   1.52 MBytes
[  4]  60.00-90.00  sec   320 MBytes  89.5 Mbits/sec  151   1.24 MBytes
[  4]  90.00-120.00 sec   321 MBytes  89.7 Mbits/sec   63   1.59 MBytes
[  4] 120.00-150.00 sec   320 MBytes  89.5 Mbits/sec  166   1.25 MBytes
[  4] 150.00-180.00 sec   320 MBytes  89.5 Mbits/sec   83   1.44 MBytes
[  4] 180.00-210.00 sec   320 MBytes  89.4 Mbits/sec  151   1.75 MBytes
[  4] 210.00-240.00 sec   320 MBytes  89.4 Mbits/sec  207   1.29 MBytes
[  4] 240.00-270.00 sec   319 MBytes  89.1 Mbits/sec   51   1.80 MBytes
[  4] 270.00-300.00 sec   320 MBytes  89.4 Mbits/sec  262   1.05 MBytes
[  4] 300.00-330.00 sec   320 MBytes  89.5 Mbits/sec   69   1.30 MBytes
[  4] 330.00-360.00 sec   319 MBytes  89.1 Mbits/sec  129   1.12 MBytes
[  4] 360.00-390.00 sec   320 MBytes  89.5 Mbits/sec   69   1.31 MBytes
[  4] 390.00-420.00 sec   319 MBytes  89.1 Mbits/sec  128   1.10 MBytes
[  4] 420.00-450.00 sec   320 MBytes  89.4 Mbits/sec   69   1.30 MBytes
[  4] 450.00-480.00 sec   319 MBytes  89.1 Mbits/sec  146   1.06 MBytes
[  4] 480.00-510.00 sec   321 MBytes  89.8 Mbits/sec   72   1.28 MBytes
[  4] 510.00-540.00 sec   319 MBytes  89.1 Mbits/sec  143   1.09 MBytes
[  4] 540.00-570.00 sec   320 MBytes  89.5 Mbits/sec  117   1.27 MBytes
[  4] 570.00-600.00 sec   319 MBytes  89.1 Mbits/sec   47   1.95 MBytes
[  4] 600.00-630.00 sec   320 MBytes  89.4 Mbits/sec  235   1.41 MBytes
[  4] 630.00-660.00 sec   320 MBytes  89.5 Mbits/sec  117   1.75 MBytes
[  4] 660.00-690.00 sec   320 MBytes  89.4 Mbits/sec  166   1.26 MBytes
[  4] 690.00-720.00 sec   319 MBytes  89.1 Mbits/sec   72   1.66 MBytes
[  4] 720.00-750.00 sec   317 MBytes  88.8 Mbits/sec  166   1.30 MBytes
[  4] 750.00-780.00 sec   320 MBytes  89.5 Mbits/sec  101   1.59 MBytes
[  4] 780.00-810.00 sec   320 MBytes  89.5 Mbits/sec  161   1.26 MBytes
[  4] 810.00-840.00 sec   320 MBytes  89.5 Mbits/sec   84   1.39 MBytes
[  4] 840.00-870.00 sec   317 MBytes  88.7 Mbits/sec  167   1.31 MBytes
[  4] 870.00-900.00 sec   317 MBytes  88.6 Mbits/sec   81   1.49 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  9.36 GBytes  89.3 Mbits/sec  3795             sender
[  4]   0.00-900.00 sec  9.36 GBytes  89.3 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@jessie-rpi:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@jessie-rpi:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  99   0   0   1|ksoftirqd/0  0.8|   0     0
   0 0.01 0.05|  0   0 100   0   0   0|sshd: root@pt0.0|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/u8:2 0.0|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  25B   11B
   0 0.01 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.3|  11M   11M
   0 0.01 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|3971M   11M
0.07 0.03 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.04 0.03 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   12M
0.09 0.04 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.3|  11M   11M
0.06 0.04 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.3|  11M   11M
0.09 0.05 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.19 0.08 0.06|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.12 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.6|  11M   11M
0.07 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.04 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M 3971M
0.03 0.05 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.6|  11M   11M
0.10 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.13 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.6|3971M   11M
0.14 0.08 0.06|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.09 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.05 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.03 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.15 0.09 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.09 0.08 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.05 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.11 0.08 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.07 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M 3971M
0.04 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.5|  11M   11M
0.11 0.08 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.7|  11M   11M
0.06 0.07 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.3|3971M   11M
0.04 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.3|  11M   11M
0.02 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.4|  11M   11M
0.01 0.05 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.6|  11M   11M
0.07 0.06 0.05|  0   0  97   0   0   3|ksoftirqd/0  2.6|  11M   11M
0.04 0.06 0.05|  0   0 100   0   0   0|ksoftirqd/0  0.1| 281k  308k
0.03 0.05 0.05|  0   0 100   0   0   0|irqbalance   0.0|  24B   11B
0.02 0.05 0.05|  0   0 100   0   0   0|kworker/u8:2 0.0|  22B   11B
0.01 0.04 0.05|  0   0 100   0   0   0|irqbalance   0.0|  21B   11B
0.01 0.04 0.05|  0   0 100   0   0   0|irqbalance   0.0|  22B   11B
   0 0.04 0.05|  0   0 100   0   0   0|irqbalance   0.0|  20B   11B
root@jessie-rpi:~#
```

#### With dstat Monitoring (reverse)

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c 10.0.1.5 -i 30 -t 900 -R
Connecting to host 10.0.1.5, port 5201
Reverse mode, remote host 10.0.1.5 is sending
[  4] local 10.0.0.5 port 43353 connected to 10.0.1.5 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   225 MBytes  63.0 Mbits/sec
[  4]  30.00-60.00  sec   222 MBytes  62.2 Mbits/sec
[  4]  60.00-90.00  sec   227 MBytes  63.4 Mbits/sec
[  4]  90.00-120.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 120.00-150.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 150.00-180.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 180.00-210.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 210.00-240.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 240.00-270.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 270.00-300.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 300.00-330.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 330.00-360.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 360.00-390.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 390.00-420.00 sec   226 MBytes  63.1 Mbits/sec
[  4] 420.00-450.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 450.00-480.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 480.00-510.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 510.00-540.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 540.00-570.00 sec   227 MBytes  63.3 Mbits/sec
[  4] 570.00-600.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 600.00-630.00 sec   225 MBytes  63.0 Mbits/sec
[  4] 630.00-660.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 660.00-690.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 690.00-720.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 720.00-750.00 sec   226 MBytes  63.2 Mbits/sec
[  4] 750.00-780.00 sec   226 MBytes  63.1 Mbits/sec
[  4] 780.00-810.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 810.00-840.00 sec   225 MBytes  63.0 Mbits/sec
[  4] 840.00-870.00 sec   226 MBytes  63.3 Mbits/sec
[  4] 870.00-900.00 sec   226 MBytes  63.1 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  6.62 GBytes  63.2 Mbits/sec   47             sender
[  4]   0.00-900.00 sec  6.62 GBytes  63.2 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lace:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@lace:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  90   0   0  10|ksoftirqd/0  9.3|   0     0
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:2  0.1|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:2  0.0|  53B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:2  0.0|  19B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  30B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  22B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  20B   11B
0.16 0.05 0.06|  0   0  93   0   0   7|ksoftirqd/0  6.8| 741k  743k
0.60 0.17 0.10|  0   0   0   0   0 100|ksoftirqd/0   92|8164k 8302k
0.76 0.25 0.13|  0   0   0   0   0 100|ksoftirqd/0   93|7936k 8128k
0.92 0.34 0.16|  0   0   0   0   0 100|ksoftirqd/0   92|8219k 8371k
0.95 0.40 0.18|  0   0   0   0   0  99|ksoftirqd/0   92|8067k 8234k
0.97 0.45 0.21|  0   0   0   0   0 100|ksoftirqd/0   93|8157k 8300k
0.98 0.50 0.23|  0   0   0   0   0 100|ksoftirqd/0   93|8189k 8341k
0.99 0.55 0.26|  0   0   0   0   0 100|ksoftirqd/0   93|8091k 8242k
1.11 0.62 0.29|  0   0   0   0   0 100|ksoftirqd/0   93|8203k 3968M
1.12 0.67 0.32|  0   0   0   0   0 100|ksoftirqd/0   92|8064k 8218k
1.19 0.74 0.35|  0   0   0   0   0 100|ksoftirqd/0   92|3967M 8205k
1.17 0.78 0.38|  0   0   0   0   0 100|ksoftirqd/0   94|8185k 8344k
1.15 0.81 0.40|  0   0   0   0   0 100|ksoftirqd/0   93|8126k 8280k
1.25 0.88 0.44|  0   0   0   0   0 100|ksoftirqd/0   93|8161k 8309k
1.27 0.92 0.46|  0   0   0   0   0 100|ksoftirqd/0   92|8180k 8335k
1.33 0.97 0.50|  0   0   0   0   0 100|ksoftirqd/0   93|8132k 8284k
1.25 0.99 0.52|  0   0   0   0   0 100|ksoftirqd/0   92|8072k 8248k
1.33 1.04 0.55|  0   0   0   0   0 100|ksoftirqd/0   93|8101k 8230k
1.42 1.10 0.59|  0   0   0   0   0 100|ksoftirqd/0   93|8100k 8255k
1.38 1.12 0.61|  0   0   0   0   0 100|ksoftirqd/0   93|8149k 8301k
1.23 1.11 0.62|  0   0   0   0   0 100|ksoftirqd/0   93|8173k 8333k
1.19 1.11 0.64|  0   0   0   0   0  99|ksoftirqd/0   92|8197k 8353k
1.31 1.15 0.67|  0   0   0   0   0 100|ksoftirqd/0   92|7992k 8158k
1.30 1.17 0.69|  0   0   0   0   0 100|ksoftirqd/0   93|8098k 8229k
1.67 1.28 0.74|  0   0   0   0   0 100|ksoftirqd/0   93|8251k 8414k
1.46 1.27 0.75|  0   0   0   0   0 100|ksoftirqd/0   92|8010k 3967M
1.28 1.24 0.76|  0   0   0   0   0 100|ksoftirqd/0   93|8119k 8277k
1.23 1.23 0.78|  0   0   0   0   0 100|ksoftirqd/0   93|8161k 8292k
1.22 1.23 0.79|  0   0   0   0   0  99|ksoftirqd/0   92|3967M 8221k
1.13 1.21 0.79|  0   0   0   0   0 100|ksoftirqd/0   94|8120k 8278k
1.08 1.19 0.80|  0   0   6   0   0  94|ksoftirqd/0   87|7492k 7664k
0.65 1.07 0.77|  0   0 100   0   0   0|kworker/0:2  0.1|  26B   15B
0.40 0.97 0.75|  0   0 100   0   0   0|kworker/0:2  0.0|  85B   11B
0.24 0.88 0.72|  0   0 100   0   0   0|kworker/0:2  0.0|  22B   11B
0.15 0.79 0.70|  0   0 100   0   0   0|kworker/0:2  0.1|  22B   11B
0.09 0.72 0.68|  0   0 100   0   0   0|kworker/0:2  0.0|  22B   11B
0.05 0.65 0.66|  0   0 100   0   0   0|kworker/0:2  0.0|  20B   11B
0.03 0.59 0.64|  0   0 100   0   0   0|kworker/0:2  0.1|  20B   11B
0.02 0.53 0.62|  0   0 100   0   0   0|kworker/0:2  0.0|  28B   11B
0.01 0.48 0.60|  0   0 100   0   0   0|kworker/0:2  0.0|  22B   11B
0.01 0.43 0.58|  0   0 100   0   0   0|kworker/0:2  0.1|  19B   11B
   0 0.39 0.56|  0   0 100   0   0   0|kworker/0:2  0.0|  26B   11B
   0 0.36 0.54|  0   0 100   0   0   0|kworker/0:2  0.0|  19B   11B
   0 0.32 0.52|  0   0 100   0   0   0|kworker/0:2  0.1|  51B   11B
   0 0.29 0.51|  0   0 100   0   0   0|kworker/0:2  0.0|  24B   12B
   0 0.26 0.49|  0   0 100   0   0   0|kworker/0:2  0.0|  29B   11B
   0 0.24 0.48|  0   0 100   0   0   0|kworker/0:2  0.0|  19B   11B
   0 0.22 0.46|  0   0 100   0   0   0|kworker/0:2  0.1|  19B   11B
   0 0.19 0.45|  0   0 100   0   0   0|kworker/0:2  0.0|  19B   11B
   0 0.18 0.43|  0   0 100   0   0   0|kworker/0:2  0.0|  24B   11B
root@lace:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c 10.0.3.5 -i 30 -t 900 -R
Connecting to host 10.0.3.5, port 5201
Reverse mode, remote host 10.0.3.5 is sending
[  4] local 10.0.2.5 port 33208 connected to 10.0.3.5 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   281 MBytes  78.6 Mbits/sec
[  4]  30.00-60.00  sec   279 MBytes  78.0 Mbits/sec
[  4]  60.00-90.00  sec   279 MBytes  78.1 Mbits/sec
[  4]  90.00-120.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 120.00-150.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 150.00-180.00 sec   278 MBytes  77.7 Mbits/sec
[  4] 180.00-210.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 210.00-240.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 240.00-270.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 270.00-300.00 sec   281 MBytes  78.5 Mbits/sec
[  4] 300.00-330.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 330.00-360.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 360.00-390.00 sec   278 MBytes  77.9 Mbits/sec
[  4] 390.00-420.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 420.00-450.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 450.00-480.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 480.00-510.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 510.00-540.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 540.00-570.00 sec   278 MBytes  77.9 Mbits/sec
[  4] 570.00-600.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 600.00-630.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 630.00-660.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 660.00-690.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 690.00-720.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 720.00-750.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 750.00-780.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 780.00-810.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 810.00-840.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 840.00-870.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 870.00-900.00 sec   279 MBytes  78.0 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  8.18 GBytes  78.1 Mbits/sec   85             sender
[  4]   0.00-900.00 sec  8.18 GBytes  78.1 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@jessie-rpi:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@jessie-rpi:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
0.08 0.03 0.05|  0   0  99   0   0   1|ksoftirqd/0  0.6|   0     0
0.05 0.03 0.05|  0   0 100   0   0   0|kworker/u8:2 0.0|  24B   11B
0.03 0.03 0.05|  0   0 100   0   0   0|irqbalance   0.0|  36B   11B
0.02 0.02 0.05|  0   0 100   0   0   0|kworker/1:2  0.0|  52B   11B
0.01 0.02 0.05|  0   0 100   0   0   0|irqbalance   0.0|  24B   11B
0.01 0.02 0.05|  0   0 100   0   0   0|kworker/u8:2 0.0|  39B   11B
0.14 0.05 0.05|  0   0  96   0   0   4|ksoftirqd/0  3.6|9420k 9606k
0.14 0.06 0.06|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.09 0.05 0.05|  0   0  95   0   0   5|ksoftirqd/0  4.3|  10M   10M
0.05 0.05 0.05|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.17 0.07 0.06|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.17 0.08 0.06|  0   0  95   0   0   5|ksoftirqd/0  4.1|9999k 3969M
0.23 0.11 0.07|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.31 0.14 0.08|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.24 0.14 0.08|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.28 0.16 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.3|3969M   10M
0.24 0.16 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.3|  10M   10M
0.14 0.15 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.09 0.13 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.2|9991k   10M
0.11 0.14 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.07 0.12 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.12 0.13 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.15 0.13 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.09 0.12 0.09|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.19 0.14 0.10|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M 3969M
0.19 0.14 0.10|  0   0  95   0   0   5|ksoftirqd/0  4.1|9985k   10M
0.22 0.16 0.11|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.27 0.18 0.12|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.32 0.19 0.12|  0   0  95   0   0   5|ksoftirqd/0  4.2|3969M   10M
0.20 0.17 0.12|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.25 0.19 0.13|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.20 0.19 0.13|  0   0  95   0   0   5|ksoftirqd/0  4.3|  10M   10M
0.19 0.18 0.13|  0   0  95   0   0   5|ksoftirqd/0  4.1|  10M   10M
0.11 0.17 0.13|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.20 0.18 0.14|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.18 0.18 0.14|  0   0  95   0   0   5|ksoftirqd/0  4.2|  10M   10M
0.11 0.16 0.13|  0   0 100   0   0   0|ksoftirqd/0  0.4| 802k  834k
0.07 0.15 0.13|  0   0 100   0   0   0|kworker/3:0  0.0|  34B   11B
0.04 0.13 0.13|  0   0 100   0   0   0|irqbalance   0.0|  51B   11B
0.03 0.12 0.13|  0   0 100   0   0   0|irqbalance   0.0|  31B   11B
0.02 0.11 0.12|  0   0 100   0   0   0|irqbalance   0.0|  38B   11B
0.01 0.10 0.12|  0   0 100   0   0   0|kworker/1:2  0.0|  22B   11B
0.01 0.09 0.12|  0   0 100   0   0   0|irqbalance   0.0|  20B   11B
   0 0.08 0.11|  0   0 100   0   0   0|kworker/3:0  0.0|  23B   11B
   0 0.07 0.11|  0   0 100   0   0   0|irqbalance   0.0|  22B   11B
   0 0.07 0.11|  0   0 100   0   0   0|irqbalance   0.0|  77B   11B
   0 0.06 0.10|  0   0 100   0   0   0|kworker/3:0  0.0|  19B   11B
root@jessie-rpi:~#
```

### IPv6

#### No Monitoring

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
[  4] local fd2b:656a:6fdb:a3a8::5 port 35754 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   171 MBytes  47.7 Mbits/sec   83   1.38 MBytes
[  4]  30.00-60.00  sec   169 MBytes  47.3 Mbits/sec   84   1.65 MBytes
[  4]  60.00-90.00  sec   170 MBytes  47.6 Mbits/sec   68   1.67 MBytes
[  4]  90.00-120.00 sec   170 MBytes  47.6 Mbits/sec   74   1.48 MBytes
[  4] 120.00-150.00 sec   170 MBytes  47.6 Mbits/sec   12   1.73 MBytes
[  4] 150.00-180.00 sec   169 MBytes  47.2 Mbits/sec  253   1.69 MBytes
[  4] 180.00-210.00 sec   170 MBytes  47.7 Mbits/sec  104   1.23 MBytes
[  4] 210.00-240.00 sec   170 MBytes  47.6 Mbits/sec  337   1.82 MBytes
[  4] 240.00-270.00 sec   169 MBytes  47.3 Mbits/sec  250   1.26 MBytes
[  4] 270.00-300.00 sec   170 MBytes  47.6 Mbits/sec   82   1.55 MBytes
[  4] 300.00-330.00 sec   169 MBytes  47.3 Mbits/sec  483   1.53 MBytes
[  4] 330.00-360.00 sec   171 MBytes  47.7 Mbits/sec  177   1000 KBytes
[  4] 360.00-390.00 sec   171 MBytes  47.8 Mbits/sec   20   1.22 MBytes
[  4] 390.00-420.00 sec   169 MBytes  47.3 Mbits/sec  429   1.94 MBytes
[  4] 420.00-450.00 sec   170 MBytes  47.6 Mbits/sec   18   1.23 MBytes
[  4] 450.00-480.00 sec   170 MBytes  47.6 Mbits/sec  184   1.79 MBytes
[  4] 480.00-510.00 sec   169 MBytes  47.2 Mbits/sec  329   1.31 MBytes
[  4] 510.00-540.00 sec   171 MBytes  47.9 Mbits/sec   23   1.24 MBytes
[  4] 540.00-570.00 sec   169 MBytes  47.2 Mbits/sec  275   1.49 MBytes
[  4] 570.00-600.00 sec   171 MBytes  47.9 Mbits/sec   12   1.33 MBytes
[  4] 600.00-630.00 sec   170 MBytes  47.6 Mbits/sec  111   1.33 MBytes
[  4] 630.00-660.00 sec   170 MBytes  47.5 Mbits/sec  134   1.49 MBytes
[  4] 660.00-690.00 sec   169 MBytes  47.2 Mbits/sec  218   1.52 MBytes
[  4] 690.00-720.00 sec   171 MBytes  47.7 Mbits/sec  317   1.39 MBytes
[  4] 720.00-750.00 sec   169 MBytes  47.3 Mbits/sec   33   1.75 MBytes
[  4] 750.00-780.00 sec   170 MBytes  47.6 Mbits/sec  189   1.65 MBytes
[  4] 780.00-810.00 sec   170 MBytes  47.6 Mbits/sec   37   1.07 MBytes
[  4] 810.00-840.00 sec   170 MBytes  47.5 Mbits/sec  353   1.19 MBytes
[  4] 840.00-870.00 sec   168 MBytes  47.0 Mbits/sec  569   1.61 MBytes
[  4] 870.00-900.00 sec   170 MBytes  47.7 Mbits/sec  189   1.77 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  4.98 GBytes  47.5 Mbits/sec  5447             sender
[  4]   0.00-900.00 sec  4.98 GBytes  47.5 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900 -R
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
Reverse mode, remote host fd14:9aa4:e604:ec36::1 is sending
[  4] local fd2b:656a:6fdb:a3a8::5 port 35760 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   179 MBytes  50.0 Mbits/sec
[  4]  30.00-60.00  sec   180 MBytes  50.4 Mbits/sec
[  4]  60.00-90.00  sec   180 MBytes  50.4 Mbits/sec
[  4]  90.00-120.00 sec   181 MBytes  50.5 Mbits/sec
[  4] 120.00-150.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 150.00-180.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 180.00-210.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 210.00-240.00 sec   181 MBytes  50.7 Mbits/sec
[  4] 240.00-270.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 270.00-300.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 300.00-330.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 330.00-360.00 sec   181 MBytes  50.5 Mbits/sec
[  4] 360.00-390.00 sec   181 MBytes  50.6 Mbits/sec
[  4] 390.00-420.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 420.00-450.00 sec   181 MBytes  50.7 Mbits/sec
[  4] 450.00-480.00 sec   180 MBytes  50.2 Mbits/sec
[  4] 480.00-510.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 510.00-540.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 540.00-570.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 570.00-600.00 sec   180 MBytes  50.5 Mbits/sec
[  4] 600.00-630.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 630.00-660.00 sec   181 MBytes  50.5 Mbits/sec
[  4] 660.00-690.00 sec   181 MBytes  50.6 Mbits/sec
[  4] 690.00-720.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 720.00-750.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 750.00-780.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 780.00-810.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 810.00-840.00 sec   181 MBytes  50.6 Mbits/sec
[  4] 840.00-870.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 870.00-900.00 sec   181 MBytes  50.6 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  5.28 GBytes  50.4 Mbits/sec  16915             sender
[  4]   0.00-900.00 sec  5.28 GBytes  50.4 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900
Connecting to host fd45:64bf:295c:5631::1, port 5201
[  4] local fd57:d1b1:9c79:40af::5 port 43677 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   307 MBytes  85.8 Mbits/sec   21   2.04 MBytes
[  4]  30.00-60.00  sec   308 MBytes  86.2 Mbits/sec   18   1.20 MBytes
[  4]  60.00-90.00  sec   305 MBytes  85.2 Mbits/sec   18   1.25 MBytes
[  4]  90.00-120.00 sec   306 MBytes  85.5 Mbits/sec   20   1.27 MBytes
[  4] 120.00-150.00 sec   307 MBytes  85.9 Mbits/sec    8   2.00 MBytes
[  4] 150.00-180.00 sec   306 MBytes  85.5 Mbits/sec    8   1.59 MBytes
[  4] 180.00-210.00 sec   307 MBytes  85.8 Mbits/sec    4   2.01 MBytes
[  4] 210.00-240.00 sec   306 MBytes  85.6 Mbits/sec    6   1.70 MBytes
[  4] 240.00-270.00 sec   307 MBytes  85.9 Mbits/sec    6   2.09 MBytes
[  4] 270.00-300.00 sec   306 MBytes  85.5 Mbits/sec   21   1.25 MBytes
[  4] 300.00-330.00 sec   307 MBytes  85.8 Mbits/sec    9   2.11 MBytes
[  4] 330.00-360.00 sec   307 MBytes  85.8 Mbits/sec   11   1.31 MBytes
[  4] 360.00-390.00 sec   305 MBytes  85.4 Mbits/sec   15   1.44 MBytes
[  4] 390.00-420.00 sec   305 MBytes  85.4 Mbits/sec   43   1.96 MBytes
[  4] 420.00-450.00 sec   304 MBytes  85.1 Mbits/sec    8   1.32 MBytes
[  4] 450.00-480.00 sec   306 MBytes  85.4 Mbits/sec    7   1.60 MBytes
[  4] 480.00-510.00 sec   306 MBytes  85.5 Mbits/sec   16   1.21 MBytes
[  4] 510.00-540.00 sec   306 MBytes  85.4 Mbits/sec   18   1.42 MBytes
[  4] 540.00-570.00 sec   307 MBytes  85.9 Mbits/sec    3   1.86 MBytes
[  4] 570.00-600.00 sec   306 MBytes  85.6 Mbits/sec    6   2.07 MBytes
[  4] 600.00-630.00 sec   306 MBytes  85.6 Mbits/sec   20   1.09 MBytes
[  4] 630.00-660.00 sec   305 MBytes  85.4 Mbits/sec    3   1.36 MBytes
[  4] 660.00-690.00 sec   307 MBytes  85.8 Mbits/sec   10   1.99 MBytes
[  4] 690.00-720.00 sec   306 MBytes  85.5 Mbits/sec   24   1.59 MBytes
[  4] 720.00-750.00 sec   307 MBytes  85.8 Mbits/sec    7   1.25 MBytes
[  4] 750.00-780.00 sec   306 MBytes  85.5 Mbits/sec    6   1.80 MBytes
[  4] 780.00-810.00 sec   307 MBytes  85.8 Mbits/sec    7   1.94 MBytes
[  4] 810.00-840.00 sec   306 MBytes  85.5 Mbits/sec   25   1.17 MBytes
[  4] 840.00-870.00 sec   303 MBytes  84.7 Mbits/sec    5   1.38 MBytes
[  4] 870.00-900.00 sec   303 MBytes  84.7 Mbits/sec   30   1.23 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  8.96 GBytes  85.6 Mbits/sec  403             sender
[  4]   0.00-900.00 sec  8.96 GBytes  85.5 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900 -R
Connecting to host fd45:64bf:295c:5631::1, port 5201
Reverse mode, remote host fd45:64bf:295c:5631::1 is sending
[  4] local fd57:d1b1:9c79:40af::5 port 43685 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   280 MBytes  78.4 Mbits/sec
[  4]  30.00-60.00  sec   279 MBytes  78.0 Mbits/sec
[  4]  60.00-90.00  sec   278 MBytes  77.8 Mbits/sec
[  4]  90.00-120.00 sec   281 MBytes  78.5 Mbits/sec
[  4] 120.00-150.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 150.00-180.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 180.00-210.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 210.00-240.00 sec   278 MBytes  77.7 Mbits/sec
[  4] 240.00-270.00 sec   281 MBytes  78.6 Mbits/sec
[  4] 270.00-300.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 300.00-330.00 sec   277 MBytes  77.3 Mbits/sec
[  4] 330.00-360.00 sec   281 MBytes  78.7 Mbits/sec
[  4] 360.00-390.00 sec   277 MBytes  77.5 Mbits/sec
[  4] 390.00-420.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 420.00-450.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 450.00-480.00 sec   277 MBytes  77.3 Mbits/sec
[  4] 480.00-510.00 sec   281 MBytes  78.4 Mbits/sec
[  4] 510.00-540.00 sec   278 MBytes  77.9 Mbits/sec
[  4] 540.00-570.00 sec   278 MBytes  77.6 Mbits/sec
[  4] 570.00-600.00 sec   286 MBytes  79.9 Mbits/sec
[  4] 600.00-630.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 630.00-660.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 660.00-690.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 690.00-720.00 sec   282 MBytes  78.9 Mbits/sec
[  4] 720.00-750.00 sec   280 MBytes  78.4 Mbits/sec
[  4] 750.00-780.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 780.00-810.00 sec   282 MBytes  78.8 Mbits/sec
[  4] 810.00-840.00 sec   279 MBytes  77.9 Mbits/sec
[  4] 840.00-870.00 sec   281 MBytes  78.6 Mbits/sec
[  4] 870.00-900.00 sec   282 MBytes  78.9 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  8.19 GBytes  78.2 Mbits/sec  5357             sender
[  4]   0.00-900.00 sec  8.19 GBytes  78.2 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

#### With dstat Monitoring

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
[  4] local fd2b:656a:6fdb:a3a8::5 port 35801 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   170 MBytes  47.6 Mbits/sec   21   1.69 MBytes
[  4]  30.00-60.00  sec   167 MBytes  46.7 Mbits/sec  226   1.25 MBytes
[  4]  60.00-90.00  sec   170 MBytes  47.6 Mbits/sec  497   1.64 MBytes
[  4]  90.00-120.00 sec   169 MBytes  47.3 Mbits/sec  133   1.00 MBytes
[  4] 120.00-150.00 sec   169 MBytes  47.3 Mbits/sec  117   1.24 MBytes
[  4] 150.00-180.00 sec   170 MBytes  47.6 Mbits/sec  178   1.30 MBytes
[  4] 180.00-210.00 sec   169 MBytes  47.2 Mbits/sec  107   1.65 MBytes
[  4] 210.00-240.00 sec   169 MBytes  47.3 Mbits/sec   85   1.78 MBytes
[  4] 240.00-270.00 sec   169 MBytes  47.2 Mbits/sec  241    974 KBytes
[  4] 270.00-300.00 sec   169 MBytes  47.1 Mbits/sec   41   1.25 MBytes
[  4] 300.00-330.00 sec   169 MBytes  47.2 Mbits/sec  468   1.50 MBytes
[  4] 330.00-360.00 sec   169 MBytes  47.3 Mbits/sec   11   1.35 MBytes
[  4] 360.00-390.00 sec   168 MBytes  47.0 Mbits/sec  125   1.69 MBytes
[  4] 390.00-420.00 sec   170 MBytes  47.5 Mbits/sec   63   1.42 MBytes
[  4] 420.00-450.00 sec   169 MBytes  47.2 Mbits/sec   62   1.74 MBytes
[  4] 450.00-480.00 sec   169 MBytes  47.3 Mbits/sec  259   1.48 MBytes
[  4] 480.00-510.00 sec   169 MBytes  47.2 Mbits/sec   45   1.21 MBytes
[  4] 510.00-540.00 sec   170 MBytes  47.5 Mbits/sec   36   1.49 MBytes
[  4] 540.00-570.00 sec   169 MBytes  47.3 Mbits/sec  151   1.13 MBytes
[  4] 570.00-600.00 sec   169 MBytes  47.3 Mbits/sec  335   1.19 MBytes
[  4] 600.00-630.00 sec   169 MBytes  47.2 Mbits/sec  202   1.53 MBytes
[  4] 630.00-660.00 sec   169 MBytes  47.4 Mbits/sec  173   1.55 MBytes
[  4] 660.00-690.00 sec   170 MBytes  47.5 Mbits/sec   44   1.02 MBytes
[  4] 690.00-720.00 sec   168 MBytes  46.9 Mbits/sec  288   1.83 MBytes
[  4] 720.00-750.00 sec   169 MBytes  47.3 Mbits/sec  261   1.17 MBytes
[  4] 750.00-780.00 sec   169 MBytes  47.3 Mbits/sec  506   1.65 MBytes
[  4] 780.00-810.00 sec   169 MBytes  47.3 Mbits/sec  117   1.21 MBytes
[  4] 810.00-840.00 sec   171 MBytes  47.7 Mbits/sec   68   1.25 MBytes
[  4] 840.00-870.00 sec   169 MBytes  47.3 Mbits/sec   26   1.64 MBytes
[  4] 870.00-900.00 sec   170 MBytes  47.5 Mbits/sec   27   1.46 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  4.96 GBytes  47.3 Mbits/sec  4913             sender
[  4]   0.00-900.00 sec  4.95 GBytes  47.3 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900 -R
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
Reverse mode, remote host fd14:9aa4:e604:ec36::1 is sending
[  4] local fd2b:656a:6fdb:a3a8::5 port 35805 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   178 MBytes  49.7 Mbits/sec
[  4]  30.00-60.00  sec   179 MBytes  50.1 Mbits/sec
[  4]  60.00-90.00  sec   179 MBytes  50.1 Mbits/sec
[  4]  90.00-120.00 sec   179 MBytes  50.2 Mbits/sec
[  4] 120.00-150.00 sec   179 MBytes  50.0 Mbits/sec
[  4] 150.00-180.00 sec   181 MBytes  50.5 Mbits/sec
[  4] 180.00-210.00 sec   179 MBytes  50.0 Mbits/sec
[  4] 210.00-240.00 sec   180 MBytes  50.2 Mbits/sec
[  4] 240.00-270.00 sec   179 MBytes  50.2 Mbits/sec
[  4] 270.00-300.00 sec   180 MBytes  50.3 Mbits/sec
[  4] 300.00-330.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 330.00-360.00 sec   178 MBytes  49.8 Mbits/sec
[  4] 360.00-390.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 390.00-420.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 420.00-450.00 sec   179 MBytes  50.2 Mbits/sec
[  4] 450.00-480.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 480.00-510.00 sec   178 MBytes  49.7 Mbits/sec
[  4] 510.00-540.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 540.00-570.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 570.00-600.00 sec   180 MBytes  50.2 Mbits/sec
[  4] 600.00-630.00 sec   180 MBytes  50.2 Mbits/sec
[  4] 630.00-660.00 sec   180 MBytes  50.2 Mbits/sec
[  4] 660.00-690.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 690.00-720.00 sec   179 MBytes  49.9 Mbits/sec
[  4] 720.00-750.00 sec   179 MBytes  50.2 Mbits/sec
[  4] 750.00-780.00 sec   180 MBytes  50.4 Mbits/sec
[  4] 780.00-810.00 sec   179 MBytes  49.9 Mbits/sec
[  4] 810.00-840.00 sec   179 MBytes  50.1 Mbits/sec
[  4] 840.00-870.00 sec   180 MBytes  50.2 Mbits/sec
[  4] 870.00-900.00 sec   179 MBytes  50.1 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  5.26 GBytes  50.2 Mbits/sec  16654             sender
[  4]   0.00-900.00 sec  5.25 GBytes  50.1 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lace:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@lace:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  93   0   0   7|ksoftirqd/0  6.4|   0     0
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  18B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  48B   11B
   0 0.01 0.05|  0   0 100   0   0   0|sshd: root@pt0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  24B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  17B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|sshd: root@pt0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  20B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  32B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.1|  17B   11B
   0 0.01 0.05|  0   0 100   0   0   0|kworker/0:1  0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|sshd: root@pt0.0|  16B   11B
0.16 0.05 0.06|  0   0  75   0   0  24|ksoftirqd/0   23|1601k 3097k
0.69 0.19 0.10|  0   0   0   0   0 100|ksoftirqd/0   93|3966M   12M
0.88 0.28 0.14|  0   0   1   0   0  99|ksoftirqd/0   91|6371k   12M
0.93 0.35 0.16|  0   0   0   0   0 100|ksoftirqd/0   93|6500k   12M
1.08 0.44 0.20|  0   0   0   0   0 100|ksoftirqd/0   93|6388k   12M
1.11 0.51 0.23|  0   0   0   0   0 100|ksoftirqd/0   93|6423k   12M
1.32 0.62 0.28|  0   0   0   0   0 100|ksoftirqd/0   93|6455k   12M
1.25 0.67 0.31|  0   0   0   0   0 100|ksoftirqd/0   93|6391k   12M
1.17 0.70 0.32|  0   0   0   0   0 100|ksoftirqd/0   93|6494k   12M
1.18 0.75 0.35|  0   0   0   0   0 100|ksoftirqd/0   93|6385k   12M
1.16 0.79 0.38|  0   0   0   0   0  99|ksoftirqd/0   92|6407k   12M
1.15 0.82 0.40|  0   0   0   0   0  99|ksoftirqd/0   93|6405k   12M
1.20 0.87 0.43|  0   0   0   0   0 100|ksoftirqd/0   93|6424k   12M
1.31 0.93 0.46|  0   0   0   0   0 100|ksoftirqd/0   93|6447k   12M
1.29 0.96 0.49|  0   0   0   0   0 100|ksoftirqd/0   93|6438k   12M
1.28 1.00 0.52|  0   0   0   0   0 100|ksoftirqd/0   93|6373k   12M
1.39 1.06 0.55|  0   0   0   0   0 100|ksoftirqd/0   93|6448k   12M
1.29 1.07 0.57|  0   0   0   0   0 100|ksoftirqd/0   93|6412k   12M
1.23 1.08 0.59|  0   0   0   0   0 100|ksoftirqd/0   93|6428k 3972M
1.14 1.07 0.61|  0   0   0   0   0  99|ksoftirqd/0   93|6459k   12M
1.21 1.10 0.63|  0   0   0   0   0 100|ksoftirqd/0   93|6422k   12M
1.21 1.10 0.65|  0   0   0   0   0 100|ksoftirqd/0   93|6449k   12M
1.18 1.11 0.66|  0   0   0   0   0 100|ksoftirqd/0   93|6334k   12M
1.11 1.10 0.67|  0   0   0   0   0 100|ksoftirqd/0   93|3966M   12M
1.12 1.10 0.69|  0   0   0   0   0 100|ksoftirqd/0   93|6385k   12M
1.07 1.09 0.70|  0   0   0   0   0 100|ksoftirqd/0   94|6466k   12M
1.10 1.10 0.71|  0   0   0   0   0 100|ksoftirqd/0   93|6424k   12M
1.18 1.12 0.73|  0   0   0   0   0 100|ksoftirqd/0   93|6451k   12M
1.30 1.16 0.76|  0   0   0   0   0 100|ksoftirqd/0   93|6483k   12M
1.36 1.19 0.78|  0   0   0   0   0 100|ksoftirqd/0   93|6418k   12M
1.14 1.16 0.78|  0   0  23   0   0  77|ksoftirqd/0   71|4832k 9442k
0.69 1.05 0.76|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   13B
0.42 0.95 0.73|  0   0 100   0   0   0|kworker/0:2  0.1|  16B   11B
0.25 0.86 0.71|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   11B
0.15 0.77 0.69|  0   0 100   0   0   0|kworker/0:2  0.0|  52B   11B
0.09 0.70 0.66|  0   0 100   0   0   0|kworker/0:2  0.0|  24B   11B
0.06 0.63 0.64|  0   0 100   0   0   0|kworker/0:2  0.1|  17B   12B
0.03 0.57 0.62|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   11B
0.02 0.52 0.60|  0   0 100   0   0   0|kworker/0:2  0.0|  17B   11B
0.01 0.47 0.58|  0   0 100   0   0   0|kworker/0:2  0.1|  16B   11B
0.01 0.42 0.57|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   11B
0.24 0.43 0.56|  0   0  60   0   0  39|ksoftirqd/0   37|5213k 2727k
0.70 0.52 0.59|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6975k
1.10 0.63 0.62|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6965k
1.13 0.68 0.64|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6922k
1.16 0.73 0.66|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6984k
1.09 0.75 0.67|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6912k
1.06 0.78 0.68|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6959k
1.04 0.80 0.69|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 7005k
1.02 0.82 0.70|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6917k
1.01 0.84 0.71|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 3966M
1.01 0.85 0.72|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6945k
1.08 0.88 0.73|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6861k
1.05 0.89 0.74|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6996k
1.03 0.90 0.75|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6929k
1.09 0.93 0.76|  0   0   0   0   0 100|ksoftirqd/0   94|3972M 6967k
1.12 0.95 0.78|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6973k
1.13 0.97 0.79|  0   0   2   0   0  98|ksoftirqd/0   91|  13M 6872k
1.14 0.99 0.80|  0   0   0   0   0  99|ksoftirqd/0   93|  13M 6974k
1.21 1.02 0.81|  0   0   0   0   0  99|ksoftirqd/0   93|  13M 6912k
1.13 1.02 0.82|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 7015k
1.08 1.02 0.83|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6941k
1.05 1.01 0.83|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6959k
1.03 1.01 0.84|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6990k
1.23 1.06 0.86|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6957k
1.22 1.07 0.87|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6945k
1.28 1.10 0.88|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6952k
1.17 1.09 0.89|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6932k
1.10 1.08 0.89|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6984k
1.06 1.07 0.89|  0   0   0   0   0 100|ksoftirqd/0   94|  13M 6946k
1.24 1.11 0.91|  0   0   0   0   0 100|ksoftirqd/0   93|  13M 6930k
0.99 1.07 0.90|  0   0  37   0   0  62|ksoftirqd/0   58|8011k 3964M
0.60 0.97 0.87|  0   0 100   0   0   0|kworker/0:1  0.0|  17B   11B
0.36 0.88 0.85|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   11B
0.22 0.79 0.82|  0   0 100   0   0   0|kworker/0:2  0.0|  18B   11B
0.13 0.72 0.79|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   11B
0.08 0.65 0.77|  0   0 100   0   0   0|kworker/0:2  0.1|  17B   11B
0.05 0.59 0.75|  0   0 100   0   0   0|kworker/0:2  0.0|  16B   11B
root@lace:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900
Connecting to host fd45:64bf:295c:5631::1, port 5201
[  4] local fd57:d1b1:9c79:40af::5 port 43707 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   303 MBytes  84.8 Mbits/sec   38   1.18 MBytes
[  4]  30.00-60.00  sec   303 MBytes  84.7 Mbits/sec   14   1.37 MBytes
[  4]  60.00-90.00  sec   303 MBytes  84.7 Mbits/sec   10   1.59 MBytes
[  4]  90.00-120.00 sec   303 MBytes  84.7 Mbits/sec   15   1.07 MBytes
[  4] 120.00-150.00 sec   304 MBytes  85.0 Mbits/sec   18   1.35 MBytes
[  4] 150.00-180.00 sec   304 MBytes  85.0 Mbits/sec   18   1.29 MBytes
[  4] 180.00-210.00 sec   303 MBytes  84.7 Mbits/sec   17   1.81 MBytes
[  4] 210.00-240.00 sec   303 MBytes  84.8 Mbits/sec    9   2.07 MBytes
[  4] 240.00-270.00 sec   303 MBytes  84.8 Mbits/sec    6   1.73 MBytes
[  4] 270.00-300.00 sec   303 MBytes  84.8 Mbits/sec    2   2.14 MBytes
[  4] 300.00-330.00 sec   302 MBytes  84.4 Mbits/sec   32   1.24 MBytes
[  4] 330.00-360.00 sec   303 MBytes  84.8 Mbits/sec    9   1.47 MBytes
[  4] 360.00-390.00 sec   302 MBytes  84.4 Mbits/sec   14   1.86 MBytes
[  4] 390.00-420.00 sec   303 MBytes  84.8 Mbits/sec   29   1.33 MBytes
[  4] 420.00-450.00 sec   302 MBytes  84.4 Mbits/sec   13   1.95 MBytes
[  4] 450.00-480.00 sec   303 MBytes  84.8 Mbits/sec   14   1.25 MBytes
[  4] 480.00-510.00 sec   303 MBytes  84.7 Mbits/sec   70   1.43 MBytes
[  4] 510.00-540.00 sec   304 MBytes  85.1 Mbits/sec   19   1.28 MBytes
[  4] 540.00-570.00 sec   303 MBytes  84.8 Mbits/sec   19   1.76 MBytes
[  4] 570.00-600.00 sec   304 MBytes  85.1 Mbits/sec   10   1.84 MBytes
[  4] 600.00-630.00 sec   302 MBytes  84.4 Mbits/sec   20   1.45 MBytes
[  4] 630.00-660.00 sec   301 MBytes  84.1 Mbits/sec    6   1.31 MBytes
[  4] 660.00-690.00 sec   304 MBytes  85.1 Mbits/sec   52   1.20 MBytes
[  4] 690.00-720.00 sec   302 MBytes  84.3 Mbits/sec    5   1.30 MBytes
[  4] 720.00-750.00 sec   303 MBytes  84.7 Mbits/sec   10   2.06 MBytes
[  4] 750.00-780.00 sec   303 MBytes  84.7 Mbits/sec  215   1.76 MBytes
[  4] 780.00-810.00 sec   302 MBytes  84.4 Mbits/sec    6   2.09 MBytes
[  4] 810.00-840.00 sec   302 MBytes  84.5 Mbits/sec   31   1.24 MBytes
[  4] 840.00-870.00 sec   304 MBytes  85.1 Mbits/sec    2   1.46 MBytes
[  4] 870.00-900.00 sec   303 MBytes  84.8 Mbits/sec   12   2.01 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  8.88 GBytes  84.7 Mbits/sec  735             sender
[  4]   0.00-900.00 sec  8.88 GBytes  84.7 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900 -R
Connecting to host fd45:64bf:295c:5631::1, port 5201
Reverse mode, remote host fd45:64bf:295c:5631::1 is sending
[  4] local fd57:d1b1:9c79:40af::5 port 43715 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   278 MBytes  77.8 Mbits/sec
[  4]  30.00-60.00  sec   280 MBytes  78.3 Mbits/sec
[  4]  60.00-90.00  sec   281 MBytes  78.4 Mbits/sec
[  4]  90.00-120.00 sec   282 MBytes  78.7 Mbits/sec
[  4] 120.00-150.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 150.00-180.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 180.00-210.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 210.00-240.00 sec   283 MBytes  79.1 Mbits/sec
[  4] 240.00-270.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 270.00-300.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 300.00-330.00 sec   281 MBytes  78.4 Mbits/sec
[  4] 330.00-360.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 360.00-390.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 390.00-420.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 420.00-450.00 sec   281 MBytes  78.5 Mbits/sec
[  4] 450.00-480.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 480.00-510.00 sec   280 MBytes  78.4 Mbits/sec
[  4] 510.00-540.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 540.00-570.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 570.00-600.00 sec   278 MBytes  77.7 Mbits/sec
[  4] 600.00-630.00 sec   279 MBytes  78.1 Mbits/sec
[  4] 630.00-660.00 sec   278 MBytes  77.8 Mbits/sec
[  4] 660.00-690.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 690.00-720.00 sec   277 MBytes  77.6 Mbits/sec
[  4] 720.00-750.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 750.00-780.00 sec   280 MBytes  78.2 Mbits/sec
[  4] 780.00-810.00 sec   281 MBytes  78.5 Mbits/sec
[  4] 810.00-840.00 sec   280 MBytes  78.3 Mbits/sec
[  4] 840.00-870.00 sec   279 MBytes  78.0 Mbits/sec
[  4] 870.00-900.00 sec   278 MBytes  77.8 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  8.19 GBytes  78.2 Mbits/sec  5911             sender
[  4]   0.00-900.00 sec  8.19 GBytes  78.2 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@jessie-rpi:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@jessie-rpi:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  99   0   0   1|ksoftirqd/0  0.5|   0     0
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.1|  18B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.1|  48B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  24B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.1|  20B   11B
   0 0.01 0.05|  0   0  95   0   0   5|ksoftirqd/0  5.3|3343k 6476k
0.40 0.11 0.08|  0   0  81   0   0  19|ksoftirqd/0   17|  11M   22M
0.58 0.18 0.10|  0   0  81   0   0  19|ksoftirqd/0   18|  11M   22M
0.82 0.27 0.13|  0   0  80   0   0  19|ksoftirqd/0   18|  11M   22M
0.83 0.33 0.16|  0   0  80   0   0  20|ksoftirqd/0   18|  11M   22M
0.77 0.36 0.17|  0   0  80   0   0  20|ksoftirqd/0   19|  11M 3981M
0.79 0.40 0.19|  0   0  81   0   0  19|ksoftirqd/0   18|  11M   22M
0.69 0.41 0.20|  0   0  81   0   0  19|ksoftirqd/0   18|  11M   22M
0.74 0.45 0.22|  0   0  80   0   0  20|ksoftirqd/0   19|  11M   22M
0.77 0.49 0.24|  0   0  80   0   0  20|ksoftirqd/0   18|  11M   22M
0.75 0.51 0.25|  0   0  80   0   0  20|ksoftirqd/0   19|3971M   22M
0.69 0.52 0.27|  0   0  81   0   0  19|ksoftirqd/0   17|  11M   22M
0.67 0.54 0.28|  0   0  81   0   0  19|ksoftirqd/0   18|  11M   22M
0.74 0.56 0.30|  0   0  82   0   0  18|ksoftirqd/0   16|  11M   22M
0.64 0.56 0.31|  0   0  81   0   0  19|ksoftirqd/0   17|  11M   22M
0.78 0.60 0.33|  0   0  80   0   0  20|ksoftirqd/0   18|  11M   22M
0.80 0.62 0.34|  0   0  81   0   0  19|ksoftirqd/0   18|  11M   22M
0.56 0.58 0.34|  0   0  80   0   0  19|ksoftirqd/0   18|  11M 3981M
0.65 0.60 0.35|  0   0  81   0   0  19|ksoftirqd/0   18|  11M   22M
0.51 0.58 0.35|  0   0  80   0   0  20|ksoftirqd/0   19|  11M   22M
0.56 0.58 0.36|  0   0  80   0   0  20|ksoftirqd/0   19|  11M   22M
0.54 0.58 0.36|  0   0  80   0   0  19|ksoftirqd/0   18|  11M   22M
0.59 0.58 0.37|  0   0  81   0   0  19|ksoftirqd/0   18|3971M   22M
0.75 0.62 0.39|  0   0  81   0   0  18|ksoftirqd/0   17|  11M   22M
0.67 0.61 0.40|  0   0  82   0   0  18|ksoftirqd/0   17|  11M   22M
0.64 0.62 0.41|  0   0  80   0   0  20|ksoftirqd/0   19|  11M   22M
0.73 0.64 0.42|  0   0  80   0   0  20|ksoftirqd/0   18|  11M   22M
0.75 0.66 0.43|  0   0  80   0   0  20|ksoftirqd/0   19|  11M   22M
0.60 0.63 0.43|  0   0  80   0   0  19|ksoftirqd/0   18|  11M   22M
0.49 0.60 0.43|  0   0  81   0   0  19|ksoftirqd/0   18|  11M 3981M
0.49 0.59 0.43|  0   0  87   0   0  13|ksoftirqd/0   13|8100k   15M
0.29 0.53 0.41|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.18 0.48 0.40|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.11 0.44 0.39|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
0.06 0.39 0.38|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.04 0.36 0.36|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.02 0.32 0.35|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.01 0.29 0.34|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
0.01 0.26 0.33|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.01 0.24 0.32|  0   0 100   0   0   0|irqbalance   0.1|  18B   11B
   0 0.22 0.31|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.19 0.30|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.18 0.29|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.16 0.28|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.14 0.27|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.13 0.26|  0   0 100   0   0   0|irqbalance   0.1|  49B   11B
   0 0.12 0.26|  0   0 100   0   0   0|irqbalance   0.0|  24B   11B
   0 0.11 0.25|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.10 0.24|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.09 0.23|  0   0 100   0   0   0|irqbalance   0.1|  20B   11B
   0 0.08 0.22|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.07 0.22|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.07 0.21|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.06 0.20|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.05 0.20|  0   0 100   0   0   0|irqbalance   0.0|  32B   11B
   0 0.05 0.19|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.04 0.19|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.04 0.18|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.04 0.18|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.03 0.17|  0   0 100   0   0   0|irqbalance   0.1|  18B   11B
   0 0.03 0.16|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.03 0.16|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.03 0.15|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.02 0.15|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.02 0.14|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.02 0.14|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.13|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.01 0.13|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.13|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.12|  0   0 100   0   0   0|irqbalance   0.1|  50B   11B
   0 0.01 0.12|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.01 0.12|  0   0 100   0   0   0|irqbalance   0.1|  24B   11B
   0 0.01 0.11|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.11|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.11|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.01 0.11|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.10|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.08 0.03 0.11|  0   0 100   0   0   0|ksoftirqd/0  0.3|1316k  684k
0.22 0.07 0.12|  0   0  91   0   0   9|ksoftirqd/0  7.6|  20M   11M
0.21 0.08 0.12|  0   0  92   0   0   8|ksoftirqd/0  6.7|  20M   11M
0.35 0.12 0.13|  0   0  92   0   0   8|ksoftirqd/0  6.8|  20M   11M
0.27 0.13 0.14|  0   0  92   0   0   8|ksoftirqd/0  7.2|  20M   11M
0.30 0.15 0.14|  0   0  92   0   0   8|ksoftirqd/0  7.0|3980M   11M
0.31 0.17 0.15|  0   0  91   0   0   9|ksoftirqd/0  7.4|  20M   11M
0.30 0.18 0.15|  0   0  92   0   0   8|ksoftirqd/0  7.0|  20M   11M
0.30 0.19 0.16|  0   0  92   0   0   8|ksoftirqd/0  7.3|  20M   11M
0.44 0.24 0.17|  0   0  92   0   0   8|ksoftirqd/0  7.3|  20M   11M
0.34 0.23 0.17|  0   0  92   0   0   8|ksoftirqd/0  7.0|  20M   11M
0.36 0.24 0.18|  0   0  92   0   0   8|ksoftirqd/0  6.8|  20M   11M
0.43 0.27 0.19|  0   0  91   0   0   8|ksoftirqd/0  7.3|  20M 3970M
0.34 0.26 0.19|  0   0  92   0   0   8|ksoftirqd/0  7.0|  20M   11M
0.29 0.25 0.19|  0   0  93   0   0   7|ksoftirqd/0  6.3|  20M   11M
0.42 0.29 0.20|  0   0  92   0   0   8|ksoftirqd/0  7.0|  20M   11M
0.43 0.31 0.21|  0   0  92   0   0   8|ksoftirqd/0  6.7|  20M   11M
0.52 0.34 0.23|  0   0  92   0   0   8|ksoftirqd/0  6.6|  20M   11M
0.44 0.34 0.23|  0   0  92   0   0   8|ksoftirqd/0  6.8|  20M   11M
0.34 0.33 0.23|  0   0  92   0   0   8|ksoftirqd/0  7.1|3979M   11M
0.34 0.33 0.23|  0   0  92   0   0   8|ksoftirqd/0  6.7|  20M   10M
0.26 0.31 0.23|  0   0  92   0   0   8|ksoftirqd/0  7.1|  20M   11M
0.41 0.35 0.24|  0   0  92   0   0   8|ksoftirqd/0  6.6|  20M   11M
0.38 0.34 0.24|  0   0  92   0   0   8|ksoftirqd/0  6.8|  20M   11M
0.35 0.34 0.24|  0   0  92   0   0   8|ksoftirqd/0  6.9|  20M   10M
0.35 0.34 0.25|  0   0  92   0   0   7|ksoftirqd/0  6.5|  20M   11M
0.40 0.36 0.25|  0   0  92   0   0   8|ksoftirqd/0  7.2|  20M 3970M
0.25 0.32 0.24|  0   0  92   0   0   7|ksoftirqd/0  6.4|  20M   11M
0.21 0.31 0.24|  0   0  92   0   0   8|ksoftirqd/0  6.6|  20M   11M
0.26 0.31 0.24|  0   0  93   0   0   7|ksoftirqd/0  6.4|  20M   11M
0.21 0.30 0.24|  0   0  92   0   0   8|ksoftirqd/0  7.1|  19M   10M
0.13 0.27 0.23|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
0.08 0.24 0.22|  0   0 100   0   0   0|irqbalance   0.1|  18B   11B
0.05 0.22 0.22|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.03 0.20 0.21|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.02 0.18 0.21|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
0.01 0.16 0.20|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.01 0.15 0.19|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.13 0.19|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.12 0.18|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.11 0.18|  0   0 100   0   0   0|irqbalance   0.1|  48B   11B
   0 0.10 0.17|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.09 0.16|  0   0 100   0   0   0|irqbalance   0.1|  26B   11B
   0 0.08 0.16|  0   0 100   0   0   0|irqbalance   0.0|  13B    7B
   0 0.07 0.15|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.07 0.15|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.06 0.14|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.05 0.14|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.05 0.13|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.06 0.06 0.13|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.04 0.05 0.13|  0   0 100   0   0   0|irqbalance   0.1|  32B   11B
0.02 0.05 0.13|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
0.01 0.04 0.13|  0   0 100   0   0   0|irqbalance   0.1|  18B   11B
0.01 0.04 0.12|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.04 0.12|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.03 0.12|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.03 0.11|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.03 0.11|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.03 0.11|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.02 0.11|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.02 0.10|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.02 0.10|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.10|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.09|  0   0 100   0   0   0|irqbalance   0.0|  18B   11B
   0 0.01 0.09|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.01 0.09|  0   0 100   0   0   0|irqbalance   0.0|  48B   11B
   0 0.01 0.08|  0   0 100   0   0   0|irqbalance   0.1|  24B   11B
   0 0.01 0.08|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.08|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.01 0.08|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.07|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.07|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.07|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.01 0.06|  0   0 100   0   0   0|irqbalance   0.0|  18B   11B
   0 0.01 0.06|  0   0 100   0   0   0|irqbalance   0.1|  32B   11B
   0 0.01 0.06|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.06|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
   0 0.01 0.05|  0   0 100   0   0   0|irqbalance   0.0|  18B   11B
root@jessie-rpi:~#
```

### IPv6 with iptables

#### Setup

##### ferm.conf

```
domain (ip ip6) chain (INPUT OUTPUT FORWARD) policy DROP;
domain (ip ip6) chain (INPUT OUTPUT FORWARD) {
        mod conntrack ctstate INVALID DROP;
        mod conntrack ctstate (ESTABLISHED RELATED) ACCEPT;
}

domain (ip ip6) chain INPUT interface lo ACCEPT;
domain (ip ip6) chain OUTPUT outerface lo ACCEPT;

domain ip chain (INPUT OUTPUT FORWARD) proto icmp ACCEPT;
domain ip6 chain (INPUT OUTPUT FORWARD) proto icmpv6 ACCEPT;

domain (ip ip6) chain INPUT proto tcp dport (ssh 5102) ACCEPT;
domain (ip ip6) chain OUTPUT {
	proto ipv6 daddr (10.0.1.5 10.0.3.5) ACCEPT;
        proto (tcp udp) dport domain ACCEPT;
        proto tcp dport ssh ACCEPT;
}

domain ip6 chain FORWARD saddr (fd2b:656a:6fdb:a3a8::/64 fd57:d1b1:9c79:40af::/64) ACCEPT;

domain ip chain INPUT LOG log-prefix 'iptables CHAIN=INPUT ';
domain ip chain OUTPUT LOG log-prefix 'iptables CHAIN=OUTPUT ';
domain ip chain FORWARD LOG log-prefix 'iptables CHAIN=FORWARD ';
domain ip6 chain INPUT LOG log-prefix 'iptables CHAIN=INPUT ';
domain ip6 chain OUTPUT LOG log-prefix 'iptables CHAIN=OUTPUT ';
domain ip6 chain FORWARD LOG log-prefix 'iptables CHAIN=FORWARD ';

domain ip chain (INPUT OUTPUT FORWARD) REJECT reject-with icmp-admin-prohibited;
domain ip6 chain (INPUT OUTPUT FORWARD) REJECT reject-with icmp6-adm-prohibited;
```

##### iptables-save

```
# Generated by iptables-save v1.4.21 on Fri Jan  2 03:09:52 1970
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT DROP [0:0]
-A INPUT -m conntrack --ctstate INVALID -j DROP
-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -p icmp -j ACCEPT
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 5102 -j ACCEPT
-A INPUT -j LOG --log-prefix "iptables CHAIN=INPUT "
-A INPUT -j REJECT --reject-with icmp-admin-prohibited
-A FORWARD -m conntrack --ctstate INVALID -j DROP
-A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -p icmp -j ACCEPT
-A FORWARD -j LOG --log-prefix "iptables CHAIN=FORWARD "
-A FORWARD -j REJECT --reject-with icmp-admin-prohibited
-A OUTPUT -m conntrack --ctstate INVALID -j DROP
-A OUTPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A OUTPUT -o lo -j ACCEPT
-A OUTPUT -p icmp -j ACCEPT
-A OUTPUT -d 10.0.1.5/32 -p ipv6 -j ACCEPT
-A OUTPUT -d 10.0.3.5/32 -p ipv6 -j ACCEPT
-A OUTPUT -p tcp -m tcp --dport 53 -j ACCEPT
-A OUTPUT -p udp -m udp --dport 53 -j ACCEPT
-A OUTPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A OUTPUT -j LOG --log-prefix "iptables CHAIN=OUTPUT "
-A OUTPUT -j REJECT --reject-with icmp-admin-prohibited
COMMIT
# Completed on Fri Jan  2 03:09:52 1970
```

```
# Generated by ip6tables-save v1.4.21 on Fri Jan  2 04:38:40 1970
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT DROP [0:0]
-A INPUT -m conntrack --ctstate INVALID -j DROP
-A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -p ipv6-icmp -j ACCEPT
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 5102 -j ACCEPT
-A INPUT -j LOG --log-prefix "iptables CHAIN=INPUT "
-A INPUT -j REJECT --reject-with icmp6-adm-prohibited
-A FORWARD -m conntrack --ctstate INVALID -j DROP
-A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -p ipv6-icmp -j ACCEPT
-A FORWARD -s fd2b:656a:6fdb:a3a8::/64 -j ACCEPT
-A FORWARD -s fd57:d1b1:9c79:40af::/64 -j ACCEPT
-A FORWARD -j LOG --log-prefix "iptables CHAIN=FORWARD "
-A FORWARD -j REJECT --reject-with icmp6-adm-prohibited
-A OUTPUT -m conntrack --ctstate INVALID -j DROP
-A OUTPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A OUTPUT -o lo -j ACCEPT
-A OUTPUT -p ipv6-icmp -j ACCEPT
-A OUTPUT -p tcp -m tcp --dport 53 -j ACCEPT
-A OUTPUT -p udp -m udp --dport 53 -j ACCEPT
-A OUTPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A OUTPUT -j LOG --log-prefix "iptables CHAIN=OUTPUT "
-A OUTPUT -j REJECT --reject-with icmp6-adm-prohibited
COMMIT
# Completed on Fri Jan  2 04:38:40 1970
```

#### No Monitoring

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
[  4] local fd2b:656a:6fdb:a3a8::5 port 35939 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   118 MBytes  33.1 Mbits/sec  261   1.22 MBytes
[  4]  30.00-60.00  sec   117 MBytes  32.6 Mbits/sec   51   1.52 MBytes
[  4]  60.00-90.00  sec   118 MBytes  33.0 Mbits/sec   72   1.56 MBytes
[  4]  90.00-120.00 sec   119 MBytes  33.3 Mbits/sec  103   1.79 MBytes
[  4] 120.00-150.00 sec   118 MBytes  32.9 Mbits/sec   94   1.92 MBytes
[  4] 150.00-180.00 sec   118 MBytes  32.9 Mbits/sec  160   1.48 MBytes
[  4] 180.00-210.00 sec   118 MBytes  32.9 Mbits/sec  211   1.69 MBytes
[  4] 210.00-240.00 sec   118 MBytes  32.9 Mbits/sec  101   1.58 MBytes
[  4] 240.00-270.00 sec   117 MBytes  32.8 Mbits/sec  166   1.92 MBytes
[  4] 270.00-300.00 sec   118 MBytes  33.0 Mbits/sec  107   1.33 MBytes
[  4] 300.00-330.00 sec   118 MBytes  32.9 Mbits/sec  187   1.62 MBytes
[  4] 330.00-360.00 sec   117 MBytes  32.8 Mbits/sec   63   2.26 MBytes
[  4] 360.00-390.00 sec   117 MBytes  32.7 Mbits/sec  603   1.63 MBytes
[  4] 390.00-420.00 sec   119 MBytes  33.1 Mbits/sec  382   1.33 MBytes
[  4] 420.00-450.00 sec   119 MBytes  33.2 Mbits/sec   32   1.57 MBytes
[  4] 450.00-480.00 sec   118 MBytes  32.9 Mbits/sec  297   1.76 MBytes
[  4] 480.00-510.00 sec   117 MBytes  32.8 Mbits/sec  115   1.84 MBytes
[  4] 510.00-540.00 sec   118 MBytes  32.9 Mbits/sec  166   1.96 MBytes
[  4] 540.00-570.00 sec   118 MBytes  33.1 Mbits/sec  195   1.56 MBytes
[  4] 570.00-600.00 sec   118 MBytes  33.0 Mbits/sec  140   1.19 MBytes
[  4] 600.00-630.00 sec   118 MBytes  32.9 Mbits/sec  262   1.69 MBytes
[  4] 630.00-660.00 sec   118 MBytes  33.0 Mbits/sec  264   1.30 MBytes
[  4] 660.00-690.00 sec   118 MBytes  33.1 Mbits/sec  117   1.54 MBytes
[  4] 690.00-720.00 sec   118 MBytes  33.1 Mbits/sec   72   1.41 MBytes
[  4] 720.00-750.00 sec   117 MBytes  32.6 Mbits/sec  102   1.76 MBytes
[  4] 750.00-780.00 sec   118 MBytes  33.0 Mbits/sec  265   1.21 MBytes
[  4] 780.00-810.00 sec   118 MBytes  33.1 Mbits/sec   26   1.77 MBytes
[  4] 810.00-840.00 sec   118 MBytes  32.9 Mbits/sec  159   1.30 MBytes
[  4] 840.00-870.00 sec   117 MBytes  32.8 Mbits/sec  293   1.20 MBytes
[  4] 870.00-900.00 sec   118 MBytes  32.9 Mbits/sec   56   1.62 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  3.45 GBytes  32.9 Mbits/sec  5122             sender
[  4]   0.00-900.00 sec  3.45 GBytes  32.9 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900 -R
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
Reverse mode, remote host fd14:9aa4:e604:ec36::1 is sending
[  4] local fd2b:656a:6fdb:a3a8::5 port 35963 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   123 MBytes  34.4 Mbits/sec
[  4]  30.00-60.00  sec   125 MBytes  35.0 Mbits/sec
[  4]  60.00-90.02  sec   124 MBytes  34.7 Mbits/sec
[  4]  90.02-120.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 120.00-150.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 150.00-180.00 sec   125 MBytes  35.0 Mbits/sec
[  4] 180.00-210.00 sec   124 MBytes  34.5 Mbits/sec
[  4] 210.00-240.00 sec   123 MBytes  34.5 Mbits/sec
[  4] 240.00-270.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 270.00-300.00 sec   124 MBytes  34.8 Mbits/sec
[  4] 300.00-330.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 330.00-360.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 360.00-390.00 sec   125 MBytes  34.8 Mbits/sec
[  4] 390.00-420.00 sec   125 MBytes  34.8 Mbits/sec
[  4] 420.00-450.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 450.00-480.00 sec   125 MBytes  35.0 Mbits/sec
[  4] 480.00-510.00 sec   125 MBytes  35.0 Mbits/sec
[  4] 510.00-540.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 540.00-570.00 sec   126 MBytes  35.1 Mbits/sec
[  4] 570.00-600.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 600.00-630.00 sec   123 MBytes  34.4 Mbits/sec
[  4] 630.00-660.00 sec   126 MBytes  35.1 Mbits/sec
[  4] 660.00-690.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 690.00-720.00 sec   125 MBytes  35.0 Mbits/sec
[  4] 720.00-750.00 sec   124 MBytes  34.8 Mbits/sec
[  4] 750.00-780.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 780.00-810.00 sec   124 MBytes  34.8 Mbits/sec
[  4] 810.00-840.00 sec   125 MBytes  34.8 Mbits/sec
[  4] 840.00-870.00 sec   124 MBytes  34.8 Mbits/sec
[  4] 870.00-900.00 sec   125 MBytes  35.1 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  3.65 GBytes  34.8 Mbits/sec  16597             sender
[  4]   0.00-900.00 sec  3.65 GBytes  34.8 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900
Connecting to host fd45:64bf:295c:5631::1, port 5201
[  4] local fd57:d1b1:9c79:40af::5 port 43866 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   239 MBytes  66.9 Mbits/sec  110    813 KBytes
[  4]  30.00-60.00  sec   238 MBytes  66.6 Mbits/sec   23   1.31 MBytes
[  4]  60.00-90.00  sec   236 MBytes  66.1 Mbits/sec   18   2.40 MBytes
[  4]  90.00-120.00 sec   236 MBytes  66.1 Mbits/sec  289   2.03 MBytes
[  4] 120.00-150.00 sec   237 MBytes  66.4 Mbits/sec  177   1.41 MBytes
[  4] 150.00-180.00 sec   236 MBytes  66.1 Mbits/sec  116   1.75 MBytes
[  4] 180.00-210.00 sec   236 MBytes  66.1 Mbits/sec   63   1.59 MBytes
[  4] 210.00-240.00 sec   238 MBytes  66.5 Mbits/sec   88   1.19 MBytes
[  4] 240.00-270.00 sec   238 MBytes  66.5 Mbits/sec   41   1.66 MBytes
[  4] 270.00-300.00 sec   235 MBytes  65.7 Mbits/sec  197   1.53 MBytes
[  4] 300.00-330.00 sec   238 MBytes  66.5 Mbits/sec   45   1.13 MBytes
[  4] 330.00-360.00 sec   237 MBytes  66.4 Mbits/sec  324   1.95 MBytes
[  4] 360.00-390.00 sec   238 MBytes  66.4 Mbits/sec   62   1.45 MBytes
[  4] 390.00-420.00 sec   238 MBytes  66.5 Mbits/sec   21   1.79 MBytes
[  4] 420.00-450.00 sec   237 MBytes  66.4 Mbits/sec  181   1.83 MBytes
[  4] 450.00-480.00 sec   236 MBytes  66.0 Mbits/sec   80   1.88 MBytes
[  4] 480.00-510.00 sec   237 MBytes  66.3 Mbits/sec   32   1.74 MBytes
[  4] 510.00-540.00 sec   237 MBytes  66.4 Mbits/sec   82   1.18 MBytes
[  4] 540.00-570.00 sec   238 MBytes  66.6 Mbits/sec   55   1.33 MBytes
[  4] 570.00-600.00 sec   236 MBytes  66.1 Mbits/sec   69   1.80 MBytes
[  4] 600.00-630.00 sec   236 MBytes  66.1 Mbits/sec  387   1.31 MBytes
[  4] 630.00-660.00 sec   236 MBytes  65.9 Mbits/sec   16   1.72 MBytes
[  4] 660.00-690.00 sec   238 MBytes  66.5 Mbits/sec   85   1.85 MBytes
[  4] 690.00-720.00 sec   237 MBytes  66.2 Mbits/sec   44   1.83 MBytes
[  4] 720.00-750.00 sec   236 MBytes  66.1 Mbits/sec   57   1.63 MBytes
[  4] 750.00-780.00 sec   238 MBytes  66.4 Mbits/sec   79   1.87 MBytes
[  4] 780.00-810.00 sec   236 MBytes  65.9 Mbits/sec   28   1.82 MBytes
[  4] 810.00-840.00 sec   237 MBytes  66.3 Mbits/sec   83   1.79 MBytes
[  4] 840.00-870.00 sec   235 MBytes  65.7 Mbits/sec  209   1.78 MBytes
[  4] 870.00-900.00 sec   235 MBytes  65.7 Mbits/sec   14   1.57 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  6.94 GBytes  66.2 Mbits/sec  3075             sender
[  4]   0.00-900.00 sec  6.94 GBytes  66.2 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900 -R
Connecting to host fd45:64bf:295c:5631::1, port 5201
Reverse mode, remote host fd45:64bf:295c:5631::1 is sending
[  4] local fd57:d1b1:9c79:40af::5 port 43870 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   247 MBytes  69.2 Mbits/sec
[  4]  30.00-60.00  sec   249 MBytes  69.7 Mbits/sec
[  4]  60.00-90.00  sec   249 MBytes  69.6 Mbits/sec
[  4]  90.00-120.00 sec   249 MBytes  69.7 Mbits/sec
[  4] 120.00-150.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 150.00-180.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 180.00-210.00 sec   250 MBytes  69.8 Mbits/sec
[  4] 210.00-240.00 sec   248 MBytes  69.3 Mbits/sec
[  4] 240.00-270.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 270.00-300.00 sec   248 MBytes  69.5 Mbits/sec
[  4] 300.00-330.00 sec   250 MBytes  69.8 Mbits/sec
[  4] 330.00-360.00 sec   248 MBytes  69.3 Mbits/sec
[  4] 360.00-390.00 sec   247 MBytes  69.0 Mbits/sec
[  4] 390.00-420.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 420.00-450.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 450.00-480.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 480.00-510.00 sec   247 MBytes  69.0 Mbits/sec
[  4] 510.00-540.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 540.00-570.00 sec   246 MBytes  68.9 Mbits/sec
[  4] 570.00-600.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 600.00-630.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 630.00-660.00 sec   248 MBytes  69.4 Mbits/sec
[  4] 660.00-690.00 sec   243 MBytes  67.9 Mbits/sec
[  4] 690.00-720.00 sec   247 MBytes  69.2 Mbits/sec
[  4] 720.00-750.00 sec   249 MBytes  69.7 Mbits/sec
[  4] 750.00-780.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 780.00-810.00 sec   250 MBytes  69.8 Mbits/sec
[  4] 810.00-840.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 840.00-870.00 sec   249 MBytes  69.7 Mbits/sec
[  4] 870.00-900.00 sec   249 MBytes  69.6 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  7.28 GBytes  69.5 Mbits/sec  16734             sender
[  4]   0.00-900.00 sec  7.28 GBytes  69.5 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

#### With dstat Monitoring

##### Raspberry Pi

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
[  4] local fd2b:656a:6fdb:a3a8::5 port 35898 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   118 MBytes  32.9 Mbits/sec   90   1.84 MBytes
[  4]  30.00-60.00  sec   116 MBytes  32.6 Mbits/sec  353   1.31 MBytes
[  4]  60.00-90.00  sec   117 MBytes  32.8 Mbits/sec  247   1.52 MBytes
[  4]  90.00-120.00 sec   118 MBytes  32.9 Mbits/sec   97   1.60 MBytes
[  4] 120.00-150.00 sec   117 MBytes  32.8 Mbits/sec   68   1.91 MBytes
[  4] 150.00-180.00 sec   116 MBytes  32.5 Mbits/sec  359   1.58 MBytes
[  4] 180.00-210.00 sec   118 MBytes  32.9 Mbits/sec   94   1.72 MBytes
[  4] 210.00-240.00 sec   117 MBytes  32.7 Mbits/sec  309   1.12 MBytes
[  4] 240.00-270.00 sec   118 MBytes  32.9 Mbits/sec  119   1.53 MBytes
[  4] 270.00-300.00 sec   118 MBytes  33.0 Mbits/sec    1   2.00 MBytes
[  4] 300.00-330.00 sec   117 MBytes  32.6 Mbits/sec  151   1.20 MBytes
[  4] 330.00-360.00 sec   118 MBytes  33.0 Mbits/sec   28   1.47 MBytes
[  4] 360.00-390.00 sec   117 MBytes  32.8 Mbits/sec  121   1.39 MBytes
[  4] 390.00-420.00 sec   118 MBytes  33.0 Mbits/sec   59   1.54 MBytes
[  4] 420.00-450.00 sec   118 MBytes  33.0 Mbits/sec   63   1.57 MBytes
[  4] 450.00-480.00 sec   118 MBytes  32.9 Mbits/sec   38   1.70 MBytes
[  4] 480.00-510.00 sec   117 MBytes  32.7 Mbits/sec   24   1.55 MBytes
[  4] 510.00-540.00 sec   117 MBytes  32.8 Mbits/sec   61   1.19 MBytes
[  4] 540.00-570.00 sec   117 MBytes  32.8 Mbits/sec   77   1.67 MBytes
[  4] 570.00-600.00 sec   117 MBytes  32.8 Mbits/sec  128   1.55 MBytes
[  4] 600.00-630.00 sec   117 MBytes  32.7 Mbits/sec  111   1.37 MBytes
[  4] 630.00-660.00 sec   118 MBytes  33.0 Mbits/sec   18   1.84 MBytes
[  4] 660.00-690.00 sec   117 MBytes  32.6 Mbits/sec  147   1.79 MBytes
[  4] 690.00-720.00 sec   118 MBytes  32.9 Mbits/sec  147   1.16 MBytes
[  4] 720.00-750.00 sec   117 MBytes  32.6 Mbits/sec  176   1.46 MBytes
[  4] 750.00-780.00 sec   118 MBytes  33.0 Mbits/sec  120   1.93 MBytes
[  4] 780.00-810.00 sec   117 MBytes  32.8 Mbits/sec  310   1.53 MBytes
[  4] 810.00-840.00 sec   118 MBytes  32.9 Mbits/sec   23   1.51 MBytes
[  4] 840.00-870.00 sec   117 MBytes  32.6 Mbits/sec  140   1.81 MBytes
[  4] 870.00-900.00 sec   117 MBytes  32.8 Mbits/sec   99   1.34 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  3.44 GBytes  32.8 Mbits/sec  3778             sender
[  4]   0.00-900.00 sec  3.44 GBytes  32.8 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd14:9aa4:e604:ec36::1 -i 30 -t 900 -R
Connecting to host fd14:9aa4:e604:ec36::1, port 5201
Reverse mode, remote host fd14:9aa4:e604:ec36::1 is sending
[  4] local fd2b:656a:6fdb:a3a8::5 port 35904 connected to fd14:9aa4:e604:ec36::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   122 MBytes  34.2 Mbits/sec
[  4]  30.00-60.00  sec   124 MBytes  34.7 Mbits/sec
[  4]  60.00-90.00  sec   125 MBytes  34.9 Mbits/sec
[  4]  90.00-120.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 120.00-150.00 sec   125 MBytes  35.0 Mbits/sec
[  4] 150.00-180.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 180.00-210.00 sec   124 MBytes  34.5 Mbits/sec
[  4] 210.00-240.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 240.00-270.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 270.00-300.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 300.00-330.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 330.00-360.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 360.00-390.00 sec   124 MBytes  34.8 Mbits/sec
[  4] 390.00-420.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 420.00-450.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 450.00-480.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 480.00-510.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 510.00-540.00 sec   122 MBytes  34.1 Mbits/sec
[  4] 540.00-570.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 570.00-600.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 600.00-630.00 sec   123 MBytes  34.5 Mbits/sec
[  4] 630.00-660.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 660.00-690.00 sec   123 MBytes  34.3 Mbits/sec
[  4] 690.00-720.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 720.00-750.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 750.00-780.00 sec   123 MBytes  34.3 Mbits/sec
[  4] 780.00-810.00 sec   124 MBytes  34.7 Mbits/sec
[  4] 810.00-840.00 sec   125 MBytes  34.9 Mbits/sec
[  4] 840.00-870.00 sec   124 MBytes  34.6 Mbits/sec
[  4] 870.00-900.00 sec   122 MBytes  34.1 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  3.63 GBytes  34.6 Mbits/sec  16597             sender
[  4]   0.00-900.00 sec  3.63 GBytes  34.6 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lace:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@lace:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  91   0   0   9|ksoftirqd/0  8.3|   0     0
0.08 0.03 0.05|  0   0  73   0   0  27|ksoftirqd/0   25|1231k 2364k
0.55 0.15 0.09|  0   0   0   0   0  99|ksoftirqd/0   90|4407k 8560k
0.73 0.23 0.12|  0   0   0   0   0 100|ksoftirqd/0   92|4503k 8751k
0.91 0.32 0.15|  0   0   0   0   0  99|ksoftirqd/0   91|4448k 8650k
1.00 0.40 0.19|  0   0   0   0   0  99|ksoftirqd/0   92|4460k 8676k
1.17 0.51 0.23|  0   0   0   0   0  99|ksoftirqd/0   90|4442k 8624k
1.40 0.62 0.27|  0   0   0   0   0  99|ksoftirqd/0   91|4490k 8744k
1.40 0.69 0.31|  0   0   0   0   0  99|ksoftirqd/0   90|4384k 8530k
1.24 0.72 0.33|  0   0   0   0   0 100|ksoftirqd/0   91|4521k 8785k
1.15 0.75 0.35|  0   0   0   0   0 100|ksoftirqd/0   91|4443k 8651k
1.16 0.79 0.38|  0   0   0   0   0 100|ksoftirqd/0   92|4476k 8695k
1.24 0.84 0.41|  0   0   0   0   0  99|ksoftirqd/0   90|4424k 8627k
1.20 0.87 0.43|  0   0   0   0   0 100|ksoftirqd/0   92|4484k 8735k
1.12 0.88 0.45|  0   0   0   0   0 100|ksoftirqd/0   91|4478k 8703k
1.07 0.89 0.47|  0   0   0   0   0 100|ksoftirqd/0   91|4475k 8723k
1.04 0.90 0.48|  0   0   0   0   0 100|ksoftirqd/0   92|4469k 8692k
1.16 0.94 0.51|  0   0   0   0   0  99|ksoftirqd/0   92|4484k 3968M
1.10 0.95 0.52|  0   1   0   0   0  99|ksoftirqd/0   91|4421k 8609k
1.19 0.99 0.55|  0   0   0   0   0 100|ksoftirqd/0   91|4436k 8634k
1.28 1.03 0.58|  0   0   0   0   0 100|ksoftirqd/0   91|4479k 8724k
1.24 1.05 0.60|  0   0   0   0   0 100|ksoftirqd/0   91|4450k 8651k
1.42 1.11 0.63|  0   0   0   0   0  99|ksoftirqd/0   92|4456k 8685k
1.25 1.10 0.65|  0   0   0   0   0  99|ksoftirqd/0   91|4447k 8662k
1.29 1.12 0.67|  0   0   0   0   0 100|ksoftirqd/0   91|4464k 8695k
1.17 1.11 0.68|  0   0   0   0   0  99|ksoftirqd/0   91|4475k 8701k
1.25 1.13 0.70|  0   0   0   0   0 100|ksoftirqd/0   91|4458k 8665k
1.15 1.12 0.71|  0   0   0   0   0 100|ksoftirqd/0   91|3964M 8677k
1.09 1.10 0.72|  0   0   0   0   0  99|ksoftirqd/0   91|4461k 8671k
1.12 1.11 0.73|  0   0   0   0   0 100|ksoftirqd/0   92|4450k 8666k
1.13 1.12 0.75|  0   0   0   0   0 100|ksoftirqd/0   92|4481k 8721k
0.92 1.07 0.74|  0   0  24   0   0  75|ksoftirqd/0   67|3229k 6301k
0.56 0.97 0.72|  0   0 100   0   0   0|kworker/0:2  0.1|  17B   13B
0.34 0.88 0.70|  0   0 100   0   0   0|kworker/u2:2 0.0|  16B   11B
0.61 0.89 0.71|  0   0  27   0   0  73|ksoftirqd/0   68|6775k 3544k
1.03 0.96 0.74|  0   0   0   0   0 100|ksoftirqd/0   91|9100k 4799k
1.08 0.98 0.75|  0   0   0   0   0  99|ksoftirqd/0   92|9092k 4794k
1.11 1.00 0.76|  0   0   0   0   0 100|ksoftirqd/0   92|9202k 4847k
1.13 1.02 0.78|  0   0   0   0   0  99|ksoftirqd/0   92|9150k 4827k
1.16 1.03 0.79|  0   0   0   0   0 100|ksoftirqd/0   92|9138k 4820k
1.10 1.03 0.79|  0   0   0   0   0  99|ksoftirqd/0   92|9073k 4781k
1.13 1.04 0.81|  0   0   0   0   0  99|ksoftirqd/0   92|9139k 4808k
1.23 1.07 0.82|  0   0   0   0   0  99|ksoftirqd/0   91|9019k 4762k
1.20 1.08 0.83|  0   0   0   0   0 100|ksoftirqd/0   92|9242k 4862k
1.40 1.14 0.86|  0   0   0   0   0 100|ksoftirqd/0   92|9167k 4830k
1.36 1.16 0.88|  0   0   0   0   0  99|ksoftirqd/0   91|9132k 4820k
1.22 1.14 0.88|  0   0   0   0   0 100|ksoftirqd/0   92|9159k 4811k
1.13 1.13 0.88|  0   0   0   0   0 100|ksoftirqd/0   92|9042k 4768k
1.08 1.12 0.88|  0   0   0   0   0 100|ksoftirqd/0   92|9180k 4848k
1.05 1.10 0.89|  0   0   0   0   0 100|ksoftirqd/0   91|9096k 4787k
1.10 1.11 0.90|  0   0   0   0   0 100|ksoftirqd/0   92|9077k 3964M
1.06 1.10 0.90|  0   0   0   0   0  99|ksoftirqd/0   90|9108k 4810k
1.31 1.15 0.92|  0   0   0   0   0 100|ksoftirqd/0   91|9082k 4782k
1.19 1.14 0.93|  0   0   0   0   0 100|ksoftirqd/0   91|9144k 4826k
1.11 1.13 0.93|  0   0   0   0   0 100|ksoftirqd/0   92|9129k 4799k
1.07 1.11 0.93|  0   0   0   0   0  99|ksoftirqd/0   91|9034k 4777k
1.23 1.15 0.95|  0   0   0   0   0  99|ksoftirqd/0   92|9152k 4821k
1.20 1.15 0.96|  0   0   0   0   0  99|ksoftirqd/0   92|9171k 4818k
1.18 1.15 0.96|  0   0   0   0   0  99|ksoftirqd/0   91|9087k 4806k
1.11 1.14 0.96|  0   0   0   0   0  99|ksoftirqd/0   92|9041k 4777k
1.15 1.14 0.97|  0   0   0   0   0  99|ksoftirqd/0   92|3968M 4786k
1.16 1.15 0.97|  0   0   0   0   0 100|ksoftirqd/0   93|9196k 4855k
1.23 1.16 0.98|  0   0   0   0   0  99|ksoftirqd/0   91|9108k 4794k
1.19 1.16 0.99|  0   0   1   0   0  99|ksoftirqd/0   91|9058k 4785k
0.88 1.10 0.97|  0   0  72   0   0  28|ksoftirqd/0   25|2413k 1279k
0.54 0.99 0.94|  0   0 100   0   0   0|kworker/u2:1 0.0|  17B   11B
0.32 0.90 0.91|  0   0  99   0   0   0|kworker/0:2  0.0|  48B   11B
0.20 0.81 0.88|  0   0  99   0   0   0|kworker/0:2  0.1|  24B   11B
0.12 0.73 0.85|  0   0 100   0   0   0|kworker/0:2  0.0|  18B   11B
root@lace:~#
```

##### Raspberry Pi 2

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900
Connecting to host fd45:64bf:295c:5631::1, port 5201
[  4] local fd57:d1b1:9c79:40af::5 port 43781 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth       Retr  Cwnd
[  4]   0.00-30.00  sec   238 MBytes  66.7 Mbits/sec  128   1.18 MBytes
[  4]  30.00-60.00  sec   239 MBytes  66.8 Mbits/sec   35   1.42 MBytes
[  4]  60.00-90.00  sec   238 MBytes  66.4 Mbits/sec  424   1.26 MBytes
[  4]  90.00-120.00 sec   238 MBytes  66.5 Mbits/sec   45   1.45 MBytes
[  4] 120.00-150.00 sec   237 MBytes  66.1 Mbits/sec   38   1.58 MBytes
[  4] 150.00-180.00 sec   238 MBytes  66.7 Mbits/sec   93   1.29 MBytes
[  4] 180.00-210.00 sec   238 MBytes  66.6 Mbits/sec  258   1.82 MBytes
[  4] 210.00-240.00 sec   236 MBytes  66.0 Mbits/sec  103   1.61 MBytes
[  4] 240.00-270.00 sec   237 MBytes  66.3 Mbits/sec  118   1.47 MBytes
[  4] 270.00-300.00 sec   236 MBytes  66.1 Mbits/sec  162   1.76 MBytes
[  4] 300.00-330.00 sec   237 MBytes  66.3 Mbits/sec  120   1.59 MBytes
[  4] 330.00-360.00 sec   237 MBytes  66.4 Mbits/sec   57   1.23 MBytes
[  4] 360.00-390.00 sec   238 MBytes  66.5 Mbits/sec  170   1.51 MBytes
[  4] 390.00-420.00 sec   237 MBytes  66.2 Mbits/sec  167   1.80 MBytes
[  4] 420.00-450.00 sec   239 MBytes  66.8 Mbits/sec   97   1.25 MBytes
[  4] 450.00-480.00 sec   238 MBytes  66.5 Mbits/sec   55   1.82 MBytes
[  4] 480.00-510.00 sec   237 MBytes  66.4 Mbits/sec  183   1.15 MBytes
[  4] 510.00-540.00 sec   237 MBytes  66.2 Mbits/sec   19   1.47 MBytes
[  4] 540.00-570.00 sec   238 MBytes  66.5 Mbits/sec   39   1.59 MBytes
[  4] 570.00-600.00 sec   236 MBytes  65.9 Mbits/sec  110   1.87 MBytes
[  4] 600.00-630.00 sec   234 MBytes  65.6 Mbits/sec  121   1.17 MBytes
[  4] 630.00-660.00 sec   238 MBytes  66.5 Mbits/sec   92   1.46 MBytes
[  4] 660.00-690.00 sec   234 MBytes  65.5 Mbits/sec   51   1.77 MBytes
[  4] 690.00-720.00 sec   231 MBytes  64.5 Mbits/sec   39   1.82 MBytes
[  4] 720.00-750.00 sec   236 MBytes  66.1 Mbits/sec   64   1.76 MBytes
[  4] 750.00-780.00 sec   236 MBytes  65.9 Mbits/sec   63   1.33 MBytes
[  4] 780.00-810.00 sec   237 MBytes  66.2 Mbits/sec   50   1.76 MBytes
[  4] 810.00-840.00 sec   239 MBytes  66.8 Mbits/sec   28   1.82 MBytes
[  4] 840.00-870.00 sec   238 MBytes  66.6 Mbits/sec   20   1.81 MBytes
[  4] 870.00-900.00 sec   236 MBytes  66.0 Mbits/sec   82   1.91 MBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  6.94 GBytes  66.2 Mbits/sec  3031             sender
[  4]   0.00-900.00 sec  6.94 GBytes  66.2 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@lenovo:~# iperf3 -c fd45:64bf:295c:5631::1 -i 30 -t 900 -R
Connecting to host fd45:64bf:295c:5631::1, port 5201
Reverse mode, remote host fd45:64bf:295c:5631::1 is sending
[  4] local fd57:d1b1:9c79:40af::5 port 43787 connected to fd45:64bf:295c:5631::1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-30.00  sec   248 MBytes  69.4 Mbits/sec
[  4]  30.00-60.00  sec   247 MBytes  69.1 Mbits/sec
[  4]  60.00-90.00  sec   239 MBytes  66.8 Mbits/sec
[  4]  90.00-120.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 120.00-150.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 150.00-180.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 180.00-210.00 sec   247 MBytes  69.2 Mbits/sec
[  4] 210.00-240.00 sec   248 MBytes  69.3 Mbits/sec
[  4] 240.00-270.00 sec   247 MBytes  69.2 Mbits/sec
[  4] 270.00-300.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 300.00-330.00 sec   250 MBytes  69.9 Mbits/sec
[  4] 330.00-360.00 sec   248 MBytes  69.4 Mbits/sec
[  4] 360.00-390.00 sec   250 MBytes  69.8 Mbits/sec
[  4] 390.00-420.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 420.00-450.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 450.00-480.00 sec   246 MBytes  68.8 Mbits/sec
[  4] 480.00-510.00 sec   250 MBytes  69.9 Mbits/sec
[  4] 510.00-540.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 540.00-570.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 570.00-600.00 sec   248 MBytes  69.5 Mbits/sec
[  4] 600.00-630.00 sec   249 MBytes  69.5 Mbits/sec
[  4] 630.00-660.00 sec   248 MBytes  69.3 Mbits/sec
[  4] 660.00-690.00 sec   250 MBytes  69.9 Mbits/sec
[  4] 690.00-720.00 sec   247 MBytes  69.1 Mbits/sec
[  4] 720.00-750.00 sec   250 MBytes  70.0 Mbits/sec
[  4] 750.00-780.00 sec   249 MBytes  69.6 Mbits/sec
[  4] 780.00-810.00 sec   250 MBytes  69.9 Mbits/sec
[  4] 810.00-840.00 sec   248 MBytes  69.5 Mbits/sec
[  4] 840.00-870.00 sec   248 MBytes  69.4 Mbits/sec
[  4] 870.00-900.00 sec   248 MBytes  69.4 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth       Retr
[  4]   0.00-900.00 sec  7.27 GBytes  69.4 Mbits/sec  17251             sender
[  4]   0.00-900.00 sec  7.27 GBytes  69.4 Mbits/sec                  receiver

iperf Done.
root@lenovo:~#
```

```
root@jessie-rpi:~# dstat --nocolor  -l -c --top-cpu -n 30 > res
^Croot@jessie-rpi:~# cat res
---load-avg--- ----total-cpu-usage---- -most-expensive- -net/total-
 1m   5m  15m |usr sys idl wai hiq siq|  cpu process   | recv  send
   0 0.01 0.05|  0   0  99   0   0   1|ksoftirqd/0  0.7|   0     0
0.05 0.03 0.05|  0   0 100   0   0   0|irqbalance   0.0|  28B   17B
0.03 0.03 0.05|  0   0 100   0   0   0|irqbalance   0.1|  17B   11B
0.02 0.02 0.05|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.06 0.04 0.05|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.09 0.05 0.05|  0   0 100   0   0   0|irqbalance   0.0|  18B   11B
0.31 0.11 0.07|  0   0  86   0   0  14|ksoftirqd/0   14|5529k   10M
0.64 0.21 0.10|  0   0  76   0   0  24|ksoftirqd/0   23|9027k   17M
0.78 0.28 0.13|  0   0  77   0   0  23|ksoftirqd/0   23|3968M   17M
0.99 0.38 0.17|  0   0  76   0   0  24|ksoftirqd/0   23|9083k   17M
1.12 0.47 0.21|  0   0  77   0   0  23|ksoftirqd/0   23|8975k   17M
1.07 0.52 0.23|  0   0  77   0   0  23|ksoftirqd/0   22|8990k   17M
0.95 0.55 0.25|  0   0  76   0   0  24|ksoftirqd/0   23|9042k   17M
0.97 0.59 0.28|  0   0  76   0   0  24|ksoftirqd/0   23|9025k   17M
0.90 0.62 0.29|  0   0  77   0   0  23|ksoftirqd/0   23|8942k   17M
0.86 0.64 0.31|  0   0  76   0   0  23|ksoftirqd/0   23|9003k 3977M
0.92 0.67 0.33|  0   0  76   0   0  23|ksoftirqd/0   23|9023k   17M
0.80 0.67 0.34|  0   0  76   0   0  23|ksoftirqd/0   23|9002k   17M
0.88 0.70 0.36|  0   0  76   0   0  23|ksoftirqd/0   23|8975k   17M
1.00 0.75 0.39|  0   0  76   0   0  24|ksoftirqd/0   23|9052k   17M
1.00 0.77 0.41|  0   0  76   0   0  24|ksoftirqd/0   23|9024k   17M
0.93 0.78 0.42|  0   0  76   0   0  24|ksoftirqd/0   23|8996k   17M
0.96 0.80 0.44|  0   0  76   0   0  24|ksoftirqd/0   23|9054k   17M
0.97 0.82 0.46|  0   0  76   0   0  23|ksoftirqd/0   23|8931k   17M
0.98 0.83 0.47|  0   0  76   0   0  24|ksoftirqd/0   23|3968M   17M
0.86 0.82 0.48|  0   0  76   0   0  24|ksoftirqd/0   23|9012k   17M
0.86 0.82 0.49|  0   0  77   0   0  23|ksoftirqd/0   22|8842k   17M
0.91 0.84 0.51|  0   0  76   0   0  23|ksoftirqd/0   23|8966k   17M
0.95 0.85 0.52|  0   0  76   0   0  23|ksoftirqd/0   23|9020k   17M
0.97 0.87 0.54|  0   0  77   0   0  23|ksoftirqd/0   22|8730k   17M
0.98 0.88 0.55|  0   0  77   0   0  23|ksoftirqd/0   23|8914k   17M
0.99 0.89 0.57|  0   0  77   0   0  23|ksoftirqd/0   23|8979k 3977M
0.99 0.90 0.58|  0   0  77   0   0  23|ksoftirqd/0   23|9003k   17M
0.88 0.88 0.59|  0   0  77   0   0  23|ksoftirqd/0   23|8936k   17M
0.92 0.89 0.60|  0   0  76   0   0  24|ksoftirqd/0   23|9051k   17M
0.95 0.90 0.61|  0   0  77   0   0  23|ksoftirqd/0   23|8974k   17M
0.75 0.86 0.61|  0   0  91   0   0   9|ksoftirqd/0  9.0|3524k 6898k
0.45 0.78 0.59|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
0.28 0.70 0.57|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.17 0.64 0.55|  0   0 100   0   0   0|irqbalance   0.0|  17B   11B
0.10 0.58 0.53|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.35 0.59 0.54|  0   0  79   0   0  21|ksoftirqd/0   20|  15M 8066k
0.60 0.63 0.55|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9614k
0.76 0.66 0.57|  0   0  76   0   0  24|ksoftirqd/0   23|  17M 9340k
0.85 0.69 0.58|  0   0  76   0   0  24|ksoftirqd/0   24|3977M 9495k
0.91 0.72 0.60|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9632k
0.95 0.75 0.61|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9666k
0.97 0.77 0.62|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9582k
0.98 0.80 0.63|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9591k
0.88 0.78 0.63|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9621k
0.93 0.80 0.64|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9584k
1.02 0.84 0.66|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 3969M
1.14 0.89 0.68|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9613k
1.08 0.90 0.69|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9663k
0.99 0.89 0.70|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9641k
1.00 0.90 0.70|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9633k
1.00 0.91 0.71|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9577k
1.00 0.92 0.72|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9637k
1.00 0.93 0.73|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9671k
1.00 0.93 0.74|  0   0  75   0   0  25|ksoftirqd/0   25|3977M 9611k
1.00 0.94 0.75|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9653k
1.00 0.95 0.76|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9610k
0.92 0.93 0.76|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9596k
0.95 0.94 0.77|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9676k
0.97 0.95 0.78|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9605k
0.93 0.94 0.78|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9658k
0.96 0.94 0.78|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 3969M
0.91 0.93 0.78|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9680k
0.95 0.94 0.79|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9614k
0.97 0.94 0.80|  0   0  75   0   0  25|ksoftirqd/0   24|  18M 9614k
0.98 0.95 0.80|  0   0  75   0   0  25|ksoftirqd/0   25|  18M 9645k
0.65 0.87 0.78|  0   0  96   0   0   4|ksoftirqd/0  4.2|3064k 1641k
0.39 0.79 0.76|  0   0 100   0   0   0|irqbalance   0.1|  48B   11B
0.24 0.71 0.73|  0   0 100   0   0   0|irqbalance   0.0|  25B   11B
0.14 0.65 0.71|  0   0 100   0   0   0|irqbalance   0.1|  16B   11B
0.09 0.58 0.69|  0   0 100   0   0   0|irqbalance   0.0|  16B   11B
root@jessie-rpi:~#
```

## Results

| ---  | Forward<br>Mbit/s | Forward<br>Mbit/s<br>(%cpu) | Reverse<br>Mbit/s | Reverse<br>Mbit/s<br>(%cpu) | Forward<br>Mbit/s | Forward<br>Mbit/s<br>(cpu%) | Reverse<br>Mbit/s | Reverse<br>Mbit/s<br>(%cpu) | Forward<br>Mbit/s | Forward<br>Mbit/s<br>(%cpu) | Reverse<br>Mbit/s  | Reverse<br>Mbit/s<br>(%cpu) |
| ---- | ----------------- | --------------------------- | ----------------- | --------------------------- | ----------------- | --------------------------- | ----------------- | --------------------------- | ----------------- | --------------------------- | ------------------ | --------------------------- | --- |
| ---  | IPv4              | ---                         | ---               | ---                         | IPv6              | ---                         | ---               | ---                         | ---               | ---                         | IPv6 with iptables | ---                         |     |
| RPi  | 65.6              | 65.2<br>(100%)              | 62.9              | 63.2<br>(100%)              | 47.5              | 47.3<br>(100%)              | 50.4              | 50.2<br>(100%)              | 32.9              | 32.8<br>(100%)              | 34.8               | 34.6<br>(100%)              |
| RPi2 | 89.3              | 89.3<br>(3%)                | 78.0              | 78.1<br>(5%)                | 85.6              | 84.7<br>(20%)               | 78.2              | 78.2<br>(8%)                | 66.2              | 66.2<br>(23%)               | 69.5               | 69.4<br>(25%)               |
