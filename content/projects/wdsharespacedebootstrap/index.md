---
title: "WD Sharespace Debootstrap"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2015-10-17
aliases: [/tomsweb/WDShareSpaceDebootstrap/]
showTableOfContents: true
---

## Intro

So I have an old Western Digital Sharespace NAS box that I used to use as my
main home NAS. I've long since switched it off, support for it has more or less
finished, there have been no updates in ages and the new WD support site does
not list it anymore. That said it seems a shame to skip it so I tried a few
times to re-purpose it. I did get root when I first got it, but was never able
to do anything more as it had all my files on. After I stopped using it for a
while I forgot about it. Some time later I found a few posts on the debian-arm
mailing list from David Hicks, he had managed to get Debian installed at
working! Yay I thought so I emailed him and he very helpfully gave me some
instructions and some patches to get me started. Unfortunately I fell at the
first hurdle and could not get the console working. Embarrassingly I had not
turned flow control off within the minicom settings. After 18 months
while working on a serial console for a Raspberry Pi it dawned on me that it was
my mistake. So I got out the box and console cable and decided to have another
go.

A big thanks to David Hicks for giving me the right kernel patch and sending me
in the right direction. To Western Digital's credit they did release a GPL.zip
type zip that appeared to contain a build system, gcc, kernel etc. However
actually unpicking all the .config.old, .config.old2 files would have taken an
age. Plus given that the Sharespace board is very much like the arm orion5x, the
patch to get it working is not that big, so does not need the mountain of
changes that Western Digital applied. I have attached the patch to this page.

I have basically documented the entire process, rather than a list of commands
to type, it's more of a command log. That way if anyone does want to repeat,
they can at least understand what to expect to see. Given this it's rather
longer than I expected. The original running Linux is too old to chroot into a
new Linux and I did not try to get perl working in order to run debootstrap
natively. So the process involved cross compiling a kernel and booting that in
order to debootstrap a new system install.

The process:

1.  create some chroots
2.  compile kernel
3.  create initrd
4.  boot new kernel
5.  extract debootstrap and finish to temp partition which can act as rescue
    in case of later errors
6.  create actual system on raid1 and copy to there
7.  reboot
8.  do some clean up, backup mtd, setup uboot to boot automatically

Some links:

- http://www.arm.linux.org.uk/developer/machines/
- http://www.arm.linux.org.uk/developer/machines/list.php?id=3140
- http://westerndigital.nas-central.org/wiki/Category:ShareSpace
- http://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/tree/arch/arm/tools/mach-types

Patch:

- [v3.10-sharespace.patch](v3.10-sharespace.patch)

## Setup Environment

Create a work area:

```#!bash
thomas@diamond ~ $ mkdir /srv/store/sharespace
thomas@diamond ~ $ cd /srv/store/sharespace
thomas@diamond ~ $
```

Older kernels don't know how to use gcc5, so create a jessie chroot to do some
compiling:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo debootstrap --include=devio,u-boot-tools,build-essential,kernel-package,locales,curl,telnet,sudo jessie /srv/store/sharespace/jessie-x86_64/ http://httpredir.debian.org/debian/
I: Retrieving Release
I: Retrieving Release.gpg
I: Checking Release signature
I: Valid Release signature (key id 75DDC3C4A499F1A18CB5F3C8CBF8D6FD518E17E1)
I: Retrieving Packages
I: Validating Packages
I: Resolving dependencies of required packages...
I: Resolving dependencies of base packages...
I: Found additional required dependencies: acl adduser dmsetup insserv libaudit-common libaudit1 libbz2-1.0 libcap2 libcap2-bin libcryptsetup4 libdb5.3 libdebconfclient0 libdevmapper1.02.1 libgcrypt20 libgpg-error0 libkmod2 libncursesw5 libprocps3 libsemanage-common libsemanage1 libslang2 libsystemd0 libudev1 libustr-1.0-1 procps systemd systemd-sysv udev
I: Found additional base dependencies: bc binutils bzip2 cpp cpp-4.9 docbook-xml docbook-xsl dpkg-dev file g++ g++-3.9 gcc gcc-4.9 gettext gettext-base intltool-debian libasan1 libasprintf0c2 libatomic1 libc-dev-bin libc6-dev libcilkrts5 libcloog-isl4 libcroco3 libcurl3 libdns-export100 libdpkg-perl libffi6 libgcc-4.9-dev libglib2.0-0 libgmp10 libgnutls-deb0-28 libgnutls-openssl27 libgomp1 libgssapi-krb5-2 libhogweed2 libicu52 libidn11 libirs-export91 libisc-export95 libisccfg-export90 libisl10 libitm1 libk5crypto3 libkeyutils1 libkrb5-3 libkrb5support0 libldap-2.4-2 liblsan0 libmagic1 libmnl0 libmpc3 libmpfr4 libnetfilter-acct1 libnettle4 libnfnetlink0 libp11-kit0 libpsl0 libquadmath0 librtmp1 libsasl2-2 libsasl2-modules-db libssh2-1 libstdc++-4.9-dev libtasn1-6 libtimedate-perl libtsan0 libubsan0 libunistring0 libxml2 libxml2-utils libxslt1.1 linux-libc-dev lzma make patch perl perl-modules po-debconf sgml-base sgml-data xml-core xmlto xsltproc xz-utils
I: Checking component main on http://httpredir.debian.org/debian...
I: Retrieving acl 2.2.52-2
I: Validating acl 2.2.52-2
I: Retrieving libacl1 2.2.52-2
I: Validating libacl1 2.2.52-2
I: Retrieving adduser 3.113+nmu3
I: Validating adduser 3.113+nmu3
I: Retrieving apt 1.0.9.8.1
I: Validating apt 1.0.9.8.1
I: Retrieving apt-utils 1.0.9.8.1
I: Validating apt-utils 1.0.9.8.1
I: Retrieving libapt-inst1.5 1.0.9.8.1
I: Validating libapt-inst1.5 1.0.9.8.1
I: Retrieving libapt-pkg4.12 1.0.9.8.1
I: Validating libapt-pkg4.12 1.0.9.8.1
I: Retrieving libattr1 1:2.4.47-2
I: Validating libattr1 1:2.4.47-2
I: Retrieving libaudit-common 1:2.4-1
I: Validating libaudit-common 1:2.4-1
I: Retrieving libaudit1 1:2.4-1+b1
I: Validating libaudit1 1:2.4-1+b1
I: Retrieving base-files 8+deb8u2
I: Validating base-files 8+deb8u2
I: Retrieving base-passwd 3.5.37
I: Validating base-passwd 3.5.37
I: Retrieving bash 4.3-11+b1
I: Validating bash 4.3-11+b1
I: Retrieving bc 1.06.95-9
I: Validating bc 1.06.95-9
I: Retrieving libdns-export100 1:9.9.5.dfsg-9+deb8u2
I: Validating libdns-export100 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libirs-export91 1:9.9.5.dfsg-9+deb8u2
I: Validating libirs-export91 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libisc-export95 1:9.9.5.dfsg-9+deb8u2
I: Validating libisc-export95 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libisccfg-export90 1:9.9.5.dfsg-9+deb8u2
I: Validating libisccfg-export90 1:9.9.5.dfsg-9+deb8u2
I: Retrieving binutils 2.25-5
I: Validating binutils 2.25-5
I: Retrieving libboost-iostreams1.55.0 1.55.0+dfsg-3
I: Validating libboost-iostreams1.55.0 1.55.0+dfsg-3
I: Retrieving bsdmainutils 9.0.6
I: Validating bsdmainutils 9.0.6
I: Retrieving build-essential 11.7
I: Validating build-essential 11.7
I: Retrieving bzip2 1.0.6-7+b3
I: Validating bzip2 1.0.6-7+b3
I: Retrieving libbz2-1.0 1.0.6-7+b3
I: Validating libbz2-1.0 1.0.6-7+b3
I: Retrieving libdebconfclient0 0.192
I: Validating libdebconfclient0 0.192
I: Retrieving libcloog-isl4 0.18.2-1+b2
I: Validating libcloog-isl4 0.18.2-1+b2
I: Retrieving coreutils 8.23-4
I: Validating coreutils 8.23-4
I: Retrieving cpio 2.11+dfsg-4.1
I: Validating cpio 2.11+dfsg-4.1
I: Retrieving cron 3.0pl1-127+deb8u1
I: Validating cron 3.0pl1-127+deb8u1
I: Retrieving libcryptsetup4 2:1.6.6-5
I: Validating libcryptsetup4 2:1.6.6-5
I: Retrieving curl 7.38.0-4+deb8u2
I: Validating curl 7.38.0-4+deb8u2
I: Retrieving libcurl3 7.38.0-4+deb8u2
I: Validating libcurl3 7.38.0-4+deb8u2
I: Retrieving libsasl2-2 2.1.26.dfsg1-13
I: Validating libsasl2-2 2.1.26.dfsg1-13
I: Retrieving libsasl2-modules-db 2.1.26.dfsg1-13
I: Validating libsasl2-modules-db 2.1.26.dfsg1-13
I: Retrieving dash 0.5.7-4+b1
I: Validating dash 0.5.7-4+b1
I: Retrieving libdb5.3 5.3.28-9
I: Validating libdb5.3 5.3.28-9
I: Retrieving debconf 1.5.56
I: Validating debconf 1.5.56
I: Retrieving debconf-i18n 1.5.56
I: Validating debconf-i18n 1.5.56
I: Retrieving debian-archive-keyring 2014.3
I: Validating debian-archive-keyring 2014.3
I: Retrieving debianutils 4.4+b1
I: Validating debianutils 4.4+b1
I: Retrieving devio 1.2-1+b1
I: Validating devio 1.2-1+b1
I: Retrieving diffutils 1:3.3-1+b1
I: Validating diffutils 1:3.3-1+b1
I: Retrieving dmidecode 2.12-3
I: Validating dmidecode 2.12-3
I: Retrieving docbook-xml 4.5-7.2
I: Validating docbook-xml 4.5-7.2
I: Retrieving docbook-xsl 1.78.1+dfsg-1
I: Validating docbook-xsl 1.78.1+dfsg-1
I: Retrieving dpkg 1.17.25
I: Validating dpkg 1.17.25
I: Retrieving dpkg-dev 1.17.25
I: Validating dpkg-dev 1.17.25
I: Retrieving libdpkg-perl 1.17.25
I: Validating libdpkg-perl 1.17.25
I: Retrieving e2fslibs 1.42.12-1.1
I: Validating e2fslibs 1.42.12-1.1
I: Retrieving e2fsprogs 1.42.12-1.1
I: Validating e2fsprogs 1.42.12-1.1
I: Retrieving libcomerr2 1.42.12-1.1
I: Validating libcomerr2 1.42.12-1.1
I: Retrieving libss2 1.42.12-1.1
I: Validating libss2 1.42.12-1.1
I: Retrieving file 1:5.22+15-2
I: Validating file 1:5.22+15-2
I: Retrieving libmagic1 1:5.22+15-2
I: Validating libmagic1 1:5.22+15-2
I: Retrieving findutils 4.4.2-9+b1
I: Validating findutils 4.4.2-9+b1
I: Retrieving gcc-4.8-base 4.8.4-1
I: Validating gcc-4.8-base 4.8.4-1
I: Retrieving cpp-4.9 4.9.2-10
I: Validating cpp-4.9 4.9.2-10
I: Retrieving g++-4.9 4.9.2-10
I: Validating g++-4.9 4.9.2-10
I: Retrieving gcc-4.9 4.9.2-10
I: Validating gcc-4.9 4.9.2-10
I: Retrieving gcc-4.9-base 4.9.2-10
I: Validating gcc-4.9-base 4.9.2-10
I: Retrieving libasan1 4.9.2-10
I: Validating libasan1 4.9.2-10
I: Retrieving libatomic1 4.9.2-10
I: Validating libatomic1 4.9.2-10
I: Retrieving libcilkrts5 4.9.2-10
I: Validating libcilkrts5 4.9.2-10
I: Retrieving libgcc-4.9-dev 4.9.2-10
I: Validating libgcc-4.9-dev 4.9.2-10
I: Retrieving libgcc1 1:4.9.2-10
I: Validating libgcc1 1:4.9.2-10
I: Retrieving libgomp1 4.9.2-10
I: Validating libgomp1 4.9.2-10
I: Retrieving libitm1 4.9.2-10
I: Validating libitm1 4.9.2-10
I: Retrieving liblsan0 4.9.2-10
I: Validating liblsan0 4.9.2-10
I: Retrieving libquadmath0 4.9.2-10
I: Validating libquadmath0 4.9.2-10
I: Retrieving libstdc++-4.9-dev 4.9.2-10
I: Validating libstdc++-4.9-dev 4.9.2-10
I: Retrieving libstdc++6 4.9.2-10
I: Validating libstdc++6 4.9.2-10
I: Retrieving libtsan0 4.9.2-10
I: Validating libtsan0 4.9.2-10
I: Retrieving libubsan0 4.9.2-10
I: Validating libubsan0 4.9.2-10
I: Retrieving cpp 4:4.9.2-2
I: Validating cpp 4:4.9.2-2
I: Retrieving g++ 4:4.9.2-2
I: Validating g++ 4:4.9.2-2
I: Retrieving gcc 4:4.9.2-2
I: Validating gcc 4:4.9.2-2
I: Retrieving libgdbm3 1.8.3-13.1
I: Validating libgdbm3 1.8.3-13.1
I: Retrieving gettext 0.19.3-2
I: Validating gettext 0.19.3-2
I: Retrieving gettext-base 0.19.3-2
I: Validating gettext-base 0.19.3-2
I: Retrieving libasprintf0c2 0.19.3-2
I: Validating libasprintf0c2 0.19.3-2
I: Retrieving libglib2.0-0 2.42.1-1
I: Validating libglib2.0-0 2.42.1-1
I: Retrieving libc-bin 2.19-18+deb8u1
I: Validating libc-bin 2.19-18+deb8u1
I: Retrieving libc-dev-bin 2.19-18+deb8u1
I: Validating libc-dev-bin 2.19-18+deb8u1
I: Retrieving libc6 2.19-18+deb8u1
I: Validating libc6 2.19-18+deb8u1
I: Retrieving libc6-dev 2.19-18+deb8u1
I: Validating libc6-dev 2.19-18+deb8u1
I: Retrieving locales 2.19-18+deb8u1
I: Validating locales 2.19-18+deb8u1
I: Retrieving multiarch-support 2.19-18+deb8u1
I: Validating multiarch-support 2.19-18+deb8u1
I: Retrieving libgmp10 2:6.0.0+dfsg-6
I: Validating libgmp10 2:6.0.0+dfsg-6
I: Retrieving gnupg 1.4.18-7
I: Validating gnupg 1.4.18-7
I: Retrieving gpgv 1.4.18-7
I: Validating gpgv 1.4.18-7
I: Retrieving libgnutls-deb0-28 3.3.8-6+deb8u3
I: Validating libgnutls-deb0-28 3.3.8-6+deb8u3
I: Retrieving libgnutls-openssl27 3.3.8-6+deb8u3
I: Validating libgnutls-openssl27 3.3.8-6+deb8u3
I: Retrieving grep 2.20-4.1
I: Validating grep 2.20-4.1
I: Retrieving groff-base 1.22.2-8
I: Validating groff-base 1.22.2-8
I: Retrieving gzip 1.6-4
I: Validating gzip 1.6-4
I: Retrieving hostname 3.15
I: Validating hostname 3.15
I: Retrieving libicu52 52.1-8+deb8u2
I: Validating libicu52 52.1-8+deb8u2
I: Retrieving ifupdown 0.7.53.1
I: Validating ifupdown 0.7.53.1
I: Retrieving init 1.22
I: Validating init 1.22
I: Retrieving init-system-helpers 1.22
I: Validating init-system-helpers 1.22
I: Retrieving insserv 1.14.0-5
I: Validating insserv 1.14.0-5
I: Retrieving intltool-debian 0.35.0+20060710.1
I: Validating intltool-debian 0.35.0+20060710.1
I: Retrieving iproute2 3.16.0-2
I: Validating iproute2 3.16.0-2
I: Retrieving iptables 1.4.21-2+b1
I: Validating iptables 1.4.21-2+b1
I: Retrieving libxtables10 1.4.21-2+b1
I: Validating libxtables10 1.4.21-2+b1
I: Retrieving iputils-ping 3:20121221-5+b2
I: Validating iputils-ping 3:20121221-5+b2
I: Retrieving isc-dhcp-client 4.3.1-6
I: Validating isc-dhcp-client 4.3.1-6
I: Retrieving isc-dhcp-common 4.3.1-6
I: Validating isc-dhcp-common 4.3.1-6
I: Retrieving libisl10 0.12.2-2
I: Validating libisl10 0.12.2-2
I: Retrieving libjson-c2 0.11-4
I: Validating libjson-c2 0.11-4
I: Retrieving kernel-package 13.014+nmu1
I: Validating kernel-package 13.014+nmu1
I: Retrieving libkeyutils1 1.5.9-5+b1
I: Validating libkeyutils1 1.5.9-5+b1
I: Retrieving kmod 18-3
I: Validating kmod 18-3
I: Retrieving libkmod2 18-3
I: Validating libkmod2 18-3
I: Retrieving libgssapi-krb5-2 1.12.1+dfsg-19
I: Validating libgssapi-krb5-2 1.12.1+dfsg-19
I: Retrieving libk5crypto3 1.12.1+dfsg-19
I: Validating libk5crypto3 1.12.1+dfsg-19
I: Retrieving libkrb5-3 1.12.1+dfsg-19
I: Validating libkrb5-3 1.12.1+dfsg-19
I: Retrieving libkrb5support0 1.12.1+dfsg-19
I: Validating libkrb5support0 1.12.1+dfsg-19
I: Retrieving less 458-3
I: Validating less 458-3
I: Retrieving libcap2 1:2.24-8
I: Validating libcap2 1:2.24-8
I: Retrieving libcap2-bin 1:2.24-8
I: Validating libcap2-bin 1:2.24-8
I: Retrieving libcroco3 0.6.8-3+b1
I: Validating libcroco3 0.6.8-3+b1
I: Retrieving libestr0 0.1.9-1.1
I: Validating libestr0 0.1.9-1.1
I: Retrieving libffi6 3.1-2+b2
I: Validating libffi6 3.1-2+b2
I: Retrieving libgcrypt20 1.6.3-2
I: Validating libgcrypt20 1.6.3-2
I: Retrieving libgpg-error0 1.17-3
I: Validating libgpg-error0 1.17-3
I: Retrieving libidn11 1.29-1+b2
I: Validating libidn11 1.29-1+b2
I: Retrieving liblocale-gettext-perl 1.05-8+b1
I: Validating liblocale-gettext-perl 1.05-8+b1
I: Retrieving liblogging-stdlog0 1.0.4-1
I: Validating liblogging-stdlog0 1.0.4-1
I: Retrieving liblognorm1 1.0.1-3
I: Validating liblognorm1 1.0.1-3
I: Retrieving libmnl0 1.0.3-5
I: Validating libmnl0 1.0.3-5
I: Retrieving libnetfilter-acct1 1.0.2-1.1
I: Validating libnetfilter-acct1 1.0.2-1.1
I: Retrieving libnfnetlink0 1.0.1-3
I: Validating libnfnetlink0 1.0.1-3
I: Retrieving libpipeline1 1.4.0-1
I: Validating libpipeline1 1.4.0-1
I: Retrieving libpsl0 0.5.1-1
I: Validating libpsl0 0.5.1-1
I: Retrieving libselinux1 2.3-2
I: Validating libselinux1 2.3-2
I: Retrieving libsemanage-common 2.3-1
I: Validating libsemanage-common 2.3-1
I: Retrieving libsemanage1 2.3-1+b1
I: Validating libsemanage1 2.3-1+b1
I: Retrieving libsepol1 2.3-2
I: Validating libsepol1 2.3-2
I: Retrieving libsigc++-2.0-0c2a 2.4.0-1
I: Validating libsigc++-2.0-0c2a 2.4.0-1
I: Retrieving libssh2-1 1.4.3-4.1
I: Validating libssh2-1 1.4.3-4.1
I: Retrieving libtasn1-6 4.2-3+deb8u1
I: Validating libtasn1-6 4.2-3+deb8u1
I: Retrieving libtext-charwidth-perl 0.04-7+b3
I: Validating libtext-charwidth-perl 0.04-7+b3
I: Retrieving libtext-iconv-perl 1.7-5+b2
I: Validating libtext-iconv-perl 1.7-5+b2
I: Retrieving libtext-wrapi18n-perl 0.06-7
I: Validating libtext-wrapi18n-perl 0.06-7
I: Retrieving libtimedate-perl 2.3000-2
I: Validating libtimedate-perl 2.3000-2
I: Retrieving libunistring0 0.9.3-5.2+b1
I: Validating libunistring0 0.9.3-5.2+b1
I: Retrieving libusb-0.1-4 2:0.1.12-25
I: Validating libusb-0.1-4 2:0.1.12-25
I: Retrieving libxml2 2.9.1+dfsg1-5
I: Validating libxml2 2.9.1+dfsg1-5
I: Retrieving libxml2-utils 2.9.1+dfsg1-5
I: Validating libxml2-utils 2.9.1+dfsg1-5
I: Retrieving libxslt1.1 1.1.28-2+b2
I: Validating libxslt1.1 1.1.28-2+b2
I: Retrieving xsltproc 1.1.28-2+b2
I: Validating xsltproc 1.1.28-2+b2
I: Retrieving linux-libc-dev 3.16.7-ckt11-1+deb8u3
I: Validating linux-libc-dev 3.16.7-ckt11-1+deb8u3
I: Retrieving logrotate 3.8.7-1+b1
I: Validating logrotate 3.8.7-1+b1
I: Retrieving lsb-base 4.1+Debian13+nmu1
I: Validating lsb-base 4.1+Debian13+nmu1
I: Retrieving dmsetup 2:1.02.90-2.2
I: Validating dmsetup 2:1.02.90-2.2
I: Retrieving libdevmapper1.02.1 2:1.02.90-2.2
I: Validating libdevmapper1.02.1 2:1.02.90-2.2
I: Retrieving lzma 9.22-2
I: Validating lzma 9.22-2
I: Retrieving make 4.0-8.1
I: Validating make 4.0-8.1
I: Retrieving man-db 2.7.0.2-5
I: Validating man-db 2.7.0.2-5
I: Retrieving manpages 3.74-1
I: Validating manpages 3.74-1
I: Retrieving mawk 1.3.3-17
I: Validating mawk 1.3.3-17
I: Retrieving libmpc3 1.0.2-1
I: Validating libmpc3 1.0.2-1
I: Retrieving libmpfr4 3.1.2-2
I: Validating libmpfr4 3.1.2-2
I: Retrieving nano 2.2.6-3
I: Validating nano 2.2.6-3
I: Retrieving libncurses5 5.9+20140913-1+b1
I: Validating libncurses5 5.9+20140913-1+b1
I: Retrieving libncursesw5 5.9+20140913-1+b1
I: Validating libncursesw5 5.9+20140913-1+b1
I: Retrieving libtinfo5 5.9+20140913-1+b1
I: Validating libtinfo5 5.9+20140913-1+b1
I: Retrieving ncurses-base 5.9+20140913-1
I: Validating ncurses-base 5.9+20140913-1
I: Retrieving ncurses-bin 5.9+20140913-1+b1
I: Validating ncurses-bin 5.9+20140913-1+b1
I: Retrieving net-tools 1.60-26+b1
I: Validating net-tools 1.60-26+b1
I: Retrieving netbase 5.3
I: Validating netbase 5.3
I: Retrieving netcat-traditional 1.10-41
I: Validating netcat-traditional 1.10-41
I: Retrieving telnet 0.17-36
I: Validating telnet 0.17-36
I: Retrieving libhogweed2 2.7.1-5
I: Validating libhogweed2 2.7.1-5
I: Retrieving libnettle4 2.7.1-5
I: Validating libnettle4 2.7.1-5
I: Retrieving libnewt0.52 0.52.17-1+b1
I: Validating libnewt0.52 0.52.17-1+b1
I: Retrieving whiptail 0.52.17-1+b1
I: Validating whiptail 0.52.17-1+b1
I: Retrieving nfacct 1.0.1-1.1
I: Validating nfacct 1.0.1-1.1
I: Retrieving libldap-2.4-2 2.4.40+dfsg-1
I: Validating libldap-2.4-2 2.4.40+dfsg-1
I: Retrieving libssl1.0.0 1.0.1k-3+deb8u1
I: Validating libssl1.0.0 1.0.1k-3+deb8u1
I: Retrieving libp11-kit0 0.20.7-1
I: Validating libp11-kit0 0.20.7-1
I: Retrieving libpam-modules 1.1.8-3.1
I: Validating libpam-modules 1.1.8-3.1
I: Retrieving libpam-modules-bin 1.1.8-3.1
I: Validating libpam-modules-bin 1.1.8-3.1
I: Retrieving libpam-runtime 1.1.8-3.1
I: Validating libpam-runtime 1.1.8-3.1
I: Retrieving libpam0g 1.1.8-3.1
I: Validating libpam0g 1.1.8-3.1
I: Retrieving patch 2.7.5-1
I: Validating patch 2.7.5-1
I: Retrieving libpcre3 2:8.35-3.3
I: Validating libpcre3 2:8.35-3.3
I: Retrieving perl 5.20.2-3+deb8u1
I: Validating perl 5.20.2-3+deb8u1
I: Retrieving perl-base 5.20.2-3+deb8u1
I: Validating perl-base 5.20.2-3+deb8u1
I: Retrieving perl-modules 5.20.2-3+deb8u1
I: Validating perl-modules 5.20.2-3+deb8u1
I: Retrieving po-debconf 1.0.16+nmu3
I: Validating po-debconf 1.0.16+nmu3
I: Retrieving libpopt0 1.16-10
I: Validating libpopt0 1.16-10
I: Retrieving libprocps3 2:3.3.9-9
I: Validating libprocps3 2:3.3.9-9
I: Retrieving procps 2:3.3.9-9
I: Validating procps 2:3.3.9-9
I: Retrieving libreadline6 6.3-8+b3
I: Validating libreadline6 6.3-8+b3
I: Retrieving readline-common 6.3-8
I: Validating readline-common 6.3-8
I: Retrieving rsyslog 8.4.2-1+deb8u1
I: Validating rsyslog 8.4.2-1+deb8u1
I: Retrieving librtmp1 2.4+20150115.gita107cef-1
I: Validating librtmp1 2.4+20150115.gita107cef-1
I: Retrieving sed 4.2.2-4+b1
I: Validating sed 4.2.2-4+b1
I: Retrieving sensible-utils 0.0.9
I: Validating sensible-utils 0.0.9
I: Retrieving sgml-base 1.26+nmu4
I: Validating sgml-base 1.26+nmu4
I: Retrieving sgml-data 2.0.10
I: Validating sgml-data 2.0.10
I: Retrieving login 1:4.2-3
I: Validating login 1:4.2-3
I: Retrieving passwd 1:4.2-3
I: Validating passwd 1:4.2-3
I: Retrieving libslang2 2.3.0-2
I: Validating libslang2 2.3.0-2
I: Retrieving startpar 0.59-3
I: Validating startpar 0.59-3
I: Retrieving sudo 1.8.10p3-1+deb8u2
I: Validating sudo 1.8.10p3-1+deb8u2
I: Retrieving libsystemd0 215-17+deb8u2
I: Validating libsystemd0 215-17+deb8u2
I: Retrieving libudev1 215-17+deb8u2
I: Validating libudev1 215-17+deb8u2
I: Retrieving systemd 215-17+deb8u2
I: Validating systemd 215-17+deb8u2
I: Retrieving systemd-sysv 215-17+deb8u2
I: Validating systemd-sysv 215-17+deb8u2
I: Retrieving udev 215-17+deb8u2
I: Validating udev 215-17+deb8u2
I: Retrieving initscripts 2.88dsf-59
I: Validating initscripts 2.88dsf-59
I: Retrieving sysv-rc 2.88dsf-59
I: Validating sysv-rc 2.88dsf-59
I: Retrieving sysvinit-utils 2.88dsf-59
I: Validating sysvinit-utils 2.88dsf-59
I: Retrieving tar 1.27.1-2+b1
I: Validating tar 1.27.1-2+b1
I: Retrieving tasksel 3.31+deb8u1
I: Validating tasksel 3.31+deb8u1
I: Retrieving tasksel-data 3.31+deb8u1
I: Validating tasksel-data 3.31+deb8u1
I: Retrieving traceroute 1:2.0.20-2+b1
I: Validating traceroute 1:2.0.20-2+b1
I: Retrieving tzdata 2015f-0+deb8u1
I: Validating tzdata 2015f-0+deb8u1
I: Retrieving u-boot-tools 2014.10+dfsg1-5
I: Validating u-boot-tools 2014.10+dfsg1-5
I: Retrieving libustr-1.0-1 1.0.4-3+b2
I: Validating libustr-1.0-1 1.0.4-3+b2
I: Retrieving bsdutils 1:2.25.2-6
I: Validating bsdutils 1:2.25.2-6
I: Retrieving libblkid1 2.25.2-6
I: Validating libblkid1 2.25.2-6
I: Retrieving libmount1 2.25.2-6
I: Validating libmount1 2.25.2-6
I: Retrieving libsmartcols1 2.25.2-6
I: Validating libsmartcols1 2.25.2-6
I: Retrieving libuuid1 2.25.2-6
I: Validating libuuid1 2.25.2-6
I: Retrieving mount 2.25.2-6
I: Validating mount 2.25.2-6
I: Retrieving util-linux 2.25.2-6
I: Validating util-linux 2.25.2-6
I: Retrieving vim-common 2:7.4.488-7
I: Validating vim-common 2:7.4.488-7
I: Retrieving vim-tiny 2:7.4.488-7
I: Validating vim-tiny 2:7.4.488-7
I: Retrieving wget 1.16-1
I: Validating wget 1.16-1
I: Retrieving xml-core 0.13+nmu2
I: Validating xml-core 0.13+nmu2
I: Retrieving xmlto 0.0.25-2
I: Validating xmlto 0.0.25-2
I: Retrieving liblzma5 5.1.1alpha+20120614-2+b3
I: Validating liblzma5 5.1.1alpha+20120614-2+b3
I: Retrieving xz-utils 5.1.1alpha+20120614-2+b3
I: Validating xz-utils 5.1.1alpha+20120614-2+b3
I: Retrieving zlib1g 1:1.2.8.dfsg-2+b1
I: Validating zlib1g 1:1.2.8.dfsg-2+b1
I: Chosen extractor for .deb packages: dpkg-deb
I: Extracting acl...
I: Extracting libacl1...
I: Extracting adduser...
I: Extracting libattr1...
I: Extracting libaudit-common...
I: Extracting libaudit1...
I: Extracting base-files...
I: Extracting base-passwd...
I: Extracting bash...
I: Extracting libbz2-1.0...
I: Extracting libdebconfclient0...
I: Extracting coreutils...
I: Extracting libcryptsetup4...
I: Extracting dash...
I: Extracting libdb5.3...
I: Extracting debconf...
I: Extracting debconf-i18n...
I: Extracting debianutils...
I: Extracting diffutils...
I: Extracting dpkg...
I: Extracting e2fslibs...
I: Extracting e2fsprogs...
I: Extracting libcomerr2...
I: Extracting libss2...
I: Extracting findutils...
I: Extracting gcc-4.8-base...
I: Extracting gcc-4.9-base...
I: Extracting libgcc1...
I: Extracting libc-bin...
I: Extracting libc6...
I: Extracting multiarch-support...
I: Extracting grep...
I: Extracting gzip...
I: Extracting hostname...
I: Extracting init...
I: Extracting insserv...
I: Extracting libkmod2...
I: Extracting libcap2...
I: Extracting libcap2-bin...
I: Extracting libgcrypt20...
I: Extracting libgpg-error0...
I: Extracting liblocale-gettext-perl...
I: Extracting libselinux1...
I: Extracting libsemanage-common...
I: Extracting libsemanage1...
I: Extracting libsepol1...
I: Extracting libtext-charwidth-perl...
I: Extracting libtext-iconv-perl...
I: Extracting libtext-wrapi18n-perl...
I: Extracting lsb-base...
I: Extracting dmsetup...
I: Extracting libdevmapper1.02.1...
I: Extracting mawk...
I: Extracting libncurses5...
I: Extracting libncursesw5...
I: Extracting libtinfo5...
I: Extracting ncurses-base...
I: Extracting ncurses-bin...
I: Extracting libpam-modules...
I: Extracting libpam-modules-bin...
I: Extracting libpam-runtime...
I: Extracting libpam0g...
I: Extracting libpcre3...
I: Extracting perl-base...
I: Extracting libprocps3...
I: Extracting procps...
I: Extracting sed...
I: Extracting sensible-utils...
I: Extracting login...
I: Extracting passwd...
I: Extracting libslang2...
I: Extracting startpar...
I: Extracting libsystemd0...
I: Extracting libudev1...
I: Extracting systemd...
I: Extracting systemd-sysv...
I: Extracting udev...
I: Extracting initscripts...
I: Extracting sysv-rc...
I: Extracting sysvinit-utils...
I: Extracting tar...
I: Extracting tzdata...
I: Extracting libustr-1.0-1...
I: Extracting bsdutils...
I: Extracting libblkid1...
I: Extracting libmount1...
I: Extracting libsmartcols1...
I: Extracting libuuid1...
I: Extracting mount...
I: Extracting util-linux...
I: Extracting liblzma5...
I: Extracting zlib1g...
I: Installing core packages...
I: Unpacking required packages...
I: Unpacking acl...
I: Unpacking libacl1:amd64...
I: Unpacking adduser...
I: Unpacking libattr1:amd64...
I: Unpacking libaudit-common...
I: Unpacking libaudit1:amd64...
I: Unpacking base-files...
I: Unpacking base-passwd...
I: Unpacking bash...
I: Unpacking libbz2-1.0:amd64...
I: Unpacking libdebconfclient0:amd64...
I: Unpacking coreutils...
I: Unpacking libcryptsetup4:amd64...
I: Unpacking dash...
I: Unpacking libdb5.3:amd64...
I: Unpacking debconf...
I: Unpacking debconf-i18n...
I: Unpacking debianutils...
I: Unpacking diffutils...
I: Unpacking dpkg...
I: Unpacking e2fslibs:amd64...
I: Unpacking e2fsprogs...
I: Unpacking libcomerr2:amd64...
I: Unpacking libss2:amd64...
I: Unpacking findutils...
I: Unpacking gcc-4.8-base:amd64...
I: Unpacking gcc-4.9-base:amd64...
I: Unpacking libgcc1:amd64...
I: Unpacking libc-bin...
I: Unpacking libc6:amd64...
I: Unpacking multiarch-support...
I: Unpacking grep...
I: Unpacking gzip...
I: Unpacking hostname...
I: Unpacking init...
I: Unpacking insserv...
I: Unpacking libkmod2:amd64...
I: Unpacking libcap2:amd64...
I: Unpacking libcap2-bin...
I: Unpacking libgcrypt20:amd64...
I: Unpacking libgpg-error0:amd64...
I: Unpacking liblocale-gettext-perl...
I: Unpacking libselinux1:amd64...
I: Unpacking libsemanage-common...
I: Unpacking libsemanage1:amd64...
I: Unpacking libsepol1:amd64...
I: Unpacking libtext-charwidth-perl...
I: Unpacking libtext-iconv-perl...
I: Unpacking libtext-wrapi18n-perl...
I: Unpacking lsb-base...
I: Unpacking dmsetup...
I: Unpacking libdevmapper1.02.1:amd64...
I: Unpacking mawk...
I: Unpacking libncurses5:amd64...
I: Unpacking libncursesw5:amd64...
I: Unpacking libtinfo5:amd64...
I: Unpacking ncurses-base...
I: Unpacking ncurses-bin...
I: Unpacking libpam-modules:amd64...
I: Unpacking libpam-modules-bin...
I: Unpacking libpam-runtime...
I: Unpacking libpam0g:amd64...
I: Unpacking libpcre3:amd64...
I: Unpacking perl-base...
I: Unpacking libprocps3:amd64...
I: Unpacking procps...
I: Unpacking sed...
I: Unpacking sensible-utils...
I: Unpacking login...
I: Unpacking passwd...
I: Unpacking libslang2:amd64...
I: Unpacking startpar...
I: Unpacking libsystemd0:amd64...
I: Unpacking libudev1:amd64...
I: Unpacking systemd...
I: Unpacking systemd-sysv...
I: Unpacking udev...
I: Unpacking initscripts...
I: Unpacking sysv-rc...
I: Unpacking sysvinit-utils...
I: Unpacking tar...
I: Unpacking tzdata...
I: Unpacking libustr-1.0-1:amd64...
I: Unpacking bsdutils...
I: Unpacking libblkid1:amd64...
I: Unpacking libmount1:amd64...
I: Unpacking libsmartcols1:amd64...
I: Unpacking libuuid1:amd64...
I: Unpacking mount...
I: Unpacking util-linux...
I: Unpacking liblzma5:amd64...
I: Unpacking zlib1g:amd64...
I: Configuring required packages...
I: Configuring gcc-4.8-base:amd64...
I: Configuring lsb-base...
I: Configuring sensible-utils...
I: Configuring ncurses-base...
I: Configuring libsemanage-common...
I: Configuring gcc-4.9-base:amd64...
I: Configuring libaudit-common...
I: Configuring libc6:amd64...
I: Configuring startpar...
I: Configuring diffutils...
I: Configuring insserv...
I: Configuring findutils...
I: Configuring debianutils...
I: Configuring hostname...
I: Configuring multiarch-support...
I: Configuring mawk...
I: Configuring libprocps3:amd64...
I: Configuring libpcre3:amd64...
I: Configuring libbz2-1.0:amd64...
I: Configuring libkmod2:amd64...
I: Configuring libgpg-error0:amd64...
I: Configuring base-files...
I: Configuring libdebconfclient0:amd64...
I: Configuring libselinux1:amd64...
I: Configuring libcomerr2:amd64...
I: Configuring libslang2:amd64...
I: Configuring libsepol1:amd64...
I: Configuring libgcc1:amd64...
I: Configuring libustr-1.0-1:amd64...
I: Configuring libsmartcols1:amd64...
I: Configuring libaudit1:amd64...
I: Configuring libtinfo5:amd64...
I: Configuring libudev1:amd64...
I: Configuring libattr1:amd64...
I: Configuring libss2:amd64...
I: Configuring liblzma5:amd64...
I: Configuring base-passwd...
I: Configuring e2fslibs:amd64...
I: Configuring libgcrypt20:amd64...
I: Configuring libncursesw5:amd64...
I: Configuring libdb5.3:amd64...
I: Configuring zlib1g:amd64...
I: Configuring libcap2:amd64...
I: Configuring libsystemd0:amd64...
I: Configuring libdevmapper1.02.1:amd64...
I: Configuring libc-bin...
I: Configuring libsemanage1:amd64...
I: Configuring sysvinit-utils...
I: Configuring libacl1:amd64...
I: Configuring ncurses-bin...
I: Configuring acl...
I: Configuring libncurses5:amd64...
I: Configuring libcap2-bin...
I: Configuring bsdutils...
I: Configuring coreutils...
I: Configuring tar...
I: Configuring dpkg...
I: Configuring sed...
I: Configuring perl-base...
I: Configuring grep...
I: Configuring debconf...
I: Configuring tzdata...
I: Configuring gzip...
I: Configuring dash...
I: Configuring libtext-iconv-perl...
I: Configuring sysv-rc...
I: Configuring liblocale-gettext-perl...
I: Configuring libtext-charwidth-perl...
I: Configuring libpam0g:amd64...
I: Configuring libpam-modules-bin...
I: Configuring bash...
I: Configuring libtext-wrapi18n-perl...
I: Configuring libpam-modules:amd64...
I: Configuring libpam-runtime...
I: Configuring debconf-i18n...
I: Configuring passwd...
I: Configuring login...
I: Configuring adduser...
I: Configuring libuuid1:amd64...
I: Configuring libblkid1:amd64...
I: Configuring libmount1:amd64...
I: Configuring libcryptsetup4:amd64...
I: Configuring mount...
I: Configuring initscripts...
I: Configuring util-linux...
I: Configuring e2fsprogs...
I: Configuring procps...
I: Configuring udev...
I: Configuring systemd...
I: Configuring dmsetup...
I: Configuring systemd-sysv...
I: Configuring init...
I: Configuring libc-bin...
I: Unpacking the base system...
I: Unpacking apt...
I: Unpacking apt-utils...
I: Unpacking libapt-inst1.5:amd64...
I: Unpacking libapt-pkg4.12:amd64...
I: Unpacking bc...
I: Unpacking libdns-export100...
I: Unpacking libirs-export91...
I: Unpacking libisc-export95...
I: Unpacking libisccfg-export90...
I: Unpacking binutils...
I: Unpacking libboost-iostreams1.55.0:amd64...
I: Unpacking bsdmainutils...
I: Unpacking build-essential...
I: Unpacking bzip2...
I: Unpacking libcloog-isl4:amd64...
I: Unpacking cpio...
I: Unpacking cron...
I: Unpacking curl...
I: Unpacking libcurl3:amd64...
I: Unpacking libsasl2-2:amd64...
I: Unpacking libsasl2-modules-db:amd64...
I: Unpacking debian-archive-keyring...
I: Unpacking devio...
I: Unpacking dmidecode...
I: Unpacking docbook-xml...
I: Unpacking docbook-xsl...
I: Unpacking dpkg-dev...
I: Unpacking libdpkg-perl...
I: Unpacking file...
I: Unpacking libmagic1:amd64...
I: Unpacking cpp-4.9...
I: Unpacking g++-4.9...
I: Unpacking gcc-4.9...
I: Unpacking libasan1:amd64...
I: Unpacking libatomic1:amd64...
I: Unpacking libcilkrts5:amd64...
I: Unpacking libgcc-4.9-dev:amd64...
I: Unpacking libgomp1:amd64...
I: Unpacking libitm1:amd64...
I: Unpacking liblsan0:amd64...
I: Unpacking libquadmath0:amd64...
I: Unpacking libstdc++-4.9-dev:amd64...
I: Unpacking libstdc++6:amd64...
I: Unpacking libtsan0:amd64...
I: Unpacking libubsan0:amd64...
I: Unpacking cpp...
I: Unpacking g++...
I: Unpacking gcc...
I: Unpacking libgdbm3:amd64...
I: Unpacking gettext...
I: Unpacking gettext-base...
I: Unpacking libasprintf0c2:amd64...
I: Unpacking libglib2.0-0:amd64...
I: Unpacking libc-dev-bin...
I: Unpacking libc6-dev:amd64...
I: Unpacking locales...
I: Unpacking libgmp10:amd64...
I: Unpacking gnupg...
I: Unpacking gpgv...
I: Unpacking libgnutls-deb0-28:amd64...
I: Unpacking libgnutls-openssl27:amd64...
I: Unpacking groff-base...
I: Unpacking libicu52:amd64...
I: Unpacking ifupdown...
I: Unpacking init-system-helpers...
I: Unpacking intltool-debian...
I: Unpacking iproute2...
I: Unpacking iptables...
I: Unpacking libxtables10...
I: Unpacking iputils-ping...
I: Unpacking isc-dhcp-client...
I: Unpacking isc-dhcp-common...
I: Unpacking libisl10:amd64...
I: Unpacking libjson-c2:amd64...
I: Unpacking kernel-package...
I: Unpacking libkeyutils1:amd64...
I: Unpacking kmod...
I: Unpacking libgssapi-krb5-2:amd64...
I: Unpacking libk5crypto3:amd64...
I: Unpacking libkrb5-3:amd64...
I: Unpacking libkrb5support0:amd64...
I: Unpacking less...
I: Unpacking libcroco3:amd64...
I: Unpacking libestr0...
I: Unpacking libffi6:amd64...
I: Unpacking libidn11:amd64...
I: Unpacking liblogging-stdlog0:amd64...
I: Unpacking liblognorm1:amd64...
I: Unpacking libmnl0:amd64...
I: Unpacking libnetfilter-acct1:amd64...
I: Unpacking libnfnetlink0:amd64...
I: Unpacking libpipeline1:amd64...
I: Unpacking libpsl0:amd64...
I: Unpacking libsigc++-2.0-0c2a:amd64...
I: Unpacking libssh2-1:amd64...
I: Unpacking libtasn1-6:amd64...
I: Unpacking libtimedate-perl...
I: Unpacking libunistring0:amd64...
I: Unpacking libusb-0.1-4:amd64...
I: Unpacking libxml2:amd64...
I: Unpacking libxml2-utils...
I: Unpacking libxslt1.1:amd64...
I: Unpacking xsltproc...
I: Unpacking linux-libc-dev:amd64...
I: Unpacking logrotate...
I: Unpacking lzma...
I: Unpacking make...
I: Unpacking man-db...
I: Unpacking manpages...
I: Unpacking libmpc3:amd64...
I: Unpacking libmpfr4:amd64...
I: Unpacking nano...
I: Unpacking net-tools...
I: Unpacking netbase...
I: Unpacking netcat-traditional...
I: Unpacking telnet...
I: Unpacking libhogweed2:amd64...
I: Unpacking libnettle4:amd64...
I: Unpacking libnewt0.52:amd64...
I: Unpacking whiptail...
I: Unpacking nfacct...
I: Unpacking libldap-2.4-2:amd64...
I: Unpacking libssl1.0.0:amd64...
I: Unpacking libp11-kit0:amd64...
I: Unpacking patch...
I: Unpacking perl...
I: Unpacking perl-modules...
I: Unpacking po-debconf...
I: Unpacking libpopt0:amd64...
I: Unpacking libreadline6:amd64...
I: Unpacking readline-common...
I: Unpacking rsyslog...
I: Unpacking librtmp1:amd64...
I: Unpacking sgml-base...
I: Unpacking sgml-data...
I: Unpacking sudo...
I: Unpacking tasksel...
I: Unpacking tasksel-data...
I: Unpacking traceroute...
I: Unpacking u-boot-tools...
I: Unpacking vim-common...
I: Unpacking vim-tiny...
I: Unpacking wget...
I: Unpacking xml-core...
I: Unpacking xmlto...
I: Unpacking xz-utils...
I: Configuring the base system...
I: Configuring libquadmath0:amd64...
I: Configuring libgomp1:amd64...
I: Configuring libatomic1:amd64...
I: Configuring readline-common...
I: Configuring libgdbm3:amd64...
I: Configuring manpages...
I: Configuring libxtables10...
I: Configuring cpio...
I: Configuring libpopt0:amd64...
I: Configuring kmod...
I: Configuring libestr0...
I: Configuring less...
I: Configuring make...
I: Configuring libssl1.0.0:amd64...
I: Configuring sudo...
I: Configuring dmidecode...
I: Configuring gpgv...
I: Configuring libsasl2-modules-db:amd64...
I: Configuring liblogging-stdlog0:amd64...
I: Configuring linux-libc-dev:amd64...
I: Configuring perl-modules...
I: Configuring libsasl2-2:amd64...
I: Configuring u-boot-tools...
I: Configuring netcat-traditional...
I: Configuring libpipeline1:amd64...
I: Configuring iproute2...
I: Configuring libxml2:amd64...
I: Configuring libtasn1-6:amd64...
I: Configuring bzip2...
I: Configuring libmagic1:amd64...
I: Configuring libxslt1.1:amd64...
I: Configuring perl...
I: Configuring nano...
I: Configuring libgmp10:amd64...
I: Configuring libisc-export95...
I: Configuring libssh2-1:amd64...
I: Configuring patch...
I: Configuring init-system-helpers...
I: Configuring devio...
I: Configuring libunistring0:amd64...
I: Configuring libnettle4:amd64...
I: Configuring xz-utils...
I: Configuring debian-archive-keyring...
I: Configuring libisl10:amd64...
I: Configuring vim-common...
I: Configuring libmpfr4:amd64...
I: Configuring libcloog-isl4:amd64...
I: Configuring libnfnetlink0:amd64...
I: Configuring libmpc3:amd64...
I: Configuring libstdc++6:amd64...
I: Configuring lzma...
I: Configuring binutils...
I: Configuring libffi6:amd64...
I: Configuring libc-dev-bin...
I: Configuring libkeyutils1:amd64...
I: Configuring libnewt0.52:amd64...
I: Configuring bsdmainutils...
I: Configuring net-tools...
I: Configuring libc6-dev:amd64...
I: Configuring cron...
I: Configuring libmnl0:amd64...
I: Configuring libapt-pkg4.12:amd64...
I: Configuring libusb-0.1-4:amd64...
I: Configuring locales...
I: Configuring traceroute...
I: Configuring logrotate...
I: Configuring libitm1:amd64...
I: Configuring libidn11:amd64...
I: Configuring libreadline6:amd64...
I: Configuring libjson-c2:amd64...
I: Configuring libicu52:amd64...
I: Configuring netbase...
I: Configuring vim-tiny...
I: Configuring libhogweed2:amd64...
I: Configuring ifupdown...
I: Configuring libisccfg-export90...
I: Configuring libsigc++-2.0-0c2a:amd64...
I: Configuring libtimedate-perl...
I: Configuring libcilkrts5:amd64...
I: Configuring libubsan0:amd64...
I: Configuring libtsan0:amd64...
I: Configuring groff-base...
I: Configuring liblognorm1:amd64...
I: Configuring libglib2.0-0:amd64...
I: Configuring whiptail...
I: Configuring libasprintf0c2:amd64...
I: Configuring gnupg...
I: Configuring libxml2-utils...
I: Configuring libdpkg-perl...
I: Configuring libpsl0:amd64...
I: Configuring libboost-iostreams1.55.0:amd64...
I: Configuring gettext-base...
I: Configuring xsltproc...
I: Configuring cpp-4.9...
I: Configuring sgml-base...
I: Configuring file...
I: Configuring libdns-export100...
I: Configuring libkrb5support0:amd64...
I: Configuring liblsan0:amd64...
I: Configuring libcroco3:amd64...
I: Configuring dpkg-dev...
I: Configuring iptables...
I: Configuring telnet...
I: Configuring libapt-inst1.5:amd64...
I: Configuring libasan1:amd64...
I: Configuring libp11-kit0:amd64...
I: Configuring libgnutls-deb0-28:amd64...
I: Configuring libgcc-4.9-dev:amd64...
I: Configuring wget...
I: Configuring apt...
I: Configuring man-db...
I: Configuring xml-core...
I: Configuring libnetfilter-acct1:amd64...
I: Configuring rsyslog...
I: Configuring libstdc++-4.9-dev:amd64...
I: Configuring cpp...
I: Configuring libk5crypto3:amd64...
I: Configuring nfacct...
I: Configuring gettext...
I: Configuring gcc-4.9...
I: Configuring apt-utils...
I: Configuring libirs-export91...
I: Configuring librtmp1:amd64...
I: Configuring gcc...
I: Configuring intltool-debian...
I: Configuring libldap-2.4-2:amd64...
I: Configuring libgnutls-openssl27:amd64...
I: Configuring g++-4.9...
I: Configuring g++...
I: Configuring libkrb5-3:amd64...
I: Configuring iputils-ping...
I: Configuring po-debconf...
I: Configuring isc-dhcp-common...
I: Configuring build-essential...
I: Configuring isc-dhcp-client...
I: Configuring libgssapi-krb5-2:amd64...
I: Configuring libcurl3:amd64...
I: Configuring curl...
I: Configuring sgml-base...
I: Configuring sgml-data...
I: Configuring sgml-base...
I: Configuring docbook-xml...
I: Configuring xmlto...
I: Configuring kernel-package...
I: Configuring tasksel-data...
I: Configuring tasksel...
I: Configuring libc-bin...
I: Configuring systemd...
I: Base system installed successfully.
thomas@diamond /srv/store/sharespace $
```

Do some basic setup inside the chroot:

```#!bash
thomas@diamond /srv/store/sharespace $ grep thomas /etc/passwd | sudo tee -a /srv/store/sharespace/jessie-x86_64/etc/passwd
[sudo] password for thomas:
thomas:x:1000:1000:Thomas Stewart,,,:/home/thomas:/bin/bash
thomas@diamond /srv/store/sharespace $
thomas@diamond /srv/store/sharespace $ grep ^thomas /etc/passwd | sudo tee -a /srv/store/sharespace/jessie-x86_64/etc/group
thomas:x:1000:1000:Thomas Stewart,,,:/home/thomas:/bin/bash
thomas@diamond /srv/store/sharespace $
```

Add a repo which has the arm cross compilers:

```#!bash
thomas@diamond /srv/store/sharespace $ echo "deb http://emdebian.org/tools/debian jessie main" | sudo tee -a /srv/store/sharespace/jessie-x86_64/etc/apt/sources.list
deb http://emdebian.org/tools/debian jessie main
thomas@diamond /srv/store/sharespace $

thomas@diamond /srv/store/sharespace $ curl http://emdebian.org/tools/debian/emdebian-toolchain-archive.key | sudo chroot /srv/store/sharespace/jessie-x86_64 apt-key add -
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  2398  100  2398    0     0   1551      0  0:00:01  0:00:01 --:--:--  1552
OK
thomas@diamond /srv/store/sharespace $
```

Add the armel architecture to the chroot:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 dpkg --add-architecture armel
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 dpkg --print-architecture
amd64
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 dpkg --print-foreign-architectures
armel
thomas@diamond /srv/store/sharespace $
```

Update the packages:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 apt-get update
Hit http://emdebian.org jessie InRelease
Hit http://emdebian.org jessie/main amd64 Packages
Get:1 http://emdebian.org jessie/main armel Packages [7606 B]
Ign http://emdebian.org jessie/main Translation-en
Ign http://httpredir.debian.org jessie InRelease
Hit http://httpredir.debian.org jessie Release.gpg
Hit http://httpredir.debian.org jessie Release
Hit http://httpredir.debian.org jessie/main amd64 Packages
Get:2 http://httpredir.debian.org jessie/main armel Packages [6622 kB]
Hit http://httpredir.debian.org jessie/main Translation-en
Fetched 6629 kB in 10s (617 kB/s)
Reading package lists... Done
thomas@diamond /srv/store/sharespace $
```

Install the cross compiler and a statically linked armel busybox for use with
the initramfs later:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 apt-get install cross-gcc-dev crossbuild-essential-armel binutils-arm-linux-gnueabi busybox-static:armel
Reading package lists... Done
Building dependency tree... Done
The following extra packages will be installed:
  ca-certificates cpp-4.9-arm-linux-gnueabi dpkg-cross fakeroot g++-4.9-arm-linux-gnueabi g++-arm-linux-gnueabi
  gcc-4.9-arm-linux-gnueabi gcc-4.9-base:armel gcc-arm-linux-gnueabi libasan1:armel libatomic1:armel libauthen-sasl-perl
  libc6:armel libc6-dev:armel libconfig-auto-perl libconfig-inifiles-perl libdebian-dpkgcross-perl libencode-locale-perl
  libexpat1 libfakeroot libfile-homedir-perl libfile-listing-perl libfile-which-perl libfont-afm-perl libgcc-4.9-dev:armel
  libgcc1:armel libgomp1:armel libhtml-form-perl libhtml-format-perl libhtml-parser-perl libhtml-tagset-perl libhtml-tree-perl
  libhttp-cookies-perl libhttp-daemon-perl libhttp-date-perl libhttp-message-perl libhttp-negotiate-perl libio-html-perl
  libio-socket-ssl-perl libio-string-perl liblist-moreutils-perl liblwp-mediatypes-perl liblwp-protocol-https-perl
  libmailtools-perl libnet-http-perl libnet-smtp-ssl-perl libnet-ssleay-perl libstdc++-4.9-dev:armel libstdc++6:armel
  libubsan0:armel liburi-perl libwww-perl libwww-robotrules-perl libxml-namespacesupport-perl libxml-parser-perl
  libxml-sax-base-perl libxml-sax-expat-perl libxml-sax-perl libxml-simple-perl libyaml-libyaml-perl libyaml-perl
  linux-libc-dev:armel openssl realpath ucf
Suggested packages:
  binutils-doc gcc-4.9-locales binutils-multiarch gcc-4.9-doc libstdc++6-4.9-dbg:armel libgcc1-dbg:armel libgomp1-dbg:armel
  libitm1-dbg:armel libatomic1-dbg:armel libasan1-dbg:armel liblsan0-dbg:armel libtsan0-dbg:armel libubsan0-dbg:armel
  libcilkrts5-dbg:armel libquadmath-dbg:armel libdigest-hmac-perl libgssapi-perl glibc-doc:armel locales:armel
  manpages-dev:armel libdata-dump-perl libcrypt-ssleay-perl libstdc++-4.9-doc:armel libauthen-ntlm-perl libyaml-shell-perl
The following NEW packages will be installed:
  binutils-arm-linux-gnueabi busybox-static:armel ca-certificates cpp-4.9-arm-linux-gnueabi cross-gcc-dev
  crossbuild-essential-armel dpkg-cross fakeroot g++-4.9-arm-linux-gnueabi g++-arm-linux-gnueabi gcc-4.9-arm-linux-gnueabi
  gcc-4.9-base:armel gcc-arm-linux-gnueabi libasan1:armel libatomic1:armel libauthen-sasl-perl libc6:armel libc6-dev:armel
  libconfig-auto-perl libconfig-inifiles-perl libdebian-dpkgcross-perl libencode-locale-perl libexpat1 libfakeroot
  libfile-homedir-perl libfile-listing-perl libfile-which-perl libfont-afm-perl libgcc-4.9-dev:armel libgcc1:armel
  libgomp1:armel libhtml-form-perl libhtml-format-perl libhtml-parser-perl libhtml-tagset-perl libhtml-tree-perl
  libhttp-cookies-perl libhttp-daemon-perl libhttp-date-perl libhttp-message-perl libhttp-negotiate-perl libio-html-perl
  libio-socket-ssl-perl libio-string-perl liblist-moreutils-perl liblwp-mediatypes-perl liblwp-protocol-https-perl
  libmailtools-perl libnet-http-perl libnet-smtp-ssl-perl libnet-ssleay-perl libstdc++-4.9-dev:armel libstdc++6:armel
  libubsan0:armel liburi-perl libwww-perl libwww-robotrules-perl libxml-namespacesupport-perl libxml-parser-perl
  libxml-sax-base-perl libxml-sax-expat-perl libxml-sax-perl libxml-simple-perl libyaml-libyaml-perl libyaml-perl
  linux-libc-dev:armel openssl realpath ucf
0 upgraded, 69 newly installed, 0 to remove and 1 not upgraded.
Need to get 33.0 MB of archives.
After this operation, 124 MB of additional disk space will be used.
Do you want to continue? [Y/n]
Get:1 http://emdebian.org/tools/debian/ jessie/main cpp-4.9-arm-linux-gnueabi amd64 4.9.2-10 [5196 kB]
Get:2 http://httpredir.debian.org/debian/ jessie/main gcc-4.9-base armel 4.9.2-10 [160 kB]
Get:3 http://emdebian.org/tools/debian/ jessie/main gcc-4.9-arm-linux-gnueabi amd64 4.9.2-10 [5213 kB]
Get:4 http://httpredir.debian.org/debian/ jessie/main libgcc1 armel 1:4.9.2-10 [41.4 kB]
Get:5 http://httpredir.debian.org/debian/ jessie/main libc6 armel 2.19-18+deb8u1 [4126 kB]
Get:6 http://emdebian.org/tools/debian/ jessie/main gcc-arm-linux-gnueabi all 4.9.2-10.1 [2776 B]
Get:7 http://emdebian.org/tools/debian/ jessie/main g++-4.9-arm-linux-gnueabi amd64 4.9.2-10 [5473 kB]
Get:8 http://emdebian.org/tools/debian/ jessie/main g++-arm-linux-gnueabi all 4.9.2-10.1 [2680 B]
Get:9 http://emdebian.org/tools/debian/ jessie/main libdebian-dpkgcross-perl all 2.6.11~emdeb8 [28.9 kB]
Get:10 http://emdebian.org/tools/debian/ jessie/main dpkg-cross all 2.6.11~emdeb8 [53.7 kB]
Get:11 http://emdebian.org/tools/debian/ jessie/main crossbuild-essential-armel all 11.7+nmu1 [6176 B]
Get:12 http://httpredir.debian.org/debian/ jessie/main libstdc++6 armel 4.9.2-10 [234 kB]
Get:13 http://httpredir.debian.org/debian/ jessie/main libasan1 armel 4.9.2-10 [165 kB]
Get:14 http://httpredir.debian.org/debian/ jessie/main libatomic1 armel 4.9.2-10 [6742 B]
Get:15 http://httpredir.debian.org/debian/ jessie/main libexpat1 amd64 2.1.0-6+deb8u1 [80.0 kB]
Get:16 http://httpredir.debian.org/debian/ jessie/main libgomp1 armel 4.9.2-10 [36.5 kB]
Get:17 http://httpredir.debian.org/debian/ jessie/main libubsan0 armel 4.9.2-10 [68.5 kB]
Get:18 http://httpredir.debian.org/debian/ jessie/main ucf all 3.0030 [69.7 kB]
Get:19 http://httpredir.debian.org/debian/ jessie/main openssl amd64 1.0.1k-3+deb8u1 [677 kB]
Get:20 http://httpredir.debian.org/debian/ jessie/main ca-certificates all 20141019 [200 kB]
Get:21 http://httpredir.debian.org/debian/ jessie/main linux-libc-dev armel 3.16.7-ckt11-1+deb8u3 [976 kB]
Get:22 http://httpredir.debian.org/debian/ jessie/main libc6-dev armel 2.19-18+deb8u1 [1781 kB]
Get:23 http://httpredir.debian.org/debian/ jessie/main binutils-arm-linux-gnueabi amd64 2.25-5 [3721 kB]
Get:24 http://httpredir.debian.org/debian/ jessie/main libgcc-4.9-dev armel 4.9.2-10 [361 kB]
Get:25 http://httpredir.debian.org/debian/ jessie/main libstdc++-4.9-dev armel 4.9.2-10 [1140 kB]
Get:26 http://httpredir.debian.org/debian/ jessie/main liblist-moreutils-perl amd64 0.33-2+b1 [44.4 kB]
Get:27 http://httpredir.debian.org/debian/ jessie/main libconfig-inifiles-perl all 2.83-3 [54.0 kB]
Get:28 http://httpredir.debian.org/debian/ jessie/main libio-string-perl all 1.08-3 [12.3 kB]
Get:29 http://httpredir.debian.org/debian/ jessie/main libxml-namespacesupport-perl all 1.11-1 [14.8 kB]
Get:30 http://httpredir.debian.org/debian/ jessie/main libxml-sax-base-perl all 1.07-1 [23.1 kB]
Get:31 http://httpredir.debian.org/debian/ jessie/main libxml-sax-perl all 0.99+dfsg-2 [68.3 kB]
Get:32 http://httpredir.debian.org/debian/ jessie/main liburi-perl all 1.64-1 [95.5 kB]
Get:33 http://httpredir.debian.org/debian/ jessie/main libencode-locale-perl all 1.03-1 [13.6 kB]
Get:34 http://httpredir.debian.org/debian/ jessie/main libhttp-date-perl all 6.02-1 [10.7 kB]
Get:35 http://httpredir.debian.org/debian/ jessie/main libfile-listing-perl all 6.04-1 [10.3 kB]
Get:36 http://httpredir.debian.org/debian/ jessie/main libhtml-tagset-perl all 3.20-2 [13.5 kB]
Get:37 http://httpredir.debian.org/debian/ jessie/main libhtml-parser-perl amd64 3.71-1+b3 [109 kB]
Get:38 http://httpredir.debian.org/debian/ jessie/main libhtml-tree-perl all 5.03-1 [210 kB]
Get:39 http://httpredir.debian.org/debian/ jessie/main libio-html-perl all 1.001-1 [17.6 kB]
Get:40 http://httpredir.debian.org/debian/ jessie/main liblwp-mediatypes-perl all 6.02-1 [22.1 kB]
Get:41 http://httpredir.debian.org/debian/ jessie/main libhttp-message-perl all 6.06-1 [80.1 kB]
Get:42 http://httpredir.debian.org/debian/ jessie/main libhttp-cookies-perl all 6.01-1 [17.4 kB]
Get:43 http://httpredir.debian.org/debian/ jessie/main libhttp-negotiate-perl all 6.00-2 [13.6 kB]
Get:44 http://httpredir.debian.org/debian/ jessie/main libnet-ssleay-perl amd64 1.65-1+b1 [277 kB]
Get:45 http://httpredir.debian.org/debian/ jessie/main libio-socket-ssl-perl all 2.002-2+deb8u1 [172 kB]
Get:46 http://httpredir.debian.org/debian/ jessie/main libnet-http-perl all 6.07-1 [24.8 kB]
Get:47 http://httpredir.debian.org/debian/ jessie/main liblwp-protocol-https-perl all 6.06-2 [9582 B]
Get:48 http://httpredir.debian.org/debian/ jessie/main libwww-robotrules-perl all 6.01-1 [14.3 kB]
Get:49 http://httpredir.debian.org/debian/ jessie/main libwww-perl all 6.08-1 [194 kB]
Get:50 http://httpredir.debian.org/debian/ jessie/main libxml-parser-perl amd64 2.41-3 [215 kB]
Get:51 http://httpredir.debian.org/debian/ jessie/main libxml-sax-expat-perl all 0.40-2 [12.9 kB]
Get:52 http://httpredir.debian.org/debian/ jessie/main libxml-simple-perl all 2.20-1 [74.7 kB]
Get:53 http://httpredir.debian.org/debian/ jessie/main libyaml-perl all 1.13-1 [69.7 kB]
Get:54 http://httpredir.debian.org/debian/ jessie/main libconfig-auto-perl all 0.44-1 [19.5 kB]
Get:55 http://httpredir.debian.org/debian/ jessie/main libfile-which-perl all 1.09-1 [13.1 kB]
Get:56 http://httpredir.debian.org/debian/ jessie/main libfile-homedir-perl all 1.00-1 [48.9 kB]
Get:57 http://httpredir.debian.org/debian/ jessie/main libfakeroot amd64 1.20.2-1 [44.7 kB]
Get:58 http://httpredir.debian.org/debian/ jessie/main fakeroot amd64 1.20.2-1 [84.7 kB]
Get:59 http://httpredir.debian.org/debian/ jessie/main libauthen-sasl-perl all 2.1600-1 [50.8 kB]
Get:60 http://httpredir.debian.org/debian/ jessie/main libfont-afm-perl all 1.20-1 [14.4 kB]
Get:61 http://httpredir.debian.org/debian/ jessie/main libhtml-form-perl all 6.03-1 [23.9 kB]
Get:62 http://httpredir.debian.org/debian/ jessie/main libhtml-format-perl all 2.11-1 [43.1 kB]
Get:63 http://httpredir.debian.org/debian/ jessie/main libhttp-daemon-perl all 6.01-1 [17.3 kB]
Get:64 http://httpredir.debian.org/debian/ jessie/main libnet-smtp-ssl-perl all 1.01-3 [5996 B]
Get:65 http://httpredir.debian.org/debian/ jessie/main libmailtools-perl all 2.13-1 [96.6 kB]
Get:66 http://httpredir.debian.org/debian/ jessie/main libyaml-libyaml-perl amd64 0.41-6 [67.0 kB]
Get:67 http://httpredir.debian.org/debian/ jessie/main realpath all 8.23-4 [18.0 kB]
Get:68 http://httpredir.debian.org/debian/ jessie/main busybox-static armel 1:1.22.0-9+deb8u1 [717 kB]
Get:69 http://httpredir.debian.org/debian/ jessie/main cross-gcc-dev all 14+deb8u1 [17.3 kB]
Fetched 33.0 MB in 26s (1243 kB/s)
perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
	LANGUAGE = "en_GB:en",
	LC_ALL = (unset),
	LANG = "en_GB.UTF-8"
    are supported and installed on your system.
perl: warning: Falling back to the standard locale ("C").
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory
Extracting templates from packages: 100%
Preconfiguring packages ...
perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
	LANGUAGE = "en_GB:en",
	LC_ALL = (unset),
	LANG = "en_GB.UTF-8"
    are supported and installed on your system.
perl: warning: Falling back to the standard locale ("C").
E: Can not write log (Is /dev/pts mounted?) - posix_openpt (2: No such file or directory)
Selecting previously unselected package gcc-4.9-base:armel.
(Reading database ... 17028 files and directories currently installed.)
Preparing to unpack .../gcc-4.9-base_4.9.2-10_armel.deb ...
Unpacking gcc-4.9-base:armel (4.9.2-10) ...
Selecting previously unselected package libgcc1:armel.
Preparing to unpack .../libgcc1_1%3a4.9.2-10_armel.deb ...
Unpacking libgcc1:armel (1:4.9.2-10) ...
Selecting previously unselected package libc6:armel.
Preparing to unpack .../libc6_2.19-18+deb8u1_armel.deb ...
Unpacking libc6:armel (2.19-18+deb8u1) ...
Selecting previously unselected package libstdc++6:armel.
Preparing to unpack .../libstdc++6_4.9.2-10_armel.deb ...
Unpacking libstdc++6:armel (4.9.2-10) ...
Selecting previously unselected package libasan1:armel.
Preparing to unpack .../libasan1_4.9.2-10_armel.deb ...
Unpacking libasan1:armel (4.9.2-10) ...
Selecting previously unselected package libatomic1:armel.
Preparing to unpack .../libatomic1_4.9.2-10_armel.deb ...
Unpacking libatomic1:armel (4.9.2-10) ...
Selecting previously unselected package libexpat1:amd64.
Preparing to unpack .../libexpat1_2.1.0-6+deb8u1_amd64.deb ...
Unpacking libexpat1:amd64 (2.1.0-6+deb8u1) ...
Selecting previously unselected package libgomp1:armel.
Preparing to unpack .../libgomp1_4.9.2-10_armel.deb ...
Unpacking libgomp1:armel (4.9.2-10) ...
Selecting previously unselected package libubsan0:armel.
Preparing to unpack .../libubsan0_4.9.2-10_armel.deb ...
Unpacking libubsan0:armel (4.9.2-10) ...
Selecting previously unselected package ucf.
Preparing to unpack .../archives/ucf_3.0030_all.deb ...
Moving old data out of the way
Unpacking ucf (3.0030) ...
Selecting previously unselected package openssl.
Preparing to unpack .../openssl_1.0.1k-3+deb8u1_amd64.deb ...
Unpacking openssl (1.0.1k-3+deb8u1) ...
Selecting previously unselected package ca-certificates.
Preparing to unpack .../ca-certificates_20141019_all.deb ...
Unpacking ca-certificates (20141019) ...
Selecting previously unselected package linux-libc-dev:armel.
Preparing to unpack .../linux-libc-dev_3.16.7-ckt11-1+deb8u3_armel.deb ...
Unpacking linux-libc-dev:armel (3.16.7-ckt11-1+deb8u3) ...
Selecting previously unselected package libc6-dev:armel.
Preparing to unpack .../libc6-dev_2.19-18+deb8u1_armel.deb ...
Unpacking libc6-dev:armel (2.19-18+deb8u1) ...
Selecting previously unselected package cpp-4.9-arm-linux-gnueabi.
Preparing to unpack .../cpp-4.9-arm-linux-gnueabi_4.9.2-10_amd64.deb ...
Unpacking cpp-4.9-arm-linux-gnueabi (4.9.2-10) ...
Selecting previously unselected package binutils-arm-linux-gnueabi.
Preparing to unpack .../binutils-arm-linux-gnueabi_2.25-5_amd64.deb ...
Unpacking binutils-arm-linux-gnueabi (2.25-5) ...
Selecting previously unselected package libgcc-4.9-dev:armel.
Preparing to unpack .../libgcc-4.9-dev_4.9.2-10_armel.deb ...
Unpacking libgcc-4.9-dev:armel (4.9.2-10) ...
Selecting previously unselected package gcc-4.9-arm-linux-gnueabi.
Preparing to unpack .../gcc-4.9-arm-linux-gnueabi_4.9.2-10_amd64.deb ...
Unpacking gcc-4.9-arm-linux-gnueabi (4.9.2-10) ...
Selecting previously unselected package gcc-arm-linux-gnueabi.
Preparing to unpack .../gcc-arm-linux-gnueabi_4.9.2-10.1_all.deb ...
Unpacking gcc-arm-linux-gnueabi (4.9.2-10.1) ...
Selecting previously unselected package libstdc++-4.9-dev:armel.
Preparing to unpack .../libstdc++-4.9-dev_4.9.2-10_armel.deb ...
Unpacking libstdc++-4.9-dev:armel (4.9.2-10) ...
Selecting previously unselected package g++-4.9-arm-linux-gnueabi.
Preparing to unpack .../g++-4.9-arm-linux-gnueabi_4.9.2-10_amd64.deb ...
Unpacking g++-4.9-arm-linux-gnueabi (4.9.2-10) ...
Selecting previously unselected package g++-arm-linux-gnueabi.
Preparing to unpack .../g++-arm-linux-gnueabi_4.9.2-10.1_all.deb ...
Unpacking g++-arm-linux-gnueabi (4.9.2-10.1) ...
Selecting previously unselected package liblist-moreutils-perl.
Preparing to unpack .../liblist-moreutils-perl_0.33-2+b1_amd64.deb ...
Unpacking liblist-moreutils-perl (0.33-2+b1) ...
Selecting previously unselected package libconfig-inifiles-perl.
Preparing to unpack .../libconfig-inifiles-perl_2.83-3_all.deb ...
Unpacking libconfig-inifiles-perl (2.83-3) ...
Selecting previously unselected package libio-string-perl.
Preparing to unpack .../libio-string-perl_1.08-3_all.deb ...
Unpacking libio-string-perl (1.08-3) ...
Selecting previously unselected package libxml-namespacesupport-perl.
Preparing to unpack .../libxml-namespacesupport-perl_1.11-1_all.deb ...
Unpacking libxml-namespacesupport-perl (1.11-1) ...
Selecting previously unselected package libxml-sax-base-perl.
Preparing to unpack .../libxml-sax-base-perl_1.07-1_all.deb ...
Unpacking libxml-sax-base-perl (1.07-1) ...
Selecting previously unselected package libxml-sax-perl.
Preparing to unpack .../libxml-sax-perl_0.99+dfsg-2_all.deb ...
Unpacking libxml-sax-perl (0.99+dfsg-2) ...
Selecting previously unselected package liburi-perl.
Preparing to unpack .../liburi-perl_1.64-1_all.deb ...
Unpacking liburi-perl (1.64-1) ...
Selecting previously unselected package libencode-locale-perl.
Preparing to unpack .../libencode-locale-perl_1.03-1_all.deb ...
Unpacking libencode-locale-perl (1.03-1) ...
Selecting previously unselected package libhttp-date-perl.
Preparing to unpack .../libhttp-date-perl_6.02-1_all.deb ...
Unpacking libhttp-date-perl (6.02-1) ...
Selecting previously unselected package libfile-listing-perl.
Preparing to unpack .../libfile-listing-perl_6.04-1_all.deb ...
Unpacking libfile-listing-perl (6.04-1) ...
Selecting previously unselected package libhtml-tagset-perl.
Preparing to unpack .../libhtml-tagset-perl_3.20-2_all.deb ...
Unpacking libhtml-tagset-perl (3.20-2) ...
Selecting previously unselected package libhtml-parser-perl.
Preparing to unpack .../libhtml-parser-perl_3.71-1+b3_amd64.deb ...
Unpacking libhtml-parser-perl (3.71-1+b3) ...
Selecting previously unselected package libhtml-tree-perl.
Preparing to unpack .../libhtml-tree-perl_5.03-1_all.deb ...
Unpacking libhtml-tree-perl (5.03-1) ...
Selecting previously unselected package libio-html-perl.
Preparing to unpack .../libio-html-perl_1.001-1_all.deb ...
Unpacking libio-html-perl (1.001-1) ...
Selecting previously unselected package liblwp-mediatypes-perl.
Preparing to unpack .../liblwp-mediatypes-perl_6.02-1_all.deb ...
Unpacking liblwp-mediatypes-perl (6.02-1) ...
Selecting previously unselected package libhttp-message-perl.
Preparing to unpack .../libhttp-message-perl_6.06-1_all.deb ...
Unpacking libhttp-message-perl (6.06-1) ...
Selecting previously unselected package libhttp-cookies-perl.
Preparing to unpack .../libhttp-cookies-perl_6.01-1_all.deb ...
Unpacking libhttp-cookies-perl (6.01-1) ...
Selecting previously unselected package libhttp-negotiate-perl.
Preparing to unpack .../libhttp-negotiate-perl_6.00-2_all.deb ...
Unpacking libhttp-negotiate-perl (6.00-2) ...
Selecting previously unselected package libnet-ssleay-perl.
Preparing to unpack .../libnet-ssleay-perl_1.65-1+b1_amd64.deb ...
Unpacking libnet-ssleay-perl (1.65-1+b1) ...
Selecting previously unselected package libio-socket-ssl-perl.
Preparing to unpack .../libio-socket-ssl-perl_2.002-2+deb8u1_all.deb ...
Unpacking libio-socket-ssl-perl (2.002-2+deb8u1) ...
Selecting previously unselected package libnet-http-perl.
Preparing to unpack .../libnet-http-perl_6.07-1_all.deb ...
Unpacking libnet-http-perl (6.07-1) ...
Selecting previously unselected package liblwp-protocol-https-perl.
Preparing to unpack .../liblwp-protocol-https-perl_6.06-2_all.deb ...
Unpacking liblwp-protocol-https-perl (6.06-2) ...
Selecting previously unselected package libwww-robotrules-perl.
Preparing to unpack .../libwww-robotrules-perl_6.01-1_all.deb ...
Unpacking libwww-robotrules-perl (6.01-1) ...
Selecting previously unselected package libwww-perl.
Preparing to unpack .../libwww-perl_6.08-1_all.deb ...
Unpacking libwww-perl (6.08-1) ...
Selecting previously unselected package libxml-parser-perl.
Preparing to unpack .../libxml-parser-perl_2.41-3_amd64.deb ...
Unpacking libxml-parser-perl (2.41-3) ...
Selecting previously unselected package libxml-sax-expat-perl.
Preparing to unpack .../libxml-sax-expat-perl_0.40-2_all.deb ...
Unpacking libxml-sax-expat-perl (0.40-2) ...
Selecting previously unselected package libxml-simple-perl.
Preparing to unpack .../libxml-simple-perl_2.20-1_all.deb ...
Unpacking libxml-simple-perl (2.20-1) ...
Selecting previously unselected package libyaml-perl.
Preparing to unpack .../libyaml-perl_1.13-1_all.deb ...
Unpacking libyaml-perl (1.13-1) ...
Selecting previously unselected package libconfig-auto-perl.
Preparing to unpack .../libconfig-auto-perl_0.44-1_all.deb ...
Unpacking libconfig-auto-perl (0.44-1) ...
Selecting previously unselected package libfile-which-perl.
Preparing to unpack .../libfile-which-perl_1.09-1_all.deb ...
Unpacking libfile-which-perl (1.09-1) ...
Selecting previously unselected package libfile-homedir-perl.
Preparing to unpack .../libfile-homedir-perl_1.00-1_all.deb ...
Unpacking libfile-homedir-perl (1.00-1) ...
Selecting previously unselected package libdebian-dpkgcross-perl.
Preparing to unpack .../libdebian-dpkgcross-perl_2.6.11~emdeb8_all.deb ...
Unpacking libdebian-dpkgcross-perl (2.6.11~emdeb8) ...
Selecting previously unselected package dpkg-cross.
Preparing to unpack .../dpkg-cross_2.6.11~emdeb8_all.deb ...
Unpacking dpkg-cross (2.6.11~emdeb8) ...
Selecting previously unselected package crossbuild-essential-armel.
Preparing to unpack .../crossbuild-essential-armel_11.7+nmu1_all.deb ...
Unpacking crossbuild-essential-armel (11.7+nmu1) ...
Selecting previously unselected package libfakeroot:amd64.
Preparing to unpack .../libfakeroot_1.20.2-1_amd64.deb ...
Unpacking libfakeroot:amd64 (1.20.2-1) ...
Selecting previously unselected package fakeroot.
Preparing to unpack .../fakeroot_1.20.2-1_amd64.deb ...
Unpacking fakeroot (1.20.2-1) ...
Selecting previously unselected package libauthen-sasl-perl.
Preparing to unpack .../libauthen-sasl-perl_2.1600-1_all.deb ...
Unpacking libauthen-sasl-perl (2.1600-1) ...
Selecting previously unselected package libfont-afm-perl.
Preparing to unpack .../libfont-afm-perl_1.20-1_all.deb ...
Unpacking libfont-afm-perl (1.20-1) ...
Selecting previously unselected package libhtml-form-perl.
Preparing to unpack .../libhtml-form-perl_6.03-1_all.deb ...
Unpacking libhtml-form-perl (6.03-1) ...
Selecting previously unselected package libhtml-format-perl.
Preparing to unpack .../libhtml-format-perl_2.11-1_all.deb ...
Unpacking libhtml-format-perl (2.11-1) ...
Selecting previously unselected package libhttp-daemon-perl.
Preparing to unpack .../libhttp-daemon-perl_6.01-1_all.deb ...
Unpacking libhttp-daemon-perl (6.01-1) ...
Selecting previously unselected package libnet-smtp-ssl-perl.
Preparing to unpack .../libnet-smtp-ssl-perl_1.01-3_all.deb ...
Unpacking libnet-smtp-ssl-perl (1.01-3) ...
Selecting previously unselected package libmailtools-perl.
Preparing to unpack .../libmailtools-perl_2.13-1_all.deb ...
Unpacking libmailtools-perl (2.13-1) ...
Selecting previously unselected package libyaml-libyaml-perl.
Preparing to unpack .../libyaml-libyaml-perl_0.41-6_amd64.deb ...
Unpacking libyaml-libyaml-perl (0.41-6) ...
Selecting previously unselected package realpath.
Preparing to unpack .../realpath_8.23-4_all.deb ...
Unpacking realpath (8.23-4) ...
Selecting previously unselected package busybox-static.
Preparing to unpack .../busybox-static_1%3a1.22.0-9+deb8u1_armel.deb ...
Unpacking busybox-static (1:1.22.0-9+deb8u1) ...
Selecting previously unselected package cross-gcc-dev.
Preparing to unpack .../cross-gcc-dev_14+deb8u1_all.deb ...
Unpacking cross-gcc-dev (14+deb8u1) ...
Processing triggers for man-db (2.7.0.2-5) ...
Setting up gcc-4.9-base:armel (4.9.2-10) ...
Setting up libexpat1:amd64 (2.1.0-6+deb8u1) ...
Setting up ucf (3.0030) ...
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory
Setting up openssl (1.0.1k-3+deb8u1) ...
Setting up ca-certificates (20141019) ...
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory
Setting up linux-libc-dev:armel (3.16.7-ckt11-1+deb8u3) ...
Setting up cpp-4.9-arm-linux-gnueabi (4.9.2-10) ...
Setting up binutils-arm-linux-gnueabi (2.25-5) ...
Setting up liblist-moreutils-perl (0.33-2+b1) ...
Setting up libconfig-inifiles-perl (2.83-3) ...
Setting up libio-string-perl (1.08-3) ...
Setting up libxml-namespacesupport-perl (1.11-1) ...
Setting up libxml-sax-base-perl (1.07-1) ...
Setting up libxml-sax-perl (0.99+dfsg-2) ...
update-perl-sax-parsers: Registering Perl SAX parser XML::SAX::PurePerl with priority 10...
update-perl-sax-parsers: Updating overall Perl SAX parser modules info file...
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory

Creating config file /etc/perl/XML/SAX/ParserDetails.ini with new version
Setting up liburi-perl (1.64-1) ...
Setting up libencode-locale-perl (1.03-1) ...
Setting up libhttp-date-perl (6.02-1) ...
Setting up libfile-listing-perl (6.04-1) ...
Setting up libhtml-tagset-perl (3.20-2) ...
Setting up libhtml-parser-perl (3.71-1+b3) ...
Setting up libhtml-tree-perl (5.03-1) ...
Setting up libio-html-perl (1.001-1) ...
Setting up liblwp-mediatypes-perl (6.02-1) ...
Setting up libhttp-message-perl (6.06-1) ...
Setting up libhttp-cookies-perl (6.01-1) ...
Setting up libhttp-negotiate-perl (6.00-2) ...
Setting up libnet-ssleay-perl (1.65-1+b1) ...
Setting up libio-socket-ssl-perl (2.002-2+deb8u1) ...
Setting up libnet-http-perl (6.07-1) ...
Setting up libwww-robotrules-perl (6.01-1) ...
Setting up libyaml-perl (1.13-1) ...
Setting up libfile-which-perl (1.09-1) ...
Setting up libfile-homedir-perl (1.00-1) ...
Setting up libfakeroot:amd64 (1.20.2-1) ...
Setting up fakeroot (1.20.2-1) ...
update-alternatives: using /usr/bin/fakeroot-sysv to provide /usr/bin/fakeroot (fakeroot) in auto mode
Setting up libauthen-sasl-perl (2.1600-1) ...
Setting up libfont-afm-perl (1.20-1) ...
Setting up libhtml-form-perl (6.03-1) ...
Setting up libhtml-format-perl (2.11-1) ...
Setting up libhttp-daemon-perl (6.01-1) ...
Setting up libnet-smtp-ssl-perl (1.01-3) ...
Setting up libmailtools-perl (2.13-1) ...
Setting up libyaml-libyaml-perl (0.41-6) ...
Setting up realpath (8.23-4) ...
Setting up busybox-static (1:1.22.0-9+deb8u1) ...
Setting up cross-gcc-dev (14+deb8u1) ...
Setting up libgcc1:armel (1:4.9.2-10) ...
Setting up libc6:armel (2.19-18+deb8u1) ...
Setting up libstdc++6:armel (4.9.2-10) ...
Setting up libasan1:armel (4.9.2-10) ...
Setting up libatomic1:armel (4.9.2-10) ...
Setting up libgomp1:armel (4.9.2-10) ...
Setting up libubsan0:armel (4.9.2-10) ...
Setting up libc6-dev:armel (2.19-18+deb8u1) ...
Setting up libgcc-4.9-dev:armel (4.9.2-10) ...
Setting up gcc-4.9-arm-linux-gnueabi (4.9.2-10) ...
Setting up gcc-arm-linux-gnueabi (4.9.2-10.1) ...
Setting up libstdc++-4.9-dev:armel (4.9.2-10) ...
Setting up g++-4.9-arm-linux-gnueabi (4.9.2-10) ...
Setting up g++-arm-linux-gnueabi (4.9.2-10.1) ...
Setting up libwww-perl (6.08-1) ...
Setting up libxml-parser-perl (2.41-3) ...
Setting up libxml-sax-expat-perl (0.40-2) ...
update-perl-sax-parsers: Registering Perl SAX parser XML::SAX::Expat with priority 50...
update-perl-sax-parsers: Updating overall Perl SAX parser modules info file...
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory
Replacing config file /etc/perl/XML/SAX/ParserDetails.ini with new version
Setting up libxml-simple-perl (2.20-1) ...
Setting up libconfig-auto-perl (0.44-1) ...
Setting up libdebian-dpkgcross-perl (2.6.11~emdeb8) ...
Setting up dpkg-cross (2.6.11~emdeb8) ...
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory
Setting up crossbuild-essential-armel (11.7+nmu1) ...
Setting up liblwp-protocol-https-perl (6.06-2) ...
Processing triggers for libc-bin (2.19-18+deb8u1) ...
Processing triggers for ca-certificates (20141019) ...
Updating certificates in /etc/ssl/certs... 173 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d....done.
thomas@diamond /srv/store/sharespace $
```

Configure locates so stop the annoying locale warnings:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 dpkg-reconfigure locales
perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
	LANGUAGE = "en_GB:en",
	LC_ALL = (unset),
	LANG = "en_GB.UTF-8"
    are supported and installed on your system.
perl: warning: Falling back to the standard locale ("C").
locale: Cannot set LC_CTYPE to default locale: No such file or directory
locale: Cannot set LC_MESSAGES to default locale: No such file or directory
locale: Cannot set LC_ALL to default locale: No such file or directory
/usr/bin/locale: Cannot set LC_CTYPE to default locale: No such file or directory
/usr/bin/locale: Cannot set LC_MESSAGES to default locale: No such file or directory
/usr/bin/locale: Cannot set LC_ALL to default locale: No such file or directory
Generating locales (this might take a while)...
  en_GB.UTF-8... done
Generation complete.
thomas@diamond /srv/store/sharespace $
```

Install git:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo chroot /srv/store/sharespace/jessie-x86_64 apt-get install git
Reading package lists... Done
Building dependency tree
Reading state information... Done
The following extra packages will be installed:
  git-man libbsd0 libcurl3-gnutls libedit2 liberror-perl libx11-6 libx11-data libxau6 libxcb1 libxdmcp6 libxext6 libxmuu1
  openssh-client rsync xauth
Suggested packages:
  git-daemon-run git-daemon-sysvinit git-doc git-el git-email git-gui gitk gitweb git-arch git-cvs git-mediawiki git-svn
  ssh-askpass libpam-ssh keychain monkeysphere openssh-server
Recommended packages:
  ssh-client
The following NEW packages will be installed:
  git git-man libbsd0 libcurl3-gnutls libedit2 liberror-perl libx11-6 libx11-data libxau6 libxcb1 libxdmcp6 libxext6 libxmuu1
  openssh-client rsync xauth
0 upgraded, 16 newly installed, 0 to remove and 1 not upgraded.
Need to get 7,456 kB of archives.
After this operation, 32.6 MB of additional disk space will be used.
Do you want to continue? [Y/n]
Get:1 http://httpredir.debian.org/debian/ jessie/main libbsd0 amd64 0.7.0-2 [67.9 kB]
Get:2 http://httpredir.debian.org/debian/ jessie/main libedit2 amd64 3.1-20140620-2 [85.1 kB]
Get:3 http://httpredir.debian.org/debian/ jessie/main libcurl3-gnutls amd64 7.38.0-4+deb8u2 [251 kB]
Get:4 http://httpredir.debian.org/debian/ jessie/main libxau6 amd64 1:1.0.8-1 [20.7 kB]
Get:5 http://httpredir.debian.org/debian/ jessie/main libxdmcp6 amd64 1:1.1.1-1+b1 [24.9 kB]
Get:6 http://httpredir.debian.org/debian/ jessie/main libxcb1 amd64 1.10-3+b1 [44.4 kB]
Get:7 http://httpredir.debian.org/debian/ jessie/main libx11-data all 2:1.6.2-3 [126 kB]
Get:8 http://httpredir.debian.org/debian/ jessie/main libx11-6 amd64 2:1.6.2-3 [729 kB]
Get:9 http://httpredir.debian.org/debian/ jessie/main libxext6 amd64 2:1.3.3-1 [52.7 kB]
Get:10 http://httpredir.debian.org/debian/ jessie/main libxmuu1 amd64 2:1.1.2-1 [23.3 kB]
Get:11 http://httpredir.debian.org/debian/ jessie/main openssh-client amd64 1:6.7p1-5 [691 kB]
Get:12 http://httpredir.debian.org/debian/ jessie/main liberror-perl all 0.17-1.1 [22.4 kB]
Get:13 http://httpredir.debian.org/debian/ jessie/main git-man all 1:2.1.4-2.1 [1,266 kB]
Get:14 http://httpredir.debian.org/debian/ jessie/main git amd64 1:2.1.4-2.1 [3,624 kB]
Get:15 http://httpredir.debian.org/debian/ jessie/main rsync amd64 3.1.1-3 [390 kB]
Get:16 http://httpredir.debian.org/debian/ jessie/main xauth amd64 1:1.0.9-1 [38.2 kB]
Fetched 7,456 kB in 8s (859 kB/s)
E: Can not write log (Is /dev/pts mounted?) - posix_openpt (2: No such file or directory)
Selecting previously unselected package libbsd0:amd64.
(Reading database ... 19184 files and directories currently installed.)
Preparing to unpack .../libbsd0_0.7.0-2_amd64.deb ...
Unpacking libbsd0:amd64 (0.7.0-2) ...
Selecting previously unselected package libedit2:amd64.
Preparing to unpack .../libedit2_3.1-20140620-2_amd64.deb ...
Unpacking libedit2:amd64 (3.1-20140620-2) ...
Selecting previously unselected package libcurl3-gnutls:amd64.
Preparing to unpack .../libcurl3-gnutls_7.38.0-4+deb8u2_amd64.deb ...
Unpacking libcurl3-gnutls:amd64 (7.38.0-4+deb8u2) ...
Selecting previously unselected package libxau6:amd64.
Preparing to unpack .../libxau6_1%3a1.0.8-1_amd64.deb ...
Unpacking libxau6:amd64 (1:1.0.8-1) ...
Selecting previously unselected package libxdmcp6:amd64.
Preparing to unpack .../libxdmcp6_1%3a1.1.1-1+b1_amd64.deb ...
Unpacking libxdmcp6:amd64 (1:1.1.1-1+b1) ...
Selecting previously unselected package libxcb1:amd64.
Preparing to unpack .../libxcb1_1.10-3+b1_amd64.deb ...
Unpacking libxcb1:amd64 (1.10-3+b1) ...
Selecting previously unselected package libx11-data.
Preparing to unpack .../libx11-data_2%3a1.6.2-3_all.deb ...
Unpacking libx11-data (2:1.6.2-3) ...
Selecting previously unselected package libx11-6:amd64.
Preparing to unpack .../libx11-6_2%3a1.6.2-3_amd64.deb ...
Unpacking libx11-6:amd64 (2:1.6.2-3) ...
Selecting previously unselected package libxext6:amd64.
Preparing to unpack .../libxext6_2%3a1.3.3-1_amd64.deb ...
Unpacking libxext6:amd64 (2:1.3.3-1) ...
Selecting previously unselected package libxmuu1:amd64.
Preparing to unpack .../libxmuu1_2%3a1.1.2-1_amd64.deb ...
Unpacking libxmuu1:amd64 (2:1.1.2-1) ...
Selecting previously unselected package openssh-client.
Preparing to unpack .../openssh-client_1%3a6.7p1-5_amd64.deb ...
Unpacking openssh-client (1:6.7p1-5) ...
Selecting previously unselected package liberror-perl.
Preparing to unpack .../liberror-perl_0.17-1.1_all.deb ...
Unpacking liberror-perl (0.17-1.1) ...
Selecting previously unselected package git-man.
Preparing to unpack .../git-man_1%3a2.1.4-2.1_all.deb ...
Unpacking git-man (1:2.1.4-2.1) ...
Selecting previously unselected package git.
Preparing to unpack .../git_1%3a2.1.4-2.1_amd64.deb ...
Unpacking git (1:2.1.4-2.1) ...
Selecting previously unselected package rsync.
Preparing to unpack .../rsync_3.1.1-3_amd64.deb ...
Unpacking rsync (3.1.1-3) ...
Selecting previously unselected package xauth.
Preparing to unpack .../xauth_1%3a1.0.9-1_amd64.deb ...
Unpacking xauth (1:1.0.9-1) ...
Processing triggers for man-db (2.7.0.2-5) ...
Processing triggers for systemd (215-17+deb8u2) ...
Setting up libbsd0:amd64 (0.7.0-2) ...
Setting up libedit2:amd64 (3.1-20140620-2) ...
Setting up libcurl3-gnutls:amd64 (7.38.0-4+deb8u2) ...
Setting up libxau6:amd64 (1:1.0.8-1) ...
Setting up libxdmcp6:amd64 (1:1.1.1-1+b1) ...
Setting up libxcb1:amd64 (1.10-3+b1) ...
Setting up libx11-data (2:1.6.2-3) ...
Setting up libx11-6:amd64 (2:1.6.2-3) ...
Setting up libxext6:amd64 (2:1.3.3-1) ...
Setting up libxmuu1:amd64 (2:1.1.2-1) ...
Setting up openssh-client (1:6.7p1-5) ...
Setting up liberror-perl (0.17-1.1) ...
Setting up git-man (1:2.1.4-2.1) ...
Setting up git (1:2.1.4-2.1) ...
Setting up rsync (3.1.1-3) ...
Failed to read /proc/cmdline. Ignoring: No such file or directory
Setting up xauth (1:1.0.9-1) ...
Processing triggers for libc-bin (2.19-18+deb8u1) ...
Processing triggers for systemd (215-17+deb8u2) ...
thomas@diamond /srv/store/sharespace $
```

Create a home directory to do work inside the chroot, copy the sharespace kernel
patch, create a link so that "arm-linux-gnueabiobjcopy" works:

```#!bash
thomas@diamond /srv/store/sharespace $ sudo mkdir jessie-x86_64/home/thomas
thomas@diamond /srv/store/sharespace $ sudo chown thomas:thomas jessie-x86_64/home/thomas
thomas@diamond /srv/store/sharespace $ cp /srv/store/sharespace/v3.10-sharespace.patch /srv/store/sharespace/jessie-x86_64/home/thomas/
thomas@diamond /srv/store/sharespace $ ln -s /usr/bin/arm-linux-gnueabi-objcopy /usr/bin/arm-linux-gnueabiobjcopy
thomas@diamond /srv/store/sharespace $
```

Mount proc and sys. Then chroot in as thomas:

```#!bash
thomas@diamond /srv/store/sharespace $ cd jessie-x86_64/
thomas@diamond /srv/store/sharespace/jessie-x86_64 $ sudo mount -t proc proc proc
thomas@diamond /srv/store/sharespace/jessie-x86_64 $ sudo mount -t sysfs sysfs sys
thomas@diamond /srv/store/sharespace/jessie-x86_64 $
thomas@diamond /srv/store/sharespace/jessie-x86_64 $ sudo chroot /srv/store/sharespace/jessie-x86_64 su - thomas
su: Authentication failure
(Ignored)
thomas@diamond:~$
```

## Get Compilin

Get the latest linux source from git:

```#!bash
thomas@diamond:~$ git clone https://github.com/torvalds/linux.git
Cloning into 'linux'...
remote: Counting objects: 4370680, done.
remote: Total 4370680 (delta 0), reused 0 (delta 0), pack-reused 4370680
Receiving objects: 100% (4370680/4370680), 1.12 GiB | 6.24 MiB/s, done.
Resolving deltas: 100% (3664432/3664432), done.
Checking connectivity... done.
Checking out files: 100% (51567/51567), done.
thomas@diamond:~$
```

Checkout v3.10, create a new branch called v3.10-sharespace and apply the patch:

```#!bash
thomas@diamond:~$ cd linux/
thomas@diamond:~/linux$ git checkout -b v3.10-sharespace v3.10
Checking out files: 100% (41519/41519), done.
Switched to a new branch 'v3.10-sharespace'
thomas@diamond:~/linux$ cat ~/v3.10-sharespace.patch | patch -p1
patching file .config
patching file arch/arm/mach-orion5x/Kconfig
patching file arch/arm/mach-orion5x/Makefile
patching file arch/arm/mach-orion5x/sharespace-setup.c
patching file arch/arm/tools/mach-types
thomas@diamond:~/linux$
```

Set some environment variables and compile the kernel:

```#!bash
thomas@diamond:~/linux$ export CC=/usr/bin/arm-linux-gnueabi-gcc
thomas@diamond:~/linux$ export KPKG_ARCH=armel
thomas@diamond:~/linux$ export DPKG_ARCH=armel
thomas@diamond:~/linux$ export DEB_HOST_ARCH=armel
thomas@diamond:~/linux$ make-kpkg -j 4 --initrd --rootcmd fakeroot --arch arm --subarch orion5x --arch_in_name --revision 1.sharespace --cross_compile arm-linux-gnueabi kernel-image
dpkg-architecture: warning: specified GNU system type arm-linux-gnu does not match gcc system type arm-linux-gnueabi, try setting a correct CC environment variable
dpkg-architecture: warning: specified GNU system type arm-linux-gnu does not match gcc system type arm-linux-gnueabi, try setting a correct CC environment variable
dpkg-architecture: warning: specified GNU system type arm-linux-gnu does not match gcc system type arm-linux-gnueabi, try setting a correct CC environment variable
====== making target debian/stamp/conf/minimal_debian [new prereqs: ]======
This is kernel package version 13.014+nmu1.
test -d debian             || mkdir debian
```

SNIP some verbose output, press enter a few times for kernel default config
values and wait.

```#!bash
make[1]: Entering directory '/home/thomas/linux'
  CHK     include/generated/uapi/linux/version.h
  HOSTCC  scripts/genksyms/genksyms.o
  CC      scripts/mod/empty.o
  HOSTCC  scripts/selinux/genheaders/genheaders
  HOSTCC  scripts/mod/mk_elfconfig
  HOSTCC  scripts/selinux/mdp/mdp
  CC      scripts/mod/devicetable-offsets.s
  MKELF   scripts/mod/elfconfig.h
  GEN     scripts/mod/devicetable-offsets.h
  HOSTCC  scripts/mod/modpost.o
<SNIP>
  CC      init/main.o
  CC      arch/arm/vfp/vfpmodule.o
  CC      arch/arm/kernel/elf.o
  GEN     usr/initramfs_data.cpio
<SNIP>
chown -R root:root             /home/thomas/linux/debian/linux-image-3.10.0+-orion5x
dpkg --build                   /home/thomas/linux/debian/linux-image-3.10.0+-orion5x ..
dpkg-deb: building package `linux-image-3.10.0+-orion5x' in `../linux-image-3.10.0+-orion5x_1.sharespace_armel.deb'.
make[2]: Leaving directory '/home/thomas/linux'
make[1]: Leaving directory '/home/thomas/linux'
thomas@diamond:~/linux$
thomas@diamond:~/linux$ exit
```

Exit the chroot and install the newly created deb inside. This means /boot has
armel code, but we are never booting this chroot so it just makes it easier to
get the linux image and modules:

```#!bash
thomas@diamond ~ $ sudo chroot /srv/store/sharespace/jessie-x86_64 dpkg -i /home/thomas/linux-image-3.10.0+-orion5x_1.sharespace_armel.deb
Selecting previously unselected package linux-image-3.10.0+-orion5x.
(Reading database ... 20358 files and directories currently installed.)
Preparing to unpack .../linux-image-3.10.0+-orion5x_1.sharespace_armel.deb ...
Done.
Unpacking linux-image-3.10.0+-orion5x (1.sharespace) ...
Setting up linux-image-3.10.0+-orion5x (1.sharespace) ...
Running depmod.
Examining /etc/kernel/postinst.d.
run-parts: executing /etc/kernel/postinst.d/apt-auto-removal 3.10.0+ /boot/vmlinuz-3.10.0+
thomas@diamond ~ $
```

## Setup armel chroot

Create another chroot, but this time a foreign armel one. We need some bins and
libs to construct an initrd and this will serve as the chroot to be installed as
it's much easier to make a foreign one on x86_64 than try to get debootstrap
working with next to no other tools:

```
thomas@diamond ~ $ sudo debootstrap --verbose --foreign --arch=armel --include=initramfs-tools,ssh,file,mdadm,pv,file jessie /srv/store/sharespace/jessie-armel http://httpredir.debian.org/debian/
I: Retrieving Release
I: Retrieving Release.gpg
I: Checking Release signature
I: Valid Release signature (key id 75DDC3C4A499F1A18CB5F3C8CBF8D6FD518E17E1)
I: Retrieving Packages
I: Validating Packages
I: Resolving dependencies of required packages...
I: Resolving dependencies of base packages...
I: Found additional required dependencies: acl adduser dmsetup insserv libaudit-common libaudit1 libbz2-1.0 libcap2 libcap2-bin libcryptsetup4 libdb5.3 libdebconfclient0 libdevmapper1.02.1 libgcrypt20 libgpg-error0 libkmod2 libncursesw5 libprocps3 libsemanage-common libsemanage1 libslang2 libsystemd0 libudev1 libustr-1.0-1 procps systemd systemd-sysv udev
I: Found additional base dependencies: klibc-utils libbsd0 libdns-export100 libedit2 libffi6 libgmp10 libgnutls-deb0-28 libgnutls-openssl27 libgssapi-krb5-2 libhogweed2 libicu52 libidn11 libirs-export91 libisc-export95 libisccfg-export90 libk5crypto3 libkeyutils1 libklibc libkrb5-3 libkrb5support0 libmagic1 libmnl0 libnetfilter-acct1 libnettle4 libnfnetlink0 libp11-kit0 libpsl0 libtasn1-6 libwrap0 openssh-client openssh-server openssh-sftp-server
I: Checking component main on http://httpredir.debian.org/debian...
I: Retrieving acl 2.2.52-2
I: Validating acl 2.2.52-2
I: Retrieving libacl1 2.2.52-2
I: Validating libacl1 2.2.52-2
I: Retrieving adduser 3.113+nmu3
I: Validating adduser 3.113+nmu3
I: Retrieving apt 1.0.9.8.1
I: Validating apt 1.0.9.8.1
I: Retrieving apt-utils 1.0.9.8.1
I: Validating apt-utils 1.0.9.8.1
I: Retrieving libapt-inst1.5 1.0.9.8.1
I: Validating libapt-inst1.5 1.0.9.8.1
I: Retrieving libapt-pkg4.12 1.0.9.8.1
I: Validating libapt-pkg4.12 1.0.9.8.1
I: Retrieving libattr1 1:2.4.47-2
I: Validating libattr1 1:2.4.47-2
I: Retrieving libaudit-common 1:2.4-1
I: Validating libaudit-common 1:2.4-1
I: Retrieving libaudit1 1:2.4-1+b1
I: Validating libaudit1 1:2.4-1+b1
I: Retrieving base-files 8+deb8u2
I: Validating base-files 8+deb8u2
I: Retrieving base-passwd 3.5.37
I: Validating base-passwd 3.5.37
I: Retrieving bash 4.3-11+b1
I: Validating bash 4.3-11+b1
I: Retrieving libdns-export100 1:9.9.5.dfsg-9+deb8u2
I: Validating libdns-export100 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libirs-export91 1:9.9.5.dfsg-9+deb8u2
I: Validating libirs-export91 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libisc-export95 1:9.9.5.dfsg-9+deb8u2
I: Validating libisc-export95 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libisccfg-export90 1:9.9.5.dfsg-9+deb8u2
I: Validating libisccfg-export90 1:9.9.5.dfsg-9+deb8u2
I: Retrieving libboost-iostreams1.55.0 1.55.0+dfsg-3
I: Validating libboost-iostreams1.55.0 1.55.0+dfsg-3
I: Retrieving bsdmainutils 9.0.6
I: Validating bsdmainutils 9.0.6
I: Retrieving libbz2-1.0 1.0.6-7+b3
I: Validating libbz2-1.0 1.0.6-7+b3
I: Retrieving libdebconfclient0 0.192
I: Validating libdebconfclient0 0.192
I: Retrieving coreutils 8.23-4
I: Validating coreutils 8.23-4
I: Retrieving cpio 2.11+dfsg-4.1
I: Validating cpio 2.11+dfsg-4.1
I: Retrieving cron 3.0pl1-127+deb8u1
I: Validating cron 3.0pl1-127+deb8u1
I: Retrieving libcryptsetup4 2:1.6.6-5
I: Validating libcryptsetup4 2:1.6.6-5
I: Retrieving dash 0.5.7-4+b1
I: Validating dash 0.5.7-4+b1
I: Retrieving libdb5.3 5.3.28-9
I: Validating libdb5.3 5.3.28-9
I: Retrieving debconf 1.5.56
I: Validating debconf 1.5.56
I: Retrieving debconf-i18n 1.5.56
I: Validating debconf-i18n 1.5.56
I: Retrieving debian-archive-keyring 2014.3
I: Validating debian-archive-keyring 2014.3
I: Retrieving debianutils 4.4+b1
I: Validating debianutils 4.4+b1
I: Retrieving diffutils 1:3.3-1+b1
I: Validating diffutils 1:3.3-1+b1
I: Retrieving dpkg 1.17.25
I: Validating dpkg 1.17.25
I: Retrieving e2fslibs 1.42.12-1.1
I: Validating e2fslibs 1.42.12-1.1
I: Retrieving e2fsprogs 1.42.12-1.1
I: Validating e2fsprogs 1.42.12-1.1
I: Retrieving libcomerr2 1.42.12-1.1
I: Validating libcomerr2 1.42.12-1.1
I: Retrieving libss2 1.42.12-1.1
I: Validating libss2 1.42.12-1.1
I: Retrieving file 1:5.22+15-2
I: Validating file 1:5.22+15-2
I: Retrieving libmagic1 1:5.22+15-2
I: Validating libmagic1 1:5.22+15-2
I: Retrieving findutils 4.4.2-9+b1
I: Validating findutils 4.4.2-9+b1
I: Retrieving gcc-4.8-base 4.8.4-1
I: Validating gcc-4.8-base 4.8.4-1
I: Retrieving gcc-4.9-base 4.9.2-10
I: Validating gcc-4.9-base 4.9.2-10
I: Retrieving libgcc1 1:4.9.2-10
I: Validating libgcc1 1:4.9.2-10
I: Retrieving libstdc++6 4.9.2-10
I: Validating libstdc++6 4.9.2-10
I: Retrieving libgdbm3 1.8.3-13.1
I: Validating libgdbm3 1.8.3-13.1
I: Retrieving libc-bin 2.19-18+deb8u1
I: Validating libc-bin 2.19-18+deb8u1
I: Retrieving libc6 2.19-18+deb8u1
I: Validating libc6 2.19-18+deb8u1
I: Retrieving multiarch-support 2.19-18+deb8u1
I: Validating multiarch-support 2.19-18+deb8u1
I: Retrieving libgmp10 2:6.0.0+dfsg-6
I: Validating libgmp10 2:6.0.0+dfsg-6
I: Retrieving gnupg 1.4.18-7
I: Validating gnupg 1.4.18-7
I: Retrieving gpgv 1.4.18-7
I: Validating gpgv 1.4.18-7
I: Retrieving libgnutls-deb0-28 3.3.8-6+deb8u3
I: Validating libgnutls-deb0-28 3.3.8-6+deb8u3
I: Retrieving libgnutls-openssl27 3.3.8-6+deb8u3
I: Validating libgnutls-openssl27 3.3.8-6+deb8u3
I: Retrieving grep 2.20-4.1
I: Validating grep 2.20-4.1
I: Retrieving groff-base 1.22.2-8
I: Validating groff-base 1.22.2-8
I: Retrieving gzip 1.6-4
I: Validating gzip 1.6-4
I: Retrieving hostname 3.15
I: Validating hostname 3.15
I: Retrieving libicu52 52.1-8+deb8u2
I: Validating libicu52 52.1-8+deb8u2
I: Retrieving ifupdown 0.7.53.1
I: Validating ifupdown 0.7.53.1
I: Retrieving init 1.22
I: Validating init 1.22
I: Retrieving init-system-helpers 1.22
I: Validating init-system-helpers 1.22
I: Retrieving initramfs-tools 0.120
I: Validating initramfs-tools 0.120
I: Retrieving insserv 1.14.0-5
I: Validating insserv 1.14.0-5
I: Retrieving iproute2 3.16.0-2
I: Validating iproute2 3.16.0-2
I: Retrieving iptables 1.4.21-2+b1
I: Validating iptables 1.4.21-2+b1
I: Retrieving libxtables10 1.4.21-2+b1
I: Validating libxtables10 1.4.21-2+b1
I: Retrieving iputils-ping 3:20121221-5+b2
I: Validating iputils-ping 3:20121221-5+b2
I: Retrieving isc-dhcp-client 4.3.1-6
I: Validating isc-dhcp-client 4.3.1-6
I: Retrieving isc-dhcp-common 4.3.1-6
I: Validating isc-dhcp-common 4.3.1-6
I: Retrieving libjson-c2 0.11-4
I: Validating libjson-c2 0.11-4
I: Retrieving libkeyutils1 1.5.9-5+b1
I: Validating libkeyutils1 1.5.9-5+b1
I: Retrieving klibc-utils 2.0.4-2
I: Validating klibc-utils 2.0.4-2
I: Retrieving libklibc 2.0.4-2
I: Validating libklibc 2.0.4-2
I: Retrieving kmod 18-3
I: Validating kmod 18-3
I: Retrieving libkmod2 18-3
I: Validating libkmod2 18-3
I: Retrieving libgssapi-krb5-2 1.12.1+dfsg-19
I: Validating libgssapi-krb5-2 1.12.1+dfsg-19
I: Retrieving libk5crypto3 1.12.1+dfsg-19
I: Validating libk5crypto3 1.12.1+dfsg-19
I: Retrieving libkrb5-3 1.12.1+dfsg-19
I: Validating libkrb5-3 1.12.1+dfsg-19
I: Retrieving libkrb5support0 1.12.1+dfsg-19
I: Validating libkrb5support0 1.12.1+dfsg-19
I: Retrieving less 458-3
I: Validating less 458-3
I: Retrieving libbsd0 0.7.0-2
I: Validating libbsd0 0.7.0-2
I: Retrieving libcap2 1:2.24-8
I: Validating libcap2 1:2.24-8
I: Retrieving libcap2-bin 1:2.24-8
I: Validating libcap2-bin 1:2.24-8
I: Retrieving libedit2 3.1-20140620-2
I: Validating libedit2 3.1-20140620-2
I: Retrieving libestr0 0.1.9-1.1
I: Validating libestr0 0.1.9-1.1
I: Retrieving libffi6 3.1-2+b2
I: Validating libffi6 3.1-2+b2
I: Retrieving libgcrypt20 1.6.3-2
I: Validating libgcrypt20 1.6.3-2
I: Retrieving libgpg-error0 1.17-3
I: Validating libgpg-error0 1.17-3
I: Retrieving libidn11 1.29-1+b2
I: Validating libidn11 1.29-1+b2
I: Retrieving liblocale-gettext-perl 1.05-8+b1
I: Validating liblocale-gettext-perl 1.05-8+b1
I: Retrieving liblogging-stdlog0 1.0.4-1
I: Validating liblogging-stdlog0 1.0.4-1
I: Retrieving liblognorm1 1.0.1-3
I: Validating liblognorm1 1.0.1-3
I: Retrieving libmnl0 1.0.3-5
I: Validating libmnl0 1.0.3-5
I: Retrieving libnetfilter-acct1 1.0.2-1.1
I: Validating libnetfilter-acct1 1.0.2-1.1
I: Retrieving libnfnetlink0 1.0.1-3
I: Validating libnfnetlink0 1.0.1-3
I: Retrieving libpipeline1 1.4.0-1
I: Validating libpipeline1 1.4.0-1
I: Retrieving libpsl0 0.5.1-1
I: Validating libpsl0 0.5.1-1
I: Retrieving libselinux1 2.3-2
I: Validating libselinux1 2.3-2
I: Retrieving libsemanage-common 2.3-1
I: Validating libsemanage-common 2.3-1
I: Retrieving libsemanage1 2.3-1+b1
I: Validating libsemanage1 2.3-1+b1
I: Retrieving libsepol1 2.3-2
I: Validating libsepol1 2.3-2
I: Retrieving libsigc++-2.0-0c2a 2.4.0-1
I: Validating libsigc++-2.0-0c2a 2.4.0-1
I: Retrieving libtasn1-6 4.2-3+deb8u1
I: Validating libtasn1-6 4.2-3+deb8u1
I: Retrieving libtext-charwidth-perl 0.04-7+b3
I: Validating libtext-charwidth-perl 0.04-7+b3
I: Retrieving libtext-iconv-perl 1.7-5+b2
I: Validating libtext-iconv-perl 1.7-5+b2
I: Retrieving libtext-wrapi18n-perl 0.06-7
I: Validating libtext-wrapi18n-perl 0.06-7
I: Retrieving libusb-0.1-4 2:0.1.12-25
I: Validating libusb-0.1-4 2:0.1.12-25
I: Retrieving logrotate 3.8.7-1+b1
I: Validating logrotate 3.8.7-1+b1
I: Retrieving lsb-base 4.1+Debian13+nmu1
I: Validating lsb-base 4.1+Debian13+nmu1
I: Retrieving dmsetup 2:1.02.90-2.2
I: Validating dmsetup 2:1.02.90-2.2
I: Retrieving libdevmapper1.02.1 2:1.02.90-2.2
I: Validating libdevmapper1.02.1 2:1.02.90-2.2
I: Retrieving man-db 2.7.0.2-5
I: Validating man-db 2.7.0.2-5
I: Retrieving manpages 3.74-1
I: Validating manpages 3.74-1
I: Retrieving mawk 1.3.3-17
I: Validating mawk 1.3.3-17
I: Retrieving mdadm 3.3.2-5
I: Validating mdadm 3.3.2-5
I: Retrieving nano 2.2.6-3
I: Validating nano 2.2.6-3
I: Retrieving libncurses5 5.9+20140913-1+b1
I: Validating libncurses5 5.9+20140913-1+b1
I: Retrieving libncursesw5 5.9+20140913-1+b1
I: Validating libncursesw5 5.9+20140913-1+b1
I: Retrieving libtinfo5 5.9+20140913-1+b1
I: Validating libtinfo5 5.9+20140913-1+b1
I: Retrieving ncurses-base 5.9+20140913-1
I: Validating ncurses-base 5.9+20140913-1
I: Retrieving ncurses-bin 5.9+20140913-1+b1
I: Validating ncurses-bin 5.9+20140913-1+b1
I: Retrieving net-tools 1.60-26+b1
I: Validating net-tools 1.60-26+b1
I: Retrieving netbase 5.3
I: Validating netbase 5.3
I: Retrieving netcat-traditional 1.10-41
I: Validating netcat-traditional 1.10-41
I: Retrieving libhogweed2 2.7.1-5
I: Validating libhogweed2 2.7.1-5
I: Retrieving libnettle4 2.7.1-5
I: Validating libnettle4 2.7.1-5
I: Retrieving libnewt0.52 0.52.17-1+b1
I: Validating libnewt0.52 0.52.17-1+b1
I: Retrieving whiptail 0.52.17-1+b1
I: Validating whiptail 0.52.17-1+b1
I: Retrieving nfacct 1.0.1-1.1
I: Validating nfacct 1.0.1-1.1
I: Retrieving openssh-client 1:6.7p1-5
I: Validating openssh-client 1:6.7p1-5
I: Retrieving openssh-server 1:6.7p1-5
I: Validating openssh-server 1:6.7p1-5
I: Retrieving openssh-sftp-server 1:6.7p1-5
I: Validating openssh-sftp-server 1:6.7p1-5
I: Retrieving ssh 1:6.7p1-5
I: Validating ssh 1:6.7p1-5
I: Retrieving libssl1.0.0 1.0.1k-3+deb8u1
I: Validating libssl1.0.0 1.0.1k-3+deb8u1
I: Retrieving libp11-kit0 0.20.7-1
I: Validating libp11-kit0 0.20.7-1
I: Retrieving libpam-modules 1.1.8-3.1
I: Validating libpam-modules 1.1.8-3.1
I: Retrieving libpam-modules-bin 1.1.8-3.1
I: Validating libpam-modules-bin 1.1.8-3.1
I: Retrieving libpam-runtime 1.1.8-3.1
I: Validating libpam-runtime 1.1.8-3.1
I: Retrieving libpam0g 1.1.8-3.1
I: Validating libpam0g 1.1.8-3.1
I: Retrieving libpcre3 2:8.35-3.3
I: Validating libpcre3 2:8.35-3.3
I: Retrieving perl-base 5.20.2-3+deb8u1
I: Validating perl-base 5.20.2-3+deb8u1
I: Retrieving libpopt0 1.16-10
I: Validating libpopt0 1.16-10
I: Retrieving libprocps3 2:3.3.9-9
I: Validating libprocps3 2:3.3.9-9
I: Retrieving procps 2:3.3.9-9
I: Validating procps 2:3.3.9-9
I: Retrieving pv 1.5.7-2
I: Validating pv 1.5.7-2
I: Retrieving libreadline6 6.3-8+b3
I: Validating libreadline6 6.3-8+b3
I: Retrieving readline-common 6.3-8
I: Validating readline-common 6.3-8
I: Retrieving rsyslog 8.4.2-1+deb8u1
I: Validating rsyslog 8.4.2-1+deb8u1
I: Retrieving sed 4.2.2-4+b1
I: Validating sed 4.2.2-4+b1
I: Retrieving sensible-utils 0.0.9
I: Validating sensible-utils 0.0.9
I: Retrieving login 1:4.2-3
I: Validating login 1:4.2-3
I: Retrieving passwd 1:4.2-3
I: Validating passwd 1:4.2-3
I: Retrieving libslang2 2.3.0-2
I: Validating libslang2 2.3.0-2
I: Retrieving startpar 0.59-3
I: Validating startpar 0.59-3
I: Retrieving libsystemd0 215-17+deb8u2
I: Validating libsystemd0 215-17+deb8u2
I: Retrieving libudev1 215-17+deb8u2
I: Validating libudev1 215-17+deb8u2
I: Retrieving systemd 215-17+deb8u2
I: Validating systemd 215-17+deb8u2
I: Retrieving systemd-sysv 215-17+deb8u2
I: Validating systemd-sysv 215-17+deb8u2
I: Retrieving udev 215-17+deb8u2
I: Validating udev 215-17+deb8u2
I: Retrieving initscripts 2.88dsf-59
I: Validating initscripts 2.88dsf-59
I: Retrieving sysv-rc 2.88dsf-59
I: Validating sysv-rc 2.88dsf-59
I: Retrieving sysvinit-utils 2.88dsf-59
I: Validating sysvinit-utils 2.88dsf-59
I: Retrieving tar 1.27.1-2+b1
I: Validating tar 1.27.1-2+b1
I: Retrieving tasksel 3.31+deb8u1
I: Validating tasksel 3.31+deb8u1
I: Retrieving tasksel-data 3.31+deb8u1
I: Validating tasksel-data 3.31+deb8u1
I: Retrieving libwrap0 7.6.q-25
I: Validating libwrap0 7.6.q-25
I: Retrieving traceroute 1:2.0.20-2+b1
I: Validating traceroute 1:2.0.20-2+b1
I: Retrieving tzdata 2015f-0+deb8u1
I: Validating tzdata 2015f-0+deb8u1
I: Retrieving libustr-1.0-1 1.0.4-3+b2
I: Validating libustr-1.0-1 1.0.4-3+b2
I: Retrieving bsdutils 1:2.25.2-6
I: Validating bsdutils 1:2.25.2-6
I: Retrieving libblkid1 2.25.2-6
I: Validating libblkid1 2.25.2-6
I: Retrieving libmount1 2.25.2-6
I: Validating libmount1 2.25.2-6
I: Retrieving libsmartcols1 2.25.2-6
I: Validating libsmartcols1 2.25.2-6
I: Retrieving libuuid1 2.25.2-6
I: Validating libuuid1 2.25.2-6
I: Retrieving mount 2.25.2-6
I: Validating mount 2.25.2-6
I: Retrieving util-linux 2.25.2-6
I: Validating util-linux 2.25.2-6
I: Retrieving vim-common 2:7.4.488-7
I: Validating vim-common 2:7.4.488-7
I: Retrieving vim-tiny 2:7.4.488-7
I: Validating vim-tiny 2:7.4.488-7
I: Retrieving wget 1.16-1
I: Validating wget 1.16-1
I: Retrieving liblzma5 5.1.1alpha+20120614-2+b3
I: Validating liblzma5 5.1.1alpha+20120614-2+b3
I: Retrieving zlib1g 1:1.2.8.dfsg-2+b1
I: Validating zlib1g 1:1.2.8.dfsg-2+b1
I: Chosen extractor for .deb packages: dpkg-deb
I: Extracting acl...
I: Extracting libacl1...
I: Extracting adduser...
I: Extracting libattr1...
I: Extracting libaudit-common...
I: Extracting libaudit1...
I: Extracting base-files...
I: Extracting base-passwd...
I: Extracting bash...
I: Extracting libbz2-1.0...
I: Extracting libdebconfclient0...
I: Extracting coreutils...
I: Extracting libcryptsetup4...
I: Extracting dash...
I: Extracting libdb5.3...
I: Extracting debconf...
I: Extracting debconf-i18n...
I: Extracting debianutils...
I: Extracting diffutils...
I: Extracting dpkg...
I: Extracting e2fslibs...
I: Extracting e2fsprogs...
I: Extracting libcomerr2...
I: Extracting libss2...
I: Extracting findutils...
I: Extracting gcc-4.8-base...
I: Extracting gcc-4.9-base...
I: Extracting libgcc1...
I: Extracting libc-bin...
I: Extracting libc6...
I: Extracting multiarch-support...
I: Extracting grep...
I: Extracting gzip...
I: Extracting hostname...
I: Extracting init...
I: Extracting insserv...
I: Extracting libkmod2...
I: Extracting libcap2...
I: Extracting libcap2-bin...
I: Extracting libgcrypt20...
I: Extracting libgpg-error0...
I: Extracting liblocale-gettext-perl...
I: Extracting libselinux1...
I: Extracting libsemanage-common...
I: Extracting libsemanage1...
I: Extracting libsepol1...
I: Extracting libtext-charwidth-perl...
I: Extracting libtext-iconv-perl...
I: Extracting libtext-wrapi18n-perl...
I: Extracting lsb-base...
I: Extracting dmsetup...
I: Extracting libdevmapper1.02.1...
I: Extracting mawk...
I: Extracting libncurses5...
I: Extracting libncursesw5...
I: Extracting libtinfo5...
I: Extracting ncurses-base...
I: Extracting ncurses-bin...
I: Extracting libpam-modules...
I: Extracting libpam-modules-bin...
I: Extracting libpam-runtime...
I: Extracting libpam0g...
I: Extracting libpcre3...
I: Extracting perl-base...
I: Extracting libprocps3...
I: Extracting procps...
I: Extracting sed...
I: Extracting sensible-utils...
I: Extracting login...
I: Extracting passwd...
I: Extracting libslang2...
I: Extracting startpar...
I: Extracting libsystemd0...
I: Extracting libudev1...
I: Extracting systemd...
I: Extracting systemd-sysv...
I: Extracting udev...
I: Extracting initscripts...
I: Extracting sysv-rc...
I: Extracting sysvinit-utils...
I: Extracting tar...
I: Extracting tzdata...
I: Extracting libustr-1.0-1...
I: Extracting bsdutils...
I: Extracting libblkid1...
I: Extracting libmount1...
I: Extracting libsmartcols1...
I: Extracting libuuid1...
I: Extracting mount...
I: Extracting util-linux...
I: Extracting liblzma5...
I: Extracting zlib1g...
thomas@diamond ~ $
```

Create a tar of the entire chroot, at 176M we could almost tftp the lot on newer
larger ram'ed machines:

```#!bash
thomas@diamond ~ $ sudo tar cf /srv/store/sharespace/jessie-armel.tar -C /srv/store/sharespace jessie-armel
thomas@diamond ~ $
thomas@diamond ~ $ ls -lah /srv/store/sharespace/jessie-armel.tar
-rw-r--r-- 1 root root 176M Oct 14 21:07 /srv/store/sharespace/jessie-armel.tar
thomas@diamond ~ $
```

## Build images

Chroot back in as root to create the kernel. First we create some magic bytes to
prepend to the image, something related to the hardware (Thanks again David
Hicks). Then we use the mkimage tool to create a Linux image that u-boot will
load:

```#!bash
thomas@diamond ~ $ sudo chroot /srv/store/sharespace/jessie-x86_64
root@diamond:/# devio 'wl 0xe3a01c0c,4' 'wl 0xe3811044,4' > /boot/vmlinuz.magic
root@diamond:/#
root@diamond:/# cat /boot/vmlinuz.magic /boot/vmlinuz-3.10.0+ > /boot/vmlinuz-3.10.0+.withmagic
root@diamond:/#
root@diamond:/# mkimage -A arm -O linux -T kernel -C none -a 0x00008000 -e 0x00008000 -n "SharespaceKImage" -d /boot/vmlinuz-3.10.0+.withmagic /boot/uImage
Image Name:   SharespaceKImage
Created:      Tue Oct 13 15:17:20 2015
Image Type:   ARM Linux Kernel Image (uncompressed)
Data Size:    1499600 Bytes = 1464.45 kB = 1.43 MB
Load Address: 00008000
Entry Point:  00008000
root@diamond:/#
```

Create an initial ram disk structure. Thanks Gentoo!
https://wiki.gentoo.org/wiki/Custom_Initramfs

```#!bash
root@diamond:/# mkdir -p /boot/initramfs/{bin,dev,etc,lib/arm-linux-gnueabi,lib/modules,mnt/root,proc,sbin,sys}
root@diamond:/# cp -a /dev/{null,console,tty} /boot/initramfs/dev/
root@diamond:/# mknod /boot/initramfs/dev/sda  b 8 0
root@diamond:/# mknod /boot/initramfs/dev/sda1 b 8 1
root@diamond:/# mknod /boot/initramfs/dev/sda2 b 8 2
root@diamond:/# mknod /boot/initramfs/dev/sda3 b 8 3
root@diamond:/# mknod /boot/initramfs/dev/sda4 b 8 4
root@diamond:/# mknod /boot/initramfs/dev/sdb  b 8 16
root@diamond:/# mknod /boot/initramfs/dev/sdb1 b 8 17
root@diamond:/# mknod /boot/initramfs/dev/sdb2 b 8 18
root@diamond:/# mknod /boot/initramfs/dev/sdb3 b 8 19
root@diamond:/# mknod /boot/initramfs/dev/sdb4 b 8 20
root@diamond:/# mknod /boot/initramfs/dev/sdc  b 8 32
root@diamond:/# mknod /boot/initramfs/dev/sdc1 b 8 33
root@diamond:/# mknod /boot/initramfs/dev/sdc2 b 8 34
root@diamond:/# mknod /boot/initramfs/dev/sdc3 b 8 35
root@diamond:/# mknod /boot/initramfs/dev/sdc4 b 8 36
root@diamond:/# mknod /boot/initramfs/dev/sdd  b 8 48
root@diamond:/# mknod /boot/initramfs/dev/sdd1 b 8 49
root@diamond:/# mknod /boot/initramfs/dev/sdd2 b 8 50
root@diamond:/# mknod /boot/initramfs/dev/sdd3 b 8 51
root@diamond:/# mknod /boot/initramfs/dev/sdd4 b 8 52
root@diamond:/#
root@diamond:/# cp /bin/busybox /boot/initramfs/bin
root@diamond:/# cd /boot/initramfs/bin
root@diamond:/boot/initramfs/bin# ln -s busybox mount
root@diamond:/boot/initramfs/bin# ln -s busybox sh
root@diamond:/boot/initramfs/bin# cd
root@diamond:/#
root@diamond:/# cp -a /lib/modules/3.10.0+ /boot/initramfs/lib/modules
root@diamond:/# echo "/lib/arm-linux-gnueabi"> /boot/initramfs/etc/ld.so.conf
```

Create a very basic /init script, note it will not switch_root or pivot_root. We
land with some networking and the ability to see disks if we are lucky:

```#!bash
root@diamond:/# cat << EOF > /boot/initramfs/init
> #!/bin/busybox sh
> set -x
> mount -t proc none /proc
> mount -t sysfs none /sys
> modprobe
> modprobe mv643xx_eth
> modprobe mvmdio
> ip link set eth0 up
> ip addr add 192.168.1.10/24 dev eth0
> ip route add default via 192.168.1.254 dev eth0
> modprobe libata
> modprobe sata_mv
> modprobe sd_mod
> modprobe ext2
> modprobe ext3
> modprobe ext4
> echo "exec /sbin/switch_root /mnt/root /sbin/init"
> exec sh
> EOF
root@diamond:/# chmod +x /boot/initramfs/init
root@diamond:/#
root@diamond:~# exit
exit
thomas@diamond ~ $
```

Exit the chroot and copy some useful bits (like a system linker!) from the armel
chroot into the ramdisk:

```#!bash
thomas@diamond ~ $ sudo cp -a /srv/store/sharespace/jessie-armel/lib/ld-linux.so.3 /srv/store/sharespace/jessie-x86_64/boot/initramfs/lib
thomas@diamond ~ $ sudo cp -a /srv/store/sharespace/jessie-armel/lib/arm-linux-gnueabi/l* /srv/store/sharespace/jessie-x86_64/boot/initramfs/lib/arm-linux-gnueabi/
thomas@diamond ~ $ sudo cp -a /srv/store/sharespace/jessie-armel/sbin/switch_root /srv/store/sharespace/jessie-armel/sbin/fdisk /srv/store/sharespace/jessie-armel/sbin/mk* /srv/store/sharespace/jessie-x86_64/boot/initramfs/sbin/
```

Back into the chroot as root and create the cpio.gz file that will be the
initrd. Again the mkimage tool needs to bless the image:

```#!bash
thomas@diamond ~ $ sudo chroot /srv/store/sharespace/jessie-x86_64
root@diamond:/# cd /boot/initramfs
root@diamond:/boot/initramfs# find . -print0 | cpio --null -o --format=newc | gzip > /boot/initrd.img-3.10.0+
140700 blocks
root@diamond:/boot/initramfs# mkimage -A arm -O linux -T ramdisk -C gzip -a 0x0 -e 0x0 -n "SharespaceInitrd" -d /boot/initrd.img-3.10.0+ /boot/uInitrd
Image Name:   SharespaceInitrd
Created:      Wed Oct 14 20:31:57 2015
Image Type:   ARM Linux RAMDisk Image (gzip compressed)
Data Size:    26486373 Bytes = 25865.60 kB = 25.26 MB
Load Address: 00000000
Entry Point:  00000000
root@diamond:/boot/initramfs#
```

## Copy Images

Copy images to tftp server:

```
thomas@diamond ~ $ scp /srv/store/sharespace/jessie-x86_64/boot/u* jasper:/srv/tftp
uImage                                                    100% 1465KB   1.4MB/s   00:00
uInitrd                                                   100%   25MB  12.6MB/s   00:02
thomas@diamond ~ $
```

## Serial

It's 3v line level, so there both worked for me:
http://www.ftdichip.com/Products/Cables/USBTTLSerial.htm and
http://www.ftdichip.com/Products/Cables/RPi.htm

See here for the pinout:
http://westerndigital.nas-central.org/wiki/Category:ShareSpace#Serial_Access

Setup minicom:

```
thomas@diamond ~ $ cat /etc/minicom/minirc.wd
# Machine-generated file - use "minicom -s" to change parameters.
pu port             /dev/ttyUSB0
pu baudrate         115200
pu bits             8
pu parity           N
pu stopbits         1
pu rtscts           No
thomas@diamond ~ $
```

Run minicom:

```
thomas@diamond ~ $ mincom wd
```

## Booting

Switch on the Sharespace an interrupt the boot my pressing any key to get to the
Marvell uboot prompt:

```
         __  __                      _ _
        |  \/  | __ _ _ ____   _____| | |
        | |\/| |/ _` | '__\ \ / / _ \ | |
        | |  | | (_| | |   \ V /  __/ | |
        |_|  |_|\__,_|_|    \_/ \___|_|_|
 _   _     ____              _
| | | |   | __ )  ___   ___ | |_
| | | |___|  _ \ / _ \ / _ \| __|
| |_| |___| |_) | (_) | (_) | |_
 \___/    |____/ \___/ \___/ \__|  ** Forcing LOADER mode only **
 ** MARVELL BOARD: DB-88F5X81-DDR2-A/B LE

U-Boot 1.1.4 (Aug  4 2008 - 09:35:54) Marvell version: 2.3.23

U-Boot code: 00200000 -> 0026FFF0  BSS: -> 0027AD18

Soc: 88F5281 D0 (DDR2)
CPU running @ 500Mhz
SysClock = 166Mhz , TClock = 166Mhz

DRAM CS[0] base 0x00000000   size 128MB
DRAM Total size 128MB  32bit width
[16384kB@ff000000] Flash: 16 MB
Addresses 4M - 0M are saved for the U-Boot usage.
Mem malloc Initialization (4M - 3M): Done

CPU : ARM926 (Rev 0)
Streaming disabled
VFP initialized to Run Fast Mode.
USB 0: host mode
PCI 0: PCI Express Root Complex Interface
CPU: Write allocate enabled
Net:   egiga0 [PRIME]
Hit any key to stop autoboot:  0
Marvell>>
```

Setup env for booting manually, set server ip, reset the ide, copy images to
ram, set some paramaters for the kernel:

```
Marvell>> setenv serverip 192.168.1.252
Marvell>> setenv bootargs console=ttyS0,115200
Marvell>>
Marvell>> ide reset

Reset IDE:
Marvell Serial ATA Adapter
Found adapter at bus 0, device 1 ... Scanning channels
  Device 0: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEMXAY
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 1: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEG2XA
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 2: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEMBH2
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 3: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEE8ZG
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)

Marvell>> tftpboot 0x800000 uImage
Using egiga0 device
TFTP from server 192.168.1.252; our IP address is 192.168.1.2
Filename 'uImage'.
Load address: 0x800000
Loading: #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################
done
Bytes transferred = 1499664 (16e210 hex)
Marvell>> tftpboot 0x01100000 uInitrd
Using egiga0 device
TFTP from server 192.168.1.252; our IP address is 192.168.1.2
Filename 'uInitrd'.
Load address: 0x1100000
Loading: #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #######################################
done
Bytes transferred = 26486437 (19426a5 hex)
Marvell>>
```

Boot from memory:

```
Marvell>> bootm 0x800000 0x01100000
## Booting image at 00800000 ...
   Image Name:   SharespaceKImage
   Created:      2015-10-13  15:17:20 UTC
   Image Type:   ARM Linux Kernel Image (uncompressed)
   Data Size:    1499600 Bytes =  1.4 MB
   Load Address: 00008000
   Entry Point:  00008000
   Verifying Checksum ... OK
OK
## Loading Ramdisk Image at 01100000 ...
   Image Name:   SharespaceInitrd
   Created:      2015-10-14  20:31:57 UTC
   Image Type:   ARM Linux RAMDisk Image (gzip compressed)
   Data Size:    26486373 Bytes = 25.3 MB
   Load Address: 00000000
   Entry Point:  00000000
   Verifying Checksum ... OK

Starting kernel ...

Uncompressing Linux... done, booting the kernel.
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Initializing cgroup subsys cpuset
[    0.000000] Initializing cgroup subsys cpu
[    0.000000] Initializing cgroup subsys cpuacct
[    0.000000] Linux version 3.10.0+ (thomas@diamond) (gcc version 4.9.2 ( 4.9.2-10) ) #2 Tue Oct 13 14:50:33 UTC 2015
[    0.000000] CPU: Feroceon [41069260] revision 0 (ARMv5TEJ), cr=00053177
[    0.000000] CPU: VIVT data cache, VIVT instruction cache
[    0.000000] Machine: WD Sharespace
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x41000403
[    0.000000] Memory policy: ECC disabled, Data cache writeback
[    0.000000] Built 1 zonelists in Zone order, mobility grouping on.  Total pages: 32512
[    0.000000] Kernel command line: root=/dev/mtdblock2 console=ttyS0,115200 init=/etc/rc.preroot
[    0.000000] PID hash table entries: 512 (order: -1, 2048 bytes)
[    0.000000] Dentry cache hash table entries: 16384 (order: 4, 65536 bytes)
[    0.000000] Inode-cache hash table entries: 8192 (order: 3, 32768 bytes)
[    0.000000] allocated 262144 bytes of page_cgroup
[    0.000000] please try 'cgroup_disable=memory' option if you don't want memory cgroups
[    0.000000] Memory: 128MB = 128MB total
[    0.000000] Memory: 99448k/99448k available, 31624k reserved, 0K highmem
[    0.000000] Virtual kernel memory layout:
[    0.000000]     vector  : 0xffff0000 - 0xffff1000   (   4 kB)
[    0.000000]     fixmap  : 0xfff00000 - 0xfffe0000   ( 896 kB)
[    0.000000]     vmalloc : 0xc8800000 - 0xff000000   ( 872 MB)
[    0.000000]     lowmem  : 0xc0000000 - 0xc8000000   ( 128 MB)
[    0.000000]     modules : 0xbf000000 - 0xc0000000   (  16 MB)
[    0.000000]       .text : 0xc0008000 - 0xc03985ec   (3650 kB)
[    0.000000]       .init : 0xc0399000 - 0xc03bb1a4   ( 137 kB)
[    0.000000]       .data : 0xc03bc000 - 0xc03fb8e0   ( 255 kB)
[    0.000000]        .bss : 0xc03fb8e0 - 0xc043b710   ( 256 kB)
[    0.000000] NR_IRQS:64
[    0.000000] sched_clock: 32 bits at 166MHz, resolution 5ns, wraps every 25769ms
[    0.000000] Console: colour dummy device 80x30
[   10.201318] Calibrating delay loop... 498.89 BogoMIPS (lpj=2494464)
[   10.261035] pid_max: default: 32768 minimum: 301
[   10.261201] Security Framework initialized
[   10.261286] Mount-cache hash table entries: 512
[   10.262302] Initializing cgroup subsys memory
[   10.262421] Initializing cgroup subsys devices
[   10.262443] Initializing cgroup subsys freezer
[   10.262460] Initializing cgroup subsys net_cls
[   10.262478] Initializing cgroup subsys blkio
[   10.262495] Initializing cgroup subsys perf_event
[   10.262651] CPU: Testing write buffer coherency: ok
[   10.263321] Setting up static identity map for 0xc028f6b8 - 0xc028f6f4
[   10.265238] devtmpfs: initialized
[   10.267703] regulator-dummy: no parameters
[   10.268106] NET: Registered protocol family 16
[   10.269870] DMA: preallocated 256 KiB pool for atomic coherent allocations
[   10.270793] Orion ID: MV88F5281-D0. TCLK=166666667.
[   10.270860] Orion: Applying 5281 D0 WFI workaround.
[   10.272754] PCI host bridge to bus 0000:00
[   10.272791] pci_bus 0000:00: root bus resource [mem 0xe0000000-0xe7ffffff]
[   10.272818] pci_bus 0000:00: root bus resource [io  0x1000-0xffff]
[   10.272843] pci_bus 0000:00: No busn resource found for root bus, will use [bus 00-ff]
[   10.273760] PCI: bus0: Fast back to back transfers disabled
[   10.273853] pci 0000:00:01.0: BAR 0: assigned [mem 0xe0000000-0xe00fffff 64bit]
[   10.273894] pci 0000:00:01.0: BAR 2: assigned [io  0x1000-0x10ff]
[   10.277418] bio: create slab <bio-0> at 0
[   10.279467] Switching to clocksource orion_clocksource
[   10.298778] NET: Registered protocol family 2
[   10.299907] TCP established hash table entries: 1024 (order: 1, 8192 bytes)
[   10.299983] TCP bind hash table entries: 1024 (order: 0, 4096 bytes)
[   10.300030] TCP: Hash tables configured (established 1024 bind 1024)
[   10.300261] TCP: reno registered
[   10.300288] UDP hash table entries: 256 (order: 0, 4096 bytes)
[   10.300334] UDP-Lite hash table entries: 256 (order: 0, 4096 bytes)
[   10.300734] NET: Registered protocol family 1
[   10.301164] Unpacking initramfs...
[   17.080003] Freeing initrd memory: 25860K (c1101000 - c2a42000)
[   17.081189] audit: initializing netlink socket (disabled)
[   17.081256] type=2000 audit(6.870:1): initialized
[   17.082546] VFS: Disk quotas dquot_6.5.2
[   17.082632] Dquot-cache hash table entries: 1024 (order 0, 4096 bytes)
[   17.082903] msgmni has been set to 244
[   17.084377] alg: No test for stdrng (krng)
[   17.084539] Block layer SCSI generic (bsg) driver version 0.4 loaded (major 252)
[   17.084816] io scheduler noop registered
[   17.084838] io scheduler deadline registered
[   17.084881] io scheduler cfq registered (default)
[   17.085435] Serial: 8250/16550 driver, 2 ports, IRQ sharing disabled
[   17.106884] serial8250.0: ttyS0 at MMIO 0xf1012000 (irq = 3) is a 16550A
[   17.571348] console [ttyS0] enabled
[   17.595654] serial8250.1: ttyS1 at MMIO 0xf1012100 (irq = 4) is a 16550A
[   17.603801] physmap platform flash device: 01000000 at ff000000
[   17.610093] physmap-flash.0: Found 1 x16 devices at 0x0 in 8-bit bank. Manufacturer ID 0x000001 Chip ID 0x002101
[   17.620293] Amd/Fujitsu Extended Query Table at 0x0040
[   17.625422]   Amd/Fujitsu Extended Query version 1.3.
[   17.630487] number of CFI chips: 1
[   17.634833] Creating 5 MTD partitions on "physmap-flash.0":
[   17.640454] 0x000000ca0000-0x000000cc0000 : "U-Boot environment"
[   17.648164] 0x000000e80000-0x000000f80000 : "Pre-RootFS"
[   17.655205] 0x000000cc0000-0x000000e80000 : "Kernel"
[   17.661842] 0x000000000000-0x000000ca0000 : "Full RootFS"
[   17.668843] 0x000000f80000-0x000001000000 : "U-Boot"
[   17.676431] mousedev: PS/2 mouse device common for all mice
[   17.682457] i2c /dev entries driver
[   17.686794] rtc-pcf8563 0-0051: chip found, driver version 0.4.3
[   17.694719] rtc-pcf8563 0-0051: rtc core: registered rtc-pcf8563 as rtc0
[   17.702116] TCP: cubic registered
[   17.705432] NET: Registered protocol family 17
[   17.709986] VFP support v0.3: implementor 41 architecture 1 part 10 variant 9 rev 0
[   17.718504] registered taskstats version 1
[   17.724556] rtc-pcf8563 0-0051: setting system clock to 2015-10-15 08:35:18 UTC (1444898118)
[   17.734177] Freeing unused kernel memory: 136K (c0399000 - c03bb000)
+ mount -t proc none /proc
+ mount -t sysfs none /sys
+ modprobe
+ modprobe mv643xx_eth
[   17.771585] mv643xx_eth: MV-643xx 10/100/1000 ethernet driver version 1.4
[   17.778666] libphy: PHY orion-mdio-mii:08 not found
[   17.783623] platform mv643xx_eth_port.0: Driver mv643xx_eth_port requests probe deferral
+ modprobe mvmdio
[   17.810749] libphy: orion_mdio_bus: probed
[   17.816660] mv643xx_eth_port mv643xx_eth_port.0 eth0: port 0 with MAC address 00:90:a9:5e:36:99
+ ip link set eth0 up
+ ip addr add 192.168.1.10/24 dev eth0
+ ip route add default via 192.168.1.254 dev eth0
+ modprobe libata
[   17.886844] SCSI subsystem initialized
+ modprobe sata_mv
[   17.940058] sata_mv 0000:00:01.0: Gen-IIE 32 slots 4 ports SCSI mode IRQ via INTx
[   17.961799] scsi0 : sata_mv
[   17.965210] scsi1 : sata_mv
[   17.968584] scsi2 : sata_mv
[   17.972027] scsi3 : sata_mv
[   17.975253] ata1: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0022000 irq 11
[   17.982943] ata2: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0024000 irq 11
[   17.990611] ata3: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0026000 irq 11
[   17.998245] ata4: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0028000 irq 11
[   18.509589] ata1: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   18.589623] ata1.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   18.595269] ata1.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   18.679638] ata1.00: configured for UDMA/133
[   18.684591] scsi 0:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   19.199586] ata2: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   19.259627] ata2.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   19.265276] ata2.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   19.349638] ata2.00: configured for UDMA/133
[   19.354586] scsi 1:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   19.869593] ata3: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   19.949622] ata3.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   19.955275] ata3.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   20.039636] ata3.00: configured for UDMA/133
[   20.044614] scsi 2:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   20.559588] ata4: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   20.639622] ata4.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   20.645273] ata4.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   20.729639] ata4.00: configured for UDMA/133
[   20.734605] scsi 3:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
+ modprobe sd_mod
[   20.775185] sd 0:0:0:0: [sda] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   20.783392] sd 1:0:0:0: [sdb] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   20.791547] sd 2:0:0:0: [sdc] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   20.799842] sd 3:0:0:0: [sdd] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   20.808346] sd 0:0:0:0: [sda] Write Protect is off
[   20.814525] sd 1:0:0:0: [sdb] Write Protect is off
[   20.819912] sd 2:0:0:0: [sdc] Write Protect is off
[   20.825374] sd 3:0:0:0: [sdd] Write Protect is off
[   20.830527] sd 0:0:0:0: [sda] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   20.839771] sd 1:0:0:0: [sdb] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   20.849341] sd 2:0:0:0: [sdc] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   20.858706] sd 3:0:0:0: [sdd] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   20.896594]  sdc: sdc1 sdc2 sdc3 sdc4
[   20.901134]  sda: sda1 sda2 sda3 sda4
[   20.905624]  sdb: sdb1 sdb2 sdb3 sdb4
[   20.909996]  sdd: sdd1
[   20.919401] sd 3:0:0:0: [sdd] Attached SCSI disk
[   20.927484] sd 0:0:0:0: [sda] Attached SCSI disk
[   20.932841] sd 1:0:0:0: [sdb] Attached SCSI disk
[   20.938295] sd 2:0:0:0: [sdc] Attached SCSI disk
+ modprobe ext2
+ modprobe ext3
+ modprobe ext4
+ echo exec /sbin/switch_root /mnt/root /sbin/init
exec /sbin/switch_root /mnt/root /sbin/init
+ exec sh


BusyBox v1.22.1 (Debian 1:1.22.0-9+deb8u1) built-in shell (ash)
Enter 'help' for a list of built-in commands.

sh: can't access tty; job control turned off
/ # [   21.494807] mv643xx_eth_port mv643xx_eth_port.0 eth0: link up, 1000 Mb/s, full duplex, flow control disabled
/ #
```

## Install system

Partition temporary root filesystem:

```
/ # mknod /dev/zero c 1 5
/ # dd if=/dev/zero of=/dev/sdd bs=1M count=10
10+0 records in
10+0 records out
/ # fdisk /dev/sdd
Device contains neither a valid DOS partition table, nor Sun, SGI, OSF or GPT disklabel
Building a new DOS disklabel. Changes will remain in memory only,
until you decide to write them. After that the previous content
won't be recoverable.


The number of cylinders for this disk is set to 19452.
There is nothing wrong with that, but this is larger than 1024,
and could in certain setups cause problems with:
1) software that runs at boot time (e.g., old versions of LILO)
2) booting and partitioning software from other OSs
   (e.g., DOS FDISK, OS/2 FDISK)

Command (m for help): p

Disk /dev/sdd: 160.0 GB, 160000000000 bytes
255 heads, 63 sectors/track, 19452 cylinders
Units = cylinders of 16065 * 512 = 8225280 bytes

   Device Boot      Start         End      Blocks  Id System

Command (m for help): n
Command action
   e   extended
   p   primary partition (1-4)
p
Partition number (1-4): 1
First cylinder (1-19452, default 1):
Using default value 1
Last cylinder or +size or +sizeM or +sizeK (1-19452, default 19452): +1024M

Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table

[  131.952808]  sdd: sdd1
/ #
```

Make and mount temp root filesystem:

```
/ # mkfs.ext4 /dev/sdd1
mke2fs 1.42.12 (29-Aug-2014)
ext2fs_check_if_mount: Can't check if filesystem is mounted due to missing mtab file while determining.
Creating filesystem with 251007 4k blocks and 62848 inodes
Filesystem UUID: 5dd4f9a8-7376-11e5-9202-0090a95e3699
Superblock backups stored on blocks:
        32768, 98304, 163840, 229376

Allocating group tables: done
Writing inode tables: done
Creating journal (4096 blocks): done
Writing superblocks and filesystem accounting information: done


/ # mount -t ext4 /dev/sdd1 /mnt/root
[  231.518123] EXT4-fs (sdd1): mounted filesystem with ordered data mode. Opts: (null)
/ #
```

Copy armel chroot tar from build pc to sharespace via netcat:

```
/ # cd /mnt/root
/mnt/root # ip -4 a show dev eth0
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq qlen 1000
    inet 192.168.1.10/24 scope global eth0
       valid_lft forever preferred_lft forever
/mnt/root # nc -l -p 9999 | tar xf -
```

Meanwhile on the host computer:

```
thomas@diamond ~ $ pv /srv/store/sharespace/jessie-armel.tar | nc 192.168.1.10 9999
 175MiB 0:00:25 [ 6.8MiB/s] [=======================================================>] 100%
thomas@diamond ~ $
```

After which the sharespace returns with:

```
/mnt/root #
```

Copy kernel dev fom build pc to sharespace via netcat:

```
/mnt/root # nc -l -p 9999 > linux-image-3.10.0+-orion5x_1.sharespace_armel.deb
/mnt/root #
```

Meanwhile on the host computer:

```
thomas@diamond ~ $ pv /srv/store/sharespace/jessie-x86_64/home/thomas/linux-image-3.10.0+-orion5x_1.sharespace_armel.deb | nc 192.168.1.10 9999
15.2MiB 0:00:01 [12.9MiB/s] [=======================================================>] 100%
thomas@diamond ~ $
```

Move the files to the root dir:

```
/mnt/root # mv jessie-armel/* .
/mnt/root # rmdir jessie-armel
/mnt/root # cp -a /dev/sd* /mnt/root/dev/
/mnt/root # ls
bin          dev          lib          root         sys          var
boot         etc          lost+found   run          tmp
debootstrap  home         proc         sbin         usr
/mnt/root #
```

Finish the debootstrap:

```
/mnt/root # mount -t proc proc proc
/mnt/root # mount -t sysfs sysfs sys
/mnt/root # chroot /mnt/root
/bin/sh: 0: can't access tty; job control turned off
# ./debootstrap/debootstrap --verbose --second-stage
I: Keyring file not available at /usr/share/keyrings/debian-archive-keyring.gpg; switching to https min
I: Installing core packages...
I: Installing core packages...
I: Unpacking required packages...
I: Unpacking acl...
I: Unpacking libacl1:armel...
I: Unpacking adduser...
I: Unpacking libattr1:armel...
I: Unpacking libaudit-common...
I: Unpacking libaudit1:armel...
I: Unpacking base-files...
I: Unpacking base-passwd...
I: Unpacking bash...
I: Unpacking libbz2-1.0:armel...
I: Unpacking libdebconfclient0:armel...
I: Unpacking coreutils...
I: Unpacking libcryptsetup4:armel...
I: Unpacking dash...
I: Unpacking libdb5.3:armel...
I: Unpacking debconf...
I: Unpacking debconf-i18n...
I: Unpacking debianutils...
I: Unpacking diffutils...
I: Unpacking dpkg...
I: Unpacking e2fslibs:armel...
I: Unpacking e2fsprogs...
I: Unpacking libcomerr2:armel...
I: Unpacking libss2:armel...
I: Unpacking findutils...
I: Unpacking gcc-4.8-base:armel...
I: Unpacking gcc-4.9-base:armel...
I: Unpacking libgcc1:armel...
I: Unpacking libc-bin...
I: Unpacking libc6:armel...
I: Unpacking multiarch-support...
I: Unpacking grep...
I: Unpacking gzip...
I: Unpacking hostname...
I: Unpacking init...
I: Unpacking insserv...
I: Unpacking libkmod2:armel...
I: Unpacking libcap2:armel...
I: Unpacking libcap2-bin...
I: Unpacking libgcrypt20:armel...
I: Unpacking libgpg-error0:armel...
I: Unpacking liblocale-gettext-perl...
I: Unpacking libselinux1:armel...
I: Unpacking libsemanage-common...
I: Unpacking libsemanage1:armel...
I: Unpacking libsepol1:armel...
I: Unpacking libtext-charwidth-perl...
I: Unpacking libtext-iconv-perl...
I: Unpacking libtext-wrapi18n-perl...
I: Unpacking lsb-base...
I: Unpacking dmsetup...
I: Unpacking libdevmapper1.02.1:armel...
I: Unpacking mawk...
I: Unpacking libncurses5:armel...
I: Unpacking libncursesw5:armel...
I: Unpacking libtinfo5:armel...
I: Unpacking ncurses-base...
I: Unpacking ncurses-bin...
I: Unpacking libpam-modules:armel...
I: Unpacking libpam-modules-bin...
I: Unpacking libpam-runtime...
I: Unpacking libpam0g:armel...
I: Unpacking libpcre3:armel...
I: Unpacking perl-base...
I: Unpacking libprocps3:armel...
I: Unpacking procps...
I: Unpacking sed...
I: Unpacking sensible-utils...
I: Unpacking login...
I: Unpacking passwd...
I: Unpacking libslang2:armel...
I: Unpacking startpar...
I: Unpacking libsystemd0:armel...
I: Unpacking libudev1:armel...
I: Unpacking systemd...
I: Unpacking systemd-sysv...
I: Unpacking udev...
I: Unpacking initscripts...
I: Unpacking sysv-rc...
I: Unpacking sysvinit-utils...
I: Unpacking tar...
I: Unpacking tzdata...
I: Unpacking libustr-1.0-1:armel...
I: Unpacking bsdutils...
I: Unpacking libblkid1:armel...
I: Unpacking libmount1:armel...
I: Unpacking libsmartcols1:armel...
I: Unpacking libuuid1:armel...
I: Unpacking mount...
I: Unpacking util-linux...
I: Unpacking liblzma5:armel...
I: Unpacking zlib1g:armel...
I: Configuring required packages...
I: Configuring gcc-4.8-base:armel...
I: Configuring lsb-base...
I: Configuring sensible-utils...
I: Configuring ncurses-base...
I: Configuring libsemanage-common...
I: Configuring gcc-4.9-base:armel...
I: Configuring libaudit-common...
I: Configuring libc6:armel...
I: Configuring startpar...
I: Configuring diffutils...
I: Configuring insserv...
I: Configuring findutils...
I: Configuring debianutils...
I: Configuring hostname...
I: Configuring multiarch-support...
I: Configuring mawk...
I: Configuring libprocps3:armel...
I: Configuring libpcre3:armel...
I: Configuring libbz2-1.0:armel...
I: Configuring libkmod2:armel...
I: Configuring libgpg-error0:armel...
I: Configuring base-files...
I: Configuring libdebconfclient0:armel...
I: Configuring libselinux1:armel...
I: Configuring libcomerr2:armel...
I: Configuring libslang2:armel...
I: Configuring libsepol1:armel...
I: Configuring libgcc1:armel...
I: Configuring libustr-1.0-1:armel...
I: Configuring libsmartcols1:armel...
I: Configuring libaudit1:armel...
I: Configuring libtinfo5:armel...
I: Configuring libudev1:armel...
I: Configuring libattr1:armel...
I: Configuring libss2:armel...
I: Configuring liblzma5:armel...
I: Configuring base-passwd...
I: Configuring e2fslibs:armel...
I: Configuring libgcrypt20:armel...
I: Configuring libncursesw5:armel...
I: Configuring libdb5.3:armel...
I: Configuring zlib1g:armel...
I: Configuring libcap2:armel...
I: Configuring libsystemd0:armel...
I: Configuring libdevmapper1.02.1:armel...
I: Configuring libc-bin...
I: Configuring libsemanage1:armel...
I: Configuring sysvinit-utils...
I: Configuring libacl1:armel...
I: Configuring ncurses-bin...
I: Configuring acl...
I: Configuring libncurses5:armel...
I: Configuring libcap2-bin...
I: Configuring bsdutils...
I: Configuring coreutils...
I: Configuring tar...
I: Configuring dpkg...
I: Configuring sed...
I: Configuring perl-base...
I: Configuring grep...
I: Configuring debconf...
I: Configuring tzdata...
I: Configuring gzip...
I: Configuring dash...
I: Configuring libtext-iconv-perl...
I: Configuring sysv-rc...
I: Configuring liblocale-gettext-perl...
I: Configuring libtext-charwidth-perl...
I: Configuring libpam0g:armel...
I: Configuring initscripts...
I: Configuring libpam-modules-bin...
I: Configuring bash...
I: Configuring procps...
I: Configuring libtext-wrapi18n-perl...
I: Configuring libpam-modules:armel...
I: Configuring libpam-runtime...
I: Configuring debconf-i18n...
I: Configuring passwd...
I: Configuring login...
I: Configuring adduser...
I: Configuring libuuid1:armel...
I: Configuring libblkid1:armel...
I: Configuring libmount1:armel...
I: Configuring util-linux...
I: Configuring libcryptsetup4:armel...
I: Configuring mount...
I: Configuring e2fsprogs...
I: Configuring udev...
I: Configuring systemd...
I: Configuring dmsetup...
I: Configuring systemd-sysv...
I: Configuring init...
I: Configuring libc-bin...
I: Unpacking the base system...
I: Unpacking apt...
I: Unpacking apt-utils...
I: Unpacking libapt-inst1.5:armel...
I: Unpacking libapt-pkg4.12:armel...
I: Unpacking libdns-export100...
I: Unpacking libirs-export91...
I: Unpacking libisc-export95...
I: Unpacking libisccfg-export90...
I: Unpacking libboost-iostreams1.55.0:armel...
I: Unpacking bsdmainutils...
I: Unpacking cpio...
I: Unpacking cron...
I: Unpacking debian-archive-keyring...
I: Unpacking file...
I: Unpacking libmagic1:armel...
I: Unpacking libstdc++6:armel...
I: Unpacking libgdbm3:armel...
I: Unpacking libgmp10:armel...
I: Unpacking gnupg...
I: Unpacking gpgv...
I: Unpacking libgnutls-deb0-28:armel...
I: Unpacking libgnutls-openssl27:armel...
I: Unpacking groff-base...
I: Unpacking libicu52:armel...
I: Unpacking ifupdown...
I: Unpacking init-system-helpers...
I: Unpacking initramfs-tools...
I: Unpacking iproute2...
I: Unpacking iptables...
I: Unpacking libxtables10...
I: Unpacking iputils-ping...
I: Unpacking isc-dhcp-client...
I: Unpacking isc-dhcp-common...
I: Unpacking libjson-c2:armel...
I: Unpacking libkeyutils1:armel...
I: Unpacking klibc-utils...
I: Unpacking libklibc...
I: Unpacking kmod...
I: Unpacking libgssapi-krb5-2:armel...
I: Unpacking libk5crypto3:armel...
I: Unpacking libkrb5-3:armel...
I: Unpacking libkrb5support0:armel...
I: Unpacking less...
I: Unpacking libbsd0:armel...
I: Unpacking libedit2:armel...
I: Unpacking libestr0...
I: Unpacking libffi6:armel...
I: Unpacking libidn11:armel...
I: Unpacking liblogging-stdlog0:armel...
I: Unpacking liblognorm1:armel...
I: Unpacking libmnl0:armel...
I: Unpacking libnetfilter-acct1:armel...
I: Unpacking libnfnetlink0:armel...
I: Unpacking libpipeline1:armel...
I: Unpacking libpsl0:armel...
I: Unpacking libsigc++-2.0-0c2a:armel...
I: Unpacking libtasn1-6:armel...
I: Unpacking libusb-0.1-4:armel...
I: Unpacking logrotate...
I: Unpacking man-db...
I: Unpacking manpages...
I: Unpacking mdadm...
I: Unpacking nano...
I: Unpacking net-tools...
I: Unpacking netbase...
I: Unpacking netcat-traditional...
I: Unpacking libhogweed2:armel...
I: Unpacking libnettle4:armel...
I: Unpacking libnewt0.52:armel...
I: Unpacking whiptail...
I: Unpacking nfacct...
I: Unpacking openssh-client...
I: Unpacking openssh-server...
I: Unpacking openssh-sftp-server...
I: Unpacking ssh...
I: Unpacking libssl1.0.0:armel...
I: Unpacking libp11-kit0:armel...
I: Unpacking libpopt0:armel...
I: Unpacking pv...
I: Unpacking libreadline6:armel...
I: Unpacking readline-common...
I: Unpacking rsyslog...
I: Unpacking tasksel...
I: Unpacking tasksel-data...
I: Unpacking libwrap0:armel...
I: Unpacking traceroute...
I: Unpacking vim-common...
I: Unpacking vim-tiny...
I: Unpacking wget...
I: Configuring the base system...
I: Configuring readline-common...
I: Configuring libgdbm3:armel...
I: Configuring manpages...
I: Configuring libxtables10...
I: Configuring cpio...
I: Configuring libpopt0:armel...
I: Configuring kmod...
I: Configuring libestr0...
I: Configuring less...
I: Configuring pv...
I: Configuring libssl1.0.0:armel...
I: Configuring libklibc...
I: Configuring gpgv...
I: Configuring liblogging-stdlog0:armel...
I: Configuring netcat-traditional...
I: Configuring libpipeline1:armel...
I: Configuring iproute2...
I: Configuring libbsd0:armel...
I: Configuring mdadm...
I: Configuring libtasn1-6:armel...
I: Configuring libmagic1:armel...
I: Configuring nano...
I: Configuring libgmp10:armel...
I: Configuring libisc-export95...
I: Configuring init-system-helpers...
I: Configuring libnettle4:armel...
I: Configuring debian-archive-keyring...
I: Configuring vim-common...
I: Configuring libnfnetlink0:armel...
I: Configuring libstdc++6:armel...
I: Configuring libffi6:armel...
I: Configuring libkeyutils1:armel...
I: Configuring libnewt0.52:armel...
I: Configuring bsdmainutils...
I: Configuring net-tools...
I: Configuring cron...
I: Configuring libmnl0:armel...
I: Configuring libapt-pkg4.12:armel...
I: Configuring libusb-0.1-4:armel...
I: Configuring traceroute...
I: Configuring logrotate...
I: Configuring libidn11:armel...
I: Configuring libreadline6:armel...
I: Configuring libjson-c2:armel...
I: Configuring libwrap0:armel...
I: Configuring libicu52:armel...
I: Configuring netbase...
I: Configuring libedit2:armel...
I: Configuring vim-tiny...
I: Configuring klibc-utils...
I: Configuring libhogweed2:armel...
I: Configuring ifupdown...
I: Configuring libisccfg-export90...
I: Configuring libsigc++-2.0-0c2a:armel...
I: Configuring groff-base...
I: Configuring liblognorm1:armel...
I: Configuring whiptail...
I: Configuring gnupg...
I: Configuring libpsl0:armel...
I: Configuring libboost-iostreams1.55.0:armel...
I: Configuring initramfs-tools...
I: Configuring file...
I: Configuring libdns-export100...
I: Configuring libkrb5support0:armel...
I: Configuring iptables...
I: Configuring libapt-inst1.5:armel...
I: Configuring libp11-kit0:armel...
I: Configuring libgnutls-deb0-28:armel...
I: Configuring wget...
I: Configuring apt...
I: Configuring man-db...
I: Configuring libnetfilter-acct1:armel...
I: Configuring rsyslog...
I: Configuring libk5crypto3:armel...
I: Configuring nfacct...
I: Configuring apt-utils...
I: Configuring libirs-export91...
I: Configuring libgnutls-openssl27:armel...
I: Configuring libkrb5-3:armel...
I: Configuring iputils-ping...
I: Configuring isc-dhcp-common...
I: Configuring isc-dhcp-client...
I: Configuring libgssapi-krb5-2:armel...
I: Configuring openssh-client...
I: Configuring openssh-sftp-server...
I: Configuring openssh-server...
I: Configuring ssh...
I: Configuring tasksel...
I: Configuring tasksel-data...
I: Configuring libc-bin...
I: Configuring systemd...
I: Configuring initramfs-tools...
I: Base system installed successfully.
#
```

Do some basic setup inside the new system, password, new user, hostname, fstab,
networking, install the kernel:

```
# stty erase ^H
# passwd
Enter new UNIX password:
Retype new UNIX password:
passwd: password updated successfully
# adduser thomas
Adding user `thomas' ...
Adding new group `thomas' (1000) ...
Adding new user `thomas' (1000) with group `thomas' ...
Creating home directory `/home/thomas' ...
Copying files from `/etc/skel' ...
Enter new UNIX password:
Retype new UNIX password:
passwd: password updated successfully
Changing the user information for thomas
Enter the new value, or press ENTER for the default
        Full Name []: Thomas Stewart
        Room Number []:
        Work Phone []:
        Home Phone []:
        Other []:
Is the information correct? [Y/n]
#
# echo "sharespace" > /etc/hostname
# echo "/dev/sdd1 / ext3 defaults,noatime,errors=remount-ro 0 1" > /etc/fstab
# cat << EOF > /etc/network/interfaces
> auto lo
> iface lo inet loopback
>
> auto eth0
> iface eth0 inet dhcp
> EOF
#
# dpkg -i linux-image-3.10.0+-orion5x_1.sharespace_armel.deb
Selecting previously unselected package linux-image-3.10.0+-orion5x.
(Reading database ... 10083 files and directories currently installed.)
Preparing to unpack linux-image-3.10.0+-orion5x_1.sharespace_armel.deb ...
Done.
Unpacking linux-image-3.10.0+-orion5x (1.sharespace) ...
Setting up linux-image-3.10.0+-orion5x (1.sharespace) ...

 Hmm. There is a symbolic link /lib/modules/3.10.0+/build
 However, I can not read it: No such file or directory
 Therefore, I am deleting /lib/modules/3.10.0+/build


 Hmm. The package shipped with a symbolic link /lib/modules/3.10.0+/source
 However, I can not read the target: No such file or directory
 Therefore, I am deleting /lib/modules/3.10.0+/source

Running depmod.
Examining /etc/kernel/postinst.d.
run-parts: executing /etc/kernel/postinst.d/apt-auto-removal 3.10.0+ /boot/vmlinuz-3.10.0+
run-parts: executing /etc/kernel/postinst.d/initramfs-tools 3.10.0+ /boot/vmlinuz-3.10.0+
update-initramfs: Generating /boot/initrd.img-3.10.0+
W: mdadm: /etc/mdadm/mdadm.conf defines no arrays.
W: mkconf: MD subsystem is not loaded, thus I cannot scan for arrays.
W: mdadm: failed to auto-generate temporary mdadm.conf file.
W: mdadm: no configuration file available.
I: mdadm: letting initramfs assemble auto-detected arrays.
#
```

Erase sda, sdb and sdc:

```
# dd if=/dev/zero bs=1M count=10 of=/dev/sda
10+0 records in
10+0 records out
10485760 bytes (10 MB) copied, 0.318227 s, 33.0 MB/s
# dd if=/dev/zero bs=1M count=10 of=/dev/sdb
10+0 records in
10+0 records out
10485760 bytes (10 MB) copied, 0.318631 s, 32.9 MB/s
# dd if=/dev/zero bs=1M count=10 of=/dev/sdc
10+0 records in
10+0 records out
10485760 bytes (10 MB) copied, 0.319021 s, 32.9 MB/s
#
```

Partition the actual disks for the new root filesystem:

```
# fdisk /dev/sda

Welcome to fdisk (util-linux 2.25.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

Device does not contain a recognized partition table.
Created a new DOS disklabel with disk identifier 0x65d89d7e.

Command (m for help): n
Partition type
   p   primary (0 primary, 0 extended, 4 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (1-4, default 1):
First sector (2048-312499999, default 2048):
Last sector, +sectors or +size{K,M,G,T,P} (2048-312499999, default 312499999): +10G

Created a new partition 1 of type 'Linux' and of size 10 GiB.

Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2):
First sector (20973568-312499999, default 20973568):
Last sector, +sectors or +size{K,M,G,T,P} (20973568-312499999, default 312499999):

Created a new partition 2 of type 'Linux' and of size 139 GiB.

Command (m for help): t
Partition number (1,2, default 2): 1
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): t
Partition number (1,2, default 2): 2
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): p
Disk /dev/sda: 149 GiB, 160000000000 bytes, 312500000 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x65d89d7e

Device     Boot    Start       End   Sectors  Size Id Type
/dev/sda1           2048  20973567  20971520   10G fd Linux raid autodetect
/dev/sda2       20973568 312499999 291526432  139G fd Linux raid autodetect


Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
[ 2164.700550]  sda: sda1 sda2
Syncing disks.

# fdisk /dev/sdb

Welcome to fdisk (util-linux 2.25.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

Device does not contain a recognized partition table.
Created a new DOS disklabel with disk identifier 0xb40ce87f.

Command (m for help): n
Partition type
   p   primary (0 primary, 0 extended, 4 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (1-4, default 1):
First sector (2048-312499999, default 2048):
Last sector, +sectors or +size{K,M,G,T,P} (2048-312499999, default 312499999): +10G

Created a new partition 1 of type 'Linux' and of size 10 GiB.

Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2):
First sector (20973568-312499999, default 20973568):
Last sector, +sectors or +size{K,M,G,T,P} (20973568-312499999, default 312499999):

Created a new partition 2 of type 'Linux' and of size 139 GiB.

Command (m for help): t
Partition number (1,2, default 2): 1
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): t
Partition number (1,2, default 2): 2
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): p
Disk /dev/sdb: 149 GiB, 160000000000 bytes, 312500000 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xb40ce87f

Device     Boot    Start       End   Sectors  Size Id Type
/dev/sdb1           2048  20973567  20971520   10G fd Linux raid autodetect
/dev/sdb2       20973568 312499999 291526432  139G fd Linux raid autodetect


Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
[ 2195.146742]  sdb: sdb1 sdb2
Syncing disks.

# fdisk /dev/sdc

Welcome to fdisk (util-linux 2.25.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

Device does not contain a recognized partition table.
Created a new DOS disklabel with disk identifier 0x0f18ca52.

Command (m for help): n
Partition type
   p   primary (0 primary, 0 extended, 4 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (1-4, default 1):
First sector (2048-312499999, default 2048):
Last sector, +sectors or +size{K,M,G,T,P} (2048-312499999, default 312499999): +10G

Created a new partition 1 of type 'Linux' and of size 10 GiB.

Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2):
First sector (20973568-312499999, default 20973568):
Last sector, +sectors or +size{K,M,G,T,P} (20973568-312499999, default 312499999):

Created a new partition 2 of type 'Linux' and of size 139 GiB.

Command (m for help): t
Partition number (1,2, default 2): 1
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): t
Partition number (1,2, default 2): 2
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): p
Disk /dev/sdc: 149 GiB, 160000000000 bytes, 312500000 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x0f18ca52

Device     Boot    Start       End   Sectors  Size Id Type
/dev/sdc1           2048  20973567  20971520   10G fd Linux raid autodetect
/dev/sdc2       20973568 312499999 291526432  139G fd Linux raid autodetect


Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
[ 2233.149041]  sdc: sdc1 sdc2
Syncing disks.

#
```

Create a raid1 mirror of sda1, sdb1, sdc1 and missing. The disk sdd1 it still
used for the temp root and can be added to the mirror later:

```
# modprobe raid1
[  360.935350] md: raid1 personality registered for level 1
#
# mdadm -C /dev/md0 -l 1 -n 4 /dev/sd[abc]1 missing
mdadm: Note: this array has metadata at the start and
    may not be suitable as a boot device.  If you plan to
    store '/boot' on this device please ensure that
    your boot-loader understands md/v1.x metadata, or use
    --metadata=0.90
Continue creating array? y
mdadm: Defaulting to version 1.2 metadata
[  372.071509] md: bind<sda1>
[  372.077087] md: bind<sdb1>
[  372.088851] md: bind<sdc1>
[  372.093167] md/raid1:md0: not clean -- starting background reconstruction
[  372.099994] md/raid1:md0: active with 3 out of 4 mirrors
[  372.105509] md0: detected capacity change from 0 to 10729029632
[  372.111661] md: md0 switched to read-write mode.
mdadm: array /dev/md0 started.
[  372.118248] md: resync of RAID array md0
[  372.123143] md: minimum _guaranteed_  speed: 1000 KB/sec/disk.
[  372.128962] md: using maximum available idle IO bandwidth (but not more than 200000 KB/sec) for res.
[  372.138348] md: using 128k window, over a total of 10477568k.
#
```

Make filesystem:

```
# mkfs -t ext4 /dev/md0
mke2fs 1.42.12 (29-Aug-2014)
[  415.024825]  md0: unknown partition table
ext2fs_check_if_mount: Can't check if filesystem is mounted due to missing mtab file while determining.
Creating filesystem with 2619392 4k blocks and 655360 inodes
Filesystem UUID: 3e5881c6-b5f8-4b1e-a953-31d5f5c76588
Superblock backups stored on blocks:
        32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632

Allocating group tables: done
Writing inode tables: done
Creating journal (32768 blocks): done
Writing superblocks and filesystem accounting information: done

#
# exit
/ #
```

After a little time the raid resync completes:

```
[  628.443261] md: md0: resync done.
Then:
/ # cat /proc/mdstat
Personalities : [raid1]
md0 : active raid1 sdc1[2] sdb1[1] sda1[0]
      10477568 blocks super 1.2 [4/3] [UUU_]

unused devices: <none>
/ #
```

Umount the pseudo file systems and copy the temp root to the new root:

```
/ # umount /mnt/root/proc
/ # umount /mnt/root/sys
/ # mkdir /mnt/rootnew
/ # mount -t ext4 /mnt/root/dev/md0 /mnt/rootnew
[  485.376000] EXT4-fs (md0): mounted filesystem with ordered data mode. Opts: (null)
/ # cp -a /mnt/root/* /mnt/rootnew/
/ # umount /mnt/root
/ #
/ # umount /sys
/ # umount /proc
```

Switch root to the new root and we get a running Debian system:

```
/ # exec /sbin/switch_root /mnt/rootnew /sbin/init
switch_root: failed to mount moving /dev to /mnt/rootnew/dev: Invalid argument
switch_root: forcing unmount of /dev
switch_root: failed to mount moving /proc to /mnt/rootnew/proc: Invalid argument
switch_root: forcing unmount of /proc
switch_root: failed to mount moving /sys to /mnt/rootnew/sys: Invalid argument
switch_root: forcing unmount of /sys
switch_root: failed to mount moving /run to /mnt/rootnew/run: No such file or directory
switch_root: forcing unmount of /run
[  137.564436] systemd[1]: systemd 215 running in system mode. (+PAM +AUDIT +SELINUX +IMA +SYSVINIT +L)
[  137.578360] systemd[1]: Detected architecture 'arm'.

Welcome to Debian GNU/Linux 8 (jessie)!

[  137.719546] systemd[1]: Inserted module 'autofs4'
[  137.794065] NET: Registered protocol family 10
[  137.800254] systemd[1]: Inserted module 'ipv6'
[  137.819434] systemd[1]: Set hostname to <sharespace>.
[  138.543444] systemd[1]: Cannot add dependency job for unit dbus.socket, ignoring: Unit dbus.socket .
[  138.556660] systemd[1]: Cannot add dependency job for unit display-manager.service, ignoring: Unit .
[  138.578621] systemd[1]: Starting Forward Password Requests to Wall Directory Watch.
[  138.587084] systemd[1]: Started Forward Password Requests to Wall Directory Watch.
[  138.594888] systemd[1]: Expecting device dev-ttyS0.device...
         Expecting device dev-ttyS0.device...
[  138.620085] systemd[1]: Starting Remote File Systems (Pre).
[  OK  ] Reached target Remote File Systems (Pre).
[  138.650029] systemd[1]: Reached target Remote File Systems (Pre).
[  138.656347] systemd[1]: Starting Encrypted Volumes.
[  OK  ] Reached target Encrypted Volumes.
[  138.680166] systemd[1]: Reached target Encrypted Volumes.
[  138.685818] systemd[1]: Starting Dispatch Password Requests to Console Directory Watch.
[  138.694343] systemd[1]: Started Dispatch Password Requests to Console Directory Watch.
[  138.702475] systemd[1]: Starting Paths.
[  OK  ] Reached target Paths.
[  138.720036] systemd[1]: Reached target Paths.
[  138.724705] systemd[1]: Starting Arbitrary Executable File Formats File System Automount Point.
[  OK  ] Set up automount Arbitrary Executable File Formats F...utomount Point.
[  138.760043] systemd[1]: Set up automount Arbitrary Executable File Formats File System Automount Po.
[  138.769655] systemd[1]: Starting Swap.
[  OK  ] Reached target Swap.
[  138.790033] systemd[1]: Reached target Swap.
[  138.794503] systemd[1]: Starting Root Slice.
[  OK  ] Created slice Root Slice.
[  138.820028] systemd[1]: Created slice Root Slice.
[  138.824921] systemd[1]: Starting User and Session Slice.
[  OK  ] Created slice User and Session Slice.
[  138.850038] systemd[1]: Created slice User and Session Slice.
[  138.855973] systemd[1]: Starting Delayed Shutdown Socket.
[  OK  ] Listening on Delayed Shutdown Socket.
[  138.880036] systemd[1]: Listening on Delayed Shutdown Socket.
[  138.885975] systemd[1]: Starting /dev/initctl Compatibility Named Pipe.
[  OK  ] Listening on /dev/initctl Compatibility Named Pipe.
[  138.910036] systemd[1]: Listening on /dev/initctl Compatibility Named Pipe.
[  138.917183] systemd[1]: Starting Journal Socket (/dev/log).
[  OK  ] Listening on Journal Socket (/dev/log).
[  138.940030] systemd[1]: Listening on Journal Socket (/dev/log).
[  138.946199] systemd[1]: Starting udev Control Socket.
[  OK  ] Listening on udev Control Socket.
[  138.970037] systemd[1]: Listening on udev Control Socket.
[  138.975683] systemd[1]: Starting udev Kernel Socket.
[  OK  ] Listening on udev Kernel Socket.
[  139.000015] systemd[1]: Listening on udev Kernel Socket.
[  139.005554] systemd[1]: Starting Journal Socket.
[  OK  ] Listening on Journal Socket.
[  139.030038] systemd[1]: Listening on Journal Socket.
[  139.035318] systemd[1]: Starting System Slice.
[  OK  ] Created slice System Slice.
[  139.060037] systemd[1]: Created slice System Slice.
[  139.065245] systemd[1]: Started File System Check on Root Device.
[  139.071536] systemd[1]: Starting system-getty.slice.
[  OK  ] Created slice system-getty.slice.
[  139.100031] systemd[1]: Created slice system-getty.slice.
[  139.105618] systemd[1]: Starting system-serial\x2dgetty.slice.
[  OK  ] Created slice system-serial\x2dgetty.slice.
[  139.130036] systemd[1]: Created slice system-serial\x2dgetty.slice.
[  139.136615] systemd[1]: Starting Increase datagram queue length...
         Starting Increase datagram queue length...
[  139.165989] systemd[1]: Mounting POSIX Message Queue File System...
         Mounting POSIX Message Queue File System...
[  139.206177] systemd[1]: Starting Create list of required static device nodes for the current kernel.
         Starting Create list of required static device nodes...rrent kernel...
[  139.256481] systemd[1]: Starting udev Coldplug all Devices...
         Starting udev Coldplug all Devices...
[  139.309447] systemd[1]: Mounted Huge Pages File System.
[  139.321239] systemd[1]: Mounting Debug File System...
         Mounting Debug File System...
[  139.417909] systemd[1]: Starting Load Kernel Modules...
         Starting Load Kernel Modules...
[  139.474404] systemd[1]: Started Set Up Additional Binary Formats.
[  139.490093] systemd[1]: Starting Slices.
[  OK  ] Reached target Slices.
[  139.510066] systemd[1]: Reached target Slices.
[  139.516625] systemd[1]: Starting Remount Root and Kernel File Systems...
         Starting Remount Root and Kernel File Systems...
[  OK  ] Mounted Debug File System.
[  139.590105] systemd[1]: Mounted Debug File System.
[  OK  ] Mounted POSIX Message Queue File System.
[  139.620075] systemd[1]: Mounted POSIX Message Queue File System.
[  OK  ] Started Increase datagram queue length.
[  139.634970] systemd[1]: Started Increase datagram queue length.
[  OK  ] Started Create list of required static device nodes ...current kernel.
[  139.670049] systemd[1]: Started Create list of required static device nodes for the current kernel.
[  OK  ] Started Load Kernel Modules.
[  139.713168] systemd[1]: Started Load Kernel Modules.
[  139.720079] EXT4-fs (md0): re-mounted. Opts: errors=remount-ro
[  OK  ] Started Remount Root and Kernel File Systems.
[  139.820104] systemd[1]: Started Remount Root and Kernel File Systems.
[  OK  ] Started udev Coldplug all Devices.
[  139.940029] systemd[1]: Started udev Coldplug all Devices.
[  140.216230] systemd[1]: Starting Various fixups to make systemd work better on Debian...
         Starting Various fixups to make systemd work better on Debian...
[  140.256454] systemd[1]: Starting Load/Save Random Seed...
         Starting Load/Save Random Seed...
[  140.296116] systemd[1]: Mounted FUSE Control File System.
[  140.315340] systemd[1]: Mounted Configuration File System.
[  140.323687] systemd[1]: Starting Apply Kernel Variables...
         Starting Apply Kernel Variables...
[  140.362728] systemd[1]: Starting Create Static Device Nodes in /dev...
         Starting Create Static Device Nodes in /dev...
[  140.426145] systemd[1]: Starting Syslog Socket.
[  OK  ] Listening on Syslog Socket.
[  140.460126] systemd[1]: Listening on Syslog Socket.
[  140.465256] systemd[1]: Starting Sockets.
[  OK  ] Reached target Sockets.
[  140.480259] systemd[1]: Reached target Sockets.
[  140.485016] systemd[1]: Starting Journal Service...
         Starting Journal Service...
[  OK  ] Started Journal Service.
[  140.526862] systemd[1]: Started Journal Service.
[  OK  ] Started Various fixups to make systemd work better on Debian.
[  OK  ] Started Load/Save Random Seed.
[  OK  ] Started Apply Kernel Variables.
[  OK  ] Started Create Static Device Nodes in /dev.
         Starting udev Kernel Device Manager...
[  OK  ] Reached target Local File Systems (Pre).
[  OK  [  141.035222] systemd-udevd[135]: starting version 215
] Started udev Kernel Device Manager.
         Starting Copy rules generated while the root was ro...
         Starting LSB: MD array assembly...
[  OK  ] Started Copy rules generated while the root was ro.
[  141.768622] orion_wdt: Initial timeout 25 sec
[  141.831251] usbcore: registered new interface driver usbfs
[  141.836848] usbcore: registered new interface driver hub
[  OK  ] Started LSB: MD array assembly.
[  OK  ] Reached target Local File Systems.
         Starting Create Volatile Files and Directories...
[  OK  ] Reached target Remote File Systems.
         Starting Trigger Flushing of Journal to Persistent Storage...
[  142.080123] sd 0:0:0:0: Attached scsi generic sg0 type 0
         Starting LSB: Raise network interfaces....
[  142.167596] usbcore: registered new device driver usb
[  OK  ] Started Create Volatile Files and Directories.
[  142.377853] sd 1:0:0:0: Attached scsi generic sg1 type 0
[  142.396333] systemd-journald[133]: Received request to flush runtime journal from PID 1
[  142.479188] ehci_hcd: USB 2.0 'Enhanced' Host Controller (EHCI) Driver
[  OK  ] Started Trigger Flushing of Journal to Persistent Storage.
[  142.562344] sd 2:0:0:0: Attached scsi generic sg2 type 0
[  OK  ] Found device /dev/ttyS0.
[  142.615927] sd 3:0:0:0: Attached scsi generic sg3 type 0
[  142.651137] ehci-orion: EHCI orion driver
[  142.655246] orion-ehci orion-ehci.0: EHCI Host Controller
         Starting Update UTMP about System Boot/Shutdown...
[  OK  ] Started Update UTMP about System Boot/Shutdown.
[  142.819966] orion-ehci orion-ehci.0: new USB bus registered, assigned bus number 1
[  142.827819] orion-ehci orion-ehci.0: irq 17, io mem 0xf1050000
[  143.029993] orion-ehci orion-ehci.0: USB 2.0 started, EHCI 1.00
[  143.036023] usb usb1: New USB device found, idVendor=1d6b, idProduct=0002
[  143.042970] usb usb1: New USB device strings: Mfr=3, Product=2, SerialNumber=1
[  143.050307] usb usb1: Product: EHCI Host Controller
[  143.055177] usb usb1: Manufacturer: Linux 3.10.0+ ehci_hcd
[  143.060765] usb usb1: SerialNumber: orion-ehci.0
[  143.200511] hub 1-0:1.0: USB hub found
[  143.204286] hub 1-0:1.0: 1 port detected
[  143.519918] usb 1-1: new high-speed USB device number 2 using orion-ehci
[  143.682257] usb 1-1: New USB device found, idVendor=05e3, idProduct=0608
[  143.688983] usb 1-1: New USB device strings: Mfr=0, Product=1, SerialNumber=0
[  143.696191] usb 1-1: Product: USB2.0 Hub
[  143.719326] hub 1-1:1.0: USB hub found
[  143.727271] hub 1-1:1.0: 4 ports detected
         Starting MD array monitor...
[  OK  ] Started MD array monitor.
[  OK  ] Started LSB: Raise network interfaces..
[  OK  ] Reached target Network.
[  OK  ] Reached target System Initialization.
[  OK  ] Reached target Timers.
[  OK  ] Reached target Basic System.
         Starting OpenBSD Secure Shell server...
[  OK  ] Started OpenBSD Secure Shell server.
         Starting Regular background program processing daemon...
[  OK  ] Started Regular background program processing daemon.
         Starting /etc/rc.local Compatibility...
         Starting getty on tty2-tty6 if dbus and logind are not available...
         Starting System Logging Service...
         Starting Permit User Sessions...
[  OK  ] Started /etc/rc.local Compatibility.
[  OK  ] Started Permit User Sessions.
[  OK  ] Started System Logging Service.
         Starting Getty on tty2...
[  OK  ] Started Getty on tty2.
         Starting Getty on tty1...
[  OK  ] Started Getty on tty1.
         Starting Serial Getty on ttyS0...
[  OK  ] Started Serial Getty on ttyS0.
[  OK  ] Started getty on tty2-tty6 if dbus and logind are not available.
         Starting Getty on tty6...
[  OK  ] Started Getty on tty6.
         Starting Getty on tty5...
[  OK  ] Started Getty on tty5.
         Starting Getty on tty4...
[  OK  ] Started Getty on tty4.
         Starting Getty on tty3...
[  OK  ] Started Getty on tty3.
[  OK  ] Reached target Login Prompts.
[  OK  ] Reached target Multi-User System.
[  OK  ] Reached target Graphical Interface.
         Starting Update UTMP about System Runlevel Changes...
[  OK  ] Started Update UTMP about System Runlevel Changes.

Debian GNU/Linux 8 sharespace ttyS0

sharespace login:
```

We can login:

```
Debian GNU/Linux 8 sharespace ttyS0

sharespace login: root
Password:
Linux sharespace 3.10.0+ #2 Tue Oct 13 14:50:33 UTC 2015 armv5tel

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
root@sharespace:~#
```

Update the fstab and the initrd image:

```
root@sharespace:~# echo "/dev/md0 / ext4 defaults,noatime,errors=remount-ro 0 1" > /etc/fstab
root@sharespace:~# update-initramfs -u -k all
update-initramfs: Generating /boot/initrd.img-3.10.0+
W: mdadm: /etc/mdadm/mdadm.conf defines no arrays.
I: mdadm: auto-generated temporary mdadm.conf configuration file.
I: mdadm: will start all available MD arrays from the initial ramdisk.
I: mdadm: use `dpkg-reconfigure --priority=low mdadm` to change this.
root@sharespace:~# mkimage
-bash: mkimage: command not found
root@sharespace:~# apt-get install u-boot-tools
Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  u-boot-tools
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 71.6 kB of archives.
After this operation, 207 kB of additional disk space will be used.
Get:1 http://httpredir.debian.org/debian/ jessie/main u-boot-tools armel 2014.10+dfsg1-5 [71.6 kB]
Fetched 71.6 kB in 1s (54.8 kB/s)
Selecting previously unselected package u-boot-tools.
(Reading database ... 12693 files and directories currently installed.)
Preparing to unpack .../u-boot-tools_2014.10+dfsg1-5_armel.deb ...
Unpacking u-boot-tools (2014.10+dfsg1-5) ...
Processing triggers for man-db (2.7.0.2-5) ...
Setting up u-boot-tools (2014.10+dfsg1-5) ...
root@sharespace:~#
root@sharespace:~# mkimage -A arm -O linux -T ramdisk -C gzip -a 0x0 -e 0x0 -n "SharespaceInitrd" -d /boot/initrd.img-3.10.0+ /boot/uInitrd
Image Name:   SharespaceInitrd
Created:      Thu Oct 15 21:19:14 2015
Image Type:   ARM Linux RAMDisk Image (gzip compressed)
Data Size:    8892065 Bytes = 8683.66 kB = 8.48 MB
Load Address: 00000000
Entry Point:  00000000
root@sharespace:~#
```

Copy the initrd to the tftp server and reboot:

```
root@sharespace:~# scp /boot/uInitrd thomas@jasper:/srv/tftp/uInitrd2
The authenticity of host 'jasper (192.168.1.252)' can't be established.
ECDSA key fingerprint is 1d:b2:69:5e:17:17:41:fe:6f:a7:ad:29:f9:f2:01:ac.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added 'jasper,192.168.1.252' (ECDSA) to the list of known hosts.
thomas@jasper's password:
uInitrd                                       100% 8684KB   4.2MB/s   00:02
root@sharespace:~#
root@sharespace:~# reboot
```

Interrupt uboot again and manually boot like before, but this time use the
updated initrd:

```
         __  __                      _ _
        |  \/  | __ _ _ ____   _____| | |
        | |\/| |/ _` | '__\ \ / / _ \ | |
        | |  | | (_| | |   \ V /  __/ | |
        |_|  |_|\__,_|_|    \_/ \___|_|_|
 _   _     ____              _
| | | |   | __ )  ___   ___ | |_
| | | |___|  _ \ / _ \ / _ \| __|
| |_| |___| |_) | (_) | (_) | |_
 \___/    |____/ \___/ \___/ \__|  ** Forcing LOADER mode only **
 ** MARVELL BOARD: DB-88F5X81-DDR2-A/B LE

U-Boot 1.1.4 (Aug  4 2008 - 09:35:54) Marvell version: 2.3.23

U-Boot code: 00200000 -> 0026FFF0  BSS: -> 0027AD18

Soc: 88F5281 D0 (DDR2)
CPU running @ 500Mhz
SysClock = 166Mhz , TClock = 166Mhz

DRAM CS[0] base 0x00000000   size 128MB
DRAM Total size 128MB  32bit width
[16384kB@ff000000] Flash: 16 MB
Addresses 4M - 0M are saved for the U-Boot usage.
Mem malloc Initialization (4M - 3M): Done

CPU : ARM926 (Rev 0)
Streaming disabled
VFP initialized to Run Fast Mode.
USB 0: host mode
PCI 0: PCI Express Root Complex Interface
CPU: Write allocate enabled
Net:   egiga0 [PRIME]
Hit any key to stop autoboot:  0
Marvell>> setenv serverip 192.168.1.252
Marvell>> setenv bootargs console=ttyS0,115200 root=/dev/md0
Marvell>> ide reset

Reset IDE:
Marvell Serial ATA Adapter
Found adapter at bus 0, device 1 ... Scanning channels
  Device 0: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEMXAY
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 1: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEG2XA
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 2: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEMBH2
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 3: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEE8ZG
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)

Marvell>> tftpboot 0x800000 uImage
Using egiga0 device
TFTP from server 192.168.1.252; our IP address is 192.168.1.2
Filename 'uImage'.
Load address: 0x800000
Loading: #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################
done
Bytes transferred = 1499664 (16e210 hex)
Marvell>> tftpboot 0x01100000 uInitrd2
Using egiga0 device
TFTP from server 192.168.1.252; our IP address is 192.168.1.2
Filename 'uInitrd2'.
Load address: 0x1100000
Loading: #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         #################################################################
         ###############################################
done
Bytes transferred = 8892129 (87aee1 hex)
Marvell>>
```

Boot the system:

```
Marvell>> bootm 0x800000 0x01100000
## Booting image at 00800000 ...
   Image Name:   SharespaceKImage
   Created:      2015-10-13  15:17:20 UTC
   Image Type:   ARM Linux Kernel Image (uncompressed)
   Data Size:    1499600 Bytes =  1.4 MB
   Load Address: 00008000
   Entry Point:  00008000
   Verifying Checksum ... OK
OK
## Loading Ramdisk Image at 01100000 ...
   Image Name:   SharespaceInitrd
   Created:      2015-10-15  21:19:14 UTC
   Image Type:   ARM Linux RAMDisk Image (gzip compressed)
   Data Size:    8892065 Bytes =  8.5 MB
   Load Address: 00000000
   Entry Point:  00000000
   Verifying Checksum ... OK

Starting kernel ...

Uncompressing Linux... done, booting the kernel.
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Initializing cgroup subsys cpuset
[    0.000000] Initializing cgroup subsys cpu
[    0.000000] Initializing cgroup subsys cpuacct
[    0.000000] Linux version 3.10.0+ (thomas@diamond) (gcc version 4.9.2 ( 4.9.2-10) ) #2 Tue Oct 13 14:50:33 UTC 2015
[    0.000000] CPU: Feroceon [41069260] revision 0 (ARMv5TEJ), cr=00053177
[    0.000000] CPU: VIVT data cache, VIVT instruction cache
[    0.000000] Machine: WD Sharespace
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x41000403
[    0.000000] Memory policy: ECC disabled, Data cache writeback
[    0.000000] Built 1 zonelists in Zone order, mobility grouping on.  Total pages: 32512
[    0.000000] Kernel command line: console=ttyS0,115200 root=/dev/md0
[    0.000000] PID hash table entries: 512 (order: -1, 2048 bytes)
[    0.000000] Dentry cache hash table entries: 16384 (order: 4, 65536 bytes)
[    0.000000] Inode-cache hash table entries: 8192 (order: 3, 32768 bytes)
[    0.000000] allocated 262144 bytes of page_cgroup
[    0.000000] please try 'cgroup_disable=memory' option if you don't want memory cgroups
[    0.000000] Memory: 128MB = 128MB total
[    0.000000] Memory: 116632k/116632k available, 14440k reserved, 0K highmem
[    0.000000] Virtual kernel memory layout:
[    0.000000]     vector  : 0xffff0000 - 0xffff1000   (   4 kB)
[    0.000000]     fixmap  : 0xfff00000 - 0xfffe0000   ( 896 kB)
[    0.000000]     vmalloc : 0xc8800000 - 0xff000000   ( 872 MB)
[    0.000000]     lowmem  : 0xc0000000 - 0xc8000000   ( 128 MB)
[    0.000000]     modules : 0xbf000000 - 0xc0000000   (  16 MB)
[    0.000000]       .text : 0xc0008000 - 0xc03985ec   (3650 kB)
[    0.000000]       .init : 0xc0399000 - 0xc03bb1a4   ( 137 kB)
[    0.000000]       .data : 0xc03bc000 - 0xc03fb8e0   ( 255 kB)
[    0.000000]        .bss : 0xc03fb8e0 - 0xc043b710   ( 256 kB)
[    0.000000] NR_IRQS:64
[    0.000000] sched_clock: 32 bits at 166MHz, resolution 5ns, wraps every 25769ms
[    0.000000] Console: colour dummy device 80x30
[   24.503378] Calibrating delay loop... 498.89 BogoMIPS (lpj=2494464)
[   24.563097] pid_max: default: 32768 minimum: 301
[   24.563262] Security Framework initialized
[   24.563347] Mount-cache hash table entries: 512
[   24.564363] Initializing cgroup subsys memory
[   24.564482] Initializing cgroup subsys devices
[   24.564504] Initializing cgroup subsys freezer
[   24.564523] Initializing cgroup subsys net_cls
[   24.564541] Initializing cgroup subsys blkio
[   24.564558] Initializing cgroup subsys perf_event
[   24.564715] CPU: Testing write buffer coherency: ok
[   24.565380] Setting up static identity map for 0xc028f6b8 - 0xc028f6f4
[   24.567296] devtmpfs: initialized
[   24.569738] regulator-dummy: no parameters
[   24.570135] NET: Registered protocol family 16
[   24.571888] DMA: preallocated 256 KiB pool for atomic coherent allocations
[   24.572802] Orion ID: MV88F5281-D0. TCLK=166666667.
[   24.572869] Orion: Applying 5281 D0 WFI workaround.
[   24.574738] PCI host bridge to bus 0000:00
[   24.574776] pci_bus 0000:00: root bus resource [mem 0xe0000000-0xe7ffffff]
[   24.574803] pci_bus 0000:00: root bus resource [io  0x1000-0xffff]
[   24.574829] pci_bus 0000:00: No busn resource found for root bus, will use [bus 00-ff]
[   24.575744] PCI: bus0: Fast back to back transfers disabled
[   24.575839] pci 0000:00:01.0: BAR 0: assigned [mem 0xe0000000-0xe00fffff 64bit]
[   24.575880] pci 0000:00:01.0: BAR 2: assigned [io  0x1000-0x10ff]
[   24.579415] bio: create slab <bio-0> at 0
[   24.581459] Switching to clocksource orion_clocksource
[   24.600861] NET: Registered protocol family 2
[   24.601988] TCP established hash table entries: 1024 (order: 1, 8192 bytes)
[   24.602064] TCP bind hash table entries: 1024 (order: 0, 4096 bytes)
[   24.602110] TCP: Hash tables configured (established 1024 bind 1024)
[   24.602342] TCP: reno registered
[   24.602371] UDP hash table entries: 256 (order: 0, 4096 bytes)
[   24.602419] UDP-Lite hash table entries: 256 (order: 0, 4096 bytes)
[   24.602818] NET: Registered protocol family 1
[   24.603246] Unpacking initramfs...
[   26.695165] Freeing initrd memory: 8676K (c1101000 - c197a000)
[   26.696361] audit: initializing netlink socket (disabled)
[   26.696429] type=2000 audit(2.180:1): initialized
[   26.697709] VFS: Disk quotas dquot_6.5.2
[   26.697799] Dquot-cache hash table entries: 1024 (order 0, 4096 bytes)
[   26.698069] msgmni has been set to 244
[   26.699549] alg: No test for stdrng (krng)
[   26.699720] Block layer SCSI generic (bsg) driver version 0.4 loaded (major 252)
[   26.700008] io scheduler noop registered
[   26.700030] io scheduler deadline registered
[   26.700073] io scheduler cfq registered (default)
[   26.700645] Serial: 8250/16550 driver, 2 ports, IRQ sharing disabled
[   26.722158] serial8250.0: ttyS0 at MMIO 0xf1012000 (irq = 3) is a 16550A
[   27.184376] console [ttyS0] enabled
[   27.208687] serial8250.1: ttyS1 at MMIO 0xf1012100 (irq = 4) is a 16550A
[   27.216903] physmap platform flash device: 01000000 at ff000000
[   27.223205] physmap-flash.0: Found 1 x16 devices at 0x0 in 8-bit bank. Manufacturer ID 0x000001 Chip ID 0x002101
[   27.233408] Amd/Fujitsu Extended Query Table at 0x0040
[   27.238536]   Amd/Fujitsu Extended Query version 1.3.
[   27.243601] number of CFI chips: 1
[   27.266581] Creating 5 MTD partitions on "physmap-flash.0":
[   27.272212] 0x000000ca0000-0x000000cc0000 : "U-Boot environment"
[   27.279911] 0x000000e80000-0x000000f80000 : "Pre-RootFS"
[   27.286927] 0x000000cc0000-0x000000e80000 : "Kernel"
[   27.293585] 0x000000000000-0x000000ca0000 : "Full RootFS"
[   27.300621] 0x000000f80000-0x000001000000 : "U-Boot"
[   27.308253] mousedev: PS/2 mouse device common for all mice
[   27.314282] i2c /dev entries driver
[   27.318636] rtc-pcf8563 0-0051: chip found, driver version 0.4.3
[   27.326557] rtc-pcf8563 0-0051: rtc core: registered rtc-pcf8563 as rtc0
[   27.333961] TCP: cubic registered
[   27.337279] NET: Registered protocol family 17
[   27.341819] VFP support v0.3: implementor 41 architecture 1 part 10 variant 9 rev 0
[   27.350392] registered taskstats version 1
[   27.356450] rtc-pcf8563 0-0051: setting system clock to 2015-10-16 07:59:39 UTC (1444982379)
[   27.366082] Freeing unused kernel memory: 136K (c0399000 - c03bb000)
Loading, please wait...
[   27.490971] systemd-udevd[49]: starting version 215
[   27.652231] mv643xx_eth: MV-643xx 10/100/1000 ethernet driver version 1.4
[   27.676979] SCSI subsystem initialized
[   27.716131] libphy: orion_mdio_bus: probed
[   27.726932] mv643xx_eth_port mv643xx_eth_port.0 eth0: port 0 with MAC address 00:90:a9:5e:36:99
[   27.782424] usbcore: registered new interface driver usbfs
[   27.788016] usbcore: registered new interface driver hub
[   27.824009] sata_mv 0000:00:01.0: Gen-IIE 32 slots 4 ports SCSI mode IRQ via INTx
[   27.856121] usbcore: registered new device driver usb
[   27.880123] ehci_hcd: USB 2.0 'Enhanced' Host Controller (EHCI) Driver
[   27.932717] ehci-orion: EHCI orion driver
[   27.936835] orion-ehci orion-ehci.0: EHCI Host Controller
[   27.961954] scsi0 : sata_mv
[   27.971030] scsi1 : sata_mv
[   27.980102] scsi2 : sata_mv
[   27.989220] scsi3 : sata_mv
[   27.992590] ata1: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0022000 irq 11
[   28.000230] ata2: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0024000 irq 11
[   28.007900] ata3: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0026000 irq 11
[   28.015558] ata4: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0028000 irq 11
[   28.024011] orion-ehci orion-ehci.0: new USB bus registered, assigned bus number 1
[   28.060144] orion-ehci orion-ehci.0: irq 17, io mem 0xf1050000
[   28.101646] orion-ehci orion-ehci.0: USB 2.0 started, EHCI 1.00
[   28.107677] usb usb1: New USB device found, idVendor=1d6b, idProduct=0002
[   28.114510] usb usb1: New USB device strings: Mfr=3, Product=2, SerialNumber=1
[   28.121734] usb usb1: Product: EHCI Host Controller
[   28.126605] usb usb1: Manufacturer: Linux 3.10.0+ ehci_hcd
[   28.132101] usb usb1: SerialNumber: orion-ehci.0
[   28.246148] hub 1-0:1.0: USB hub found
[   28.249929] hub 1-0:1.0: 1 port detected
[   28.531602] ata1: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   28.591572] usb 1-1: new high-speed USB device number 2 using orion-ehci
[   28.598406] ata1.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   28.604121] ata1.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   28.681662] ata1.00: configured for UDMA/133
[   28.686602] scsi 0:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   28.753414] usb 1-1: New USB device found, idVendor=05e3, idProduct=0608
[   28.760122] usb 1-1: New USB device strings: Mfr=0, Product=1, SerialNumber=0
[   28.767286] usb 1-1: Product: USB2.0 Hub
[   28.776708] hub 1-1:1.0: USB hub found
[   28.783780] hub 1-1:1.0: 4 ports detected
[   29.201580] ata2: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   29.281615] ata2.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   29.287262] ata2.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   29.371628] ata2.00: configured for UDMA/133
[   29.376587] scsi 1:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   29.891584] ata3: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   29.971614] ata3.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   29.977261] ata3.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   30.061630] ata3.00: configured for UDMA/133
[   30.066609] scsi 2:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   30.581579] ata4: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[   30.661658] ata4.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[   30.667311] ata4.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[   30.751645] ata4.00: configured for UDMA/133
[   30.756610] scsi 3:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[   30.819060] sd 0:0:0:0: [sda] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   30.835216] sd 0:0:0:0: [sda] Write Protect is off
[   30.844559] sd 0:0:0:0: [sda] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   30.855377] sd 1:0:0:0: [sdb] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   30.864072] sd 2:0:0:0: [sdc] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   30.872785] sd 3:0:0:0: [sdd] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[   30.882911] sd 1:0:0:0: [sdb] Write Protect is off
[   30.888492] sd 2:0:0:0: [sdc] Write Protect is off
[   30.896377] sd 3:0:0:0: [sdd] Write Protect is off
[   30.903583] sd 1:0:0:0: [sdb] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   30.912982] sd 2:0:0:0: [sdc] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   30.922243] sd 3:0:0:0: [sdd] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[   30.931795]  sda: sda1 sda2
[   30.950785] sd 0:0:0:0: [sda] Attached SCSI disk
[   30.969668]  sdc: sdc1 sdc2
[   30.973346]  sdb: sdb1 sdb2
[   30.976891]  sdd: sdd1
[   30.988846] sd 3:0:0:0: [sdd] Attached SCSI disk
[   30.994368] sd 2:0:0:0: [sdc] Attached SCSI disk
[   30.999922] sd 1:0:0:0: [sdb] Attached SCSI disk
[   31.017508] sd 0:0:0:0: Attached scsi generic sg0 type 0
[   31.024347] sd 1:0:0:0: Attached scsi generic sg1 type 0
[   31.030523] sd 2:0:0:0: Attached scsi generic sg2 type 0
[   31.036780] sd 3:0:0:0: Attached scsi generic sg3 type 0
[   31.693721] md: bind<sda1>
[   31.718082] md: bind<sdb1>
[   31.763352] md: bind<sdc1>
[   31.803163] md: raid1 personality registered for level 1
[   31.812269] md/raid1:md0: active with 3 out of 4 mirrors
[   31.817745] md0: detected capacity change from 0 to 10729029632
[   31.828439]  md0: unknown partition table
Begin: Loading essential drivers ... done.
Begin: Running /scripts/init-premount ... done.
Begin: Mounting root file system ... Begin: Running /scripts/local-top ... Begin: Assembling all MD arrays ... Failure: failed to assemble all arrays.
done.
done.
Begin: Running /scripts/local-premount ... done.
Begin: Checking root file system ... fsck from util-linux 2.25.2
fsck: error 2 (No such file or directory) while executing fsck.ext4 for /dev/md0
fsck exited with status code 8
done.
Warning: File system check failed but did not detect errors
[   37.486137] EXT4-fs (md0): mounted filesystem with ordered data mode. Opts: (null)
done.
Begin: Running /scripts/local-bottom ... done.
Begin: Running /scripts/init-bottom ... done.
[   38.068739] systemd[1]: systemd 215 running in system mode. (+PAM +AUDIT +SELINUX +IMA +SYSVINIT +LIBCRYPTSETUP +GCRYPT +ACL +XZ -SECCOMP -APPARMOR)
[   38.082671] systemd[1]: Detected architecture 'arm'.

Welcome to Debian GNU/Linux 8 (jessie)!

[   38.222922] systemd[1]: Inserted module 'autofs4'
[   38.297798] NET: Registered protocol family 10
[   38.303886] systemd[1]: Inserted module 'ipv6'
[   38.322594] systemd[1]: Set hostname to <sharespace>.
[   39.054761] systemd[1]: Cannot add dependency job for unit dbus.socket, ignoring: Unit dbus.socket failed to load: No such file or directory.
[   39.067975] systemd[1]: Cannot add dependency job for unit display-manager.service, ignoring: Unit display-manager.service failed to load: No such file.
[   39.088903] systemd[1]: Starting Forward Password Requests to Wall Directory Watch.
[   39.097401] systemd[1]: Started Forward Password Requests to Wall Directory Watch.
[   39.105216] systemd[1]: Expecting device dev-ttyS0.device...
         Expecting device dev-ttyS0.device...
[   39.131819] systemd[1]: Starting Remote File Systems (Pre).
[  OK  ] Reached target Remote File Systems (Pre).
[   39.161769] systemd[1]: Reached target Remote File Systems (Pre).
[   39.168090] systemd[1]: Starting Encrypted Volumes.
[  OK  ] Reached target Encrypted Volumes.
[   39.191770] systemd[1]: Reached target Encrypted Volumes.
[   39.197420] systemd[1]: Starting Dispatch Password Requests to Console Directory Watch.
[   39.205945] systemd[1]: Started Dispatch Password Requests to Console Directory Watch.
[   39.214085] systemd[1]: Starting Paths.
[  OK  ] Reached target Paths.
[   39.231769] systemd[1]: Reached target Paths.
[   39.236451] systemd[1]: Starting Arbitrary Executable File Formats File System Automount Point.
[  OK  ] Set up automount Arbitrary Executable File Formats F...utomount Point.
[   39.271779] systemd[1]: Set up automount Arbitrary Executable File Formats File System Automount Point.
[   39.281399] systemd[1]: Starting Swap.
[  OK  ] Reached target Swap.
[   39.301769] systemd[1]: Reached target Swap.
[   39.306246] systemd[1]: Starting Root Slice.
[  OK  ] Created slice Root Slice.
[   39.331768] systemd[1]: Created slice Root Slice.
[   39.336675] systemd[1]: Starting User and Session Slice.
[  OK  ] Created slice User and Session Slice.
[   39.361779] systemd[1]: Created slice User and Session Slice.
[   39.367717] systemd[1]: Starting Delayed Shutdown Socket.
[  OK  ] Listening on Delayed Shutdown Socket.
[   39.391781] systemd[1]: Listening on Delayed Shutdown Socket.
[   39.397726] systemd[1]: Starting /dev/initctl Compatibility Named Pipe.
[  OK  ] Listening on /dev/initctl Compatibility Named Pipe.
[   39.421779] systemd[1]: Listening on /dev/initctl Compatibility Named Pipe.
[   39.428932] systemd[1]: Starting Journal Socket (/dev/log).
[  OK  ] Listening on Journal Socket (/dev/log).
[   39.451779] systemd[1]: Listening on Journal Socket (/dev/log).
[   39.457955] systemd[1]: Starting udev Control Socket.
[  OK  ] Listening on udev Control Socket.
[   39.481775] systemd[1]: Listening on udev Control Socket.
[   39.487431] systemd[1]: Starting udev Kernel Socket.
[  OK  ] Listening on udev Kernel Socket.
[   39.511778] systemd[1]: Listening on udev Kernel Socket.
[   39.517324] systemd[1]: Starting Journal Socket.
[  OK  ] Listening on Journal Socket.
[   39.541775] systemd[1]: Listening on Journal Socket.
[   39.547059] systemd[1]: Starting System Slice.
[  OK  ] Created slice System Slice.
[   39.571778] systemd[1]: Created slice System Slice.
[   39.576997] systemd[1]: Starting File System Check on Root Device...
         Starting File System Check on Root Device...
[   39.607499] systemd[1]: Starting system-getty.slice.
[  OK  ] Created slice system-getty.slice.
[   39.641819] systemd[1]: Created slice system-getty.slice.
[   39.647404] systemd[1]: Starting system-serial\x2dgetty.slice.
[  OK  ] Created slice system-serial\x2dgetty.slice.
[   39.671790] systemd[1]: Created slice system-serial\x2dgetty.slice.
[   39.681922] systemd[1]: Starting Increase datagram queue length...
         Starting Increase datagram queue length...
[   39.694550] systemd[1]: Mounting POSIX Message Queue File System...
         Mounting POSIX Message Queue File System...
[   39.735004] systemd[1]: Starting Create list of required static device nodes for the current kernel...
         Starting Create list of required static device nodes...rrent kernel...
[   39.789722] systemd[1]: Starting udev Coldplug all Devices...
         Starting udev Coldplug all Devices...
[   39.858812] systemd[1]: Mounted Huge Pages File System.
[   39.892169] systemd[1]: Mounting Debug File System...
         Mounting Debug File System...
[   39.951245] systemd[1]: Starting Load Kernel Modules...
         Starting Load Kernel Modules...
[   40.019203] systemd[1]: Started Set Up Additional Binary Formats.
[   40.031928] systemd[1]: Starting Slices.
[  OK  ] Reached target Slices.
[   40.061826] systemd[1]: Reached target Slices.
[  OK  ] Mounted Debug File System.
[   40.091800] systemd[1]: Mounted Debug File System.
[  OK  ] Mounted POSIX Message Queue File System.
[   40.111773] systemd[1]: Mounted POSIX Message Queue File System.
[  OK  ] Started File System Check on Root Device.
[   40.141780] systemd[1]: Started File System Check on Root Device.
[  OK  ] Started Increase datagram queue length.
[   40.173286] systemd[1]: Started Increase datagram queue length.
[  OK  ] Started Create list of required static device nodes ...current kernel.
[   40.201790] systemd[1]: Started Create list of required static device nodes for the current kernel.
[  OK  ] Started Load Kernel Modules.
[   40.251859] systemd[1]: Started Load Kernel Modules.
[  OK  ] Started udev Coldplug all Devices.
[   40.391778] systemd[1]: Started udev Coldplug all Devices.
[   40.669619] systemd[1]: Mounted FUSE Control File System.
[   40.675961] systemd[1]: Mounted Configuration File System.
[   40.681725] systemd[1]: Starting Apply Kernel Variables...
         Starting Apply Kernel Variables...
[   40.708442] systemd[1]: Starting Create Static Device Nodes in /dev...
         Starting Create Static Device Nodes in /dev...
[   40.748132] systemd[1]: Starting Syslog Socket.
[  OK  ] Listening on Syslog Socket.
[   40.781866] systemd[1]: Listening on Syslog Socket.
[   40.786992] systemd[1]: Starting Sockets.
[  OK  ] Reached target Sockets.
[   40.799982] systemd[1]: Reached target Sockets.
[   40.804789] systemd[1]: Starting Journal Service...
         Starting Journal Service...
[  OK  ] Started Journal Service.
[   40.849598] systemd[1]: Started Journal Service.
         Starting Remount Root and Kernel File Systems...
[  OK  ] Started Apply Kernel Variables.
[  OK  ] Started Create Static Device Nodes in /dev.
[   41.022599] EXT4-fs (md0): re-mounted. Opts: errors=remount-ro
[  OK  ] Started Remount Root and Kernel File Systems.
         Starting Load/Save Random Seed...
         Starting udev Kernel Device Manager...
[  OK  ] Reached target Local File Systems (Pre).
[  OK  ] Started Load/Save Random Seed.
[   41.414282] systemd-udevd[166]: starting version 215
[  OK  ] Started udev Kernel Device Manager.
         Starting Copy rules generated while the root was ro...
         Starting LSB: MD array assembly...
[   17.095408] systemd-fsck[138]: /dev/md0: clean, 14460/655360 files, 188506/2619392 blocks
[  OK  ] Started Copy rules generated while the root was ro.
[   42.238460] orion_wdt: Initial timeout 25 sec
[  OK  ] Started LSB: MD array assembly.
[  OK  ] Reached target Local File Systems.
         Starting Create Volatile Files and Directories...
[  OK  ] Reached target Remote File Systems.
         Starting Trigger Flushing of Journal to Persistent Storage...
         Starting LSB: Raise network interfaces....
[  OK  ] Started Create Volatile Files and Directories.
[   43.127737] systemd-journald[160]: Received request to flush runtime journal from PID 1
[  OK  ] Started Trigger Flushing of Journal to Persistent Storage.
[  OK  ] Found device /dev/ttyS0.
         Starting Update UTMP about System Boot/Shutdown...
[  OK  ] Started Update UTMP about System Boot/Shutdown.
         Starting MD array monitor...
[  OK  ] Started MD array monitor.
[   45.118396] mv643xx_eth_port mv643xx_eth_port.0 eth0: link down
[   45.126274] IPv6: ADDRCONF(NETDEV_UP): eth0: link is not ready
[   49.030696] mv643xx_eth_port mv643xx_eth_port.0 eth0: link up, 1000 Mb/s, full duplex, flow control disabled
[   49.040563] IPv6: ADDRCONF(NETDEV_CHANGE): eth0: link becomes ready
[  OK  ] Started LSB: Raise network interfaces..
[  OK  ] Reached target Network.
[  OK  ] Reached target System Initialization.
[  OK  ] Reached target Timers.
[  OK  ] Reached target Basic System.
         Starting OpenBSD Secure Shell server...
[  OK  ] Started OpenBSD Secure Shell server.
         Starting Regular background program processing daemon...
[  OK  ] Started Regular background program processing daemon.
         Starting /etc/rc.local Compatibility...
         Starting getty on tty2-tty6 if dbus and logind are not available...
         Starting System Logging Service...
         Starting Permit User Sessions...
[  OK  ] Started /etc/rc.local Compatibility.
[  OK  ] Started Permit User Sessions.
[  OK  ] Started System Logging Service.
[  OK  ] Started getty on tty2-tty6 if dbus and logind are not available.
         Starting Getty on tty6...
[  OK  ] Started Getty on tty6.
         Starting Getty on tty5...
[  OK  ] Started Getty on tty5.
         Starting Getty on tty4...
[  OK  ] Started Getty on tty4.
         Starting Getty on tty3...
[  OK  ] Started Getty on tty3.
         Starting Getty on tty2...
[  OK  ] Started Getty on tty2.
         Starting Getty on tty1...
[  OK  ] Started Getty on tty1.
         Starting Serial Getty on ttyS0...
[  OK  ] Started Serial Getty on ttyS0.
[  OK  ] Reached target Login Prompts.
[  OK  ] Reached target Multi-User System.
[  OK  ] Reached target Graphical Interface.
         Starting Update UTMP about System Runlevel Changes...
[  OK  ] Started Update UTMP about System Runlevel Changes.

Debian GNU/Linux 8 sharespace ttyS0

sharespace login: root
Password:
Last login: Thu Oct 15 21:30:42 UTC 2015 on ttyS0
Linux sharespace 3.10.0+ #2 Tue Oct 13 14:50:33 UTC 2015 armv5tel

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
root@sharespace:~#
```

Yay, straight into a Debian system. We can even ssh in remotely:

```
thomas@diamond ~ $ ssh thomas@sharespace
The authenticity of host 'sharespace (192.168.1.205)' can't be established.
ECDSA key fingerprint is SHA256:JxzLBSrM9ipqWnWHS1iqvzC/7O5d24fj3BbV12CnwSs.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added 'sharespace,192.168.1.205' (ECDSA) to the list of known hosts.
thomas@sharespace's password:
X11 forwarding request failed

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Fri Oct 16 08:01:48 2015 from diamond.lan
thomas@sharespace:~$ thomas@sharespace:~$ su -
Password:
root@sharespace:~#
```

Do some more basic setup of the system:

```
root@sharespace:~# dpkg-reconfigure tzdata

Current default time zone: 'Europe/London'
Local time is now:      Fri Oct 16 15:12:41 BST 2015.
Universal Time is now:  Fri Oct 16 14:12:41 UTC 2015.

root@sharespace:~#
root@sharespace:~# apt-get install locales
Reading package lists... Done
Building dependency tree
Reading state information... Done
The following NEW packages will be installed:
  locales
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 3908 kB of archives.
After this operation, 16.3 MB of additional disk space will be used.
Get:1 http://httpredir.debian.org/debian/ jessie/main locales all 2.19-18+deb8u1 [3908 kB]
Fetched 3908 kB in 4s (972 kB/s)
Preconfiguring packages ...
Selecting previously unselected package locales.
(Reading database ... 15713 files and directories currently installed.)
Preparing to unpack .../locales_2.19-18+deb8u1_all.deb ...
Unpacking locales (2.19-18+deb8u1) ...
Processing triggers for man-db (2.7.0.2-5) ...
Setting up locales (2.19-18+deb8u1) ...
Generating locales (this might take a while)...
Generation complete.
root@sharespace:~# dpkg-reconfigure locales
Generating locales (this might take a while)...
  en_GB.UTF-8... done
Generation complete.
root@sharespace:~#
```

Update Linux and initrd images:

```
root@sharespace:~# devio 'wl 0xe3a01c0c,4' 'wl 0xe3811044,4' > /boot/vmlinuz.magic
root@sharespace:~# cat /boot/vmlinuz.magic /boot/vmlinuz-3.10.0+ > /boot/vmlinuz-3.10.0+.withmagic
root@sharespace:~# mkimage -A arm -O linux -T kernel -C none -a 0x00008000 -e 0x00008000 -n "SharespaceKImage" -d /boot/vmlinuz-3.10.0+.withmagic /boot/uImage
Image Name:   SharespaceKImage
Created:      Sat Oct 17 12:52:29 2015
Image Type:   ARM Linux Kernel Image (uncompressed)
Data Size:    1499600 Bytes = 1464.45 kB = 1.43 MB
Load Address: 00008000
Entry Point:  00008000
root@sharespace:~# update-initramfs -k all -u
update-initramfs: Generating /boot/initrd.img-3.10.0+
W: mdadm: /etc/mdadm/mdadm.conf defines no arrays.
I: mdadm: auto-generated temporary mdadm.conf configuration file.
I: mdadm: will start all available MD arrays from the initial ramdisk.
I: mdadm: use `dpkg-reconfigure --priority=low mdadm` to change this.
root@sharespace:~# mkimage -A arm -O linux -T ramdisk -C gzip -a 0x0 -e 0x0 -n "SharespaceInitrd" -d /boot/initrd.img-3.10.0+ /boot/uInitrd
Image Name:   SharespaceInitrd
Created:      Sat Oct 17 12:53:57 2015
Image Type:   ARM Linux RAMDisk Image (gzip compressed)
Data Size:    8892506 Bytes = 8684.09 kB = 8.48 MB
Load Address: 00000000
Entry Point:  00000000
root@sharespace:~#
```

Backup the mtd devices, this we can can allays return to the original firmware.

```
root@sharespace:~# for n in `seq 0 4`; do dd bs=1M if=/dev/mtdblock$n of=mtdblock$n; done
0+1 records in
0+1 records out
131072 bytes (131 kB) copied, 0.0573625 s, 2.3 MB/s
1+0 records in
1+0 records out
1048576 bytes (1.0 MB) copied, 0.426814 s, 2.5 MB/s
1+1 records in
1+1 records out
1835008 bytes (1.8 MB) copied, 0.728559 s, 2.5 MB/s
12+1 records in
12+1 records out
13238272 bytes (13 MB) copied, 5.20929 s, 2.5 MB/s
0+1 records in
0+1 records out
524288 bytes (524 kB) copied, 0.22142 s, 2.4 MB/s
root@sharespace:~# file mtd*
mtdblock0: data
mtdblock1: Linux Compressed ROM File System data, little endian size 1044480 version #2 sorted_dirs CRC 0xd377554a, edition 0, 547 blocks, 263 files
mtdblock2: u-boot legacy uImage, Linux-2.6.12.6-arm1, Linux/ARM, OS Kernel Image (Not compressed), 1746428 bytes, Mon Aug 16 08:24:03 2010, Load Address: 0x00008000, Entry Point: 0x00008000, Header CRC: 0x21C649FF, Data CRC: 0x9B2DDA69
mtdblock3: Linux jffs2 filesystem data little endian
mtdblock4: data
root@sharespace:~# tar cvzf mtdbackup.tar.gz mtd*
mtdblock0
mtdblock1
mtdblock2
mtdblock3
mtdblock4
root@sharespace:~#
root@sharespace:~# scp mtdbackup.tar.gz thomas@jasper:
thomas@jasper's password:
mtdbackup.tar.gz                                                                                                         100%   15MB   4.9MB/s   00:03
root@sharespace:~#
```

Inspect the mtd devices with mtdinfo:

```
root@sharespace:~# apt-get install mtd-utils
Reading package lists... Done
Building dependency tree
Reading state information... Done
The following extra packages will be installed:
  liblzo2-2
The following NEW packages will be installed:
  liblzo2-2 mtd-utils
0 upgraded, 2 newly installed, 0 to remove and 0 not upgraded.
Need to get 209 kB of archives.
After this operation, 862 kB of additional disk space will be used.
Do you want to continue? [Y/n]
Get:1 http://httpredir.debian.org/debian/ jessie/main liblzo2-2 armel 2.08-1.2 [46.5 kB]
Get:2 http://httpredir.debian.org/debian/ jessie/main mtd-utils armel 1:1.5.1-1 [163 kB]
Fetched 209 kB in 1s (109 kB/s)
Selecting previously unselected package liblzo2-2:armel.
(Reading database ... 16639 files and directories currently installed.)
Preparing to unpack .../liblzo2-2_2.08-1.2_armel.deb ...
Unpacking liblzo2-2:armel (2.08-1.2) ...
Selecting previously unselected package mtd-utils.
Preparing to unpack .../mtd-utils_1%3a1.5.1-1_armel.deb ...
Unpacking mtd-utils (1:1.5.1-1) ...
Processing triggers for man-db (2.7.0.2-5) ...
Setting up liblzo2-2:armel (2.08-1.2) ...
Setting up mtd-utils (1:1.5.1-1) ...
Processing triggers for libc-bin (2.19-18+deb8u1) ...
root@sharespace:~#
root@sharespace:~# mtdinfo -a
Count of MTD devices:           5
Present MTD devices:            mtd0, mtd1, mtd2, mtd3, mtd4
Sysfs interface supported:      yes

mtd0
Name:                           U-Boot environment
Type:                           nor
Eraseblock size:                131072 bytes, 128.0 KiB
Amount of eraseblocks:          1 (131072 bytes, 128.0 KiB)
Minimum input/output unit size: 1 byte
Sub-page size:                  1 byte
Character device major/minor:   90:0
Bad blocks are allowed:         false
Device is writable:             false

mtd1
Name:                           Pre-RootFS
Type:                           nor
Eraseblock size:                131072 bytes, 128.0 KiB
Amount of eraseblocks:          8 (1048576 bytes, 1024.0 KiB)
Minimum input/output unit size: 1 byte
Sub-page size:                  1 byte
Character device major/minor:   90:2
Bad blocks are allowed:         false
Device is writable:             true

mtd2
Name:                           Kernel
Type:                           nor
Eraseblock size:                131072 bytes, 128.0 KiB
Amount of eraseblocks:          14 (1835008 bytes, 1.8 MiB)
Minimum input/output unit size: 1 byte
Sub-page size:                  1 byte
Character device major/minor:   90:4
Bad blocks are allowed:         false
Device is writable:             true

mtd3
Name:                           Full RootFS
Type:                           nor
Eraseblock size:                131072 bytes, 128.0 KiB
Amount of eraseblocks:          101 (13238272 bytes, 12.6 MiB)
Minimum input/output unit size: 1 byte
Sub-page size:                  1 byte
Character device major/minor:   90:6
Bad blocks are allowed:         false
Device is writable:             true

mtd4
Name:                           U-Boot
Type:                           nor
Eraseblock size:                131072 bytes, 128.0 KiB
Amount of eraseblocks:          4 (524288 bytes, 512.0 KiB)
Minimum input/output unit size: 1 byte
Sub-page size:                  1 byte
Character device major/minor:   90:8
Bad blocks are allowed:         false
Device is writable:             false

root@sharespace:~#
```

So we want to use /dev/mtdblock2 for the kernel and /dev/mtdblock3 for the
initrd. The sizes will fit 1835008>1499664 and 13238272>8892570:

```
root@sharespace:~# ls -l /boot/u*
-rw-r--r-- 1 root root 1499664 Oct 17 12:52 /boot/uImage
-rw-r--r-- 1 root root 8892570 Oct 17 12:53 /boot/uInitrd
root@sharespace:~#
root@sharespace:~# cat /boot/uImage > /dev/mtdblock2
root@sharespace:~# cat /boot/uInitrd > /dev/mtdblock3
root@sharespace:~#
```

Back on the console reboot back to the uboot:

```
root@sharespace:~# reboot
         Starting Synchronise Hardware Clock to System Clock...
[  OK  ] Reached target Unmount All Filesystems.
[  OK  ] Stopped target Graphical Interface.
[  OK  ] Stopped target Multi-User System.
         Stopping OpenBSD Secure Shell server...
         Stopping System Logging Service...
         Stopping Regular background program processing daemon...
[  OK  ] Stopped target Login Prompts.
         Stopping Getty on tty6...
         Stopping Getty on tty5...
         Stopping Getty on tty4...
         Stopping Getty on tty3...
         Stopping Getty on tty2...
         Stopping Getty on tty1...
         Stopping Serial Getty on ttyS         Stopping getty on tty2-tty6 if dbus and logind are not .
[  OK  ] Stopped getty on tty2-tty6 if dbus and logind are not available.
[100877.524750] rtc-pcf8563 0-0051: retrieved date/time is not valid.
[  OK  ] Stopped Regular background program processing daemon.
[  OK  ] Stopped Getty on tty6.
[  OK  ] Stopped OpenBSD Secure Shell server.
[  OK  ] Stopped Getty on tty5.
[  OK  ] Stopped Getty on tty4.
[  OK  ] Stopped Getty on tty3.
[  OK  ] Stopped System Logging Service.
[  OK  ] Stopped Getty on tty2.
[  OK  ] Stopped Getty on tty1.
[  OK  ] Stopped Serial Getty on ttyS0.
[  OK  ] Removed slice system-serial\x2dgetty.slice.
[  OK  ] Removed slice system-getty.slice.
         Stopping /etc/rc.local Compatibility...
[  OK  ] Stopped /etc/rc.local Compatibility.
[  OK  ] Stopped target Network.
         Stopping Permit User Sessions...
[  OK  ] Stopped Permit User Sessions.
[  OK  ] Stopped target Basic System.
[  OK  ] Stopped target Slices.
[  OK  ] Removed slice User and Session Slice.
[  OK  ] Stopped target Paths.
[  OK  ] Stopped target Timers.
[  OK  ] Stopped target Sockets.
[  OK  ] Closed Syslog Socket.
[  OK  ] Stopped target System Initialization.
         Stopping Update UTMP about System Boot/Shutdown...
[  OK  ] Stopped target Encrypted Volumes.
         Stopping Apply Kernel Variables...
[  OK  ] Stopped Apply Kernel Variables.
         Stopping Load Kernel Modules...
[  OK  ] Stopped Load Kernel Modules.
         Stopping LSB: Raise network interfaces....
[  OK  ] Stopped target Swap.
[  OK  ] Stopped target Remote File Systems.
[  OK  ] Stopped target Remote File Systems (Pre).
[  OK  ] Stopped Update UTMP about System Boot/Shutdown.
         Stopping Create Volatile Files and Directories...
[  OK  ] Stopped Create Volatile Files and Directories.
[  OK  ] Stopped LSB: Raise network interfaces..
         Stopping Load/Save Random Seed...
[  OK  ] Stopped target Local File Systems.
[  OK  ] Stopped target Local File Systems (Pre).
         Stopping Create Static Device Nodes in /dev...
[  OK  ] Stopped Create Static Device Nodes in /dev.
         Stopping LSB: MD array assembly...
[  OK  ] Stopped Load/Save Random Seed.
[  OK  ] Stopped LSB: MD array assembly.
         Stopping Remount Root and Kernel File Systems...
[  OK  ] Stopped Remount Root and Kernel File Systems.
[  OK  ] Started Synchronise Hardware Clock to System Clock.
[  OK  ] Reached target Shutdown.
[100888.653397] watchdog watchdog0: watchdog did not stop!
[100888.744893] systemd-shutdown[1]: Sending SIGTERM to remaining processes...
[100888.793092] systemd-journald[160]: Received SIGTERM from PID 1 (systemd-shutdow).
[100888.935927] systemd-shutdown[1]: Sending SIGKILL to remaining processes...
[100888.971829] systemd-shutdown[1]: Hardware watchdog 'Orion Watchdog', version 0
[100888.982955] systemd-shutdown[1]: Unmounting file systems.
[100888.989969] systemd-shutdown[1]: Unmounting /sys/kernel/debug.
[100888.996058] systemd-shutdown[1]: Unmounting /dev/mqueue.
[100889.312553] EXT4-fs (md0): re-mounted. Opts: (null)
[100889.324376] EXT4-fs (md0): re-mounted. Opts: (null)
[100889.329352] EXT4-fs (md0): re-mounted. Opts: (null)
[100889.334412] systemd-shutdown[1]: All filesystems unmounted.
[100889.340090] systemd-shutdown[1]: Deactivating swaps.
[100889.345565] systemd-shutdown[1]: All swaps deactivated.
[100889.350897] systemd-shutdown[1]: Detaching loop devices.
[100889.389110] systemd-shutdown[1]: All loop devices detached.
[100889.394868] systemd-shutdown[1]: Detaching DM devices.
[100889.400974] systemd-shutdown[1]: All DM devices detached.
[100889.490273] systemd-shutdown[1]: Rebooting.
[100890.572277] sd 3:0:0:0: [sdd] Synchronizing SCSI cache
[100890.577818] sd 2:0:0:0: [sdc] Synchronizing SCSI cache
[100890.583311] sd 1:0:0:0: [sdb] Synchronizing SCSI cache
[100890.588774] sd 0:0:0:0: [sda] Synchronizing SCSI cache
[100890.594657] Restarting system.
```

Interrupt the boot:

```
         __  __                      _ _
        |  \/  | __ _ _ ____   _____| | |
        | |\/| |/ _` | '__\ \ / / _ \ | |
        | |  | | (_| | |   \ V /  __/ | |
        |_|  |_|\__,_|_|    \_/ \___|_|_|
 _   _     ____              _
| | | |   | __ )  ___   ___ | |_
| | | |___|  _ \ / _ \ / _ \| __|
| |_| |___| |_) | (_) | (_) | |_
 \___/    |____/ \___/ \___/ \__|  ** Forcing LOADER mode only **
 ** MARVELL BOARD: DB-88F5X81-DDR2-A/B LE

U-Boot 1.1.4 (Aug  4 2008 - 09:35:54) Marvell version: 2.3.23

U-Boot code: 00200000 -> 0026FFF0  BSS: -> 0027AD18

Soc: 88F5281 D0 (DDR2)
CPU running @ 500Mhz
SysClock = 166Mhz , TClock = 166Mhz

DRAM CS[0] base 0x00000000   size 128MB
DRAM Total size 128MB  32bit width
[16384kB@ff000000] Flash: 16 MB
Addresses 4M - 0M are saved for the U-Boot usage.
Mem malloc Initialization (4M - 3M): Done

CPU : ARM926 (Rev 0)
Streaming disabled
VFP initialized to Run Fast Mode.
USB 0: host mode
PCI 0: PCI Express Root Complex Interface
CPU: Write allocate enabled
Net:   egiga0 [PRIME]
Hit any key to stop autoboot:  0
Marvell>>
```

Run a printenv to save the original uboot environment:

```
Marvell>> printenv
baudrate=115200
loads_echo=0
rootpath=/mnt/ARM_FS/
cpuName=926
mfgmodel=s6m4nc
bootargs_root=root=/dev/md0 rw
CASset=min
MALLOC_len=1
ethprime=egiga0
netbsd_gw=192.168.0.254
netbsd_mask=255.255.255.0
netbsd_fs=nfs
netbsd_server=192.168.0.1
netbsd_rootdev=mgi0
netbsd_add=0x800000
netbsd_get=tftpboot $(netbsd_add) $(image_name)
netbsd_set_args=setenv bootargs nfsroot=$(netbsd_server):$(rootpath) fs=$(netbsd_fs) ip=$(ipaddr) serverip=$(netbsd_server) mask=$(netbsd_mask) gw=$(netbsd_gw) rootdev=$(netb)
netbsd_boot=bootm $(netbsd_add) $(bootargs)
netbsd_bootcmd=run netbsd_get ; run netbsd_set_args ; run netbsd_boot
bootargs_end=:::DB88FXX81:egiga0:none
image_name=uImage
standalone=fsload 0x400000 $(image_name);setenv bootargs $(bootargs) root=/dev/mtdblock0 rw ip=$(ipaddr):$(serverip)$(bootargs_end); bootm 0x400000;
eth1addr=00:00:00:00:51:82
usb0Mode=host
ethact=egiga0
bootcmd=ide reset; bootm 0xFFCC0000
bootargs=root=/dev/mtdblock2 console=ttyS0,115200 init=/etc/rc.preroot
ipaddr=192.168.1.2
serverip=192.168.1.100
model=WVLXN
customer=Wendy
serial_number=5565N01001G91300105J0E1
ethaddr=00:90:A9:5E:36:99
serialNo=WU4N19130201
modelname=WDA4NC40000
runintime=12000
ftpserver=192.168.43.4
testfile=100M
extendDiskMode=extend
raidlevel=5
mkraid5=ok
mfgtest_state=final_tested_ok
fw_ver=2.3.02
stdin=serial
stdout=serial
stderr=serial
enaDebugLed=yes
enaMonExt=no
enaFlashBuf=yes
enaCpuStream=no
enaVFP=yes
enaWrAllo=yes
enaICPref=yes
enaDCPref=yes
bootdelay=3
disaMvPnp=no
overEthAddr=no

Environment size: 1528/65532 bytes
Marvell>>
```

Backup the bootcmd and bootargs variables to bootcmdorig and bootcmdorig
respectfully:

```
Marvell>> printenv bootcmd
bootcmd=ide reset; bootm 0xFFCC0000
Marvell>> setenv bootcmdorig ide reset\;bootm 0xFFCC0000
Marvell>> printenv bootcmdorig
bootcmdorig=ide reset;bootm 0xFFCC0000
Marvell>>
Marvell>>
Marvell>> printenv bootargs
bootargs=root=/dev/mtdblock2 console=ttyS0,115200 init=/etc/rc.preroot
Marvell>> setenv bootargsorig root=/dev/mtdblock2 console=ttyS0,115200 init=/etc/rc.preroot
Marvell>> printenv bootargsorig
bootargsorig=root=/dev/mtdblock2 console=ttyS0,115200 init=/etc/rc.preroot
Marvell>>
```

Set a new bootargs to only say use serial console and have the rootfs as md0:

```
Marvell>> setenv bootargs console=ttyS0,115200 root=/dev/md0
Marvell>> printenv bootargs
bootargs=console=ttyS0,115200 root=/dev/md0
```

Set a new bootcmd to reset the ide, copy from the start of mtd3 to 0x01100000
for the length of mtd3, then boot code from the mtd2 and the copied location:

```
Marvell>> setenv bootcmd ide reset\; cp 0xff000000 0x01100000 0xca0000\; bootm 0xffcc0000 0x01100000
Marvell>> printenv bootcmd
bootcmd=ide reset; cp 0xff000000 0x01100000 0xca0000; bootm 0xffcc0000 0x01100000
```

Save the new environment:

```
Marvell>> saveenv
Saving Environment to Flash...
.
Un-Protected 1 sectors
Erasing Flash...
. done
Erased 1 sectors
Writing to Flash... done
.
Protected 1 sectors
Marvell>>
```

Reboot and don't interrupt the boot:

```
Marvell>> reset

         __  __                      _ _
        |  \/  | __ _ _ ____   _____| | |
        | |\/| |/ _` | '__\ \ / / _ \ | |
        | |  | | (_| | |   \ V /  __/ | |
        |_|  |_|\__,_|_|    \_/ \___|_|_|
 _   _     ____              _
| | | |   | __ )  ___   ___ | |_
| | | |___|  _ \ / _ \ / _ \| __|
| |_| |___| |_) | (_) | (_) | |_
 \___/    |____/ \___/ \___/ \__|  ** Forcing LOADER mode only **
 ** MARVELL BOARD: DB-88F5X81-DDR2-A/B LE

U-Boot 1.1.4 (Aug  4 2008 - 09:35:54) Marvell version: 2.3.23

U-Boot code: 00200000 -> 0026FFF0  BSS: -> 0027AD18

Soc: 88F5281 D0 (DDR2)
CPU running @ 500Mhz
SysClock = 166Mhz , TClock = 166Mhz

DRAM CS[0] base 0x00000000   size 128MB
DRAM Total size 128MB  32bit width
[16384kB@ff000000] Flash: 16 MB
Addresses 4M - 0M are saved for the U-Boot usage.
Mem malloc Initialization (4M - 3M): Done

CPU : ARM926 (Rev 0)
Streaming disabled
VFP initialized to Run Fast Mode.
USB 0: host mode
PCI 0: PCI Express Root Complex Interface
CPU: Write allocate enabled
Net:   egiga0 [PRIME]
Hit any key to stop autoboot:  0

Reset IDE:
Marvell Serial ATA Adapter
Found adapter at bus 0, device 1 ... Scanning channels
  Device 0: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEMXAY
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 1: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEG2XA
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 2: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEMBH2
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)
  Device 3: OK
Model: ST3160812AS                              Firm: 3.ADJ    Ser#:             5LSEE8ZG
            Type: Hard Disk
            Supports 48-bit addressing
            Capacity: 152587.8 MB = 149.0 GB (312500000 x 512)

## Booting image at ffcc0000 ...
   Image Name:   SharespaceKImage
   Created:      2015-10-17  11:52:29 UTC
   Image Type:   ARM Linux Kernel Image (uncompressed)
   Data Size:    1499600 Bytes =  1.4 MB
   Load Address: 00008000
   Entry Point:  00008000
   Verifying Checksum ... OK
OK
## Loading Ramdisk Image at 01100000 ...
   Image Name:   SharespaceInitrd
   Created:      2015-10-17  11:53:57 UTC
   Image Type:   ARM Linux RAMDisk Image (gzip compressed)
   Data Size:    8892506 Bytes =  8.5 MB
   Load Address: 00000000
   Entry Point:  00000000
   Verifying Checksum ... OK

Starting kernel ...

Uncompressing Linux... done, booting the kernel.
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Initializing cgroup subsys cpuset
[    0.000000] Initializing cgroup subsys cpu
[    0.000000] Initializing cgroup subsys cpuacct
[    0.000000] Linux version 3.10.0+ (thomas@diamond) (gcc version 4.9.2 ( 4.9.2-10) ) #2 Tue Oct 13 14:50:33 UTC 2015
[    0.000000] CPU: Feroceon [41069260] revision 0 (ARMv5TEJ), cr=00053177
[    0.000000] CPU: VIVT data cache, VIVT instruction cache
[    0.000000] Machine: WD Sharespace
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Clearing invalid memory bank 0KB@0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x00000000
[    0.000000] Ignoring unrecognised tag 0x41000403
[    0.000000] Memory policy: ECC disabled, Data cache writeback
[    0.000000] Built 1 zonelists in Zone order, mobility grouping on.  Total pages: 32512
[    0.000000] Kernel command line: console=ttyS0,115200 root=/dev/md0
[    0.000000] PID hash table entries: 512 (order: -1, 2048 bytes)
[    0.000000] Dentry cache hash table entries: 16384 (order: 4, 65536 bytes)
[    0.000000] Inode-cache hash table entries: 8192 (order: 3, 32768 bytes)
[    0.000000] allocated 262144 bytes of page_cgroup
[    0.000000] please try 'cgroup_disable=memory' option if you don't want memory cgroups
[    0.000000] Memory: 128MB = 128MB total
[    0.000000] Memory: 116628k/116628k available, 14444k reserved, 0K highmem
[    0.000000] Virtual kernel memory layout:
[    0.000000]     vector  : 0xffff0000 - 0xffff1000   (   4 kB)
[    0.000000]     fixmap  : 0xfff00000 - 0xfffe0000   ( 896 kB)
[    0.000000]     vmalloc : 0xc8800000 - 0xff000000   ( 872 MB)
[    0.000000]     lowmem  : 0xc0000000 - 0xc8000000   ( 128 MB)
[    0.000000]     modules : 0xbf000000 - 0xc0000000   (  16 MB)
[    0.000000]       .text : 0xc0008000 - 0xc03985ec   (3650 kB)
[    0.000000]       .init : 0xc0399000 - 0xc03bb1a4   ( 137 kB)
[    0.000000]       .data : 0xc03bc000 - 0xc03fb8e0   ( 255 kB)
[    0.000000]        .bss : 0xc03fb8e0 - 0xc043b710   ( 256 kB)
[    0.000000] NR_IRQS:64
[    0.000000] sched_clock: 32 bits at 166MHz, resolution 5ns, wraps every 25769ms
[    0.000000] Console: colour dummy device 80x30
[    3.403756] Calibrating delay loop... 498.89 BogoMIPS (lpj=2494464)
[    3.463476] pid_max: default: 32768 minimum: 301
[    3.463644] Security Framework initialized
[    3.463732] Mount-cache hash table entries: 512
[    3.464749] Initializing cgroup subsys memory
[    3.464872] Initializing cgroup subsys devices
[    3.464893] Initializing cgroup subsys freezer
[    3.464911] Initializing cgroup subsys net_cls
[    3.464928] Initializing cgroup subsys blkio
[    3.464945] Initializing cgroup subsys perf_event
[    3.465100] CPU: Testing write buffer coherency: ok
[    3.465767] Setting up static identity map for 0xc028f6b8 - 0xc028f6f4
[    3.467683] devtmpfs: initialized
[    3.470127] regulator-dummy: no parameters
[    3.470526] NET: Registered protocol family 16
[    3.472279] DMA: preallocated 256 KiB pool for atomic coherent allocations
[    3.473192] Orion ID: MV88F5281-D0. TCLK=166666667.
[    3.473258] Orion: Applying 5281 D0 WFI workaround.
[    3.475123] PCI host bridge to bus 0000:00
[    3.475161] pci_bus 0000:00: root bus resource [mem 0xe0000000-0xe7ffffff]
[    3.475187] pci_bus 0000:00: root bus resource [io  0x1000-0xffff]
[    3.475212] pci_bus 0000:00: No busn resource found for root bus, will use [bus 00-ff]
[    3.476125] PCI: bus0: Fast back to back transfers disabled
[    3.476219] pci 0000:00:01.0: BAR 0: assigned [mem 0xe0000000-0xe00fffff 64bit]
[    3.476260] pci 0000:00:01.0: BAR 2: assigned [io  0x1000-0x10ff]
[    3.479795] bio: create slab <bio-0> at 0
[    3.481840] Switching to clocksource orion_clocksource
[    3.501250] NET: Registered protocol family 2
[    3.502377] TCP established hash table entries: 1024 (order: 1, 8192 bytes)
[    3.502454] TCP bind hash table entries: 1024 (order: 0, 4096 bytes)
[    3.502499] TCP: Hash tables configured (established 1024 bind 1024)
[    3.502733] TCP: reno registered
[    3.502761] UDP hash table entries: 256 (order: 0, 4096 bytes)
[    3.502808] UDP-Lite hash table entries: 256 (order: 0, 4096 bytes)
[    3.503203] NET: Registered protocol family 1
[    3.503636] Unpacking initramfs...
[    5.595781] Freeing initrd memory: 8680K (c1101000 - c197b000)
[    5.596974] audit: initializing netlink socket (disabled)
[    5.597042] type=2000 audit(2.180:1): initialized
[    5.598312] VFS: Disk quotas dquot_6.5.2
[    5.598399] Dquot-cache hash table entries: 1024 (order 0, 4096 bytes)
[    5.598676] msgmni has been set to 244
[    5.600159] alg: No test for stdrng (krng)
[    5.600324] Block layer SCSI generic (bsg) driver version 0.4 loaded (major 252)
[    5.600615] io scheduler noop registered
[    5.600636] io scheduler deadline registered
[    5.600679] io scheduler cfq registered (default)
[    5.601250] Serial: 8250/16550 driver, 2 ports, IRQ sharing disabled
[    5.622761] serial8250.0: ttyS0 at MMIO 0xf1012000 (irq = 3) is a 16550A
[    6.084924] console [ttyS0] enabled
[    6.109233] serial8250.1: ttyS1 at MMIO 0xf1012100 (irq = 4) is a 16550A
[    6.117440] physmap platform flash device: 01000000 at ff000000
[    6.123733] physmap-flash.0: Found 1 x16 devices at 0x0 in 8-bit bank. Manufacturer ID 0x000001 Chip ID 0x002101
[    6.133938] Amd/Fujitsu Extended Query Table at 0x0040
[    6.139066]   Amd/Fujitsu Extended Query version 1.3.
[    6.144121] number of CFI chips: 1
[    6.167114] Creating 5 MTD partitions on "physmap-flash.0":
[    6.172742] 0x000000ca0000-0x000000cc0000 : "U-Boot environment"
[    6.180443] 0x000000e80000-0x000000f80000 : "Pre-RootFS"
[    6.187445] 0x000000cc0000-0x000000e80000 : "Kernel"
[    6.194109] 0x000000000000-0x000000ca0000 : "Full RootFS"
[    6.201133] 0x000000f80000-0x000001000000 : "U-Boot"
[    6.208766] mousedev: PS/2 mouse device common for all mice
[    6.214807] i2c /dev entries driver
[    6.219164] rtc-pcf8563 0-0051: chip found, driver version 0.4.3
[    6.227087] rtc-pcf8563 0-0051: rtc core: registered rtc-pcf8563 as rtc0
[    6.234488] TCP: cubic registered
[    6.237800] NET: Registered protocol family 17
[    6.242343] VFP support v0.3: implementor 41 architecture 1 part 10 variant 9 rev 0
[    6.250905] registered taskstats version 1
[    6.256968] rtc-pcf8563 0-0051: setting system clock to 2015-10-17 12:19:13 UTC (1445084353)
[    6.266595] Freeing unused kernel memory: 136K (c0399000 - c03bb000)
Loading, please wait...
[    6.391481] systemd-udevd[49]: starting version 215
[    6.550395] mv643xx_eth: MV-643xx 10/100/1000 ethernet driver version 1.4
[    6.582561] SCSI subsystem initialized
[    6.637468] libphy: orion_mdio_bus: probed
[    6.643526] mv643xx_eth_port mv643xx_eth_port.0 eth0: port 0 with MAC address 00:90:a9:5e:36:99
[    6.690600] usbcore: registered new interface driver usbfs
[    6.712826] usbcore: registered new interface driver hub
[    6.726302] sata_mv 0000:00:01.0: Gen-IIE 32 slots 4 ports SCSI mode IRQ via INTx
[    6.749930] usbcore: registered new device driver usb
[    6.778052] ehci_hcd: USB 2.0 'Enhanced' Host Controller (EHCI) Driver
[    6.830876] ehci-orion: EHCI orion driver
[    6.851494] scsi0 : sata_mv
[    6.860598] scsi1 : sata_mv
[    6.864256] orion-ehci orion-ehci.0: EHCI Host Controller
[    6.869688] orion-ehci orion-ehci.0: new USB bus registered, assigned bus number 1
[    6.877375] scsi2 : sata_mv
[    6.884911] scsi3 : sata_mv
[    6.888223] ata1: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0022000 irq 11
[    6.895919] ata2: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0024000 irq 11
[    6.903588] ata3: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0026000 irq 11
[    6.911222] ata4: SATA max UDMA/133 mmio m1048576@0xe0000000 port 0xe0028000 irq 11
[    6.957435] orion-ehci orion-ehci.0: irq 17, io mem 0xf1050000
[    7.002032] orion-ehci orion-ehci.0: USB 2.0 started, EHCI 1.00
[    7.008069] usb usb1: New USB device found, idVendor=1d6b, idProduct=0002
[    7.014902] usb usb1: New USB device strings: Mfr=3, Product=2, SerialNumber=1
[    7.022133] usb usb1: Product: EHCI Host Controller
[    7.026996] usb usb1: Manufacturer: Linux 3.10.0+ ehci_hcd
[    7.032492] usb usb1: SerialNumber: orion-ehci.0
[    7.146526] hub 1-0:1.0: USB hub found
[    7.150307] hub 1-0:1.0: 1 port detected
[    7.421959] ata1: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[    7.491941] usb 1-1: new high-speed USB device number 2 using orion-ehci
[    7.502002] ata1.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[    7.507684] ata1.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[    7.592023] ata1.00: configured for UDMA/133
[    7.596981] scsi 0:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[    7.644456] usb 1-1: New USB device found, idVendor=05e3, idProduct=0608
[    7.651165] usb 1-1: New USB device strings: Mfr=0, Product=1, SerialNumber=0
[    7.658329] usb 1-1: Product: USB2.0 Hub
[    7.667750] hub 1-1:1.0: USB hub found
[    7.674820] hub 1-1:1.0: 4 ports detected
[    8.111960] ata2: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[    8.191999] ata2.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[    8.197649] ata2.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[    8.282012] ata2.00: configured for UDMA/133
[    8.286973] scsi 1:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[    8.801966] ata3: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[    8.881997] ata3.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[    8.887648] ata3.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[    8.972011] ata3.00: configured for UDMA/133
[    8.977004] scsi 2:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[    9.491959] ata4: SATA link up 3.0 Gbps (SStatus 123 SControl 300)
[    9.572017] ata4.00: ATA-7: ST3160812AS, 3.ADJ, max UDMA/133
[    9.577673] ata4.00: 312500000 sectors, multi 0: LBA48 NCQ (depth 31/32)
[    9.662015] ata4.00: configured for UDMA/133
[    9.666970] scsi 3:0:0:0: Direct-Access     ATA      ST3160812AS      3.AD PQ: 0 ANSI: 5
[    9.729213] sd 0:0:0:0: [sda] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[    9.745382] sd 0:0:0:0: [sda] Write Protect is off
[    9.754816] sd 0:0:0:0: [sda] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[    9.765636] sd 1:0:0:0: [sdb] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[    9.774329] sd 2:0:0:0: [sdc] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[    9.783165] sd 3:0:0:0: [sdd] 312500000 512-byte logical blocks: (160 GB/149 GiB)
[    9.793309] sd 1:0:0:0: [sdb] Write Protect is off
[    9.798787] sd 2:0:0:0: [sdc] Write Protect is off
[    9.807065] sd 3:0:0:0: [sdd] Write Protect is off
[    9.813811] sd 1:0:0:0: [sdb] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[    9.823221] sd 2:0:0:0: [sdc] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[    9.832729]  sda: sda1 sda2
[    9.836082] sd 3:0:0:0: [sdd] Write cache: enabled, read cache: enabled, doesn't support DPO or FUA
[    9.848922] sd 0:0:0:0: [sda] Attached SCSI disk
[    9.884687]  sdc: sdc1 sdc2
[    9.888228]  sdb: sdb1 sdb2
[    9.894331]  sdd: sdd1
[    9.904212] sd 2:0:0:0: [sdc] Attached SCSI disk
[    9.909818] sd 3:0:0:0: [sdd] Attached SCSI disk
[    9.914796] sd 1:0:0:0: [sdb] Attached SCSI disk
[    9.932677] sd 0:0:0:0: Attached scsi generic sg0 type 0
[    9.939347] sd 1:0:0:0: Attached scsi generic sg1 type 0
[    9.945583] sd 2:0:0:0: Attached scsi generic sg2 type 0
[    9.951785] sd 3:0:0:0: Attached scsi generic sg3 type 0
[   10.565897] md: bind<sdb1>
[   10.624252] md: bind<sdc1>
[   10.691729] md: bind<sda1>
[   10.717852] md: raid1 personality registered for level 1
[   10.726918] md/raid1:md0: active with 3 out of 4 mirrors
[   10.732502] md0: detected capacity change from 0 to 10729029632
[   10.749957]  md0: unknown partition table
Begin: Loading essential drivers ... done.
Begin: Running /scripts/init-premount ... done.
Begin: Mounting root file system ... Begin: Running /scripts/local-top ... Begin: Assembling all MD arrays ... Failure: failed to assemble all a.
done.
done.
Begin: Running /scripts/local-premount ... done.
Begin: Checking root file system ... fsck from util-linux 2.25.2
fsck: error 2 (No such file or directory) while executing fsck.ext4 for /dev/md0
fsck exited with status code 8
done.
Warning: File system check failed but did not detect errors
[   16.399060] EXT4-fs (md0): mounted filesystem with ordered data mode. Opts: (null)
done.
Begin: Running /scripts/local-bottom ... done.
Begin: Running /scripts/init-bottom ... done.
[   17.014342] systemd[1]: systemd 215 running in system mode. (+PAM +AUDIT +SELINUX +IMA +SYSVINIT +LIBCRYPTSETUP +GCRYPT +ACL +XZ -SECCOMP -AP)
[   17.028273] systemd[1]: Detected architecture 'arm'.

Welcome to Debian GNU/Linux 8 (jessie)!

[   17.185989] systemd[1]: Inserted module 'autofs4'
[   17.261364] NET: Registered protocol family 10
[   17.267452] systemd[1]: Inserted module 'ipv6'
[   17.285742] systemd[1]: Set hostname to <sharespace>.
[   18.076128] systemd[1]: Cannot add dependency job for unit dbus.socket, ignoring: Unit dbus.socket failed to load: No such file or directory.
[   18.089408] systemd[1]: Cannot add dependency job for unit display-manager.service, ignoring: Unit display-manager.service failed to load: No.
[   18.110440] systemd[1]: Starting Forward Password Requests to Wall Directory Watch.
[   18.118956] systemd[1]: Started Forward Password Requests to Wall Directory Watch.
[   18.126771] systemd[1]: Expecting device dev-ttyS0.device...
         Expecting device dev-ttyS0.device...
[   18.152206] systemd[1]: Starting Remote File Systems (Pre).
[  OK  ] Reached target Remote File Systems (Pre).
[   18.182152] systemd[1]: Reached target Remote File Systems (Pre).
[   18.188471] systemd[1]: Starting Encrypted Volumes.
[  OK  ] Reached target Encrypted Volumes.
[   18.212155] systemd[1]: Reached target Encrypted Volumes.
[   18.217812] systemd[1]: Starting Dispatch Password Requests to Console Directory Watch.
[   18.226326] systemd[1]: Started Dispatch Password Requests to Console Directory Watch.
[   18.234464] systemd[1]: Starting Paths.
[  OK  ] Reached target Paths.
[   18.252154] systemd[1]: Reached target Paths.
[   18.256833] systemd[1]: Starting Arbitrary Executable File Formats File System Automount Point.
[  OK  ] Set up automount Arbitrary Executable File Formats F...utomount Point.
[   18.292164] systemd[1]: Set up automount Arbitrary Executable File Formats File System Automount Point.
[   18.301780] systemd[1]: Starting Swap.
[  OK  ] Reached target Swap.
[   18.322151] systemd[1]: Reached target Swap.
[   18.326622] systemd[1]: Starting Root Slice.
[  OK  ] Created slice Root Slice.
[   18.352155] systemd[1]: Created slice Root Slice.
[   18.357055] systemd[1]: Starting User and Session Slice.
[  OK  ] Created slice User and Session Slice.
[   18.382161] systemd[1]: Created slice User and Session Slice.
[   18.388101] systemd[1]: Starting Delayed Shutdown Socket.
[  OK  ] Listening on Delayed Shutdown Socket.
[   18.412161] systemd[1]: Listening on Delayed Shutdown Socket.
[   18.418103] systemd[1]: Starting /dev/initctl Compatibility Named Pipe.
[  OK  ] Listening on /dev/initctl Compatibility Named Pipe.
[   18.442159] systemd[1]: Listening on /dev/initctl Compatibility Named Pipe.
[   18.449306] systemd[1]: Starting Journal Socket (/dev/log).
[  OK  ] Listening on Journal Socket (/dev/log).
[   18.472164] systemd[1]: Listening on Journal Socket (/dev/log).
[   18.478343] systemd[1]: Starting udev Control Socket.
[  OK  ] Listening on udev Control Socket.
[   18.502158] systemd[1]: Listening on udev Control Socket.
[   18.507817] systemd[1]: Starting udev Kernel Socket.
[  OK  ] Listening on udev Kernel Socket.
[   18.532158] systemd[1]: Listening on udev Kernel Socket.
[   18.537710] systemd[1]: Starting Journal Socket.
[  OK  ] Listening on Journal Socket.
[   18.562160] systemd[1]: Listening on Journal Socket.
[   18.567447] systemd[1]: Starting System Slice.
[  OK  ] Created slice System Slice.
[   18.592157] systemd[1]: Created slice System Slice.
[   18.597367] systemd[1]: Starting File System Check on Root Device...
         Starting File System Check on Root Device...
[   18.628092] systemd[1]: Starting system-getty.slice.
[  OK  ] Created slice system-getty.slice.
[   18.662199] systemd[1]: Created slice system-getty.slice.
[   18.667789] systemd[1]: Starting system-serial\x2dgetty.slice.
[  OK  ] Created slice system-serial\x2dgetty.slice.
[   18.692295] systemd[1]: Created slice system-serial\x2dgetty.slice.
[   18.698927] systemd[1]: Starting Increase datagram queue length...
         Starting Increase datagram queue length...
[   18.715131] systemd[1]: Mounting POSIX Message Queue File System...
         Mounting POSIX Message Queue File System...
[   18.755326] systemd[1]: Starting Create list of required static device nodes for the current kernel...
         Starting Create list of required static device nodes...rrent kernel...
[   18.777287] systemd[1]: Starting udev Coldplug all Devices...
         Starting udev Coldplug all Devices...
[   18.799112] systemd[1]: Mounted Huge Pages File System.
[   18.832847] systemd[1]: Mounting Debug File System...
         Mounting Debug File System...
[   18.947596] systemd[1]: Starting Load Kernel Modules...
         Starting Load Kernel Modules...
[   19.037337] systemd[1]: Started Set Up Additional Binary Formats.
[   19.049995] systemd[1]: Starting Slices.
[  OK  [   19.055626] systemd[1]: Reached target Slices.
] Reached target Slices.
[  OK  [   19.079426] systemd[1]: Mounted Debug File System.
] Mounted Debug [   19.085968] systemd[1]: Mounted POSIX Message Queue File System.
File System.
[  OK  ] Mounted POSIX Message Queue File System.
[  OK  [   19.100109] systemd[1]: Started Increase datagram queue length.
] Started Increase datagram queue length.
[  OK  [   19.123594] systemd[1]: Started Create list of required static device nodes for the current kernel.
] Started Create list of required static device nodes ...current kernel.
[  OK  [   19.155235] systemd[1]: Started Load Kernel Modules.
] Started Load Kernel Modules.
[  OK  ] Started File System Check on Root Device.
[   19.262223] systemd[1]: Started File System Check on Root Device.
[  OK  ] Started udev Coldplug all Devices.
[   19.342159] systemd[1]: Started udev Coldplug all Devices.
[   19.624096] systemd[1]: Starting Remount Root and Kernel File Systems...
         Starting Remount Root and Kernel File Systems...
[   19.658588] systemd[1]: Mounted FUSE Control File System.
[   19.672152] systemd[1]: Mounted Configuration File System.
[   19.677876] systemd[1]: Starting Apply Kernel Variables...
         Starting Apply Kernel Variables...
[   19.718887] systemd[1]: Starting Create Static Device Nodes in /dev...
[   19.726914] EXT4-fs (md0): re-mounted. Opts: errors=remount-ro
         Starting Create Static Device Nodes in /dev...
[   19.768280] systemd[1]: Starting Syslog Socket.
[  OK  ] Listening on Syslog Socket.
[   19.802265] systemd[1]: Listening on Syslog Socket.
[   19.807395] systemd[1]: Starting Sockets.
[  OK  ] Reached target Sockets.
[   19.842240] systemd[1]: Reached target Sockets.
[   19.846997] systemd[1]: Starting Journal Service...
         Starting Journal Service...
[  OK  ] Started Journal Service.
[   19.887520] systemd[1]: Started Journal Service.
[  OK  ] Started Remount Root and Kernel File Systems.
[  OK  ] Started Apply Kernel Variables.
[  OK  ] Started Create Static Device Nodes in /dev.
         Starting udev Kernel Device Manager...
         Starting Load/Save Random Seed...
[  OK  ] Reached target Local File Systems (Pre).
[  OK  [   20.322335] systemd-udevd[165]: starting version 215
] Started udev Kernel Device Manager.
         Starting Copy rules generated while the root was ro...
         Starting LSB: MD array assembly...
[  OK  ] Started Load/Save Random Seed.
[  OK  ] Started Copy rules generated while the root was ro.
[   17.399679] systemd-fsck[138]: /dev/md0: clean, 19343/655360 files, 228741/2619392 blocks
[   21.187252] orion_wdt: Initial timeout 25 sec
[  OK  ] Started LSB: MD array assembly.
[  OK  ] Reached target Local File Systems.
         Starting Create Volatile Files and Directories...
[  OK  ] Reached target Remote File Systems.
         Starting Trigger Flushing of Journal to Persistent Storage...
         Starting LSB: Raise network interfaces....
[  OK  ] Started Create Volatile Files and Directories.
[   21.786834] systemd-journald[163]: Received request to flush runtime journal from PID 1
[  OK  ] Started Trigger Flushing of Journal to Persistent Storage.
         Starting Update UTMP about System Boot/Shutdown...
[  OK  ] Started Update UTMP about System Boot/Shutdown.
[  OK  ] Found device /dev/ttyS0.
         Starting MD array monitor...
[  OK  ] Started MD array monitor.
[   23.956378] mv643xx_eth_port mv643xx_eth_port.0 eth0: link down
[   23.964239] IPv6: ADDRCONF(NETDEV_UP): eth0: link is not ready
[   27.594868] mv643xx_eth_port mv643xx_eth_port.0 eth0: link up, 1000 Mb/s, full duplex, flow control disabled
[   27.604748] IPv6: ADDRCONF(NETDEV_CHANGE): eth0: link becomes ready
[  OK  ] Started LSB: Raise network interfaces..
[  OK  ] Reached target Network.
[  OK  ] Reached target System Initialization.
[  OK  ] Reached target Timers.
[  OK  ] Reached target Basic System.
         Starting OpenBSD Secure Shell server...
[  OK  ] Started OpenBSD Secure Shell server.
         Starting Regular background program processing daemon...
[  OK  ] Started Regular background program processing daemon.
         Starting /etc/rc.local Compatibility...
         Starting getty on tty2-tty6 if dbus and logind are not available...
         Starting System Logging Service...
         Starting Permit User Sessions...
[  OK  ] Started /etc/rc.local Compatibility.
[  OK  ] Started Permit User Sessions.
[  OK  ] Started System Logging Service.
[  OK  ] Started getty on tty2-tty6 if dbus and logind are not available.
         Starting Getty on tty6...
[  OK  ] Started Getty on tty6.
         Starting Getty on tty5...
[  OK  ] Started Getty on tty5.
         Starting Getty on tty4...
[  OK  ] Started Getty on tty4.
         Starting Getty on tty3...
[  OK  ] Started Getty on tty3.
         Starting Getty on tty2...
[  OK  ] Started Getty on tty2.
         Starting Getty on tty1...
[  OK  ] Started Getty on tty1.
         Starting Serial Getty on ttyS0...
[  OK  ] Started Serial Getty on ttyS0.
[  OK  ] Reached target Login Prompts.
[  OK  ] Reached target Multi-User System.
[  OK  ] Reached target Graphical Interface.
         Starting Update UTMP about System Runlevel Changes...
[  OK  ] Started Update UTMP about System Runlevel Changes.

Debian GNU/Linux 8 sharespace ttyS0

sharespace login: root
Password:
Last login: Sat Oct 17 13:12:38 BST 2015 on ttyS0
Linux sharespace 3.10.0+ #2 Tue Oct 13 14:50:33 UTC 2015 armv5tel

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
root@sharespace:~#
```

Yay, we have a working system. Erase sdd and partition it:

```
root@sharespace:~# dd if=/dev/zero of=/dev/sdd bs=1M count=10
10+0 records in
10+0 records out
10485760 bytes (10 MB) copied, 0.426046 s, 24.6 MB/s
root@sharespace:~# fdisk /dev/sdd

Welcome to fdisk (util-linux 2.25.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

Device does not contain a recognized partition table.
Created a new DOS disklabel with disk identifier 0x23b5f5ce.

Command (m for help): n
Partition type
   p   primary (0 primary, 0 extended, 4 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (1-4, default 1):
First sector (2048-312499999, default 2048):
Last sector, +sectors or +size{K,M,G,T,P} (2048-312499999, default 312499999): +10G

Created a new partition 1 of type 'Linux' and of size 10 GiB.

Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2):
First sector (20973568-312499999, default 20973568):
Last sector, +sectors or +size{K,M,G,T,P} (20973568-312499999, default 312499999):

Created a new partition 2 of type 'Linux' and of size 139 GiB.

Command (m for help): t
Partition number (1,2, default 2): 1
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): t
Partition number (1,2, default 2): 2
Hex code (type L to list all codes): fd

Changed type of partition 'Linux' to 'Linux raid autodetect'.

Command (m for help): p

Disk /dev/sdd: 149 GiB, 160000000000 bytes, 312500000 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x23b5f5ce

Device     Boot    Start       End   Sectors  Size Id Type
/dev/sdd1           2048  20973567  20971520   10G fd Linux raid autodetect
/dev/sdd2       20973568 312499999 291526432  139G fd Linux raid autodetect


Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.

root@sharespace:~#
```

Add sdd1 to md0:

```
root@sharespace:~# cat /proc/mdstat
Personalities : [raid1]
md0 : active raid1 sda1[0] sdc1[2] sdb1[1]
      10477568 blocks super 1.2 [4/3] [UUU_]

unused devices: <none>
root@sharespace:~# mdadm /dev/md0 -a /dev/sdd1
mdadm: added /dev/sdd1
root@sharespace:~# cat /proc/mdstat
Personalities : [raid1]
md0 : active raid1 sdd1[4] sda1[0] sdc1[2] sdb1[1]
      10477568 blocks super 1.2 [4/3] [UUU_]
      [>....................]  recovery =  2.8% (302080/10477568) finish=2.2min speed=75520K/sec

unused devices: <none>
root@sharespace:~#

```

Create a new raid5 of the rest of the disks:

```
root@sharespace:~# mdadm -C /dev/md1 -l 5 -n 4 /dev/sd[abcd]2
mdadm: Defaulting to version 1.2 metadata
mdadm: array /dev/md1 started.
root@sharespace:~# cat /proc/mdstat
Personalities : [raid1] [raid6] [raid5] [raid4]
md1 : active raid5 sdd2[4] sdc2[2] sdb2[1] sda2[0]
      436895232 blocks super 1.2 level 5, 512k chunk, algorithm 2 [4/3] [UUU_]
      	resync=DELAYED
      bitmap: 2/2 pages [8KB], 65536KB chunk

md0 : active raid1 sdd1[4] sda1[0] sdc1[2] sdb1[1]
      10477568 blocks super 1.2 [4/3] [UUU_]
      [========>............]  recovery = 41.4% (4344256/10477568) finish=1.5min speed=65221K/sec

unused devices: <none>
root@sharespace:~#
```

Make a new ext4 filesystem on the raid5:

```
root@sharespace:~# mkfs -t ext4 /dev/md1
mke2fs 1.42.12 (29-Aug-2014)
Creating filesystem with 109223808 4k blocks and 27312128 inodes
Filesystem UUID: e08c751b-43db-4518-8bb2-44112c3484cc
Superblock backups stored on blocks:
	32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632, 2654208,
	4096000, 7962624, 11239424, 20480000, 23887872, 71663616, 78675968,
	102400000

Allocating group tables: done
Writing inode tables: done
Creating journal (32768 blocks): done
Writing superblocks and filesystem accounting information: done

root@sharespace:~#
```

Create fstab entry, mount point and mount it:

```
root@sharespace:~# echo "/dev/md1 /srv/store ext4 defaults,noatime,errors=remount-ro 0 2" >> /etc/fstab
root@sharespace:~# mount /srv/store
root@sharespace:~# df -h /srv/store/
Filesystem      Size  Used Avail Use% Mounted on
/dev/md1        410G   71M  390G   1% /srv/store
root@sharespace:~#
```
