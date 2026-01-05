---
title: "Wireless and Copper Routing on Windows"
summary: ""
authors: ["thomas"]
tags: ["blog", "windows", "networking"]
categories: []
date: 2012-12-09 20:51:00
---

Ever used a laptop with a wireless and a copper network interface? Practically
every laptop has both, so chances are you have. Have you ever wondered what
happens if you plug in with copper, turn wireless on and have both interfaces
configured with an IP address? I decided to do this and have a quick look
at the routing table to see what goes on.

TL;DR Windows is sane and uses copper if you configure both.

Here is a sample ipconfig with some slight anonymization:

```
>ipconfig

Windows IP Configuration


Wireless LAN adapter Wireless Network Connection:

   Connection-specific DNS Suffix  . : example.com
   IPv4 Address. . . . . . . . . . . : 10.0.2.24
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.0.2.1

Ethernet adapter Local Area Connection:

   Connection-specific DNS Suffix  . : example.com
   IPv4 Address. . . . . . . . . . . : 10.0.1.24
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.0.1.1

Tunnel adapter isatap.example.com:

   Media State . . . . . . . . . . . : Media disconnected
   Connection-specific DNS Suffix  . : example.com

Tunnel adapter Local Area Connection* 11:

   Media State . . . . . . . . . . . : Media disconnected
   Connection-specific DNS Suffix  . :

>
```

and here is the routing table:

```
>netstat -rn
===========================================================================
Interface List
 14...10 0b a9 96 fc 2c ......Intel(R) Centrino(R) Advanced-N 6205
 11...00 21 cc ba 7f 38 ......Intel(R) 82579LM Gigabit Network Connection
  1...........................Software Loopback Interface 1
 13...00 00 00 00 00 00 00 e0 Microsoft ISATAP Adapter
 10...00 00 00 00 00 00 00 e0 Teredo Tunneling Pseudo-Interface
===========================================================================

IPv4 Route Table
===========================================================================
Active Routes:
Network Destination        Netmask          Gateway       Interface  Metric
          0.0.0.0          0.0.0.0         10.0.1.1        10.0.1.24     10
          0.0.0.0          0.0.0.0         10.0.2.1        10.0.2.24     30
        127.0.0.0        255.0.0.0         On-link         127.0.0.1    306
        127.0.0.1  255.255.255.255         On-link         127.0.0.1    306
  127.255.255.255  255.255.255.255         On-link         127.0.0.1    306
         10.0.1.0    255.255.255.0         On-link         10.0.1.24    266
        10.0.1.24  255.255.255.255         On-link         10.0.1.24    266
       10.0.1.255  255.255.255.255         On-link         10.0.1.24    266
         10.0.2.0    255.255.255.0         On-link         10.0.2.24    286
        10.0.2.24  255.255.255.255         On-link         10.0.2.24    286
       10.0.2.255  255.255.255.255         On-link         10.0.2.24    286
        224.0.0.0        240.0.0.0         On-link         127.0.0.1    306
        224.0.0.0        240.0.0.0         On-link         10.0.1.24    266
        224.0.0.0        240.0.0.0         On-link         10.0.2.24    286
  255.255.255.255  255.255.255.255         On-link         127.0.0.1    306
  255.255.255.255  255.255.255.255         On-link         10.0.1.24    266
  255.255.255.255  255.255.255.255         On-link         10.0.2.24    286
===========================================================================
Persistent Routes:
  None

===========================================================================
Persistent Routes:
  None

>
```

As you can see there are two default gateways (i.e. destination 0.0.0.0) and the
one with the lowest metric uses the 10.0.1.24 interface, which is the copper
one. So it turns out that Windows seems sane and favours the faster copper
interface when both are configured and working.

As an aside on Linux using a default network-manager setup, it also seems sane.
You get one default gateway but the copper interface is used if it is available.
The default gateway changes when the network interfaces go up and down.
