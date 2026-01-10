---
title: "Hash benching"
summary: ""
authors: ["thomas"]
tags: ["linux", "python", "crc", "md5", "sha"]
categories: []
date: 2025-04-04 10:38:00
---

## Intro

This is far from exhaustive, but I needed to perform some light benchmarks in
CRC, MD5 and SHA hashing. The idea was to compare crc, md5 and sha as well as
compare Naive Python hashing to Linux based tools.

## Method

First a 40G test file was created:

```
dd if=/dev/zero bs=1M of=/home/thomas/test count=40960
```

This short Python script was used to perform CRC, as crc.py:

```
#!/usr/bin/env python3
import zlib

file_path='/home/thomas/test'
crc32_hash = 0
with open(file_path, 'rb') as f:
    while chunk := f.read(8192):
        crc32_hash = zlib.crc32(chunk, crc32_hash)
print(format(crc32_hash & 0xFFFFFFFF, '08x'))
```

and md5.py:

```
#!/usr/bin/env python3
import hashlib

file_path='/home/thomas/test'
with open(file_path, 'rb') as f:
    md5 = hashlib.md5()
    while chunk := f.read(8192):
        md5.update(chunk)
print(md5.hexdigest())
```

## Results

```
$ time ./crc.py
e38a6876

real	0m46.361s
user	0m21.866s
sys	0m18.824s
```

```
$ time ./md5.py
c45e93a611a7283b3be8a261b4c801b6

real	1m30.876s
user	1m12.638s
sys	0m17.234s
```

```
$ time md5sum test
c45e93a611a7283b3be8a261b4c801b6  test

real	1m25.931s
user	1m7.712s
sys	0m18.013s
```

```
$ time sha1sum test
37ca1826b64b9fa14a9893f040c593c69a9a90ad  test

real	0m47.863s
user	0m30.807s
sys	0m16.670s
```

```
$ time sha224sum test
6bfbaf887b888fe307d551cba8b2b8de16ca8f80a59f6069d89b6a0b  test

real	0m52.538s
user	0m35.996s
sys	0m16.324s
```

```
$ time sha256sum test
2109856cb6642099b7ae3ee3bdf2b1bd7f64af573b04958e8cdd278a786252cc  test

real	0m40.010s
user	0m27.751s
sys	0m12.037s
```

```
$ time sha512sum test
68eaa567f0ede602c8a89bae07093d42afa5bb42306c99c2a9f2c124d688e42e323bae405b3ca06f5dc360d13325159e09e2ab89a9c82822356e25344fadc787  test

real	1m15.987s
user	1m0.268s
sys	0m15.133s
```

## Graphs

<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script type="text/javascript">
    google.charts.load('current', {'packages':['corechart', 'bar']});
    google.charts.setOnLoadCallback(drawStuff);

    function drawStuff() {
        var data = google.visualization.arrayToDataTable([
            ['Hash',        'Seconds'],
            ['Python crc',  46 ],
            ['python md5',  91 ],
            ['md5sum',      86],
            ['sha1sum',     48 ],
            ['sha224',      53 ],
            ['sha256',      40 ],
            ['sha512',      76 ],

        ]);

        var view = new google.visualization.DataView(data);
        view.setColumns([0, 1,
            { calc: "stringify",
              sourceColumn: 1,
              type: "string",
              role: "annotation" }
        ]);

        var options = {
            title: 'Hash benchmarks',
            hAxis: {
                slantedText: true,
                slantedTextAngle: 45
            },
            vAxis: { title: '{Time to complete hash of 40G\n(seconds)'},
            chartArea: { height:'50%' }
        };

        var chart = new google.visualization.ColumnChart(document.getElementById('chart_div_power'));
        chart.draw(view, options);
    };
</script>
<div id="chart_div_power" style="width: 720px; height: 600px;"></div>

## Conclusions
