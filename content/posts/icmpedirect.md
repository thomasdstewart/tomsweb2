---
title: "ICMP Redirect"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "networking"]
categories: []
date: 2009-06-13 15:46:00
---

Today I found out where Linux exposes the extra routing information gathered
from ICMP redirects. `ip route show cache` will show the entire cached routing
table. It's a bit hard to read so `ip route show cache 1.2.3.4` is better. For
example 192.168.1.0/24 is a network that is connected via a host on my
192.168.0/24 network. My default gateway (192.168.0.1) has a static routing
entry to the host that gateways for the 192.168.1.0/24 network (192.168.0.57). So
when a random host on the 192.168.0.0/24 network pings a host on the
192.168.1.0/24 network it first sends to 192.168.0.1 but it sends an ICMP
redirect saying that in the future it would be better to just send direct to
192.168.0.57.

```
$ ip route show cache 192.168.1.20
$ ping 192.168.1.20
PING 192.168.1.20 (192.168.1.20) 56(84) bytes of data.
64 bytes from 192.168.1.20: icmp_seq=1 ttl=63 time=2.25 ms
From 192.168.0.1: icmp_seq=2 Redirect Host(New nexthop: 192.168.0.57)
64 bytes from 192.168.1.20: icmp_seq=2 ttl=63 time=2.34 ms
64 bytes from 192.168.1.20: icmp_seq=3 ttl=63 time=1.32 ms
64 bytes from 192.168.1.20: icmp_seq=4 ttl=63 time=1.24 ms
^C
--- 192.168.1.20 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3012ms
rtt min/avg/max/mdev = 1.241/1.791/2.344/0.511 ms
$
$ ip route show cache 192.168.1.20
192.168.1.20 from 192.168.0.62 via 192.168.0.57 dev eth1
    cache   mtu 1500 advmss 1460 hoplimit 64
192.168.1.20 via 192.168.0.57 dev eth1  src 192.168.0.62
    cache   mtu 1500 advmss 1460 hoplimit 64
$
```

The
[Guide to IP Layer Network Administration with Linux](http://linux-ip.net/html/)
is an excellent guide!
