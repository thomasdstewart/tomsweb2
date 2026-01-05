---
title: "Linux Networking Config"
summary: ""
authors: ["thomas"]
tags: ["linux", "networking"]
categories: []
date: 2022-03-30 11:30:00
---

Linux Networking Config is a complex beast these days. In fairness networking is
complicated, and there has to be a way to configure a multitude of
technologies: Ethernet, Wi-Fi, PPP, VPN, mobile, bridge, bonding, VLAN, tunnels.
Originally networking was configured during boot up in shell scripts as part of
sysvinit. However over the last 20+ years many newer ways have popped up; this
is a short comparison of the options.

# Methods

## ifupdown derivatives

The main config for this is in /etc/network/interfaces and it also includes
files in /etc/network/interfaces.d/, it's also called ENI. For Debian this is
the original network setup after direct editing of boot up scripts. It's still
the Debian installer default, the default for official Debian Cloud images and a
dependency of cloud-init. You can achieve more or less any static network
configuration you want; there is some dynamic configuration being sort of
doable. It's got quite a lot of hooks that do allow interesting integrations.
However integration with other things like desktop tools do not exist, eg
joining a random Wi-Fi network. It's also easy to get it into an inconsistent
state if manual changes to the network are performed. It is common on servers
but not for example on a laptop. Also many implementations exist, the default
Debian one is ifupdown. I have no idea how well or not the other implementations
work or not.

- https://wiki.debian.org/NetworkConfiguration
- https://www.debian.org/doc/manuals/debian-reference/ch05.en.html

### ifupdown

- been around since woody
- https://salsa.debian.org/debian/ifupdown
- https://sources.debian.org/src/ifupdown/0.8.37/main.c/

### ifupdown (busybox)

- been around since woody
- https://busybox.net/
- https://git.busybox.net/busybox/tree/networking/ifupdown.c

### ifupdown (netscript-2.4)

- been around since sarge
- https://packages.debian.org/sid/netscript-2.4
- https://sources.debian.org/src/netscript-2.4/5.5.5/netscript/

### ifupdown2

- been around since jessie
- https://github.com/CumulusNetworks/ifupdown2/
- https://github.com/CumulusNetworks/ifupdown2/blob/master/ifupdown2/ifupdown/main.py

### ifupdown-ng

- been around since bookworm
- https://github.com/ifupdown-ng/ifupdown-ng
- https://github.com/ifupdown-ng/ifupdown-ng/blob/main/cmd/ifupdown.c

## network-scripts (redhat)

As I understand network-scripts were the first way networks were configured in
Red Hat based distros after directly editing rc scripts. The config files were
sourced and then boot scripts would implement everything needed to configure the
network. These are stored under /etc/sysconfig/network-scripts. Almost all
configurations were possible, however hooks to do "exotic" other things are
harder. However these network-scripts have not been the only option on Red Hat
based distros for some time because Network-Manager was introduced in either RHEL
5 or 6 as a replacement. Generally people recommended disabling it because
people don't like changes. However Network-Manager has become the main way
networking is configured. The way this worked was by implementing a sort of
config compatibility layer that used the same config file format, so you could
run with both enabled: network would start some interfaces and Network-Manager
would start other interfaces. However now Network-Manager just works and with
RHEL 8 it is quite hard not to use it, and I understand RHEL9 is just Network
Manager.

been around since at least Red Hat Linux 6.0 (~circa 2000)

## ipconfig

This is quite a bizarre project and it is hard to see actual references to it.
Also it's obviously hard to google as the name clash with the Windows ipconfig
tool. In essence it's a small tool that can make a simple DHCP request and use
the response to configure an interface or just set a static IP on an interface.
It's usually called from the initrd and configured from the linux command line
via the IP parameter. It can also un-configure the interface after it's needed
but before the chroot into the main system. So for example this might be needed
for ssh server in initrd, nfs root, or iscsi root. Also how it's called depends
on the initrd used, usually initramfs or dracut.

- been around since etch
- https://git.kernel.org/cgit/libs/klibc/klibc.git
- https://git.kernel.org/pub/scm/libs/klibc/klibc.git/tree/usr/kinit/ipconfig/main.c
- https://git.kernel.org/pub/scm/libs/klibc/klibc.git/tree/usr/kinit/ipconfig/README.ipconfig

## NetworkManager

NetworkManager is an answer to some of the issues with the existing setup,
mostly what seems to be around laptop type setups, where the network config
changes all the time and needs gui type tools to do this. It's a daemon that
handles this and implements changes. It's fair to say that initially people did
not seem to like it for servers, as people don't like changes. It also works
differently depending if you are on Debian or Red Hat based distributions, with
the former using /etc/NetworkManager/system-connections/ and the latter using
/etc/sysconfig/network-scripts. Initially it was not capable of implementing all
the config that ifupdown is capable of, however as it's matured it's now able to
implement almost all setups. It's also got hooks
/etc/NetworkManager/dispatcher.d and implements a ifupdown compatibility hook.
For better or worse it also reimplements things, eg it implements a DHCP client
rather than relying on calling say dhclient and hoping it does its job.

- been around since etch
- https://wiki.gnome.org/Projects/NetworkManager
- https://gitlab.freedesktop.org/NetworkManager/NetworkManager
- https://wiki.debian.org/NetworkManager

## systemd-networkd

systemd-networkd grew out of systemd, presumably with the intention of avoiding
the mess of existing tools. I think the idea for simple setups, eg just a static
IP or DHCP ip. It then just works, without calling out to other tools and
handling that mess, eg ifupdown calls dhclient, which has its own config that
might or might not do what is expected. However for anything complicated
NetworkManager is probably a better fit.

- been around since wheezy
- https://systemd.io/
- https://wiki.debian.org/SystemdNetworkd
- https://wiki.archlinux.org/title/systemd-networkd

## Cloud-init

Cloud-init is a suite of tools that run on boot that can grab information from
the hosting provider and do things with this information, eg inject ssh keys to
a virtual machine. It can also configure the network too. In Debian it depends
on ifupdown to do some of its work. It's got three methods to configure the
network:

- ENI - /etc/network/interfaces
- Networking Config Version 1 - DSL
- Networking Config Version 2 - subset of netplan version 2

- been around since wheezy
- https://cloudinit.readthedocs.io/

## Netplan

At some point Canonical decided that the way network config was configured
needed a rethink, and what seems to be along the lines of https://xkcd.com/927/
at best. It's a way to abstract the config and netplan to generate different
config backends, currently either systemd-networkd or Network Manager. It uses
its own new DSL config of which there are two versions. I can understand why
this was done, but can't help but feel it adds a useless layer of config that
should not be needed. It's also got two config file formats: version 1 and
version 2.

- been around since buster
- https://netplan.io/

# DNS

It's also fair to say that DNS settings are also part of networking config and
bring another more interesting integration issues around /etc/resolv.conf. This
is by far not exhaustive, but the three ways I use are below:

## Manual

You know what DNS servers to use, so just set them in /etc/resolv.conf, this
probably means you are using ifupdown.

## resolvconf

This is a little bit like manual, but you can set the DNS servers in ENI and the
resolvconf tools update /etc/resolv.conf

## systemd-resolver

systemd-resolver is a local stub resolver, it provides a resolv.conf file it
updates that /etc/resolv.conf is a symbolic link to. The idea being, all DNS
queries go to localhost and then systemd-resolver can then understand what to do
with the queries, so for instance with split vpn tunnels, two different dns
servers can be used at the same time for the different connections, which is not
possible with /etc/resolv.conf. The other advantage with this option is that
NetworkManager and networkd integrate nicely with systemd-resolver, so any
provided DNS servers get added.

# Examples

## ENI

### DHCP

/etc/network/interfaces

```
allow-hotplug ens3
iface ens3 inet auto
iface ens3 inet6 auto
```

### Static

/etc/network/interfaces

```
allow-hotplug ens3
iface ens3 inet static
	address 192.168.0.10/24
	gateway 192.168.0.1
	dns-nameservers 192.168.0.1 192.168.0.2
iface ens3 inet6 static
	address fc00::1/64
```

## NM

### DHCP

### Static

/etc/NetworkManager/system-connections/ens3.nmconnection

```
[connection]
id=ens3
uuid=54823d6c-73dd-35d9-8b38-d438f4e93f71
type=ethernet
autoconnect-priority=-999
interface-name=ens3
permissions=
timestamp=1648737810

[ethernet]
mac-address-blacklist=

[ipv4]
address1=192.168.0.10/24,192.168.0.1
dns=192.168.0.1;192.168.0.2;
dns-search=
method=manual

[ipv6]
addr-gen-mode=stable-privacy
address1=fc00::1/64
dns=2001:4860:4860::8888;2001:4860:4860::8844;
dns-search=
method=auto

[proxy]
```

# Remarks

For Debian use defaults for installation, after install remove ENI entries, as
needed convert and use NetworkManager, enable systemd-resolver and remove
ifupdown unless cloud-init is needed, in which case use ifupdown.
