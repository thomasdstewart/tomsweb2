---
title: "Working with large PCAPs"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "wireshark"]
categories: []
date: 2020-12-22 02:16:00
---

Recently I helped troubleshoot a networking issue with a 1Gbps link that was
being fully saturated. In the end we configured a mirror port and dumped the
traffic to analyse it. We ended up with >1000, 100MB files covering a half hour
window. I was not sure what to do with such a quantity of data ~100GB and in the
end we looked at a few caps and found the issue. However I could not help but
feel that because most of the caps only covered a few seconds that I was not
really looking at the full picture.

After the fact I made some discoveries...

# mergecap

There is a tool called mergecap that can concatenate pcap files, however it
complains when given >~1000 files. So in order to get one big file I had to run
it a few times. First merging 100 files into large files and then merging the
result into the final large file.

```
$ for n in `seq 0 9`; do echo $n; mergecap -w badport_l00$n.cap badport_00$n*; done
<SNIP>
$ for n in `seq 0 9`; do echo $n; mergecap -w badport_l01$n.cap badport_01$n*; done
<SNIP>
$ mergecap -w barport.cap badport_l*.cap
```

# Memory required

I didn't try opening the large 100G file with wireshark I went straight for
tshark. However it exhausted all memory and eventually the OOM killer kicked in.
After adding more memory to my virtual machine I found that for a 109G pcap that
72G memory is required. Indicating that a potential rule of thumb is that to
open or process a pcap of size n one requires two thirds the size of n's memory
available.

# Statistics

I was not really interested in viewing all packets; I wanted to get a feel for
the entire data set. The two main commands to do this are:

```
tshark -q -r badport.cap -z io,phs
tshark -q -r badport.cap -z endpoints,ip | head -50
```

These turn on quiet mode, read from the badport.cap file and print either the
Protocol Hierarchy Statistics or IPv4 Endpoints statistics.

Each of these took around 30 min to complete, which means that best case between
copying the pcaps to the host, merging the pcaps and running the tshark
statistics its best case time is around 2 hours.

# Conclusion

I think I've concluded that next time I should aim to concatenate down to around
10G max, as these files are a lot easier to work with (eg, 2 minutes to
complete above statistics). Also The above 2 hour process found the same issue
that looking at a single 100M cap did.
