---
title: "Weird Traceroute"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "networking"]
categories: []
date: 2010-07-29 22:56:00
---

I was looking at a development web site I am involved with and I was interested
in where the site was in the big bad world, so I decided to traceroute to it [1].
What seemed very unusual was that the 5th hop reported an IP address in the
10.0.0.0/8 private address space. To quote Sam "10.what now?". I'm still amazed
that packets with private source addresses are routed across the
Internet![2]

```
[1]
$ sudo traceroute -m 10 -N 1 -M default 78.86.199.179
traceroute to 78.86.199.179 (78.86.199.179), 10 hops max, 40 byte packets
 1  80-68-93-1.no-reverse-dns-set.bytemark.co.uk (80.68.93.1)  0.389 ms  0.174 ms  0.154 ms
 2  89-16-188-3.no-reverse-dns-set.bytemark.co.uk (89.16.188.3)  0.366 ms  0.440 ms  0.326 ms
 3  gi4-19.cr01.thn.bytemark.co.uk (80.68.80.73)  6.822 ms  6.707 ms  7.314 ms
 4  * * linx-gw1.betherenow.co.uk (195.66.224.232)  11.099 ms
 5  10.1.3.177 (10.1.3.177)  9.041 ms  8.237 ms  7.706 ms
 6  * * *
 7  * * *
 8  * * *
 9  * * *
10  * * *
$
$ sudo traceroute -m 10 -N 1 -M icmp 78.86.199.179
traceroute to 78.86.199.179 (78.86.199.179), 10 hops max, 40 byte packets
 1  80-68-93-1.no-reverse-dns-set.bytemark.co.uk (80.68.93.1)  0.216 ms  0.134 ms  0.092 ms
 2  89-16-188-3.no-reverse-dns-set.bytemark.co.uk (89.16.188.3)  0.404 ms  0.382 ms  0.451 ms
 3  gi4-19.cr01.thn.bytemark.co.uk (80.68.80.73)  8.107 ms  7.459 ms  7.462 ms
 4  linx-gw1.betherenow.co.uk (195.66.224.232)  7.653 ms  7.440 ms  8.356 ms
 5  10.1.3.177 (10.1.3.177)  10.940 ms  20.268 ms  9.236 ms
 6  * * *
 7  * * *
 8  * * *
 9  * * *
10  * * *
$
$ sudo traceroute -m 10 -N 1 -M tcp 78.86.199.179
traceroute to 78.86.199.179 (78.86.199.179), 10 hops max, 40 byte packets
 1  80-68-93-1.no-reverse-dns-set.bytemark.co.uk (80.68.93.1)  0.323 ms  0.437 ms  0.200 ms
 2  89-16-188-3.no-reverse-dns-set.bytemark.co.uk (89.16.188.3)  0.446 ms  0.333 ms  0.391 ms
 3  gi4-19.cr01.thn.bytemark.co.uk (80.68.80.73)  7.120 ms  6.713 ms  6.800 ms
 4  linx-gw1.betherenow.co.uk (195.66.224.232)  7.925 ms  7.737 ms  7.881 ms
 5  10.1.3.177 (10.1.3.177)  7.816 ms  7.500 ms  8.614 ms
 6  78-86-199-179.zone2.bethere.co.uk (78.86.199.179)  21.213 ms  21.239 ms  21.242 ms
 7  78-86-199-179.zone2.bethere.co.uk (78.86.199.179)  20.770 ms  21.662 ms  22.061 ms
$
$ sudo traceroute -m 10 -N 1 -M udp 78.86.199.179
traceroute to 78.86.199.179 (78.86.199.179), 10 hops max, 40 byte packets
 1  80-68-93-1.no-reverse-dns-set.bytemark.co.uk (80.68.93.1)  0.276 ms  0.096 ms  0.091 ms
 2  89-16-188-3.no-reverse-dns-set.bytemark.co.uk (89.16.188.3)  0.444 ms  0.409 ms  0.403 ms
 3  gi4-19.cr01.thn.bytemark.co.uk (80.68.80.73)  6.747 ms  6.797 ms  6.844 ms
 4  * linx-gw1.betherenow.co.uk (195.66.224.232)  7.620 ms  7.488 ms
 5  10.1.3.177 (10.1.3.177)  8.766 ms  7.501 ms  8.638 ms
 6  * * *
 7  * * *
 8  * * *
 9  * * *
10  * * *
$
$ sudo traceroute -m 10 -N 1 -M raw 78.86.199.179
traceroute to 78.86.199.179 (78.86.199.179), 10 hops max, 40 byte packets
 1  80-68-93-1.no-reverse-dns-set.bytemark.co.uk (80.68.93.1)  0.314 ms  0.097 ms  0.093 ms
 2  89-16-188-3.no-reverse-dns-set.bytemark.co.uk (89.16.188.3)  0.378 ms  0.412 ms  0.330 ms
 3  gi4-19.cr01.thn.bytemark.co.uk (80.68.80.73)  23.388 ms  8.331 ms  7.084 ms
 4  linx-gw1.betherenow.co.uk (195.66.224.232)  8.294 ms  7.517 ms  8.027 ms
 5  10.1.3.177 (10.1.3.177)  8.502 ms  7.589 ms  7.450 ms
 6  * * *
 7  * * *
 8  * * *
 9  * * *
10  * * *
$

[2]
$ tshark -r cap -R "ip.src == 10.0.0.0/8"
177   8.113729   10.1.3.177 -> 80.68.93.148 ICMP Time-to-live exceeded (Time to live exceeded in transit)
183   8.122267   10.1.3.177 -> 80.68.93.148 ICMP Time-to-live exceeded (Time to live exceeded in transit)
187   8.130944   10.1.3.177 -> 80.68.93.148 ICMP Time-to-live exceeded (Time to live exceeded in transit)
$
```
