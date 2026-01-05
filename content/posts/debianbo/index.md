---
title: "Debian Bo (1.3)"
summary: ""
authors: ["thomas"]
tags: ["linux", "debian"]
categories: []
date: 2007-03-25
---

- Grab: [debian-bo.img.bz2](debian-bo.img.bz2)
- `$ bunzip2 debian-bo.img.bz2`
- `$ sudo qemu-system-i386 -hda debian-bo.img -net nic,model=ne2k_isa -net tap`
- `$ sudo brctl addif virbr0 tap0`
- Username: root, Password: password
- Edit /etc/init.d/network to configure network
