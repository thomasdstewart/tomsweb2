---
title: "Minimal pppd Setup For GPRS Dongles"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "networking"]
categories: []
date: 2012-07-11 13:18:00
---

So you have a mobile broadband dongle and you want to use it on Linux, one
option is to just plug it in and from Gnome 3 it just works and can be set-up
instantly with NetworkManager. However I require something more permanent,
something that will start at boot, be less interactive and stay up. There is a
lot of (mis)information out there about how to do this with various programs and
scripts to copy and paste. Lots of wvdial configurations and lots of poking
about in /etc/ppp creating and modifying files etc.

Thanks to the wonder that is Debian, it's quite easy to get a nice setup without
copying and pasting loads of config and scattering a dozen files all over /etc.
I wanted a nice minimal set-up that will cope with Debian upgrades without
breaking horrendously. All you need to do is create a new file in /etc/ppp/peers
called something sensible like /etc/ppp/peers/giffgaff. Here is my config:

```
user "giffgaff"
password "password"
connect "/usr/sbin/chat -v -f /etc/chatscripts/gprs -T giffgaff.com"

ttyUSB0
115200

noipdefault
usepeerdns
defaultroute
persist
noauth

passive
holdoff 10
maxfail 0
debug
```

You might need to change some of the above. It's got the gprs username and
password. It turns out that Debian already has a chatscript for gprs included in
the ppp package, so we don't need to mess about with that. We just pass in the
APN to that script via the -T parameter. You will have to know these options,
however the mobile-broadband-provider-info package contains a file
(/usr/share/mobile-broadband-provider-info/serviceproviders.xml) that has all
these in, this file is used for all the automatic set-up with NetworkManager.
The rest of the options are quite straightforward and they are all listed in
the pppd(8) man page.

Next is the automatically starting at boot, for this we edit the
/etc/network/interfaces file. Just add the stanza below:

```
auto ppp0
iface ppp0 inet ppp
        provider giffgaff
```

Then the ppp0 interface will just start at boot and the usual Debian ifup and
ifdown commands will work. Something like vnstat will be good enough to capture
and log the traffic.
