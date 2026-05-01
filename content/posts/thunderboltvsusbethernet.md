---
title: "Thunderbolt vs USB Ethernet"
summary: ""
authors: ["thomas"]
tags: ["linux", "ethernet"]
categories: []
date: 2026-05-01 06:48:00
---
Having worked over high lateny powerline adapters I'm now wary of anything that could introduce latency into my daily life. Having a low latency link is just nicer when you spend most of you day on Microsoft Teams calls. Currenty my packets traverse my office swtich, core switch, router, back to the core and then to the NTU.

I currently have a "Toshiba Thunderbolt 3 Dock" thats about 7 years old (they are still avaliable for ~£100) and I'm thinking of swtiching it out for a new usb dock. So I've decided to run a very quick "benchmark" to compaire them.

I used a Lenovo ThinkPad X13 Gen 2i to run a ping to the default gateway. First using the Tunderbolt dock and then using the Kensington SD4841P EQ USB-c Triple Video Driverless Dock. Here are the results

## Results

```
$ ping -n -c 100 192.168.0.1
PING 192.168.0.1 (192.168.0.1) 56(84) bytes of data.
64 bytes from 192.168.0.1: icmp_seq=1 ttl=64 time=0.176 ms
64 bytes from 192.168.0.1: icmp_seq=2 ttl=64 time=0.237 ms
64 bytes from 192.168.0.1: icmp_seq=3 ttl=64 time=0.240 ms
64 bytes from 192.168.0.1: icmp_seq=4 ttl=64 time=0.193 ms
64 bytes from 192.168.0.1: icmp_seq=5 ttl=64 time=0.245 ms
64 bytes from 192.168.0.1: icmp_seq=6 ttl=64 time=0.238 ms
64 bytes from 192.168.0.1: icmp_seq=7 ttl=64 time=0.276 ms
64 bytes from 192.168.0.1: icmp_seq=8 ttl=64 time=0.251 ms
64 bytes from 192.168.0.1: icmp_seq=9 ttl=64 time=0.309 ms
64 bytes from 192.168.0.1: icmp_seq=10 ttl=64 time=0.259 ms
64 bytes from 192.168.0.1: icmp_seq=11 ttl=64 time=0.236 ms
64 bytes from 192.168.0.1: icmp_seq=12 ttl=64 time=0.258 ms
64 bytes from 192.168.0.1: icmp_seq=13 ttl=64 time=0.263 ms
64 bytes from 192.168.0.1: icmp_seq=14 ttl=64 time=0.277 ms
64 bytes from 192.168.0.1: icmp_seq=15 ttl=64 time=7.80 ms
64 bytes from 192.168.0.1: icmp_seq=16 ttl=64 time=0.233 ms
64 bytes from 192.168.0.1: icmp_seq=17 ttl=64 time=0.290 ms
64 bytes from 192.168.0.1: icmp_seq=18 ttl=64 time=0.262 ms
64 bytes from 192.168.0.1: icmp_seq=19 ttl=64 time=0.242 ms
64 bytes from 192.168.0.1: icmp_seq=20 ttl=64 time=0.244 ms
64 bytes from 192.168.0.1: icmp_seq=21 ttl=64 time=0.271 ms
64 bytes from 192.168.0.1: icmp_seq=22 ttl=64 time=0.238 ms
64 bytes from 192.168.0.1: icmp_seq=23 ttl=64 time=0.236 ms
64 bytes from 192.168.0.1: icmp_seq=24 ttl=64 time=0.172 ms
64 bytes from 192.168.0.1: icmp_seq=25 ttl=64 time=0.176 ms
64 bytes from 192.168.0.1: icmp_seq=26 ttl=64 time=0.136 ms
64 bytes from 192.168.0.1: icmp_seq=27 ttl=64 time=0.223 ms
64 bytes from 192.168.0.1: icmp_seq=28 ttl=64 time=0.231 ms
64 bytes from 192.168.0.1: icmp_seq=29 ttl=64 time=0.218 ms
64 bytes from 192.168.0.1: icmp_seq=30 ttl=64 time=0.254 ms
64 bytes from 192.168.0.1: icmp_seq=31 ttl=64 time=0.278 ms
64 bytes from 192.168.0.1: icmp_seq=32 ttl=64 time=0.239 ms
64 bytes from 192.168.0.1: icmp_seq=33 ttl=64 time=0.244 ms
64 bytes from 192.168.0.1: icmp_seq=34 ttl=64 time=0.252 ms
64 bytes from 192.168.0.1: icmp_seq=35 ttl=64 time=0.261 ms
64 bytes from 192.168.0.1: icmp_seq=36 ttl=64 time=0.241 ms
64 bytes from 192.168.0.1: icmp_seq=37 ttl=64 time=0.254 ms
64 bytes from 192.168.0.1: icmp_seq=38 ttl=64 time=0.280 ms
64 bytes from 192.168.0.1: icmp_seq=39 ttl=64 time=0.281 ms
64 bytes from 192.168.0.1: icmp_seq=40 ttl=64 time=0.252 ms
64 bytes from 192.168.0.1: icmp_seq=41 ttl=64 time=0.249 ms
64 bytes from 192.168.0.1: icmp_seq=42 ttl=64 time=0.200 ms
64 bytes from 192.168.0.1: icmp_seq=43 ttl=64 time=0.236 ms
64 bytes from 192.168.0.1: icmp_seq=44 ttl=64 time=0.227 ms
64 bytes from 192.168.0.1: icmp_seq=45 ttl=64 time=0.295 ms
64 bytes from 192.168.0.1: icmp_seq=46 ttl=64 time=0.239 ms
64 bytes from 192.168.0.1: icmp_seq=47 ttl=64 time=0.234 ms
64 bytes from 192.168.0.1: icmp_seq=48 ttl=64 time=0.239 ms
64 bytes from 192.168.0.1: icmp_seq=49 ttl=64 time=0.207 ms
64 bytes from 192.168.0.1: icmp_seq=50 ttl=64 time=0.247 ms
64 bytes from 192.168.0.1: icmp_seq=51 ttl=64 time=0.284 ms
64 bytes from 192.168.0.1: icmp_seq=52 ttl=64 time=0.246 ms
64 bytes from 192.168.0.1: icmp_seq=53 ttl=64 time=0.234 ms
64 bytes from 192.168.0.1: icmp_seq=54 ttl=64 time=0.281 ms
64 bytes from 192.168.0.1: icmp_seq=55 ttl=64 time=0.206 ms
64 bytes from 192.168.0.1: icmp_seq=56 ttl=64 time=0.280 ms
64 bytes from 192.168.0.1: icmp_seq=57 ttl=64 time=0.247 ms
64 bytes from 192.168.0.1: icmp_seq=58 ttl=64 time=13.4 ms
64 bytes from 192.168.0.1: icmp_seq=59 ttl=64 time=0.255 ms
64 bytes from 192.168.0.1: icmp_seq=60 ttl=64 time=0.283 ms
64 bytes from 192.168.0.1: icmp_seq=61 ttl=64 time=0.244 ms
64 bytes from 192.168.0.1: icmp_seq=62 ttl=64 time=0.263 ms
64 bytes from 192.168.0.1: icmp_seq=63 ttl=64 time=0.268 ms
64 bytes from 192.168.0.1: icmp_seq=64 ttl=64 time=14.6 ms
64 bytes from 192.168.0.1: icmp_seq=65 ttl=64 time=0.245 ms
64 bytes from 192.168.0.1: icmp_seq=66 ttl=64 time=0.174 ms
64 bytes from 192.168.0.1: icmp_seq=67 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=68 ttl=64 time=0.230 ms
64 bytes from 192.168.0.1: icmp_seq=69 ttl=64 time=0.234 ms
64 bytes from 192.168.0.1: icmp_seq=70 ttl=64 time=0.258 ms
64 bytes from 192.168.0.1: icmp_seq=71 ttl=64 time=0.256 ms
64 bytes from 192.168.0.1: icmp_seq=72 ttl=64 time=0.158 ms
64 bytes from 192.168.0.1: icmp_seq=73 ttl=64 time=0.198 ms
64 bytes from 192.168.0.1: icmp_seq=74 ttl=64 time=0.246 ms
64 bytes from 192.168.0.1: icmp_seq=75 ttl=64 time=0.244 ms
64 bytes from 192.168.0.1: icmp_seq=76 ttl=64 time=0.234 ms
64 bytes from 192.168.0.1: icmp_seq=77 ttl=64 time=0.194 ms
64 bytes from 192.168.0.1: icmp_seq=78 ttl=64 time=0.249 ms
64 bytes from 192.168.0.1: icmp_seq=79 ttl=64 time=0.243 ms
64 bytes from 192.168.0.1: icmp_seq=80 ttl=64 time=0.230 ms
64 bytes from 192.168.0.1: icmp_seq=81 ttl=64 time=0.252 ms
64 bytes from 192.168.0.1: icmp_seq=82 ttl=64 time=0.262 ms
64 bytes from 192.168.0.1: icmp_seq=83 ttl=64 time=0.236 ms
64 bytes from 192.168.0.1: icmp_seq=84 ttl=64 time=0.242 ms
64 bytes from 192.168.0.1: icmp_seq=85 ttl=64 time=0.216 ms
64 bytes from 192.168.0.1: icmp_seq=86 ttl=64 time=0.246 ms
64 bytes from 192.168.0.1: icmp_seq=87 ttl=64 time=0.251 ms
64 bytes from 192.168.0.1: icmp_seq=88 ttl=64 time=0.234 ms
64 bytes from 192.168.0.1: icmp_seq=89 ttl=64 time=0.237 ms
64 bytes from 192.168.0.1: icmp_seq=90 ttl=64 time=0.242 ms
64 bytes from 192.168.0.1: icmp_seq=91 ttl=64 time=0.205 ms
64 bytes from 192.168.0.1: icmp_seq=92 ttl=64 time=0.223 ms
64 bytes from 192.168.0.1: icmp_seq=93 ttl=64 time=0.229 ms
64 bytes from 192.168.0.1: icmp_seq=94 ttl=64 time=0.258 ms
64 bytes from 192.168.0.1: icmp_seq=95 ttl=64 time=0.206 ms
64 bytes from 192.168.0.1: icmp_seq=96 ttl=64 time=0.252 ms
64 bytes from 192.168.0.1: icmp_seq=97 ttl=64 time=0.272 ms
64 bytes from 192.168.0.1: icmp_seq=98 ttl=64 time=0.264 ms
64 bytes from 192.168.0.1: icmp_seq=99 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=100 ttl=64 time=0.248 ms

--- 192.168.0.1 ping statistics ---
100 packets transmitted, 100 received, 0% packet loss, time 101253ms
rtt min/avg/max/mdev = 0.136/0.590/14.592/2.061 ms
$ 
```

## USB
```
$ ping -n -c 100 192.168.0.1
PING 192.168.0.1 (192.168.0.1) 56(84) bytes of data.
64 bytes from 192.168.0.1: icmp_seq=1 ttl=64 time=0.207 ms
64 bytes from 192.168.0.1: icmp_seq=2 ttl=64 time=0.233 ms
64 bytes from 192.168.0.1: icmp_seq=3 ttl=64 time=0.180 ms
64 bytes from 192.168.0.1: icmp_seq=4 ttl=64 time=0.184 ms
64 bytes from 192.168.0.1: icmp_seq=5 ttl=64 time=0.161 ms
64 bytes from 192.168.0.1: icmp_seq=6 ttl=64 time=0.193 ms
64 bytes from 192.168.0.1: icmp_seq=7 ttl=64 time=0.209 ms
64 bytes from 192.168.0.1: icmp_seq=8 ttl=64 time=0.216 ms
64 bytes from 192.168.0.1: icmp_seq=9 ttl=64 time=0.199 ms
64 bytes from 192.168.0.1: icmp_seq=10 ttl=64 time=0.224 ms
64 bytes from 192.168.0.1: icmp_seq=11 ttl=64 time=0.221 ms
64 bytes from 192.168.0.1: icmp_seq=12 ttl=64 time=0.217 ms
64 bytes from 192.168.0.1: icmp_seq=13 ttl=64 time=8.93 ms
64 bytes from 192.168.0.1: icmp_seq=14 ttl=64 time=0.184 ms
64 bytes from 192.168.0.1: icmp_seq=15 ttl=64 time=0.202 ms
64 bytes from 192.168.0.1: icmp_seq=16 ttl=64 time=0.190 ms
64 bytes from 192.168.0.1: icmp_seq=17 ttl=64 time=0.198 ms
64 bytes from 192.168.0.1: icmp_seq=18 ttl=64 time=0.165 ms
64 bytes from 192.168.0.1: icmp_seq=19 ttl=64 time=0.184 ms
64 bytes from 192.168.0.1: icmp_seq=20 ttl=64 time=0.190 ms
64 bytes from 192.168.0.1: icmp_seq=21 ttl=64 time=0.182 ms
64 bytes from 192.168.0.1: icmp_seq=22 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=23 ttl=64 time=54.6 ms
64 bytes from 192.168.0.1: icmp_seq=24 ttl=64 time=5.86 ms
64 bytes from 192.168.0.1: icmp_seq=25 ttl=64 time=0.186 ms
64 bytes from 192.168.0.1: icmp_seq=26 ttl=64 time=0.204 ms
64 bytes from 192.168.0.1: icmp_seq=27 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=28 ttl=64 time=0.190 ms
64 bytes from 192.168.0.1: icmp_seq=29 ttl=64 time=0.223 ms
64 bytes from 192.168.0.1: icmp_seq=30 ttl=64 time=20.6 ms
64 bytes from 192.168.0.1: icmp_seq=31 ttl=64 time=0.171 ms
64 bytes from 192.168.0.1: icmp_seq=32 ttl=64 time=0.142 ms
64 bytes from 192.168.0.1: icmp_seq=33 ttl=64 time=0.200 ms
64 bytes from 192.168.0.1: icmp_seq=34 ttl=64 time=0.210 ms
64 bytes from 192.168.0.1: icmp_seq=35 ttl=64 time=0.186 ms
64 bytes from 192.168.0.1: icmp_seq=36 ttl=64 time=0.165 ms
64 bytes from 192.168.0.1: icmp_seq=37 ttl=64 time=0.181 ms
64 bytes from 192.168.0.1: icmp_seq=38 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=39 ttl=64 time=0.184 ms
64 bytes from 192.168.0.1: icmp_seq=40 ttl=64 time=0.204 ms
64 bytes from 192.168.0.1: icmp_seq=41 ttl=64 time=0.203 ms
64 bytes from 192.168.0.1: icmp_seq=42 ttl=64 time=0.185 ms
64 bytes from 192.168.0.1: icmp_seq=43 ttl=64 time=0.192 ms
64 bytes from 192.168.0.1: icmp_seq=44 ttl=64 time=0.187 ms
64 bytes from 192.168.0.1: icmp_seq=45 ttl=64 time=0.163 ms
64 bytes from 192.168.0.1: icmp_seq=46 ttl=64 time=0.191 ms
64 bytes from 192.168.0.1: icmp_seq=47 ttl=64 time=12.6 ms
64 bytes from 192.168.0.1: icmp_seq=48 ttl=64 time=0.182 ms
64 bytes from 192.168.0.1: icmp_seq=49 ttl=64 time=0.171 ms
64 bytes from 192.168.0.1: icmp_seq=50 ttl=64 time=0.184 ms
64 bytes from 192.168.0.1: icmp_seq=51 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=52 ttl=64 time=0.151 ms
64 bytes from 192.168.0.1: icmp_seq=53 ttl=64 time=0.188 ms
64 bytes from 192.168.0.1: icmp_seq=54 ttl=64 time=0.183 ms
64 bytes from 192.168.0.1: icmp_seq=55 ttl=64 time=0.177 ms
64 bytes from 192.168.0.1: icmp_seq=56 ttl=64 time=0.174 ms
64 bytes from 192.168.0.1: icmp_seq=57 ttl=64 time=0.173 ms
64 bytes from 192.168.0.1: icmp_seq=58 ttl=64 time=0.201 ms
64 bytes from 192.168.0.1: icmp_seq=59 ttl=64 time=0.182 ms
64 bytes from 192.168.0.1: icmp_seq=60 ttl=64 time=0.198 ms
64 bytes from 192.168.0.1: icmp_seq=61 ttl=64 time=0.210 ms
64 bytes from 192.168.0.1: icmp_seq=62 ttl=64 time=0.189 ms
64 bytes from 192.168.0.1: icmp_seq=63 ttl=64 time=0.216 ms
64 bytes from 192.168.0.1: icmp_seq=64 ttl=64 time=0.148 ms
64 bytes from 192.168.0.1: icmp_seq=65 ttl=64 time=0.206 ms
64 bytes from 192.168.0.1: icmp_seq=66 ttl=64 time=0.209 ms
64 bytes from 192.168.0.1: icmp_seq=67 ttl=64 time=0.195 ms
64 bytes from 192.168.0.1: icmp_seq=68 ttl=64 time=0.203 ms
64 bytes from 192.168.0.1: icmp_seq=69 ttl=64 time=0.215 ms
64 bytes from 192.168.0.1: icmp_seq=70 ttl=64 time=0.130 ms
64 bytes from 192.168.0.1: icmp_seq=71 ttl=64 time=18.3 ms
64 bytes from 192.168.0.1: icmp_seq=72 ttl=64 time=0.187 ms
64 bytes from 192.168.0.1: icmp_seq=73 ttl=64 time=24.6 ms
64 bytes from 192.168.0.1: icmp_seq=74 ttl=64 time=0.153 ms
64 bytes from 192.168.0.1: icmp_seq=75 ttl=64 time=0.136 ms
64 bytes from 192.168.0.1: icmp_seq=76 ttl=64 time=0.130 ms
64 bytes from 192.168.0.1: icmp_seq=77 ttl=64 time=0.179 ms
64 bytes from 192.168.0.1: icmp_seq=78 ttl=64 time=0.190 ms
64 bytes from 192.168.0.1: icmp_seq=79 ttl=64 time=0.203 ms
64 bytes from 192.168.0.1: icmp_seq=80 ttl=64 time=0.185 ms
64 bytes from 192.168.0.1: icmp_seq=81 ttl=64 time=0.159 ms
64 bytes from 192.168.0.1: icmp_seq=82 ttl=64 time=0.212 ms
64 bytes from 192.168.0.1: icmp_seq=83 ttl=64 time=0.203 ms
64 bytes from 192.168.0.1: icmp_seq=84 ttl=64 time=0.193 ms
64 bytes from 192.168.0.1: icmp_seq=85 ttl=64 time=0.196 ms
64 bytes from 192.168.0.1: icmp_seq=86 ttl=64 time=0.187 ms
64 bytes from 192.168.0.1: icmp_seq=87 ttl=64 time=0.166 ms
64 bytes from 192.168.0.1: icmp_seq=88 ttl=64 time=0.188 ms
64 bytes from 192.168.0.1: icmp_seq=89 ttl=64 time=0.195 ms
64 bytes from 192.168.0.1: icmp_seq=90 ttl=64 time=12.1 ms
64 bytes from 192.168.0.1: icmp_seq=91 ttl=64 time=0.182 ms
64 bytes from 192.168.0.1: icmp_seq=92 ttl=64 time=0.198 ms
64 bytes from 192.168.0.1: icmp_seq=93 ttl=64 time=0.194 ms
64 bytes from 192.168.0.1: icmp_seq=94 ttl=64 time=0.205 ms
64 bytes from 192.168.0.1: icmp_seq=95 ttl=64 time=0.189 ms
64 bytes from 192.168.0.1: icmp_seq=96 ttl=64 time=0.195 ms
64 bytes from 192.168.0.1: icmp_seq=97 ttl=64 time=0.197 ms
64 bytes from 192.168.0.1: icmp_seq=98 ttl=64 time=0.196 ms
64 bytes from 192.168.0.1: icmp_seq=99 ttl=64 time=0.179 ms
64 bytes from 192.168.0.1: icmp_seq=100 ttl=64 time=0.194 ms

--- 192.168.0.1 ping statistics ---
100 packets transmitted, 100 received, 0% packet loss, time 101101ms
rtt min/avg/max/mdev = 0.130/1.749/54.566/6.678 ms
$ 
```

<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script type="text/javascript">
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {
    var data = google.visualization.arrayToDataTable([
        ['Ping', 'Thunderbolt (ms)', 'USB (ms)'],
        [1, 0.176, 0.207],
        [2, 0.237, 0.233],
        [3, 0.240, 0.180],
        [4, 0.193, 0.184],
        [5, 0.245, 0.161],
        [6, 0.238, 0.193],
        [7, 0.276, 0.209],
        [8, 0.251, 0.216],
        [9, 0.309, 0.199],
        [10, 0.259, 0.224],
        [11, 0.236, 0.221],
        [12, 0.258, 0.217],
        [13, 0.263, 8.93],
        [14, 0.277, 0.184],
        [15, 7.80, 0.202],
        [16, 0.233, 0.190],
        [17, 0.290, 0.198],
        [18, 0.262, 0.165],
        [19, 0.242, 0.184],
        [20, 0.244, 0.190],
        [21, 0.271, 0.182],
        [22, 0.238, 0.183],
        [23, 0.236, 54.6],
        [24, 0.172, 5.86],
        [25, 0.176, 0.186],
        [26, 0.136, 0.204],
        [27, 0.223, 0.183],
        [28, 0.231, 0.190],
        [29, 0.218, 0.223],
        [30, 0.254, 20.6],
        [31, 0.278, 0.171],
        [32, 0.239, 0.142],
        [33, 0.244, 0.200],
        [34, 0.252, 0.210],
        [35, 0.261, 0.186],
        [36, 0.241, 0.165],
        [37, 0.254, 0.181],
        [38, 0.280, 0.183],
        [39, 0.281, 0.184],
        [40, 0.252, 0.204],
        [41, 0.249, 0.203],
        [42, 0.200, 0.185],
        [43, 0.236, 0.192],
        [44, 0.227, 0.187],
        [45, 0.295, 0.163],
        [46, 0.239, 0.191],
        [47, 0.234, 12.6],
        [48, 0.239, 0.182],
        [49, 0.207, 0.171],
        [50, 0.247, 0.184],
        [51, 0.284, 0.183],
        [52, 0.246, 0.151],
        [53, 0.234, 0.188],
        [54, 0.281, 0.183],
        [55, 0.206, 0.177],
        [56, 0.280, 0.174],
        [57, 0.247, 0.173],
        [58, 13.4, 0.201],
        [59, 0.255, 0.182],
        [60, 0.283, 0.198],
        [61, 0.244, 0.210],
        [62, 0.263, 0.189],
        [63, 0.268, 0.216],
        [64, 14.6, 0.148],
        [65, 0.245, 0.206],
        [66, 0.174, 0.209],
        [67, 0.183, 0.195],
        [68, 0.230, 0.203],
        [69, 0.234, 0.215],
        [70, 0.258, 0.130],
        [71, 0.256, 18.3],
        [72, 0.158, 0.187],
        [73, 0.198, 24.6],
        [74, 0.246, 0.153],
        [75, 0.244, 0.136],
        [76, 0.234, 0.130],
        [77, 0.194, 0.179],
        [78, 0.249, 0.190],
        [79, 0.243, 0.203],
        [80, 0.230, 0.185],
        [81, 0.252, 0.159],
        [82, 0.262, 0.212],
        [83, 0.236, 0.203],
        [84, 0.242, 0.193],
        [85, 0.216, 0.196],
        [86, 0.246, 0.187],
        [87, 0.251, 0.166],
        [88, 0.234, 0.188],
        [89, 0.237, 0.195],
        [90, 0.242, 12.1],
        [91, 0.205, 0.182],
        [92, 0.223, 0.198],
        [93, 0.229, 0.194],
        [94, 0.258, 0.205],
        [95, 0.206, 0.189],
        [96, 0.252, 0.195],
        [97, 0.272, 0.197],
        [98, 0.264, 0.196],
        [99, 0.183, 0.179],
        [100, 0.248, 0.194]
    ]);

    var options = {
        title: 'Thunderbolt vs USB etherner ping times',
        hAxis: {title: 'Ping Number'},
        vAxis: {
            title: 'Time (ms)',
            logScale: true
        },
        legend: { position: 'top' },
        pointSize: 5,
        series: {
            0: { color: '#1f77b4' }, // Thunderbolt (blue)
            1: { color: '#d62728' }  // USB (red)
        }
    };

    var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));
    chart.draw(data, options);
}

</script>
<div id="chart_div" style="width: 720px; height: 500px;"></div>
