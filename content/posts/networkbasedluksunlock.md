---
title: "Network Based LUKS Unlock"
summary: ""
authors: ["thomas"]
tags: ["linux", "luks", "debian"]
categories: []
date: 2022-01-04 16:57:00
lastmod: 2022-01-05 16:57:00
---

Recently I wanted to see if I could make my public cloud-based Linux infra more
secure via LUKS (Linux Unified Key Setup) disk encryption. I realise that one
must fully trust one's cloud provider, as they have access to the hardware.
However it would be nice to know that data is encrypted when stored on disk.
This does not mitigate against a very bad cloud provider, as ultimately if they
are determined enough they can get at the data. However implementing some sort
of encryption does offer some protection against reading the data if disks are
re-used and certainly makes the barrier much higher for access casually.

## Ideas

General Linux knowledge and a few Internet searches quickly gave me 4 options:

1.  Only encrypt a subset of data and have a dedicated disk that's encrypted. For
    example /home on a separate disk/partition/lvm volume encrypted with the
    unlock key in /etc/crypttab or unlock and mount via ssh at every boot.
2.  Implement mostly FDE (Full Disk Encryption). For example encrypt / and /home
    but not /boot and enter the password to unlock at every boot in the console.
3.  Implement mostly FDE (Full Disk Encryption). For example encrypt / and /home
    but not /boot and given it is in the cloud and on the Internet spawn sshd in
    the initramfs and then ssh in to remotely unlock at every boot.
    (https://www.arminpech.de/2019/12/23/debian-unlock-luks-root-partition-remotely-by-ssh-using-dropbear/)
4.  Implement mostly FDE (Full Disk Encryption) like above and use some sort of
    other magic.

I quickly discarded idea 1, 2 and 3, as I don't want the unlock key stored on
disk next to the encrypted disk and I don't want to enter a password at every
boot.

## The Selection

So I continued to search for that magic part of option 4, and came across 3
solutions:

1.  clevis and tang as part of the network bound disc encryption (NBDE) as part
    of the policy-based decryption (PBD)
2.  kxd - Key exchange daemon (https://blitiri.com.ar/p/kxd/)
3.  some other one I now can't find anymore

Loosely they all sounded fine, however the first option for clevis and tang
caught my attention because:

1.  It's a part of RHEL 7, 8 and 9-Beta, so therefore it will be maintained for
    the foreseeable.
2.  The unlock key is not entirely stored on the server side, so if you break
    into the clevis server you can't get the unlock key. Of course if you are
    able to grab a disk image of the encrypted disk, you can probably get the
    key anyways.

## Clevis and Tang

The project (https://github.com/latchset) have borrowed the nomenclature of the
Clevis fastener system (https://en.wikipedia.org/wiki/Clevis_fastener) and
re-use the same terminology: clevis, tang, pin. It's cute and clever but also
confusing. Basically you have a tang server somewhere and clevis uses the tang
pin to connect to the tang server over a network to calculate a key that can
unlock the disk. Also Clevis can run from initramfs with network support to
unlock the root disk. This guide explains this process very well:
https://semanticlab.net/sysadmin/encryption/Network-bound-disk-encryption-in-ubuntu-20.04/.

As an aside, there is another clevis pin that can use a TPM to unlock the disks
too, which allows promptless full disk encryption.

It's also fair to say that Red Hat also have some good documentation about it
(Red Hat Distro specific for course):
https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/security_hardening/configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption_security-hardening
https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9-beta/html/security_hardening/configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption_security-hardening

## Issues

Before letting any of this loose on real infrastructure I decided to play with
it on a pair of VMs first. One acting as the server and one acting as the
client. With the intention that my real public cloud virtual machines would
become clients, and the server would either run on another provider or at home.
However I came across a number of observations:

Observations with Tang:

1.  It is a network based daemon that is written in C
    (https://sources.debian.org/src/tang/8-3+deb11u1/src/tangd.c/).
2.  The version packaged for Debian Stable (Bullseye) runs as root, this is
    fixed in Debian Testing (Bookworm) (see:
    https://sources.debian.org/src/tang/8-3+deb11u1/units/tangd%2540.service.in/
    vs https://sources.debian.org/src/tang/11-1/units/tangd%2540.service.in/).
3.  The version packaged for Debian Stable (Bullseye) writes to /var/db/tang,
    this is fixed in Debian Testing (Bookworm) (see:
    https://sources.debian.org/src/tang/8-3+deb11u1/meson.build/#L19,
    https://sources.debian.org/src/tang/11-1/debian/patches/debian/2021-09-30.use-var-lib.patch/.
4.  It is an http server with everything operating in plaintext and does not have
    any SSL.
5.  It does not have any password protection.
6.  It does not have any network restriction functionality.

Observations with Clevis:

7.  Debian defaults to initramfs-tools rather than dracut, clevis supports both,
    but obviously via slightly different scripts.
8.  In order to make network requests when the initramfs system is running
    networking has to be configured. How this is done is not very well
    documented.
9.  The initramfs system does not have a standard way to configure DNS.
10. The initramfs system does not have any certificate authority root
    certificates collection, which makes https or ssl hard to trust.

## Workarounds

So given that running C daemons as root is fairly scary at the best of times, I
wanted to put some wrapping around the setup to protect it more (issue 1).

- Ideally I like to run things from Debian stable, however it seems in this
  case it's more straightforward to run the version from unstable as a separate
  user in a separate user rootless podman container (and hope that the tang-8
  pin can talk to tang-11 server.) (issue 2 and 3).
- If Apache reverse proxies the traffic it can implement an ssl wrapper on it to
  give it https. (issue 4).
- Apache can auto implement basic auth to stop casual access and implement
  source request IP based restrictions (issue 5 and 6).
- Now is not the time to learn how to switch Debian from initramfs to dracut, so
  care needs to be taken it's configured correctly (issue 7).
- Initramfs uses ipconfig from the klibc-utils package to configure networking
  (https://git.kernel.org/pub/scm/libs/klibc/klibc.git/tree/usr/kinit/ipconfig/README.ipconfig).
  The network is not configured automatically each helper must call
  configure_networking if it needs networking, eg the open-iscsi initramfs
  helper also calls this
  (https://sources.debian.org/src/clevis/16-2/src/initramfs-tools/scripts/local-top/clevis.in/#L265).
  It gets its config from the ip parameter from the linux command line
  (skipping this param will cause a dhcp),
  (https://sources.debian.org/src/initramfs-tools/0.140/scripts/functions/#L236)
  so the kernel params will have this ip parameter added. Interestingly
  Ubuntu configures resolv.conf when configuring networking automatically, but it
  seems this patch never made it back to Debian
  (https://git.launchpad.net/ubuntu/+source/initramfs-tools/tree/scripts/functions#n461)
  (issue 8).
- It's up to each script that calls ipconfig to implement DNS. For example
  ipconfig does configure the ip address, netmask and gateway but does not touch
  /etc/resolv.conf, it creates a temp file (eg /run/net-eth0.conf) with the
  details in. For example see
  https://sources.debian.org/src/open-iscsi/2.1.5-1/debian/extra/initramfs.local-top/?hl=130#L130
  https://sources.debian.org/src/kxd/0.15-3/cryptsetup/initramfs-scripts/kxc-premount-net/?hl=26#L26.
  Unfortunately the clevis initramfs script does not set up resolv.conf
  (https://sources.debian.org/src/clevis/16-2/src/initramfs-tools/scripts/local-top/clevis.in/#L257).
  This needs to be fixed upstream or if not a new script that runs the
  configure_networking and the careful creation of /etc/resolv.conf before the
  clevis initramfs script runs (issue 9).
- In order for the clevis script to run and use an https tang server, it
  ultimately uses curl to make the https request so will need a set of CA
  certificates to function correctly. The easiest way for this to work is an
  initramfs hook to include them (issue 10).

## Implementation

https://gitlab.com/thomasdstewart-infra/docker-tang

```
root@client:~# cat /etc/initramfs-tools/hooks/preclevis
#!/bin/sh
set -e

PREREQ=""

prereqs()
{
        echo "$PREREQ"
}

case $1 in
# get pre-requisites
prereqs)
        prereqs
        exit 0
        ;;
esac

. /usr/share/initramfs-tools/hook-functions

copy_exec /usr/lib/*/libnss_dns.so*

mkdir -p "${DESTDIR}/etc/ssl"
cp -a /etc/ssl/certs "${DESTDIR}/etc/ssl/certs"
root@client:~#
```

```
root@client:~# cat /etc/initramfs-tools/scripts/init-premount/preclevis
#!/bin/sh
set -e

PREREQ=""

prereqs()
{
	echo "$PREREQ"
}

case $1 in
# get pre-requisites
prereqs)
	prereqs
	exit 0
	;;
esac

. /scripts/functions
configure_networking

if ! [ -s /etc/resolv.conf ]; then
	for ns in "$IPV6DNS0" "$IPV6DNS1" "$IPV4DNS0" "$IPV4DNS1"; do
		if [ -n "$ns" -a "$ns" != "0.0.0.0" ]; then
			echo "nameserver $ns" >> /etc/resolv.conf
		fi
	done
fi
root@client:~#
```

## Bugs

### Setup DNS

Get the configure_networking function in initramfs-tools to set up DNS

### Include root CA

Add config option to the initramfs-tools to include a copy of the system CA's

https://github.com/latchset/clevis/issues/175
https://github.com/latchset/clevis/issues/176
