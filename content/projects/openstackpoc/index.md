---
title: "OpenStack proof of concept"
summary: ""
authors: ["thomas"]
tags: ["openstack", "linux"]
categories: []
date: 2016-03-18
aliases: [/tomsweb/CentOSOpenStackPOC/]
showTableOfContents: true
---

## Introduction

This is a short howto on creating a small OpenStack proof of concept on CentOS.
The aim is to create a proof of concept OpenStack Liberty deployment on a single
Linux testing machine, where the deployment matches real world hardware
deployments. The aim is not to just install all the OpenStack components in a
single machine or virtual machine. The aim is to make use of Linux, KVM and
libvirt to create virtual hardware to run the various OpenStack components to
match a real world deployment. Each virtual machine represents what could be a
physical host. It will use CentOS 7 as the base operating system and use the RDO
OpenStack packages. This matches the Red Hat OpenStack Platform, however does
not need subscriptions to install and test.

The deployment will use tripleo and ironic for deployment and provisioning.
Meaning that a small cut-down OpenStack cloud called the undercloud will look
after the hardware. Then this will deploy a production OpenStack cloud with all
the Components running, this is called the overcloud. The deployment consist of
1 x undercloud virtual machine and 3 x overcloud virtual machines. One of these
machines will run all the usual OpenStack components (ie be a Controller in
RDO/Red Hat terms) and the other two will run Nova (ie be Compute in RDO/Red Hat
terms).

It's mostly cobbled together with the aid of:

- https://trickycloud.wordpress.com/2015/11/15/openstack-lab-on-your-laptop-with-tripleo-and-director/
- http://keithtenzer.com/2015/10/14/howto-openstack-deployment-using-tripleo-and-the-red-hat-openstack-director/
- https://repos.fedorapeople.org/repos/openstack-m/rdo-manager-docs/liberty/basic_deployment/basic_deployment_cli.html.
- https://www.rdoproject.org/install/tripleo-cli/
- https://wiki.openstack.org/wiki/TripleO
- http://docs.openstack.org/developer/tripleo-docs/
- http://docs.openstack.org/developer/tripleo-docs/troubleshooting/troubleshooting-overcloud.html

## Preparation

A few preparations are needed before getting started. First you need a Linux
machine, the more CPUs, memory and fast disk the better. This deployment was
done on an Intel i5 laptop with 16GB RAM and a SSD. Next you need to get KVM and
libvirt running. I used Debian and a simple "apt-get install virt-manager" was
enough for me to start playing. However this should be very doable on any other
Debian or Fedora derived distribution.

Next we need to think about the software, given that there may be multiple
permutations and a little trial and error for the install I set up a local
mirror. This is not actually needed, but it speeds up the install. Ideally
having a full CentOS mirror is best. However I was not able do that in this
instance. I had a restricted network connection that was usable but
frustratingly slow. I took the CentOS-7-x86_64-Everything-1511.iso and loopback
mounted it and re-exported it via Apache. This gave me a quick and dirty mirror.
In order to speed the network up further I also installed the Squid web proxy
and tuned it to store large files. While this is getting a little off topic I
think it's worth including some brief notes on how to do this.

To get the ISO mounted on boot make an entry in /etc/fstab like the following:

```
$ cat /etc/fstab | grep CentOS
/srv/mirror/CentOS-7-x86_64-Everything-1511.iso /srv/mirror/CentOS-7-x86_64-Everything-1511.iso.d iso9660 defaults
$
```

And to get Apache to serve it add an alias to the location and enable access:

```
$ grep "Alias /mirror" /etc/apache2/sites-enabled/000-default.conf
	Alias /mirror /srv/mirror
$ grep -A 4 "Directory /srv/mirror" /etc/apache2/sites-enabled/000-default.conf
	<Directory /srv/mirror>
		Options Indexes FollowSymLinks MultiViews
		AllowOverride None
		Require all granted
	</Directory>
$
```

As for the extra Squid config, I got most of the config from there sites:

- http://ma.ttwagner.com/lazy-distro-mirrors-with-squid/
- http://sharadchhetri.com/2014/03/15/install-configure-transparent-squid-proxy-server-rhelcentos-6-x/

However, this setup is a little half baked, really I should have implemented a
transparent proxy that would also handle the fast mirror detection, so that the
304 http redirects from the CentOS mirrors would not pollute the cache with gets
from alternative mirrors. I get round this by rewriting the repo files and
instructing the build process to always use the cache. Again with a full mirror
of Centos and RDO it should be possible to do this offline. We want to tell
squid to allow access from a few virtual networks we will create, tell it to
store large objects, get it to use disk cache, up the refresh pattern to rpm,
deb and iso files to a long time and lastly tell it to shutdown quickly. In
any case here were the changes I made to Squid which sped up the multiple updates
from Centos 1511 to present updates:

```
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12
acl localnet src 192.168.0.0/16
http_access allow localnet
maximum_object_size 4096 MB
cache_dir ufs /var/spool/squid 20480 16 256
refresh_pattern -i .rpm$ 129600 100% 129600 refresh-ims override-expire
refresh_pattern -i .deb$ 129600 100% 129600 refresh-ims override-expire
refresh_pattern -i .iso$ 129600 100% 129600 refresh-ims override-expire
shutdown_lifetime 2 seconds
```

For the setup of undercloud and overcloud hosts, the undercloud needs to be able
to manage the overcloud hosts. In real hardware this would usually make use of
IPMI. However given our virtual setup we can't use IPMI, so the undercloud is
configured to issue libvirt commands to the libvirt host over ssh.
Authentication is taken care of with ssh keys, however in order for non-root
users to manage libvirt machines I setup this small policy kit file so that my
user (thomas) can run any libvirt command (change as needed):

```
$ sudo cat /etc/polkit-1/localauthority/50-local.d/50-libvirt-user-stack.pkla
[libvirt Management Access]
Identity=unix-user:thomas
Action=org.libvirt.unix.manage
ResultAny=yes
ResultInactive=yes
ResultActive=yes
$
```

Regarding nested virtualization, given that we are going to run a Nova compute
node in a virtual machine we will need some form of nested virtualization. We
could give the option "--libvirt-type qem" to the "openstack overcloud deploy"
command to just use qemu inside the virtual machine, however we can instruct KVM
to allow nested virtualization. The sysfs file
/sys/module/kvm_intel/parameters/nested show the current value. A quick way to
configure this is:

```
$ echo "options kvm_intel nested=1" | sudo tee /etc/modprobe.d/kvm-nested.conf
$ sudo modprobe -r kvm_intel; sudo modprobe kvm_intel
$ cat /sys/module/kvm_intel/parameters/nested
```

Also KVM needs to copy the same CPU type, I could not find out how to do this
with virsh. It could be done by editing the virtual machine xml files, however I
just used the GUI. So for each virtual machine created open virt-manager, open
each virtual machine in turn, click the "View" menu and select "details". Then
click "Processor" and check the "Copy host CPU configuration" box. After that
hit apply.

### Networking Diagram

The following is a diagram that shows a pictorial representation of the
networking. The top machine in the hypervisor host, in my case a real laptop.
When looking at the example snippets the "$ " prompt is used. The lower boxes
are the virtual machines that run on the above mentioned host. The red network
is the provisioning network. For example a real host would have a first nic that
would accept IPMI command and be able to PXE boot without adding any other
bonding, lacp or vlan complexities. The blue network is the OpenStack network.
It carries the production traffic and for the case of the overcloud machines
each has 2 interfaces which match what a real life setup would look like. It
should be noted that in this setup multiple VLANs are used on the blue network
to segregate the traffic. OpenStack handles all DHCP and ip address allocation
for us. This does seem to work however I'm currently not 100% sure how, I can
only assume that the libvirt virtual switch (which is a Linux bridge) somehow
handles the vlan segregation.

{{< figure src="openstack-network.png">}}

[openstack-network.dia](openstack-network.dia)

### Networking Setup

We need to make some network xml definition files: net-external.xml

```
<network>
  <name>external</name>
  <forward mode='nat'>
  </forward>
  <ip address='10.0.0.1' netmask='255.255.255.0'>
  </ip>
</network>
```

net-provisioning.xml

```
<network>
  <name>provisioning</name>
  <ip address='172.16.0.1' netmask='255.255.255.0'>
  </ip>
</network>
```

I created the above virtual networks by using here files and virsh as follows:

```
$ cat << EOF > net-external.xml
> <network>
>   <name>external</name>
>   <forward mode='nat'>
>   </forward>
>   <ip address='10.0.0.1' netmask='255.255.255.0'>
>   </ip>
> </network>
> EOF
$ cat << EOF > net-provisioning.xml
> <network>
>   <name>provisioning</name>
>   <ip address='172.16.0.1' netmask='255.255.255.0'>
>   </ip>
> </network>
> EOF
$
$ for n in external provisioning; do sudo virsh net-define net-$n.xml; sudo virsh net-autostart $n; sudo virsh net-start $n; done
Network external defined from net-external.xml

Network external marked as autostarted

Network external started

Network provisioning defined from net-provisioning.xml

Network provisioning marked as autostarted

Network provisioning started

$
$ rm net-external.xml net-provisioning.xml
```

## Undercloud

### Create undercloud01 virtual machine and install CentOS 7.0

I installed CentOS by using the virt-install with a http location. If you don't
have the ISO accessible from a local web server you can just point to a mirror
(something like http://mirror.bytemark.co.uk/centos/7/os/x86_64/ should work
instead). The virt-install(1) with the --location option is quite clever.
Instead of setting up a full blown DHCP server, TFTP server and pxelinux
configuration it extracts a kernel and initrd and boots from them passing any
extra options to the kernel that are required.

I want the installation to be as automated as possible so I used kickstart. For
speed I placed the kickstart file in my pubic_html directory of my home
(~/public_html/ks.cfg). That way it would be accessible via Apache (you may need
to enable the user directory module with "sudo a2enmod userdir"). I left it as
close to the anaconda-ks.cfg as possible. The post installation script goes on
to add the RDO reops and does a yum update. It then installs some base OpenStack
packages. It adds a user called stack, sets the password and gives it full root
access via sudo. You will need to change the rootpw option and the stack
password. If you don't have Squid configured then delete the echo line that sets
the proxy in yum.conf and delete the entried that create the
/etc/profile.d/proxy.sh file. You can also set the ssh key so that you can
connect without a password if you want. Here is the content of the ks.cfg:

```
#version=DEVEL
# System authorization information
auth --enableshadow --passalgo=sha512
# Use CDROM installation media
cdrom
# Use graphical install
#graphical
text
# Run the Setup Agent on first boot
firstboot --enable
ignoredisk --only-use=vda
# Keyboard layouts
keyboard --vckeymap=gb --xlayouts='gb'
# System language
lang en_GB.UTF-8

# Network information
network  --bootproto=static --device=eth0 --ipv6=auto --activate --ip=10.0.0.2 --netmask=255.255.255.0 --gateway=10.0.0.1 --nameserver=10.0.0.1
network  --hostname=undercloud01
network  --bootproto=static --device=eth1 --ipv6=auto --activate --ip=172.16.0.2 --netmask=255.255.255.0

# Root password
rootpw password
# System timezone
timezone Europe/London --isUtc
# System bootloader configuration
bootloader --append=" crashkernel=auto" --location=mbr --boot-drive=vda
# Partition clearing information
#clearpart --none --initlabel
clearpart --all
# Disk partitioning information
part pv.178 --fstype="lvmpv" --ondisk=vda --size=51200
part /boot --fstype="xfs" --ondisk=vda --size=500
volgroup centos --pesize=4096 pv.178
logvol /  --fstype="xfs" --grow --maxsize=51200 --size=1024 --name=root --vgname=centos
logvol swap  --fstype="swap" --size=1024 --name=swap --vgname=centos

#reboot
shutdown

%packages
@^minimal
@core
kexec-tools
tcpdump
screen
telnet

%end

%addon com_redhat_kdump --enable --reserve-mb='auto'

%end

%post
set -x
exec >/root/ks-post-anaconda.log 2>&1
tail -f /root/ks-post-anaconda.log >/dev/tty7 &
/usr/bin/chvt 7

#Set the proxy
echo 'proxy=http://10.0.0.1:3128' >> /etc/yum.conf

cat << EOF > /etc/profile.d/proxy.sh
export http_proxy="http://10.0.0.1:3128"
export https_proxy="http://10.0.0.1:3128"
export no_proxy="10.0.0.0/8,172.16.0.0/12"
EOF

#Move the original repo file out of the way and replaces it with one statically configured to use a single mirror, thus the proxy is used
#https://www.bytemark.co.uk/downloads/support/document_library/Bytemark-Centos.repo.txt
mv -v /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.orig
cat << EOF > /etc/yum.repos.d/CentOS-Base.repo
[base]
name=CentOS-\$releasever - Base
baseurl=http://mirror.bytemark.co.uk/centos/\$releasever/os/\$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7

[updates]
name=CentOS-\$releasever - Updates
baseurl=http://mirror.bytemark.co.uk/centos/\$releasever/updates/\$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7

[extras]
name=CentOS-\$releasever - Extras
baseurl=http://mirror.bytemark.co.uk/centos/\$releasever/extras/\$basearch/
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
EOF

#Originally I install EPEL, however this proved to conflict with the OpenStack repo, so this is now commented.
#yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
#mv -v /etc/yum.repos.d/epel.repo /etc/yum.repos.d/epel.repo.orig
#cat << EOF > /etc/yum.repos.d/epel.repo
#[epel]
#name=Extra Packages for Enterprise Linux 7 - \$basearch
#baseurl=http://mirror.bytemark.co.uk/fedora/epel/7/\$basearch
#failovermethod=priority
#enabled=1
#gpgcheck=1
#gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-7
#EOF


# Update to latest packages
yum clean all
yum -y update

#Install the RDO Liberty release repo and install python-tripleoclient which installs the packages need to start the undercloud install straight after the install
yum install -y http://rdoproject.org/repos/openstack-liberty/rdo-release-liberty.rpm
yum install -y python-tripleoclient

#The following enables the delorean repo rather than the stable one. I tried this but had issues.
#curl -o /etc/yum.repos.d/delorean.repo http://trunk.rdoproject.org/centos7-liberty/current-passed-ci/delorean.repo
#curl -o /etc/yum.repos.d/delorean-deps.repo http://trunk.rdoproject.org/centos7-liberty/delorean-deps.repo
#yum -y install yum-plugin-priorities
#yum install -y python-rdomanager-oscplugin
#yum install -y instack-undercloud

#Next we add a user called stack to do everything as.
useradd stack
echo -en "password\npassword\n" | passwd stack
echo "stack ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/stack
chmod 0440 /etc/sudoers.d/stack

#We need working DNS, so we add this to the hosts file.
echo "172.16.0.2 undercloud01" >> /etc/hosts

#Add the public key to the authorized_keys file.
mkdir -p /root/.ssh
echo "ssh-rsa abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 user@host" > /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys

%end
```

Next is the actual virt-install run. It sets the virtual machine name and gives
it 4GB of RAM with a 60G disk. It sets the OS variant to centos7.0 (the command
"osinfo-query os" gives a full list of variants that are possible). It sets the
location of the install media accessed via http. It adds extra arguments to set
the initial IP, netmask and the location of the kick start files. It gives it
two network interfaces, one in the external network and one in the provisioning
network. The progress of the installation is shown in virt-viewer, once the
installation is finished we don't care about the undercloud01 virtual machine
console anymore, so the - -noreboot option just lets the virt-install command
return after the installation has finished. We start the machine after with
virsh. Note that 60G may seem large, however these are qcow (copy on write)
images, so not all the space is allocated. After the installation is finished
approximately 11G is used.

```
$ sudo virt-install --name undercloud01 --vcpus 1 --memory 4096 --disk size=60 --os-variant centos7.0 --location http://10.0.0.1/mirror/CentOS-7-x86_64-Everything-1511.iso.d --extra-args "ip=10.0.0.2 netmask=255.255.255.0 ks=http://10.0.0.1/~thomas/ks.cfg vga=0" --network network=external --network network=provisioning --noreboot
/usr/share/virt-manager/virtinst/osdict.py:26: PyGIWarning: Libosinfo was imported without specifying a version first. Use gi.require_version('Libosinfo', '1.0') before import to ensure that the right version gets loaded.
  from gi.repository import Libosinfo as libosinfo

Starting install...
Retrieving file vmlinuz...                                                          | 9.8 MB     00:00 ...
Retrieving file initrd.img...                                                       |  73 MB     00:00 ...
Allocating 'undercloud01.qcow2'                                                     |  20 GB     00:00
Creating domain...
Domain creation completed.
You can restart your domain by running:
  virsh --connect qemu:///system start undercloud01
$
$ sudo virsh start undercloud01
Domain undercloud01 started

$
```

### Create overcloud01-03 virtual machines

I created the 3 virtual machines that will become the overcloud, which will form
the real usable OpenStack installation with all the normal OpenStack components.
The undercloud01 virtual machine will manage these networks. I need to create
the virtual machines in libvirt which required both the virtual machine and its
associated disk. Again virt-install is used, however it is given the -
-dry-run option to output an XML definition of the virtual machine that can be
fed into virsh. This way I ended up with 3 virtual machines ready to run. Again
60G disks are used, however not all that space is needed. By default we create
the ironic nova flavors, however in later versions of OpenStack these are created
for us. Also many examples online use flavors with a 40G disk, thus we make it
slightly bigger so examples online will work. After the installation a controller
uses about 7G and a compute node uses about 4G.

I created the machines with a small for loop:

```
$ for n in {1..3}; do sudo virt-install --name overcloud0$n --vcpus 1 --memory 4096 --disk size=60 --os-variant centos7.0 --network network=provisioning --network network=external --network network=external --boot network,hd --dry-run --print-xml > /tmp/overcloud0$n.xml; sudo virsh define --file /tmp/overcloud0$n.xml; sudo qemu-img create -f qcow2 -o preallocation=metadata /var/lib/libvirt/images/overcloud0$n.qcow2 60G; done; rm /tmp/overcloud0?.xml
/usr/share/virt-manager/virtinst/osdict.py:26: PyGIWarning: Libosinfo was imported without specifying a version first. Use gi.require_version('Libosinfo', '1.0') before import to ensure that the right version gets loaded.
  from gi.repository import Libosinfo as libosinfo
Domain overcloud01 defined from /tmp/overcloud01.xml

Formatting '/var/lib/libvirt/images/overcloud01.qcow2', fmt=qcow2 size=42949672960 encryption=off cluster_size=65536 preallocation=metadata lazy_refcounts=off refcount_bits=16
/usr/share/virt-manager/virtinst/osdict.py:26: PyGIWarning: Libosinfo was imported without specifying a version first. Use gi.require_version('Libosinfo', '1.0') before import to ensure that the right version gets loaded.
  from gi.repository import Libosinfo as libosinfo
Domain overcloud02 defined from /tmp/overcloud02.xml

Formatting '/var/lib/libvirt/images/overcloud02.qcow2', fmt=qcow2 size=42949672960 encryption=off cluster_size=65536 preallocation=metadata lazy_refcounts=off refcount_bits=16
/usr/share/virt-manager/virtinst/osdict.py:26: PyGIWarning: Libosinfo was imported without specifying a version first. Use gi.require_version('Libosinfo', '1.0') before import to ensure that the right version gets loaded.
  from gi.repository import Libosinfo as libosinfo
Domain overcloud03 defined from /tmp/overcloud03.xml

Formatting '/var/lib/libvirt/images/overcloud03.qcow2', fmt=qcow2 size=42949672960 encryption=off cluster_size=65536 preallocation=metadata lazy_refcounts=off refcount_bits=16
$
```

### Undercloud configuration

Before installing the undercloud we need to create an undercloud.conf. There is
a sample one located in /usr/share/instack-undercloud/undercloud.conf.sample.
https://github.com/openstack/instack-undercloud/blob/master/undercloud.conf.sample.
By default all the options are commented out. Here is the undercloud.conf I
used.

```
[DEFAULT]

#
# From instack-undercloud
#

# Local file path to the necessary images. The path should be a
# directory readable by the current user that contains the full set of
# images. (string value)
image_path = /home/stack/images

# IP information for the interface on the Undercloud that will be
# handling the PXE boots and DHCP for Overcloud instances.  The IP
# portion of the value will be assigned to the network interface
# defined by local_interface, with the netmask defined by the prefix
# portion of the value. (string value)
local_ip = 172.16.0.2/24

# Network interface on the Undercloud that will be handling the PXE
# boots and DHCP for Overcloud instances. (string value)
local_interface = eth1

# Network that will be masqueraded for external access, if required.
# This should be the subnet used for PXE booting. (string value)
masquerade_network = 172.16.0.0/24

# Start of DHCP allocation range for PXE and DHCP of Overcloud
# instances. (string value)
dhcp_start = 172.16.0.3

# End of DHCP allocation range for PXE and DHCP of Overcloud
# instances. (string value)
dhcp_end = 172.16.0.30

# Network CIDR for the Neutron-managed network for Overcloud
# instances. This should be the subnet used for PXE booting. (string
# value)
network_cidr = 172.16.0.0/24

# Network gateway for the Neutron-managed network for Overcloud
# instances. This should match the local_ip above when using
# masquerading. (string value)
network_gateway = 172.16.0.1

# Network interface on which inspection dnsmasq will listen.  If in
# doubt, use the default value. (string value)
# Deprecated group/name - [DEFAULT]/discovery_interface
#inspection_interface = br-ctlplane

# Temporary IP range that will be given to nodes during the inspection
# process.  Should not overlap with the range defined by dhcp_start
# and dhcp_end, but should be in the same network. (string value)
# Deprecated group/name - [DEFAULT]/discovery_iprange
inspection_iprange = 172.16.0.33,172.16.0.62

# Whether to run benchmarks when inspecting nodes. (boolean value)
# Deprecated group/name - [DEFAULT]/discovery_runbench
#inspection_runbench = false

# Whether to enable the debug log level for Undercloud OpenStack
# services. (boolean value)
#undercloud_debug = true

# Whether to install Tuskar services in the Undercloud. (boolean
# value)
#enable_tuskar = false

# Whether to install Tempest in the Undercloud. (boolean value)
#enable_tempest = false


[auth]

#
# From instack-undercloud
#

# Password used for MySQL databases. If left unset, one will be
# automatically generated. (string value)
#undercloud_db_password = <None>

# Keystone admin token. If left unset, one will be automatically
# generated. (string value)
#undercloud_admin_token = <None>

# Keystone admin password. If left unset, one will be automatically
# generated. (string value)
#undercloud_admin_password = <None>

# Glance service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_glance_password = <None>

# Heat db encryption key(must be 16, 24, or 32 characters. If left
# unset, one will be automatically generated. (string value)
#undercloud_heat_encryption_key = <None>

# Heat service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_heat_password = <None>

# Neutron service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_neutron_password = <None>

# Nova service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_nova_password = <None>

# Ironic service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_ironic_password = <None>

# Tuskar service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_tuskar_password = <None>

# Ceilometer service password. If left unset, one will be
# automatically generated. (string value)
#undercloud_ceilometer_password = <None>

# Ceilometer metering secret. If left unset, one will be automatically
# generated. (string value)
#undercloud_ceilometer_metering_secret = <None>

# Ceilometer snmpd user. If left unset, one will be automatically
# generated. (string value)
#undercloud_ceilometer_snmpd_user = <None>

# Ceilometer snmpd password. If left unset, one will be automatically
# generated. (string value)
#undercloud_ceilometer_snmpd_password = <None>

# Swift service password. If left unset, one will be automatically
# generated. (string value)
#undercloud_swift_password = <None>

# Rabbitmq cookie. If left unset, one will be automatically generated.
# (string value)
#undercloud_rabbit_cookie = <None>

# Rabbitmq password. If left unset, one will be automatically
# generated. (string value)
#undercloud_rabbit_password = <None>

# Rabbitmq username. If left unset, one will be automatically
# generated. (string value)
#undercloud_rabbit_username = <None>

# Heat stack domain admin password. If left unset, one will be
# automatically generated. (string value)
#undercloud_heat_stack_domain_admin_password = <None>

# Swift hash suffix. If left unset, one will be automatically
# generated. (string value)
#undercloud_swift_hash_suffix = <None>
```

### Undercloud installation preparation

Next we need to get the undercloud.conf onto the undercloud01 vm, ssh in, and
become the stack user:

```
$ scp undercloud.conf root@10.0.0.2:
The authenticity of host '10.0.0.2 (10.0.0.2)' can't be established.
ECDSA key fingerprint is SHA256:QlSUSv6e8wmOuzkqXbxNiK1bYhf/NVC3lafvkMhj7n0.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '10.0.0.2' (ECDSA) to the list of known hosts.
undercloud.conf                                                          100% 5219     5.1KB/s   00:00
$ ssh root@10.0.0.2
[root@undercloud01 ~]# su - stack
[stack@undercloud01 ~]$ sudo cp /root/undercloud.conf .
[stack@undercloud01 ~]$
```

### Undercloud installation

Then we start the undercloud installation with the "openstack undercloud
install", this process takes a little while:

```
[stack@undercloud01 ~]$ openstack undercloud install
Logging to /home/stack/.instack/install-undercloud.log
Checking for a FQDN hostname...
Static hostname detected as undercloud01
Transient hostname detected as undercloud01
Generated new password for undercloud_db_password
Generated new password for undercloud_admin_token
Generated new password for undercloud_admin_password
Generated new password for undercloud_glance_password

<SNIP>

[2016-02-17 15:59:05,183] (os-refresh-config) [INFO] Completed phase post-configure
os-refresh-config completed successfully
Generated new ssh key in ~/.ssh/id_rsa

#############################################################################
Undercloud install complete.

The file containing this installation's passwords is at
/home/stack/undercloud-passwords.conf.

There is also a stackrc file at /home/stack/stackrc.

These files are needed to interact with the OpenStack services, and should be
secured.

#############################################################################

[stack@undercloud01 ~]$
```

### Undercloud works

If this completes ok, we should be able to inspect the state of the undercloud.
First we source the stackrc file which contains the authentication information
for OpenStack, this sets environment variables that the OpenStack programs use.
Then we can list the services that are running. Note the lack of horizion and
other high level components.

```
[stack@undercloud01 ~]$ cat stackrc
export NOVA_VERSION=1.1
export OS_PASSWORD=$(sudo hiera admin_password)
export OS_AUTH_URL=http://172.16.0.2:5000/v2.0
export OS_USERNAME=admin
export OS_TENANT_NAME=admin
export COMPUTE_API_VERSION=1.1
export OS_NO_CACHE=True
export OS_CLOUDNAME=undercloud
export OS_IMAGE_API_VERSION=1
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ . stackrc
[stack@undercloud01 ~]$ openstack service list
+----------------------------------+------------+---------------+
| ID                               | Name       | Type          |
+----------------------------------+------------+---------------+
| 1cd0bac05deb47a59be357ccfda7bb65 | neutron    | network       |
| 54447f379a854dc2a87452ab77ae6856 | novav3     | computev3     |
| 5832fc0897a04dfab71c5cce6e0a48df | nova       | compute       |
| 5f8d78607b9347dbad9ae3c2e4b1ba2b | keystone   | identity      |
| 66ade28543474f2799ac22bfc7e41303 | ironic     | baremetal     |
| 6ad65ee3da4f415896408869a92edf28 | ceilometer | metering      |
| a3b3084c50a5486d9825661a7e2f4f0b | swift      | object-store  |
| c7343174e1154f9c8ff3ff4b820c839b | glance     | image         |
| e4121df7fa8e42e2b187ecf41863d7c3 | heat       | orchestration |
| f3cfb94376d840078960cfe77326215e | tuskar     | management    |
+----------------------------------+------------+---------------+
[stack@undercloud01 ~]$
```

### Add dns server to undercloud network

We need to modify a network subnet that is used by ironic, we need a add a dns
server to the subnet.

```
[stack@undercloud01 ~]$ neutron subnet-list
+--------------------------------------+------+---------------+-----------------------------------------------+
| id                                   | name | cidr          | allocation_pools                              |
+--------------------------------------+------+---------------+-----------------------------------------------+
| 34ffb0cf-4818-4a48-9596-702c654e79cb |      | 172.16.0.0/24 | {"start": "172.16.0.3", "end": "172.16.0.30"} |
+--------------------------------------+------+---------------+-----------------------------------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ neutron subnet-update 34ffb0cf-4818-4a48-9596-702c654e79cb --dns-nameserver 172.16.0.1
Updated subnet: 34ffb0cf-4818-4a48-9596-702c654e79cb
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ neutron subnet-show 34ffb0cf-4818-4a48-9596-702c654e79cb
+-------------------+----------------------------------------------------------------+
| Field             | Value                                                          |
+-------------------+----------------------------------------------------------------+
| allocation_pools  | {"start": "172.16.0.3", "end": "172.16.0.30"}                  |
| cidr              | 172.16.0.0/24                                                  |
| dns_nameservers   | 172.16.0.1                                                     |
| enable_dhcp       | True                                                           |
| gateway_ip        | 172.16.0.1                                                     |
| host_routes       | {"destination": "169.254.169.254/32", "nexthop": "172.16.0.2"} |
| id                | 34ffb0cf-4818-4a48-9596-702c654e79cb                           |
| ip_version        | 4                                                              |
| ipv6_address_mode |                                                                |
| ipv6_ra_mode      |                                                                |
| name              |                                                                |
| network_id        | 0a5aaff8-df4e-49b0-a167-84231f1995e1                           |
| subnetpool_id     |                                                                |
| tenant_id         | 6878ec3d47a7407eb9a829ce6f3dcded                               |
+-------------------+----------------------------------------------------------------+
[stack@undercloud01 ~]$
```

### Undercloud and overcloud image creation

When using cloud and OpenStack one doe snot usually install the operating
system. Usually you upload base operating system images that run. Given that the
Undercloud exists and it an deploy instances onto bare metal via ironic, we
still need images to actually run the overcloud. There are two options, one is
to download them and the other is to build them from scratch. In the interest of
completeness we do the latter. We tell it what RDO distribution to use and what
mirror to use. It picks up the proxy environment variables if they exist and
makes use of them. Again this step can go wrong and having a local fast repo can
speed up the tries. The script also can make use of a pypi mirror if available.
The main command is "openstack overcloud image build - -all" which builds all
the images, it takes a while to finish.

```
[stack@undercloud01 ~]$ . stackrc
[stack@undercloud01 ~]$ export RDO_RELEASE="liberty"
[stack@undercloud01 ~]$ export DIB_DISTRIBUTION_MIRROR="http://mirror.bytemark.co.uk/centos"
[stack@undercloud01 ~]$ export DIB_YUM_REPO_CONF="/etc/yum.repos.d/rdo-release.repo"
[stack@undercloud01 ~]$ #export PYPI_MIRROR=http://mirror/simple
[stack@undercloud01 ~]$ mkdir images
[stack@undercloud01 ~]$ cd images
[stack@undercloud01 images]$ openstack overcloud image build --all
Building elements: base  centos7 ironic-agent selinux-permissive centos-cloud-repo element-manifest network-gateway epel rdo-release undercloud-package-install pip-and-virtualenv-override
Expanded element dependencies to: epel network-gateway rpm-distro pip-and-virtualenv-override dib-run-parts manifests dhcp-all-interfaces selinux-permissive rdo-release source-repositories package-installs dib-python centos7 dib-init-system centos-cloud-repo install-types svc-map element-manifest base undercloud-package-install redhat-common cache-url pkg-map yum ironic-agent
WARNING: Not enough RAM to use tmpfs for build. Using /var/tmp. (3882448 < 4G)
Building in /var/tmp/image.1XTuL98i
++ export DIB_DEFAULT_INSTALLTYPE=package

<SNIP>

Unmount /var/tmp/image.z5keCNy7/mnt/sys
Unmount /var/tmp/image.z5keCNy7/mnt/proc
Unmount /var/tmp/image.z5keCNy7/mnt/dev/pts
Unmount /var/tmp/image.z5keCNy7/mnt/dev
Unmount /var/tmp/image.z5keCNy7/mnt
/dev/loop0: [64768]:71381441 (/var/tmp/image.zlMxkoLq/image.raw)
[stack@undercloud01 images]$
```

After which you should have these files generated:

```
[stack@undercloud01 images]$ ls
deploy-ramdisk-ironic.d          dib-overcloud-full.log         ironic-python-agent.vmlinuz
deploy-ramdisk-ironic.initramfs  fedora-user.qcow2              overcloud-full.d
deploy-ramdisk-ironic.kernel     ironic-python-agent.d          overcloud-full.initrd
dib-agent-ramdisk.log            ironic-python-agent.initramfs  overcloud-full.qcow2
dib-deploy.log                   ironic-python-agent.kernel     overcloud-full.vmlinuz
[stack@undercloud01 images]$
```

The next step is to upload these images into the OpenStack image storage system
(Glance):

```
[stack@undercloud01 images]$ openstack overcloud image upload
Image "overcloud-full-vmlinuz" was uploaded.
+--------------------------------------+------------------------+-------------+---------+--------+
|                  ID                  |          Name          | Disk Format |   Size  | Status |
+--------------------------------------+------------------------+-------------+---------+--------+
| a7257a33-5fb5-4f9f-864f-dcd620e77fcd | overcloud-full-vmlinuz |     aki     | 5155536 | active |
+--------------------------------------+------------------------+-------------+---------+--------+
Image "overcloud-full-initrd" was uploaded.
+--------------------------------------+-----------------------+-------------+----------+--------+
|                  ID                  |          Name         | Disk Format |   Size   | Status |
+--------------------------------------+-----------------------+-------------+----------+--------+
| f58ba706-57e8-41d5-8a51-5eba4a30870a | overcloud-full-initrd |     ari     | 38412658 | active |
+--------------------------------------+-----------------------+-------------+----------+--------+
Image "overcloud-full" was uploaded.
+--------------------------------------+----------------+-------------+------------+--------+
|                  ID                  |      Name      | Disk Format |    Size    | Status |
+--------------------------------------+----------------+-------------+------------+--------+
| ed1f9a4a-0826-42eb-9359-2d456bbdbc01 | overcloud-full |    qcow2    | 1085093888 | active |
+--------------------------------------+----------------+-------------+------------+--------+
Image "bm-deploy-kernel" was uploaded.
+--------------------------------------+------------------+-------------+---------+--------+
|                  ID                  |       Name       | Disk Format |   Size  | Status |
+--------------------------------------+------------------+-------------+---------+--------+
| 7dee66d3-e618-4bc3-999d-e061b28182ac | bm-deploy-kernel |     aki     | 5155536 | active |
+--------------------------------------+------------------+-------------+---------+--------+
Image "bm-deploy-ramdisk" was uploaded.
+--------------------------------------+-------------------+-------------+-----------+--------+
|                  ID                  |        Name       | Disk Format |    Size   | Status |
+--------------------------------------+-------------------+-------------+-----------+--------+
| d15d5608-c16b-47fd-ac8c-645604c9a3ac | bm-deploy-ramdisk |     ari     | 469452382 | active |
+--------------------------------------+-------------------+-------------+-----------+--------+
[stack@undercloud01 images]$
```

## Prepare for Overcloud

### Undercloud can control host livbirt

We want our undercloud machine to be able to ssh to the host and start and stop
the virtual overcloud machines. So we need to copy the ssh key from the
undercloud machine to the host machine. Note that this key was generated for us.
First we use the "ssh-copy-id" command and then we test it works with a "ssh
cat" command

```
[stack@undercloud01 images]$ cd
[stack@undercloud01 ~]$ ssh-copy-id thomas@10.0.0.1
The authenticity of host '10.0.0.1 (10.0.0.1)' can't be established.
ECDSA key fingerprint is 13:92:e5:4c:c5:e2:35:ba:0d:87:d2:8a:03:41:3f:ed.
Are you sure you want to continue connecting (yes/no)? yes
/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
thomas@10.0.0.1's password:

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'thomas@10.0.0.1'"
and check to make sure that only the key(s) you wanted were added.

[stack@undercloud01 ~]$ ssh thomas@10.0.0.1 cat /proc/loadavg
0.85 0.77 0.53 3/633 18647
[stack@undercloud01 ~]$
```

After this works we can see if virsh is able to communicate with the host:

```
[stack@undercloud01 ~]$ virsh -c qemu+ssh://thomas@10.0.0.1/system list --all
 Id    Name                           State
----------------------------------------------------
 19    undercloud01                   running
 -     overcloud01                    shut off
 -     overcloud02                    shut off
 -     overcloud03                    shut off

[stack@undercloud01 ~]$
```

### Prepare config files

The next thing we need to do is tell ironic about the hosts it has available to
deploy instances to (instances that will run OpenStack). We would manually run
ironic commands to add the nodes, or we can construct a json file with all the
details. The first step is to find out the mac addresses of the provisioning
network overcloud virtual machines and put them in a list. This can be done
quickly with the following:

```
[stack@undercloud01 ~]$ for i in {1..3}; do virsh -c qemu+ssh://thomas@10.0.0.1/system domiflist overcloud0$i | awk '$3 == "provisioning" {print $5};'; done > /tmp/nodes.txt
[stack@undercloud01 ~]$ cat /tmp/nodes.txt
52:54:00:df:41:0c
52:54:00:71:76:78
52:54:00:23:94:a3
[stack@undercloud01 ~]$
```

The next thing is to copy and paste the following in an editor. Edit it a you
see fit, ie change the username or add additional nodes. Node the shell $(foo)
expansions, it's going to be a here file.

```
{
  "ssh-user": "thomas",
  "ssh-key": "$(cat ~/.ssh/id_rsa)",
  "power_manager": "nova.virt.baremetal.virtual_power_driver.VirtualPowerManager",
  "host-ip": "10.0.0.1",
  "arch": "x86_64",
  "nodes": [
    {
      "pm_addr": "10.0.0.1",
      "pm_password": "$(cat ~/.ssh/id_rsa)",
      "pm_type": "pxe_ssh",
      "mac": [
        "$(sed -n 1p /tmp/nodes.txt)"
      ],
      "cpu": "1",
      "memory": "4096",
      "disk": "40",
      "arch": "x86_64",
      "pm_user": "thomas"
    },
    {
      "pm_addr": "10.0.0.1",
      "pm_password": "$(cat ~/.ssh/id_rsa)",
      "pm_type": "pxe_ssh",
      "mac": [
        "$(sed -n 2p /tmp/nodes.txt)"
      ],
      "cpu": "1",
      "memory": "4096",
      "disk": "40",
      "arch": "x86_64",
      "pm_user": "thomas"
    },
    {
      "pm_addr": "10.0.0.1",
      "pm_password": "$(cat ~/.ssh/id_rsa)",
      "pm_type": "pxe_ssh",
      "mac": [
        "$(sed -n 3p /tmp/nodes.txt)"
      ],
      "cpu": "1",
      "memory": "4096",
      "disk": "40",
      "arch": "x86_64",
      "pm_user": "thomas"
    }
  ]
}
```

With the aid of jq paste it into the here file and output the processed file to
instackenv.json. This expands the shell and well as checking the syntax of the
original json.

```
[stack@undercloud01 ~]$ jq . << EOF > ~/instackenv.json
> {
>   "ssh-user": "thomas",
>   "ssh-key": "$(cat ~/.ssh/id_rsa)",
>   "power_manager": "nova.virt.baremetal.virtual_power_driver.VirtualPowerManager",
>   "host-ip": "10.0.0.1",
>   "arch": "x86_64",
>   "nodes": [
>     {
>       "pm_addr": "10.0.0.1",
>       "pm_password": "$(cat ~/.ssh/id_rsa)",
>       "pm_type": "pxe_ssh",
>       "mac": [
>         "$(sed -n 1p /tmp/nodes.txt)"
>       ],
>       "cpu": "1",
>       "memory": "4096",
>       "disk": "40",
>       "arch": "x86_64",
>       "pm_user": "thomas"
>     },
>     {
>       "pm_addr": "10.0.0.1",
>       "pm_password": "$(cat ~/.ssh/id_rsa)",
>       "pm_type": "pxe_ssh",
>       "mac": [
>         "$(sed -n 2p /tmp/nodes.txt)"
>       ],
>       "cpu": "1",
>       "memory": "4096",
>       "disk": "40",
>       "arch": "x86_64",
>       "pm_user": "thomas"
>     },
>     {
>       "pm_addr": "10.0.0.1",
>       "pm_password": "$(cat ~/.ssh/id_rsa)",
>       "pm_type": "pxe_ssh",
>       "mac": [
>         "$(sed -n 3p /tmp/nodes.txt)"
>       ],
>       "cpu": "1",
>       "memory": "4096",
>       "disk": "40",
>       "arch": "x86_64",
>       "pm_user": "thomas"
>     }
>   ]
> }
> EOF
[stack@undercloud01 ~]$
```

Here is my resultant instackenv.json, note that the mac addresses and private
keys are all in place.

```
[stack@undercloud01 ~]$ cat ~/instackenv.json
{
  "nodes": [
    {
      "pm_user": "thomas",
      "pm_addr": "10.0.0.1",
      "pm_password": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1\n1+qyLYJfgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa\nmiZR87anAhv6xzciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g\nMsV8mKmxhpERFIWsxN69SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU\ndtWQIvLOIA4LshqxVlyvK+Gr1j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw\n2w9v15NPfQNU3uYKl814po6p1m8Dl+XM59YRyQIDAQABAoIBAQCLftFgChIx2ZO6\nOL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM3fPIPV1lMwRi1j+RIWhAkgqj49h\nY1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYgpneS+ysIelY9e8UufLChT\ncPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1gU7drcrCel6uKl4\nGTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSafzh6MmQw0\nBIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlRfD/\nG0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD\nOVyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+\nASaNF2Sx/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P\nRUBgHUlPunMa3+pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG\nqSy/+ch/r04a4yankrPtoV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC\n8p8+asJmu8S9ZRmLubi6OX/gEGlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj\ntaeMSWdv48498l3X496lfvgDw/O1p843p5zPdRl3gftedysnbEFIZ8We9b0D2UGa\n9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInYIO/4uma5NvfF4j//ntd6HwsZ4cO\nscYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7ZsqxlNCyE6eZbg1AE8g3SOg\nFyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/PlK4KNP+B8JX7d+\n1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA6ar3hd0+j\nkUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM8Hk\n0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY\nEVLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f\n-----END RSA PRIVATE KEY-----",
      "pm_type": "pxe_ssh",
      "mac": [
        "52:54:00:c5:25:35"
      ],
      "cpu": "1",
      "memory": "4096",
      "disk": "40",
      "arch": "x86_64"
    },
    {
      "pm_user": "thomas",
      "pm_addr": "10.0.0.1",
      "pm_password": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1\n1+qyLYJfgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa\nmiZR87anAhv6xzciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g\nMsV8mKmxhpERFIWsxN69SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU\ndtWQIvLOIA4LshqxVlyvK+Gr1j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw\n2w9v15NPfQNU3uYKl814po6p1m8Dl+XM59YRyQIDAQABAoIBAQCLftFgChIx2ZO6\nOL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM3fPIPV1lMwRi1j+RIWhAkgqj49h\nY1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYgpneS+ysIelY9e8UufLChT\ncPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1gU7drcrCel6uKl4\nGTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSafzh6MmQw0\nBIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlRfD/\nG0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD\nOVyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+\nASaNF2Sx/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P\nRUBgHUlPunMa3+pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG\nqSy/+ch/r04a4yankrPtoV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC\n8p8+asJmu8S9ZRmLubi6OX/gEGlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj\ntaeMSWdv48498l3X496lfvgDw/O1p843p5zPdRl3gftedysnbEFIZ8We9b0D2UGa\n9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInYIO/4uma5NvfF4j//ntd6HwsZ4cO\nscYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7ZsqxlNCyE6eZbg1AE8g3SOg\nFyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/PlK4KNP+B8JX7d+\n1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA6ar3hd0+j\nkUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM8Hk\n0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY\nEVLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f\n-----END RSA PRIVATE KEY-----",
      "pm_type": "pxe_ssh",
      "mac": [
        "52:54:00:16:c6:2b"
      ],
      "cpu": "1",
      "memory": "4096",
      "disk": "40",
      "arch": "x86_64"
    },
    {
      "pm_user": "thomas",
      "pm_addr": "10.0.0.1",
      "pm_password": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1\n1+qyLYJfgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa\nmiZR87anAhv6xzciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g\nMsV8mKmxhpERFIWsxN69SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU\ndtWQIvLOIA4LshqxVlyvK+Gr1j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw\n2w9v15NPfQNU3uYKl814po6p1m8Dl+XM59YRyQIDAQABAoIBAQCLftFgChIx2ZO6\nOL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM3fPIPV1lMwRi1j+RIWhAkgqj49h\nY1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYgpneS+ysIelY9e8UufLChT\ncPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1gU7drcrCel6uKl4\nGTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSafzh6MmQw0\nBIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlRfD/\nG0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD\nOVyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+\nASaNF2Sx/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P\nRUBgHUlPunMa3+pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG\nqSy/+ch/r04a4yankrPtoV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC\n8p8+asJmu8S9ZRmLubi6OX/gEGlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj\ntaeMSWdv48498l3X496lfvgDw/O1p843p5zPdRl3gftedysnbEFIZ8We9b0D2UGa\n9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInYIO/4uma5NvfF4j//ntd6HwsZ4cO\nscYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7ZsqxlNCyE6eZbg1AE8g3SOg\nFyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/PlK4KNP+B8JX7d+\n1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA6ar3hd0+j\nkUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM8Hk\n0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY\nEVLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f\n-----END RSA PRIVATE KEY-----",
      "pm_type": "pxe_ssh",
      "mac": [
        "52:54:00:ef:83:9e"
      ],
      "cpu": "1",
      "memory": "4096",
      "disk": "40",
      "arch": "x86_64"
    }
  ],
  "arch": "x86_64",
  "host-ip": "10.0.0.1",
  "power_manager": "nova.virt.baremetal.virtual_power_driver.VirtualPowerManager",
  "ssh-key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1\n1+qyLYJfgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa\nmiZR87anAhv6xzciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g\nMsV8mKmxhpERFIWsxN69SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU\ndtWQIvLOIA4LshqxVlyvK+Gr1j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw\n2w9v15NPfQNU3uYKl814po6p1m8Dl+XM59YRyQIDAQABAoIBAQCLftFgChIx2ZO6\nOL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM3fPIPV1lMwRi1j+RIWhAkgqj49h\nY1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYgpneS+ysIelY9e8UufLChT\ncPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1gU7drcrCel6uKl4\nGTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSafzh6MmQw0\nBIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlRfD/\nG0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD\nOVyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+\nASaNF2Sx/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P\nRUBgHUlPunMa3+pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG\nqSy/+ch/r04a4yankrPtoV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC\n8p8+asJmu8S9ZRmLubi6OX/gEGlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj\ntaeMSWdv48498l3X496lfvgDw/O1p843p5zPdRl3gftedysnbEFIZ8We9b0D2UGa\n9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInYIO/4uma5NvfF4j//ntd6HwsZ4cO\nscYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7ZsqxlNCyE6eZbg1AE8g3SOg\nFyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/PlK4KNP+B8JX7d+\n1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA6ar3hd0+j\nkUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM8Hk\n0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY\nEVLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f\n-----END RSA PRIVATE KEY-----",
  "ssh-user": "thomas"
}
[stack@undercloud01 ~]$
```

While jq gave us valid json (ie valid syntax) it didn't do much else. This small
utility can give the instackenv.json a check to make sure it's valid. download
and run it as follows:

```
[stack@undercloud01 ~]$ curl -O https://raw.githubusercontent.com/rthallisey/clapper/master/instackenv-validator.py
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3182  100  3182    0     0   6772      0 --:--:-- --:--:-- --:--:--  6784
[stack@undercloud01 ~]$ python instackenv-validator.py -f instackenv.json
INFO:__main__:Checking node 10.0.0.1
DEBUG:__main__:Identified virtual node
INFO:__main__:Checking node 10.0.0.1
DEBUG:__main__:Identified virtual node
INFO:__main__:Checking node 10.0.0.1
DEBUG:__main__:Identified virtual node
DEBUG:__main__:Baremetal IPs are all unique.
DEBUG:__main__:MAC addresses are all unique.

--------------------
SUCCESS: instackenv validator found 0 errors
[stack@undercloud01 ~]$
```

### Tell the undercloud about our hosts

Now that we have the file constructed. We can start working. First source the
stackrc file to get some credentials to work with. We can then ask ironic for a
node-list, not surprisingly there are node listed:

```
[stack@undercloud01 ~]$ . stackrc
[stack@undercloud01 ~]$ ironic node-list
+------+------+---------------+-------------+--------------------+-------------+
| UUID | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+------+------+---------------+-------------+--------------------+-------------+
+------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
```

We then import the JSON file and we find that the "ironic node-list" now shows
details about our nodes:

```
[stack@undercloud01 ~]$ openstack baremetal import --json instackenv.json
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power off   | available          | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
```

Next we well OpenStack that we want to configure these machines to boot. I think
this sets there boot image to the bare metal hardware discovery image.

```
[stack@undercloud01 ~]$ openstack baremetal configure boot
```

We can also inspect further information about the nodes:

```
[stack@undercloud01 ~]$ ironic node-port-list aa65e1af-7244-44bb-8188-8b7506e2cff3
+--------------------------------------+-------------------+
| UUID                                 | Address           |
+--------------------------------------+-------------------+
| 5e01045e-0d45-4dd9-b5a0-9d4f8998625e | 52:54:00:c5:25:35 |
+--------------------------------------+-------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ ironic node-show aa65e1af-7244-44bb-8188-8b7506e2cff3 | grep -A1 deploy
| driver_info            | {u'ssh_username': u'thomas', u'deploy_kernel': u'7dee66d3-e618-4bc3   |
|                        | -999d-e061b28182ac', u'deploy_ramdisk': u'd15d5608-c16b-47fd-ac8c-    |
|                        | 645604c9a3ac', u'ssh_key_contents': u'-----BEGIN RSA PRIVATE KEY----- |
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ openstack image show 7dee66d3-e618-4bc3-999d-e061b28182ac
+------------------+--------------------------------------+
| Field            | Value                                |
+------------------+--------------------------------------+
| checksum         | 3d320f249358a8a414be0e365abad03a     |
| container_format | aki                                  |
| created_at       | 2016-02-17T21:58:31.000000           |
| deleted          | False                                |
| disk_format      | aki                                  |
| id               | 7dee66d3-e618-4bc3-999d-e061b28182ac |
| is_public        | True                                 |
| min_disk         | 0                                    |
| min_ram          | 0                                    |
| name             | bm-deploy-kernel                     |
| owner            | 6878ec3d47a7407eb9a829ce6f3dcded     |
| properties       |                                      |
| protected        | False                                |
| size             | 5155536                              |
| status           | active                               |
| updated_at       | 2016-02-17T21:58:31.000000           |
+------------------+--------------------------------------+
[stack@undercloud01 ~]$ openstack image show d15d5608-c16b-47fd-ac8c-645604c9a3ac
+------------------+--------------------------------------+
| Field            | Value                                |
+------------------+--------------------------------------+
| checksum         | e2036fa875dc474a27e6d9617bf7df54     |
| container_format | ari                                  |
| created_at       | 2016-02-17T21:58:32.000000           |
| deleted          | False                                |
| disk_format      | ari                                  |
| id               | d15d5608-c16b-47fd-ac8c-645604c9a3ac |
| is_public        | True                                 |
| min_disk         | 0                                    |
| min_ram          | 0                                    |
| name             | bm-deploy-ramdisk                    |
| owner            | 6878ec3d47a7407eb9a829ce6f3dcded     |
| properties       |                                      |
| protected        | False                                |
| size             | 469452382                            |
| status           | active                               |
| updated_at       | 2016-02-17T21:58:37.000000           |
+------------------+--------------------------------------+
[stack@undercloud01 ~]$
```

### Inspect single node

The next step to match the real world is for ironic to boot each machine with a
special image that reports back the hardware specs of each node. It collects the
RAM, disk, CPU and probably more. It can be configured to collect extra
information. This would match the real life example where you have a bunch of
hardware and the nodes with extra ram are for Nova or the node with extra NICS
are for dedicated Neutron. Lastly on we define the link between the hardware
specs, the flavours that may match the hardware and the links between the
compute flavor and the compute install.

We start in the above state and we tell ironic to change the status of one node
to be manageable. Then we tell it to start this discover process which OpenStack
calls introspection.

```
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power off   | available          | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$ ironic node-set-provision-state aa65e1af-7244-44bb-8188-8b7506e2cff3 manage
[stack@undercloud01 ~]$ openstack baremetal introspection start aa65e1af-7244-44bb-8188-8b7506e2cff3
```

If everything has working we can see that it's turned on one node. We can even
look at that virtual machines console to see what's going on. When that machine
has successfully booted and introspected itself and reported back it shuts down.
We can see all this in the below repeated commands.

```
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power on    | manageable         | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power on    | manageable         | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power off   | manageable         | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
```

Then we change the provisioning state back to available with following command:

```
[stack@undercloud01 ~]$ ironic node-set-provision-state aa65e1af-7244-44bb-8188-8b7506e2cff3 provide
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power off   | available          | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
```

### Bulk inspect

The above is good for testing a single node, be it virtual or physical. It's
good to test the process and get it working. However doing the above for tens of
hundreds of nodes would be tedious. Fortunately there is a way to just do them
all! It's quite fun to watch with virt-manager.

```
[stack@undercloud01 ~]$ openstack baremetal introspection bulk start
Setting nodes for introspection to manageable...
Starting introspection of node: aa65e1af-7244-44bb-8188-8b7506e2cff3
Starting introspection of node: a93b47e9-b0f3-4e14-8c0e-2deb486efd9e
Starting introspection of node: 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8
Waiting for introspection to finish...
Introspection for UUID aa65e1af-7244-44bb-8188-8b7506e2cff3 finished successfully.
Introspection for UUID a93b47e9-b0f3-4e14-8c0e-2deb486efd9e finished successfully.
Introspection for UUID 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 finished successfully.
Setting manageable nodes to available...
Node aa65e1af-7244-44bb-8188-8b7506e2cff3 has been set to available.
Node a93b47e9-b0f3-4e14-8c0e-2deb486efd9e has been set to available.
Node 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 has been set to available.
Introspection completed.
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power off   | available          | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
```

### Inspection logging

Now if everything does not start working immediately don't fear. Start with
looking at the logs on the undercloud machine, something like this while the
machines boot can pick up some problems.

```
[stack@undercloud01 ~]$ sudo journalctl -f -l -u openstack-ironic-inspector -u openstack-ironic-discoverd-dnsmasq -f
```

This is an example of when the MAC address is not correct, ie the machine has
booted and expects to find a MAC but it can't. Thus it fails, this could be some
other production machine with valuable data on!

```
Feb 22 14:24:25 undercloud01 ironic-inspector[25852]: 2016-02-22 14:24:25.017 25852 INFO ironic_inspector.plugins.standard [-] PXE boot interface was 52:54:00:e2:70:6f
Feb 22 14:24:25 undercloud01 ironic-inspector[25852]: Look up error: Could not find a node for attributes {'bmc_address': u'', 'mac': [u'52:54:00:e2:70:6f']}
```

### Inspection issues on Centos

When I ran the installation the overcloud virtual machines pxe booted fine.
However when I re-ran the installation on faster hardware running CentOS7 I had
issues with the hosts not booting or booting with and having issues with MAC
address detection. Fortunately this seems to be a known bug. I can only a assume
it's related to the ipxe package in CentOS7. There is a work around that
modifies the .ipxe files in /httpboot:

```
find /httpboot/ -type f ! -iname "kernel" ! -iname "ramdisk" ! -iname "*.kernel" ! -iname "*.ramdisk" -exec sed -i 's|{mac|{net0/mac|g' {} +;
```

This results in the following changes:

```
[stack@undercloud01 ~]$ diff -u /httpboot/inspector.ipxe.orig /httpboot/inspector.ipxe
--- /httpboot/inspector.ipxe.orig	2016-02-22 14:30:42.577000000 +0000
+++ /httpboot/inspector.ipxe	2016-02-22 14:31:34.835000000 +0000
@@ -2,6 +2,6 @@

 dhcp

-kernel http://172.16.0.2:8088/agent.kernel ipa-inspection-callback-url=http://172.16.0.2:5050/v1/continue ipa-inspection-collectors=default,logs systemd.journald.forward_to_console=yes BOOTIF=${mac}
+kernel http://172.16.0.2:8088/agent.kernel ipa-inspection-callback-url=http://172.16.0.2:5050/v1/continue ipa-inspection-collectors=default,logs systemd.journald.forward_to_console=yes BOOTIF=${net0/mac}
 initrd http://172.16.0.2:8088/agent.ramdisk
 boot
[stack@undercloud01 ~]$
```

### Delete ironic nodes if they are re-created

If all goes wrong and you need to start from scratch you don't need to rebuild
the undercloud you can easily delete the ironic hosts and start again.

```
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| dbd1b670-6001-4545-8260-66ee2faab97f | None | None          | power off   | available          | False       |
| 7c7e61fe-43d7-4202-a182-358b87e338cd | None | None          | power off   | available          | False       |
| e0aa0867-4e81-452e-a548-bf4c071936f9 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ ironic node-delete dbd1b670-6001-4545-8260-66ee2faab97f
Deleted node dbd1b670-6001-4545-8260-66ee2faab97f
[stack@undercloud01 ~]$ ironic node-delete 7c7e61fe-43d7-4202-a182-358b87e338cd
Deleted node 7c7e61fe-43d7-4202-a182-358b87e338cd
[stack@undercloud01 ~]$ ironic node-delete e0aa0867-4e81-452e-a548-bf4c071936f9
Deleted node e0aa0867-4e81-452e-a548-bf4c071936f9
[stack@undercloud01 ~]$ ironic node-list
+------+------+---------------+-------------+--------------------+-------------+
| UUID | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+------+------+---------------+-------------+--------------------+-------------+
+------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$
```

### Add flavors

The next thing to do is create the OpenStack nova flavors that will run the over
cloud. We create each one with a ram, cpu count, swap, arch and a profile or
either control or compute. Later versions of OpenStack may do this for you.
Presumably this should be changed for real hardware where compute nodes might
have more CPUs than controllers. These commands will create all the required
favors:

```
openstack flavor create --id auto --ram 4096 --disk 40 --vcpus 1 --swap 2048 control
openstack flavor set --property "cpu_arch"="x86_64" --property "capabilities:boot_option"="local" --property "capabilities:profile"="control" control
openstack flavor create --id auto --ram 4096 --disk 40 --vcpus 1 --swap 2048 compute
openstack flavor set --property "cpu_arch"="x86_64" --property "capabilities:boot_option"="local" --property "capabilities:profile"="compute" compute
openstack flavor create --id auto --ram 4096 --disk 40 --vcpus 1 baremetal
openstack flavor set --property "cpu_arch"="x86_64" --property "capabilities:boot_option"="local" baremetal
```

The output looks like:

```
[stack@undercloud01 ~]$ openstack flavor list

[stack@undercloud01 ~]$ openstack flavor create --id auto --ram 4096 --disk 40 --vcpus 1 --swap 2048 control
+----------------------------+--------------------------------------+
| Field                      | Value                                |
+----------------------------+--------------------------------------+
| OS-FLV-DISABLED:disabled   | False                                |
| OS-FLV-EXT-DATA:ephemeral  | 0                                    |
| disk                       | 40                                   |
| id                         | 79de6690-b30a-486d-b1c6-05e22795155c |
| name                       | control                              |
| os-flavor-access:is_public | True                                 |
| ram                        | 4096                                 |
| rxtx_factor                | 1.0                                  |
| swap                       | 2048                                 |
| vcpus                      | 1                                    |
+----------------------------+--------------------------------------+
[stack@undercloud01 ~]$ openstack flavor set --property "cpu_arch"="x86_64" --property "capabilities:boot_option"="local" --property "capabilities:profile"="control" control
+----------------------------+-------------------------------------------------------------------------------------+
| Field                      | Value                                                                               |
+----------------------------+-------------------------------------------------------------------------------------+
| OS-FLV-DISABLED:disabled   | False                                                                               |
| OS-FLV-EXT-DATA:ephemeral  | 0                                                                                   |
| disk                       | 40                                                                                  |
| id                         | 79de6690-b30a-486d-b1c6-05e22795155c                                                |
| name                       | control                                                                             |
| os-flavor-access:is_public | True                                                                                |
| properties                 | capabilities:boot_option='local', capabilities:profile='control', cpu_arch='x86_64' |
| ram                        | 4096                                                                                |
| rxtx_factor                | 1.0                                                                                 |
| swap                       | 2048                                                                                |
| vcpus                      | 1                                                                                   |
+----------------------------+-------------------------------------------------------------------------------------+
[stack@undercloud01 ~]$ openstack flavor create --id auto --ram 4096 --disk 40 --vcpus 1 --swap 2048 compute
+----------------------------+--------------------------------------+
| Field                      | Value                                |
+----------------------------+--------------------------------------+
| OS-FLV-DISABLED:disabled   | False                                |
| OS-FLV-EXT-DATA:ephemeral  | 0                                    |
| disk                       | 40                                   |
| id                         | c90b9f5a-fcad-40fb-92d7-8a2f8fb22d41 |
| name                       | compute                              |
| os-flavor-access:is_public | True                                 |
| ram                        | 4096                                 |
| rxtx_factor                | 1.0                                  |
| swap                       | 2048                                 |
| vcpus                      | 1                                    |
+----------------------------+--------------------------------------+
[stack@undercloud01 ~]$ openstack flavor set --property "cpu_arch"="x86_64" --property "capabilities:boot_option"="local" --property "capabilities:profile"="compute" compute
+----------------------------+-------------------------------------------------------------------------------------+
| Field                      | Value                                                                               |
+----------------------------+-------------------------------------------------------------------------------------+
| OS-FLV-DISABLED:disabled   | False                                                                               |
| OS-FLV-EXT-DATA:ephemeral  | 0                                                                                   |
| disk                       | 40                                                                                  |
| id                         | c90b9f5a-fcad-40fb-92d7-8a2f8fb22d41                                                |
| name                       | compute                                                                             |
| os-flavor-access:is_public | True                                                                                |
| properties                 | capabilities:boot_option='local', capabilities:profile='compute', cpu_arch='x86_64' |
| ram                        | 4096                                                                                |
| rxtx_factor                | 1.0                                                                                 |
| swap                       | 2048                                                                                |
| vcpus                      | 1                                                                                   |
+----------------------------+-------------------------------------------------------------------------------------+
[stack@undercloud01 ~]$ openstack flavor create --id auto --ram 4096 --disk 40 --vcpus 1 baremetal
+----------------------------+--------------------------------------+
| Field                      | Value                                |
+----------------------------+--------------------------------------+
| OS-FLV-DISABLED:disabled   | False                                |
| OS-FLV-EXT-DATA:ephemeral  | 0                                    |
| disk                       | 40                                   |
| id                         | 18ca7355-f3b2-433f-a00e-a0bf4c0247ad |
| name                       | baremetal                            |
| os-flavor-access:is_public | True                                 |
| ram                        | 4096                                 |
| rxtx_factor                | 1.0                                  |
| swap                       |                                      |
| vcpus                      | 1                                    |
+----------------------------+--------------------------------------+
[stack@undercloud01 ~]$ openstack flavor set --property "cpu_arch"="x86_64" --property "capabilities:boot_option"="local" baremetal
+----------------------------+-----------------------------------------------------+
| Field                      | Value                                               |
+----------------------------+-----------------------------------------------------+
| OS-FLV-DISABLED:disabled   | False                                               |
| OS-FLV-EXT-DATA:ephemeral  | 0                                                   |
| disk                       | 40                                                  |
| id                         | 18ca7355-f3b2-433f-a00e-a0bf4c0247ad                |
| name                       | baremetal                                           |
| os-flavor-access:is_public | True                                                |
| properties                 | capabilities:boot_option='local', cpu_arch='x86_64' |
| ram                        | 4096                                                |
| rxtx_factor                | 1.0                                                 |
| swap                       |                                                     |
| vcpus                      | 1                                                   |
+----------------------------+-----------------------------------------------------+
[stack@undercloud01 ~]$ openstack flavor list
+--------------------------------------+-----------+------+------+-----------+-------+-----------+
| ID                                   | Name      |  RAM | Disk | Ephemeral | VCPUs | Is Public |
+--------------------------------------+-----------+------+------+-----------+-------+-----------+
| 18ca7355-f3b2-433f-a00e-a0bf4c0247ad | baremetal | 4096 |   40 |         0 |     1 | True      |
| 79de6690-b30a-486d-b1c6-05e22795155c | control   | 4096 |   40 |         0 |     1 | True      |
| c90b9f5a-fcad-40fb-92d7-8a2f8fb22d41 | compute   | 4096 |   40 |         0 |     1 | True      |
+--------------------------------------+-----------+------+------+-----------+-------+-----------+
[stack@undercloud01 ~]$
```

### Ironic profiles

Next we give real hints as to what we want the hard ware to do. Well tell ironic
that certain hosts are controllers and certain hosts are compute. For this
virtual setup it does not make too much sense as all the specs are the same,
however for a real deployment you would want to control which hosts would be
controllers, compute, neutron, ceph, neutron, etc. We do this with the following
commands:

```
ironic node-update {UUID} add properties/capabilities='profile:control,boot_option:local'
ironic node-update {UUID} add properties/capabilities='profile:compute,boot_option:local'
```

The output will look like:

```
[stack@undercloud01 ~]$ ironic node-list
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| UUID                                 | Name | Instance UUID | Power State | Provisioning State | Maintenance |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
| aa65e1af-7244-44bb-8188-8b7506e2cff3 | None | None          | power off   | available          | False       |
| a93b47e9-b0f3-4e14-8c0e-2deb486efd9e | None | None          | power off   | available          | False       |
| 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 | None | None          | power off   | available          | False       |
+--------------------------------------+------+---------------+-------------+--------------------+-------------+
[stack@undercloud01 ~]$ ironic node-update aa65e1af-7244-44bb-8188-8b7506e2cff3 add properties/capabilities='profile:control,boot_option:local'
+------------------------+-----------------------------------------------------------------------+
| Property               | Value                                                                 |
+------------------------+-----------------------------------------------------------------------+
| target_power_state     | None                                                                  |
| extra                  | {}                                                                    |
| last_error             | None                                                                  |
| updated_at             | 2016-02-22T12:31:22+00:00                                             |
| maintenance_reason     | None                                                                  |
| provision_state        | available                                                             |
| clean_step             | {}                                                                    |
| uuid                   | aa65e1af-7244-44bb-8188-8b7506e2cff3                                  |
| console_enabled        | False                                                                 |
| target_provision_state | None                                                                  |
| provision_updated_at   | 2016-02-22T12:31:22+00:00                                             |
| maintenance            | False                                                                 |
| inspection_started_at  | None                                                                  |
| inspection_finished_at | None                                                                  |
| power_state            | power off                                                             |
| driver                 | pxe_ssh                                                               |
| reservation            | None                                                                  |
| properties             | {u'memory_mb': u'4096', u'cpu_arch': u'x86_64', u'local_gb': u'39',   |
|                        | u'cpus': u'1', u'capabilities': u'profile:control,boot_option:local'} |
| instance_uuid          | None                                                                  |
| name                   | None                                                                  |
| driver_info            | {u'ssh_username': u'thomas', u'deploy_kernel': u'7dee66d3-e618-4bc3   |
|                        | -999d-e061b28182ac', u'deploy_ramdisk': u'd15d5608-c16b-47fd-ac8c-    |
|                        | 645604c9a3ac', u'ssh_key_contents': u'-----BEGIN RSA PRIVATE KEY----- |
|                        | M                                                                     |
|                        | IIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1       |
|                        | 1+qyLYJ                                                               |
|                        | fgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa             |
|                        | miZR87anAhv6x                                                         |
|                        | zciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g                   |
|                        | MsV8mKmxhpERFIWsxN6                                                   |
|                        | 9SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU                         |
|                        | dtWQIvLOIA4LshqxVlyvK+Gr1                                             |
|                        | j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw                               |
|                        | 2w9v15NPfQNU3uYKl814po6p1m8Dl+X                                       |
|                        | M59YRyQIDAQABAoIBAQCLftFgChIx2ZO6                                     |
|                        | OL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM                                 |
|                        | 3fPIPV1lMwRi1j+RIWhAkgqj49h                                           |
|                        | Y1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYg                           |
|                        | pneS+ysIelY9e8UufLChT                                                 |
|                        | cPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1                     |
|                        | gU7drcrCel6uKl4                                                       |
|                        | GTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSa               |
|                        | fzh6MmQw0                                                             |
|                        | BIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlR         |
|                        | fD/                                                                   |
|                        | G0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD      |
|                        | O                                                                     |
|                        | VyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+       |
|                        | ASaNF2S                                                               |
|                        | x/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P             |
|                        | RUBgHUlPunMa3                                                         |
|                        | +pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG                   |
|                        | qSy/+ch/r04a4yankrP                                                   |
|                        | toV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC                         |
|                        | 8p8+asJmu8S9ZRmLubi6OX/gE                                             |
|                        | GlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj                               |
|                        | taeMSWdv48498l3X496lfvgDw/O1p84                                       |
|                        | 3p5zPdRl3gftedysnbEFIZ8We9b0D2UGa                                     |
|                        | 9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInY                                 |
|                        | IO/4uma5NvfF4j//ntd6HwsZ4cO                                           |
|                        | scYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7Zs                           |
|                        | qxlNCyE6eZbg1AE8g3SOg                                                 |
|                        | FyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/                     |
|                        | PlK4KNP+B8JX7d+                                                       |
|                        | 1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA               |
|                        | 6ar3hd0+j                                                             |
|                        | kUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM         |
|                        | 8Hk                                                                   |
|                        | 0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY      |
|                        | E                                                                     |
|                        | VLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f                   |
|                        | -----END RSA                                                          |
|                        | PRIVATE KEY-----', u'ssh_virt_type': u'virsh', u'ssh_address':        |
|                        | u'10.0.0.1'}                                                          |
| created_at             | 2016-02-22T12:24:15+00:00                                             |
| driver_internal_info   | {}                                                                    |
| chassis_uuid           |                                                                       |
| instance_info          | {}                                                                    |
+------------------------+-----------------------------------------------------------------------+
[stack@undercloud01 ~]$ ironic node-update a93b47e9-b0f3-4e14-8c0e-2deb486efd9e add properties/capabilities='profile:compute,boot_option:local'
+------------------------+-----------------------------------------------------------------------+
| Property               | Value                                                                 |
+------------------------+-----------------------------------------------------------------------+
| target_power_state     | None                                                                  |
| extra                  | {}                                                                    |
| last_error             | None                                                                  |
| updated_at             | 2016-02-22T12:31:22+00:00                                             |
| maintenance_reason     | None                                                                  |
| provision_state        | available                                                             |
| clean_step             | {}                                                                    |
| uuid                   | a93b47e9-b0f3-4e14-8c0e-2deb486efd9e                                  |
| console_enabled        | False                                                                 |
| target_provision_state | None                                                                  |
| provision_updated_at   | 2016-02-22T12:31:22+00:00                                             |
| maintenance            | False                                                                 |
| inspection_started_at  | None                                                                  |
| inspection_finished_at | None                                                                  |
| power_state            | power off                                                             |
| driver                 | pxe_ssh                                                               |
| reservation            | None                                                                  |
| properties             | {u'memory_mb': u'4096', u'cpu_arch': u'x86_64', u'local_gb': u'39',   |
|                        | u'cpus': u'1', u'capabilities': u'profile:compute,boot_option:local'} |
| instance_uuid          | None                                                                  |
| name                   | None                                                                  |
| driver_info            | {u'ssh_username': u'thomas', u'deploy_kernel': u'7dee66d3-e618-4bc3   |
|                        | -999d-e061b28182ac', u'deploy_ramdisk': u'd15d5608-c16b-47fd-ac8c-    |
|                        | 645604c9a3ac', u'ssh_key_contents': u'-----BEGIN RSA PRIVATE KEY----- |
|                        | M                                                                     |
|                        | IIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1       |
|                        | 1+qyLYJ                                                               |
|                        | fgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa             |
|                        | miZR87anAhv6x                                                         |
|                        | zciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g                   |
|                        | MsV8mKmxhpERFIWsxN6                                                   |
|                        | 9SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU                         |
|                        | dtWQIvLOIA4LshqxVlyvK+Gr1                                             |
|                        | j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw                               |
|                        | 2w9v15NPfQNU3uYKl814po6p1m8Dl+X                                       |
|                        | M59YRyQIDAQABAoIBAQCLftFgChIx2ZO6                                     |
|                        | OL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM                                 |
|                        | 3fPIPV1lMwRi1j+RIWhAkgqj49h                                           |
|                        | Y1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYg                           |
|                        | pneS+ysIelY9e8UufLChT                                                 |
|                        | cPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1                     |
|                        | gU7drcrCel6uKl4                                                       |
|                        | GTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSa               |
|                        | fzh6MmQw0                                                             |
|                        | BIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlR         |
|                        | fD/                                                                   |
|                        | G0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD      |
|                        | O                                                                     |
|                        | VyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+       |
|                        | ASaNF2S                                                               |
|                        | x/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P             |
|                        | RUBgHUlPunMa3                                                         |
|                        | +pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG                   |
|                        | qSy/+ch/r04a4yankrP                                                   |
|                        | toV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC                         |
|                        | 8p8+asJmu8S9ZRmLubi6OX/gE                                             |
|                        | GlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj                               |
|                        | taeMSWdv48498l3X496lfvgDw/O1p84                                       |
|                        | 3p5zPdRl3gftedysnbEFIZ8We9b0D2UGa                                     |
|                        | 9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInY                                 |
|                        | IO/4uma5NvfF4j//ntd6HwsZ4cO                                           |
|                        | scYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7Zs                           |
|                        | qxlNCyE6eZbg1AE8g3SOg                                                 |
|                        | FyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/                     |
|                        | PlK4KNP+B8JX7d+                                                       |
|                        | 1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA               |
|                        | 6ar3hd0+j                                                             |
|                        | kUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM         |
|                        | 8Hk                                                                   |
|                        | 0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY      |
|                        | E                                                                     |
|                        | VLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f                   |
|                        | -----END RSA                                                          |
|                        | PRIVATE KEY-----', u'ssh_virt_type': u'virsh', u'ssh_address':        |
|                        | u'10.0.0.1'}                                                          |
| created_at             | 2016-02-22T12:24:16+00:00                                             |
| driver_internal_info   | {}                                                                    |
| chassis_uuid           |                                                                       |
| instance_info          | {}                                                                    |
+------------------------+-----------------------------------------------------------------------+
[stack@undercloud01 ~]$ ironic node-update 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8 add properties/capabilities='profile:compute,boot_option:local'
+------------------------+-----------------------------------------------------------------------+
| Property               | Value                                                                 |
+------------------------+-----------------------------------------------------------------------+
| target_power_state     | None                                                                  |
| extra                  | {}                                                                    |
| last_error             | None                                                                  |
| updated_at             | 2016-02-22T12:31:22+00:00                                             |
| maintenance_reason     | None                                                                  |
| provision_state        | available                                                             |
| clean_step             | {}                                                                    |
| uuid                   | 79dd9abe-ce2f-49e9-a8d5-3d57deb6cda8                                  |
| console_enabled        | False                                                                 |
| target_provision_state | None                                                                  |
| provision_updated_at   | 2016-02-22T12:31:22+00:00                                             |
| maintenance            | False                                                                 |
| inspection_started_at  | None                                                                  |
| inspection_finished_at | None                                                                  |
| power_state            | power off                                                             |
| driver                 | pxe_ssh                                                               |
| reservation            | None                                                                  |
| properties             | {u'memory_mb': u'4096', u'cpu_arch': u'x86_64', u'local_gb': u'39',   |
|                        | u'cpus': u'1', u'capabilities': u'profile:compute,boot_option:local'} |
| instance_uuid          | None                                                                  |
| name                   | None                                                                  |
| driver_info            | {u'ssh_username': u'thomas', u'deploy_kernel': u'7dee66d3-e618-4bc3   |
|                        | -999d-e061b28182ac', u'deploy_ramdisk': u'd15d5608-c16b-47fd-ac8c-    |
|                        | 645604c9a3ac', u'ssh_key_contents': u'-----BEGIN RSA PRIVATE KEY----- |
|                        | M                                                                     |
|                        | IIEowIBAAKCAQEAqaGcYE9HmiN2RCMevv/PWeNbglzzwWYXmSBrBDwsx/qBXTS1       |
|                        | 1+qyLYJ                                                               |
|                        | fgeMSCGoSTg9tfwt45KXX7tYy7YvG4DGcETGt57l08SiJEsE4JwOt/aNa             |
|                        | miZR87anAhv6x                                                         |
|                        | zciMoUpwWW2CMIQ9x+jVjXx3h/yd4VfNqjRb9kBV6QR3Jgw2s2g                   |
|                        | MsV8mKmxhpERFIWsxN6                                                   |
|                        | 9SwUHHGdd9/EDykBKgBDcLJ+AZwK4yqwgBNYXsv3fwtlU                         |
|                        | dtWQIvLOIA4LshqxVlyvK+Gr1                                             |
|                        | j6k+vSE2PveU+xW1ow1MNJy4fRhio13uPp5fGiw                               |
|                        | 2w9v15NPfQNU3uYKl814po6p1m8Dl+X                                       |
|                        | M59YRyQIDAQABAoIBAQCLftFgChIx2ZO6                                     |
|                        | OL9iBm/31ZY9QD9b/Z7OV/BpjSquUXzsrxoTM                                 |
|                        | 3fPIPV1lMwRi1j+RIWhAkgqj49h                                           |
|                        | Y1iCLH4hg+p54UbH1qUqZFFE0QxiWQ5OFHW/al/ecYg                           |
|                        | pneS+ysIelY9e8UufLChT                                                 |
|                        | cPsbPEVoixET5OQFyRJiTixibBQcONy7p3nYAaYol3jUZYgv1                     |
|                        | gU7drcrCel6uKl4                                                       |
|                        | GTecoGRIlw9IApHiLBjjhahyTi7Oa7xRO9TsaY+rbZRax4ko57ZGuSa               |
|                        | fzh6MmQw0                                                             |
|                        | BIdz7JyDDOoQSqJGoNUZ1oPBLgkvig5jyNOp01BRIdzSGOhOM5L8C0vbofAlR         |
|                        | fD/                                                                   |
|                        | G0bBRBYBAoGBANPFR9ehqGO5lE+zuGM9EKlMnS3kITXNNUn6CiwDbvLKzw6zBZLD      |
|                        | O                                                                     |
|                        | VyaFPFt7J4r88mio6DjJVRW57rX4YaFsj2oCxPuYnJRgGBQ1u7EGjcJ0iOxZY/+       |
|                        | ASaNF2S                                                               |
|                        | x/enAknVFiOtv8MXaoAOSRAkch2kwrw6fCkP/tZw4qELQmcChAoGBAM0P             |
|                        | RUBgHUlPunMa3                                                         |
|                        | +pXadE8SqE5ruPSdU9CbrI0UPQaoGVi8bXBqiDOaeKxcWDX4gfG                   |
|                        | qSy/+ch/r04a4yankrP                                                   |
|                        | toV9ihmLXNz0zrImHnT2wCC6nw9J/pjxBDDvXvqeL9NjC                         |
|                        | 8p8+asJmu8S9ZRmLubi6OX/gE                                             |
|                        | GlqILnWclxdMzgpAoGAHEb4e9uTL5XFLwtRcLbj                               |
|                        | taeMSWdv48498l3X496lfvgDw/O1p84                                       |
|                        | 3p5zPdRl3gftedysnbEFIZ8We9b0D2UGa                                     |
|                        | 9k6tBAFN1fP6D2JcAM/grD68d5WleR+yqaInY                                 |
|                        | IO/4uma5NvfF4j//ntd6HwsZ4cO                                           |
|                        | scYVaf9kkIXhizWpihpunWECgYAIOqKm0LScKozq7Zs                           |
|                        | qxlNCyE6eZbg1AE8g3SOg                                                 |
|                        | FyVghmkFaJEWoCz5oA7zv/cy0bcKZNiJKTMW7rjUQ5P2CyeB/                     |
|                        | PlK4KNP+B8JX7d+                                                       |
|                        | 1Whj/1p0tNrQ6bp8FIgvJptKEf3DbR9bcJ/MKV9Dp+4Utly/owmHrjA               |
|                        | 6ar3hd0+j                                                             |
|                        | kUHq8QKBgGJTbCTHPdAZMli3ckbkaLO4xKCB7gvB1Apa5OVonoQHR0LfODLpM         |
|                        | 8Hk                                                                   |
|                        | 0pDq/YAqjvndURIxOtZ2MXVig0WETYmlYSUz+mlg51GYZhGeIr7WxwuY/uu2tePY      |
|                        | E                                                                     |
|                        | VLCJM0BI8Qk9d8931pVAkdRrAU4ZU8TdkkG5C6RAJA03vO69P4f                   |
|                        | -----END RSA                                                          |
|                        | PRIVATE KEY-----', u'ssh_virt_type': u'virsh', u'ssh_address':        |
|                        | u'10.0.0.1'}                                                          |
| created_at             | 2016-02-22T12:24:16+00:00                                             |
| driver_internal_info   | {}                                                                    |
| chassis_uuid           |                                                                       |
| instance_info          | {}                                                                    |
+------------------------+-----------------------------------------------------------------------+
[stack@undercloud01 ~]$
```

## Build Overcloud

### Overstack templates

The next thing we do is prepare some configuration files. In essence the
"openstack overcloud deploy" command will deploy a simple overcloud that works.
It uses heat for all the deployment. We have to slightly modify the
configuration to customise it for our setup. These customizations overlay the
defaults, so although the changes we make are small, under the hood a lot is
going on. We need to tell it about our network, eg the various VLANS, IPs and IP
ranges to use. There are some default yaml heat templates that generate the
configuration to segregate traffic with VLANS. However our setup has the
external traffic on the default vlan untagged and thus the host can access the
instances's floating IP's. We have to reference and define compute.yaml and
controller.yaml. We also do an extra firstboot step to create and activate the
swap. I'm not sure why this is not configured by default and as it stands this
does not seem to work on my setup yet. However I let in there in hope that I fix
it. This is the output of the process I used to create the Overstack templates.

```
[stack@undercloud01 ~]$ mkdir ~/templates
[stack@undercloud01 ~]$ cat ~/templates/network-environment.yaml
resource_registry:
 OS::TripleO::Compute::Net::SoftwareConfig: /home/stack/templates/nic-configs/compute.yaml
 OS::TripleO::Controller::Net::SoftwareConfig: /home/stack/templates/nic-configs/controller.yaml

parameter_defaults:

 # The IP address of the EC2 metadata server. Generally the IP of the Undercloud
 EC2MetadataIp: 172.16.0.2
 # Gateway router for the provisioning network (or Undercloud IP)
 ControlPlaneDefaultRoute: 172.16.0.1
 DnsServers: ["172.16.0.1"]

 ExternalNetCidr: 10.0.0.0/24
 InternalApiNetCidr: 10.0.10.0/24
 StorageNetCidr: 10.0.11.0/24
 StorageMgmtNetCidr: 10.0.12.0/24
 TenantNetCidr: 10.0.13.0/24

 # Leave room for floating IPs in the External allocation pool
 ExternalAllocationPools: [{'start': '10.0.0.100', 'end': '10.0.0.200'}]
 InternalApiAllocationPools: [{'start': '10.0.10.10', 'end': '10.0.10.200'}]
 StorageAllocationPools: [{'start': '10.0.11.10', 'end': '10.0.11.200'}]
 StorageMgmtAllocationPools: [{'start': '10.0.12.10', 'end': '10.0.12.200'}]
 TenantAllocationPools: [{'start': '10.0.13.10', 'end': '10.0.13.200'}]

 InternalApiNetworkVlanID: 10
 StorageNetworkVlanID: 11
 StorageMgmtNetworkVlanID: 12
 TenantNetworkVlanID: 13

 # ExternalNetworkVlanID: 100
 # Set to the router gateway on the external network
 ExternalInterfaceDefaultRoute: 10.0.0.1
 # Set to "br-ex" if using floating IPs on native VLAN on bridge br-ex
 NeutronExternalNetworkBridge: "br-ex"

 # Customize bonding options if required
 BondInterfaceOvsOptions: "bond_mode=active-backup"
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ mkdir ~/templates/nic-configs/
[stack@undercloud01 ~]$ cp /usr/share/openstack-tripleo-heat-templates/network/config/bond-with-vlans/* ~/templates/nic-configs/
[stack@undercloud01 ~]$ find ~/templates/nic-configs/
/home/stack/templates/nic-configs/
/home/stack/templates/nic-configs/ceph-storage.yaml
/home/stack/templates/nic-configs/cinder-storage.yaml
/home/stack/templates/nic-configs/compute.yaml
/home/stack/templates/nic-configs/controller.yaml
/home/stack/templates/nic-configs/README.md
/home/stack/templates/nic-configs/swift-storage.yaml
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ cp ./templates/nic-configs/controller.yaml ./templates/nic-configs/controller.yaml.orig
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ diff -u ./templates/nic-configs/controller.yaml.orig ./templates/nic-configs/controller.yaml
--- ./templates/nic-configs/controller.yaml.orig	2016-02-21 19:28:44.735000000 +0000
+++ ./templates/nic-configs/controller.yaml	2016-02-21 19:29:00.129000000 +0000
@@ -97,6 +97,11 @@
             -
               type: ovs_bridge
               name: {get_input: bridge_name}
+              addresses:
+                - ip_netmask: {get_param: ExternalIpSubnet}
+              routes:
+                - ip_netmask: 0.0.0.0/0
+                  next_hop: {get_param: ExternalInterfaceDefaultRoute}
               dns_servers: {get_param: DnsServers}
               members:
                 -
@@ -114,17 +119,6 @@
                 -
                   type: vlan
                   device: bond1
-                  vlan_id: {get_param: ExternalNetworkVlanID}
-                  addresses:
-                    -
-                      ip_netmask: {get_param: ExternalIpSubnet}
-                  routes:
-                    -
-                      ip_netmask: 0.0.0.0/0
-                      next_hop: {get_param: ExternalInterfaceDefaultRoute}
-                -
-                  type: vlan
-                  device: bond1
                   vlan_id: {get_param: InternalApiNetworkVlanID}
                   addresses:
                     -
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ mkdir ~/templates/firstboot
[stack@undercloud01 ~]$ cat ~/templates/firstboot/firstboot.yaml
resource_registry:
 OS::TripleO::NodeUserData: /home/stack/templates/firstboot/userdata.yaml
[stack@undercloud01 ~]$ cat ~/templates/firstboot/userdata.yaml
heat_template_version: 2014-10-16

resources:
 userdata:
   type: OS::Heat::MultipartMime
   properties:
    parts:
    - config: {get_resource: swapon_config}

 swapon_config:
   type: OS::Heat::SoftwareConfig
   properties:
    config: |
     #!/bin/bash
     swap_device=$(sudo fdisk -l | grep swap | awk '{print $1}')
     if  $swap_device && ${swap_device} ; then
       rc_local="/etc/rc.d/rc.local"
       echo "swapon $swap_device " >> $rc_local
       chmod 755 $rc_local
       swapon $swap_device
     fi
outputs:
 OS::stack_id:
  value: {get_resource: userdata}
[stack@undercloud01 ~]$
```

### Deploy overcloud

The next thing to do is actually start creating the overcloud. The first time I
did this I didn't use the extra templates mentioned above, I just ran "openstack
overcloud deploy - -templates /usr/share/openstack-tripleo-heat-templates -
-control-scale 1 - -compute-scale 1 - -neutron-tunnel-types vxlan -
-neutron-network-type vxlan - -control-flavor control - -compute-flavor
compute". Once this ran and finished and had no other issues I added the extra
templates. This process does take a little time. Various numbers of
control-scale and compute-scale can be used to control how many nodes are
deployed. I only did one of each in the end for speed as I did try more but my
little laptop could not cope. It should also be noted that you can have 3
controllers by using the options "- -control-scale 3 -e
/usr/share/openstack-tripleo-heat-templates/environments/puppet-pacemaker.yaml".
This will create a HA type controller environment completely automatically. I
didn't try this on my laptop does it works work on the bigger server I was
testing.

The command is listed below:

```
[stack@undercloud01 ~]$ openstack overcloud deploy --templates /usr/share/openstack-tripleo-heat-templates --control-scale 1 --compute-scale 1 --neutron-tunnel-types vxlan --neutron-network-type vxlan --control-flavor control --compute-flavor compute -e /usr/share/openstack-tripleo-heat-templates/environments/network-isolation.yaml -e ~/templates/network-environment.yaml -e ~/templates/firstboot/firstboot.yaml
Deploying templates in the directory /usr/share/openstack-tripleo-heat-templates
```

While it runs in a window you can login to the undercloud machine and inspect
the progress with the "heat stack-list" command. Eventually this changed to
either ERROR or COMPLETE. It looks like:

```
[stack@undercloud01 ~]$ . stackrc
[stack@undercloud01 ~]$ heat stack-list
+--------------------------------------+------------+--------------------+---------------------+--------------+
| id                                   | stack_name | stack_status       | creation_time       | updated_time |
+--------------------------------------+------------+--------------------+---------------------+--------------+
| d4f6e2d8-8461-4896-9de0-4aba291294dd | overcloud  | CREATE_IN_PROGRESS | 2016-02-24T12:16:48 | None         |
+--------------------------------------+------------+--------------------+---------------------+--------------+
[stack@undercloud01 ~]$
```

If you want to see more progress, the "heat resource-list -n 5 overcloud" will
show how it's going; however, if it goes wrong, the command "heat resource-list
-n 5 overcloud | grep -i fail" will help; also see
http://docs.openstack.org/developer/tripleo-docs/troubleshooting/troubleshooting-overcloud.html.
Also "heat stack-delete overcloud" will do a good job cleaning everything up to
start afresh. However, if it all goes well you should see the nova on the
Undercloud start to spawn instances. This can be seen with a simple "nova list",
sample output below.

```
[stack@undercloud01 ~]$ . stackrc
[stack@undercloud01 ~]$ nova list
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
| ID                                   | Name                    | Status | Task State | Power State | Networks             |
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
| 576bd474-8bc1-4a0a-9991-b14498e85f73 | overcloud-controller-0  | BUILD  | spawning   | NOSTATE     | ctlplane=172.16.0.10 |
| 85c92cb7-c8fc-4fdb-b848-416635be5f45 | overcloud-novacompute-0 | BUILD  | spawning   | NOSTATE     | ctlplane=172.16.0.9  |
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
[stack@undercloud01 ~]$
```

Once the instances get further along you can see the status changes from BUILD
to ACTIVE and they are up and running:

```
[stack@undercloud01 ~]$ nova list
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
| ID                                   | Name                    | Status | Task State | Power State | Networks             |
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
| 576bd474-8bc1-4a0a-9991-b14498e85f73 | overcloud-controller-0  | ACTIVE | -          | Running     | ctlplane=172.16.0.10 |
| 85c92cb7-c8fc-4fdb-b848-416635be5f45 | overcloud-novacompute-0 | ACTIVE | -          | Running     | ctlplane=172.16.0.9  |
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
[stack@undercloud01 ~]$
```

Meanwhile heat is still working away getting everything installed. As mentioned
above the "heat resource-list" command can be used show the overall progress. I
used the rather nasty command: "while true; do heat resource-list -n 5 overcloud
| cut -c147-165 | grep -v -- '---' | sort | uniq -c; sleep 5; done" to give a
little progress. In essence it groups by the resource_status and counts the
jobs. I would like a better progress log, eta indicator. Here is an example of
the "heat resource-list -n 5 overcloud" to give an idea of the number of heat
jobs that get created:

```
[stack@undercloud01 ~]$ heat resource-list -n 5 overcloud
+-------------------------------------------+-----------------------------------------------+---------------------------------------------------+--------------------+---------------------+---------------------------------------------------------------------------------+
| resource_name                             | physical_resource_id                          | resource_type                                     | resource_status    | updated_time        | stack_name                                                                      |
+-------------------------------------------+-----------------------------------------------+---------------------------------------------------+--------------------+---------------------+---------------------------------------------------------------------------------+
| ObjectStorageAllNodesValidationDeployment |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:48 | overcloud                                                                       |
| ObjectStorageNodesPostDeployment          |                                               | OS::TripleO::ObjectStoragePostDeployment          | INIT_COMPLETE      | 2016-02-24T12:16:48 | overcloud                                                                       |
| VipDeployment                             |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:48 | overcloud                                                                       |
| AllNodesExtraConfig                       |                                               | OS::TripleO::AllNodesExtraConfig                  | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| AllNodesValidationConfig                  |                                               | OS::TripleO::AllNodes::Validation                 | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| BlockStorage                              | db69d38c-67ca-44a7-831f-ffcdbf5647a3          | OS::Heat::ResourceGroup                           | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| BlockStorageAllNodesDeployment            |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| BlockStorageAllNodesValidationDeployment  |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| BlockStorageNodesPostDeployment           |                                               | OS::TripleO::BlockStoragePostDeployment           | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| CephClusterConfig                         |                                               | OS::TripleO::CephClusterConfig::SoftwareConfig    | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| CephStorage                               | 79869bfb-c9e9-4b50-a84e-a12994ab02c9          | OS::Heat::ResourceGroup                           | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| CephStorageAllNodesDeployment             |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| CephStorageAllNodesValidationDeployment   |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| CephStorageCephDeployment                 |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| CephStorageNodesPostDeployment            |                                               | OS::TripleO::CephStoragePostDeployment            | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| Compute                                   | 6a6047d0-461b-4ae3-ade3-69beb698d161          | OS::Heat::ResourceGroup                           | CREATE_IN_PROGRESS | 2016-02-24T12:16:49 | overcloud                                                                       |
| ComputeAllNodesDeployment                 |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ComputeAllNodesValidationDeployment       |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ComputeCephDeployment                     |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ComputeNodesPostDeployment                |                                               | OS::TripleO::ComputePostDeployment                | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControlVirtualIP                          | 344ffcde-004b-4b88-b0ee-dcc29ec3267d          | OS::Neutron::Port                                 | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| Controller                                | e8f2de6a-89b9-4d8b-894b-dc20f4348831          | OS::Heat::ResourceGroup                           | CREATE_IN_PROGRESS | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerAllNodesDeployment              |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerAllNodesValidationDeployment    |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerBootstrapNodeConfig             |                                               | OS::TripleO::BootstrapNode::SoftwareConfig        | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerBootstrapNodeDeployment         |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerCephDeployment                  |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerClusterConfig                   |                                               | OS::Heat::StructuredConfig                        | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerClusterDeployment               |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerIpListMap                       |                                               | OS::TripleO::Network::Ports::NetIpListMap         | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerNodesPostDeployment             |                                               | OS::TripleO::ControllerPostDeployment             | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ControllerSwiftDeployment                 |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ExternalNetwork                           | 20db9af2-1614-4faf-9f63-5c902c510b69          | OS::TripleO::Network::External                    | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud-Networks-3jjwswfwkj7t                                                 |
| HeatAuthEncryptionKey                     | overcloud-HeatAuthEncryptionKey-7en7ykwzhbub  | OS::Heat::RandomString                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| HorizonSecret                             | overcloud-HorizonSecret-4mvh4duhl6ez          | OS::Heat::RandomString                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| InternalApiVirtualIP                      | 1070f886-e726-48b6-9952-b38a8edd5e1d          | OS::TripleO::Controller::Ports::InternalApiPort   | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| MysqlClusterUniquePart                    | overcloud-MysqlClusterUniquePart-yudeiwqayazw | OS::Heat::RandomString                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| MysqlRootPassword                         | overcloud-MysqlRootPassword-elqh65u4vbfr      | OS::Heat::RandomString                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| Networks                                  | e42485ac-8fce-474c-b807-254e0d5030f9          | OS::TripleO::Network                              | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| ObjectStorage                             | e97b12ce-53b1-4e6b-8423-77149b7c7039          | OS::Heat::ResourceGroup                           | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| ObjectStorageAllNodesDeployment           |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| ObjectStorageSwiftDeployment              |                                               | OS::Heat::StructuredDeployments                   | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| PcsdPassword                              | overcloud-PcsdPassword-zxcr22grrhk3           | OS::Heat::RandomString                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| PublicVirtualIP                           | 871d9d35-e8c0-4af3-a763-b1fd46f7b66a          | OS::TripleO::Controller::Ports::ExternalPort      | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| RabbitCookie                              | overcloud-RabbitCookie-q4dfoexkd6hu           | OS::Heat::RandomString                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| RedisVirtualIP                            | 1733b289-97de-446f-9aa0-d4f24617b6f7          | OS::TripleO::Controller::Ports::RedisVipPort      | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| StorageMgmtNetwork                        | b616e8b2-8a68-41c7-80b5-fa9b521498a8          | OS::TripleO::Network::StorageMgmt                 | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud-Networks-3jjwswfwkj7t                                                 |
| StorageMgmtVirtualIP                      | ca08d662-5999-4bcd-97e1-e277f9482fb1          | OS::TripleO::Controller::Ports::StorageMgmtPort   | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| StorageVirtualIP                          | 2dc0c025-7fd4-488d-8e83-de232e80512f          | OS::TripleO::Controller::Ports::StoragePort       | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| SwiftDevicesAndProxyConfig                |                                               | OS::TripleO::SwiftDevicesAndProxy::SoftwareConfig | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| VipConfig                                 | a03f6cd8-569f-451c-a8e7-56736aa3d8f9          | OS::TripleO::VipConfig                            | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| VipMap                                    | 36f7d520-d175-46a2-a441-11c890bb3e12          | OS::TripleO::Network::Ports::NetIpMap             | CREATE_COMPLETE    | 2016-02-24T12:16:49 | overcloud                                                                       |
| allNodesConfig                            |                                               | OS::TripleO::AllNodes::SoftwareConfig             | INIT_COMPLETE      | 2016-02-24T12:16:49 | overcloud                                                                       |
| InternalNetwork                           | 35ae6089-5696-4df0-a986-a526bb1e0aa1          | OS::TripleO::Network::InternalApi                 | CREATE_COMPLETE    | 2016-02-24T12:16:50 | overcloud-Networks-3jjwswfwkj7t                                                 |
| StorageMgmtNetwork                        | 3a7d29c9-3f4b-43da-a803-6fb9ce55103f          | OS::Neutron::Net                                  | CREATE_COMPLETE    | 2016-02-24T12:16:50 | overcloud-Networks-3jjwswfwkj7t-StorageMgmtNetwork-rklclktpxv44                 |
| StorageMgmtSubnet                         | 42a3efbc-d57d-4b89-8fa5-c76a54399b90          | OS::Neutron::Subnet                               | CREATE_COMPLETE    | 2016-02-24T12:16:50 | overcloud-Networks-3jjwswfwkj7t-StorageMgmtNetwork-rklclktpxv44                 |
| StorageNetwork                            | ee203c07-87a8-4b4b-bcce-93a552d29a43          | OS::TripleO::Network::Storage                     | CREATE_COMPLETE    | 2016-02-24T12:16:50 | overcloud-Networks-3jjwswfwkj7t                                                 |
| TenantNetwork                             | b0041abb-c510-4311-86de-65f605dc1bb1          | OS::TripleO::Network::Tenant                      | CREATE_COMPLETE    | 2016-02-24T12:16:50 | overcloud-Networks-3jjwswfwkj7t                                                 |
| VipConfigImpl                             | f176bf54-cd31-4c07-9d43-a72ea566a140          | OS::Heat::StructuredConfig                        | CREATE_COMPLETE    | 2016-02-24T12:16:50 | overcloud-VipConfig-udycuufuzgz2                                                |
| ExternalNetwork                           | fe5ee2db-4549-4a3a-8c29-502891d2984a          | OS::Neutron::Net                                  | CREATE_COMPLETE    | 2016-02-24T12:16:51 | overcloud-Networks-3jjwswfwkj7t-ExternalNetwork-3ryqumyq33yg                    |
| ExternalSubnet                            | 16075ae6-fb18-4733-af03-2d3767b2731e          | OS::Neutron::Subnet                               | CREATE_COMPLETE    | 2016-02-24T12:16:51 | overcloud-Networks-3jjwswfwkj7t-ExternalNetwork-3ryqumyq33yg                    |
| InternalApiNetwork                        | 132bb2b4-4177-440f-be0e-53c185314b9d          | OS::Neutron::Net                                  | CREATE_COMPLETE    | 2016-02-24T12:16:52 | overcloud-Networks-3jjwswfwkj7t-InternalNetwork-c2swsw5allle                    |
| InternalApiSubnet                         | 13cffdf5-d3a8-40c2-93e8-815c2d050991          | OS::Neutron::Subnet                               | CREATE_COMPLETE    | 2016-02-24T12:16:52 | overcloud-Networks-3jjwswfwkj7t-InternalNetwork-c2swsw5allle                    |
| StorageNetwork                            | 1bd6d1f8-ce0c-42e5-8041-385489b140e5          | OS::Neutron::Net                                  | CREATE_COMPLETE    | 2016-02-24T12:16:53 | overcloud-Networks-3jjwswfwkj7t-StorageNetwork-nx7kedekw66l                     |
| StorageSubnet                             | e485d312-2b5d-4e0d-9c19-5746fa86cd2f          | OS::Neutron::Subnet                               | CREATE_COMPLETE    | 2016-02-24T12:16:53 | overcloud-Networks-3jjwswfwkj7t-StorageNetwork-nx7kedekw66l                     |
| TenantNetwork                             | e5b95c05-e4a8-4f9f-b6fc-2bcb85afc6b8          | OS::Neutron::Net                                  | CREATE_COMPLETE    | 2016-02-24T12:16:54 | overcloud-Networks-3jjwswfwkj7t-TenantNetwork-vnsept5doj7p                      |
| TenantSubnet                              | b349b889-eebd-4f82-ad3c-f33c923077e1          | OS::Neutron::Subnet                               | CREATE_COMPLETE    | 2016-02-24T12:16:54 | overcloud-Networks-3jjwswfwkj7t-TenantNetwork-vnsept5doj7p                      |
| StorageMgmtPort                           | 0974c508-f402-41b1-b32b-523e68289dcd          | OS::Neutron::Port                                 | CREATE_COMPLETE    | 2016-02-24T12:17:02 | overcloud-StorageMgmtVirtualIP-febkbw4d4xue                                     |
| InternalApiPort                           | 810efa4e-91d3-4e1b-8d9a-45b44faf7259          | OS::Neutron::Port                                 | CREATE_COMPLETE    | 2016-02-24T12:17:03 | overcloud-InternalApiVirtualIP-efndwthuhklf                                     |
| VipPort                                   | 650ed5e5-78cc-4eb5-b8f4-2d4d3ad5f1b9          | OS::Neutron::Port                                 | CREATE_COMPLETE    | 2016-02-24T12:17:04 | overcloud-RedisVirtualIP-wqtmjyckp3xe                                           |
| ExternalPort                              | 7f292974-76a4-452c-a330-555cebf65bcd          | OS::Neutron::Port                                 | CREATE_COMPLETE    | 2016-02-24T12:17:05 | overcloud-PublicVirtualIP-ou5ejwo45nze                                          |
| StoragePort                               | 2b291094-3be3-463a-99be-72a59a7ab1ff          | OS::Neutron::Port                                 | CREATE_COMPLETE    | 2016-02-24T12:17:05 | overcloud-StorageVirtualIP-vbixkdafem4x                                         |
| 0                                         | 9e30c58e-3c1c-4d7d-8e39-a94554cbbf77          | OS::TripleO::Compute                              | CREATE_IN_PROGRESS | 2016-02-24T12:17:11 | overcloud-Compute-fdb52zqsuo5k                                                  |
| ComputeExtraConfigPre                     |                                               | OS::TripleO::ComputeExtraConfigPre                | INIT_COMPLETE      | 2016-02-24T12:17:12 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NodeExtraConfig                           |                                               | OS::TripleO::NodeExtraConfig                      | INIT_COMPLETE      | 2016-02-24T12:17:12 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NovaComputeDeployment                     |                                               | OS::TripleO::SoftwareDeployment                   | INIT_COMPLETE      | 2016-02-24T12:17:12 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| UpdateDeployment                          |                                               | OS::Heat::SoftwareDeployment                      | INIT_COMPLETE      | 2016-02-24T12:17:12 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NetIpMap                                  |                                               | OS::TripleO::Network::Ports::NetIpMap             | INIT_COMPLETE      | 2016-02-24T12:17:13 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NetworkConfig                             |                                               | OS::TripleO::Compute::Net::SoftwareConfig         | INIT_COMPLETE      | 2016-02-24T12:17:13 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NetworkDeployment                         |                                               | OS::TripleO::SoftwareDeployment                   | INIT_COMPLETE      | 2016-02-24T12:17:13 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NovaComputeConfig                         | 6ce7d607-1cfb-40bf-a587-4f00b0ab87fb          | OS::Heat::StructuredConfig                        | CREATE_COMPLETE    | 2016-02-24T12:17:13 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| 0                                         | cb0a7797-9e81-4c02-a11d-afd7c8f9820c          | OS::TripleO::Controller                           | CREATE_IN_PROGRESS | 2016-02-24T12:17:14 | overcloud-Controller-3hewr3lbxngq                                               |
| InternalApiPort                           |                                               | OS::TripleO::Compute::Ports::InternalApiPort      | INIT_COMPLETE      | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NodeAdminUserData                         | cce3a2f1-c558-4ae7-8c3c-96852cd20afa          | OS::TripleO::NodeAdminUserData                    | CREATE_COMPLETE    | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NodeUserData                              | 870bf09b-29c9-41f3-82b9-18a06a1d6e82          | OS::TripleO::NodeUserData                         | CREATE_COMPLETE    | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| NovaCompute                               | 85c92cb7-c8fc-4fdb-b848-416635be5f45          | OS::Nova::Server                                  | CREATE_IN_PROGRESS | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| StoragePort                               |                                               | OS::TripleO::Compute::Ports::StoragePort          | INIT_COMPLETE      | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| TenantPort                                |                                               | OS::TripleO::Compute::Ports::TenantPort           | INIT_COMPLETE      | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| UpdateConfig                              | 537e9192-291e-4bc7-824c-41303edac470          | OS::TripleO::Tasks::PackageUpdate                 | CREATE_COMPLETE    | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| UserData                                  | 494017ea-cc09-4528-8ee9-ac437cdd35ea          | OS::Heat::MultipartMime                           | CREATE_COMPLETE    | 2016-02-24T12:17:14 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf                                   |
| ControllerConfig                          | 7fd6543b-0fa7-4786-857c-a58b7d301388          | OS::Heat::StructuredConfig                        | CREATE_COMPLETE    | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| ControllerDeployment                      |                                               | OS::TripleO::SoftwareDeployment                   | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| ControllerExtraConfigPre                  |                                               | OS::TripleO::ControllerExtraConfigPre             | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| NetIpMap                                  |                                               | OS::TripleO::Network::Ports::NetIpMap             | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| NetworkConfig                             |                                               | OS::TripleO::Controller::Net::SoftwareConfig      | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| NetworkDeployment                         |                                               | OS::TripleO::SoftwareDeployment                   | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| NodeExtraConfig                           |                                               | OS::TripleO::NodeExtraConfig                      | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| UpdateDeployment                          |                                               | OS::Heat::SoftwareDeployment                      | INIT_COMPLETE      | 2016-02-24T12:17:17 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| user_config                               | b6ae6186-0db7-46ed-ad3e-e933616b49f4          | OS::Heat::CloudConfig                             | CREATE_COMPLETE    | 2016-02-24T12:17:17 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf-NodeAdminUserData-fwobdrs2j5f2    |
| userdata                                  | eda62977-b834-478d-a28e-2d2836429305          | OS::Heat::MultipartMime                           | CREATE_COMPLETE    | 2016-02-24T12:17:17 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf-NodeAdminUserData-fwobdrs2j5f2    |
| NetIpSubnetMap                            |                                               | OS::TripleO::Network::Ports::NetIpSubnetMap       | INIT_COMPLETE      | 2016-02-24T12:17:18 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| StorageMgmtPort                           |                                               | OS::TripleO::Controller::Ports::StorageMgmtPort   | INIT_COMPLETE      | 2016-02-24T12:17:18 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| StoragePort                               |                                               | OS::TripleO::Controller::Ports::StoragePort       | INIT_COMPLETE      | 2016-02-24T12:17:18 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| TenantPort                                |                                               | OS::TripleO::Controller::Ports::TenantPort        | INIT_COMPLETE      | 2016-02-24T12:17:18 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| UpdateConfig                              | b1bd9014-3d96-4405-bbde-b7be0bade37d          | OS::TripleO::Tasks::PackageUpdate                 | CREATE_COMPLETE    | 2016-02-24T12:17:18 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| Controller                                | 576bd474-8bc1-4a0a-9991-b14498e85f73          | OS::Nova::Server                                  | CREATE_IN_PROGRESS | 2016-02-24T12:17:19 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| ExternalPort                              |                                               | OS::TripleO::Controller::Ports::ExternalPort      | INIT_COMPLETE      | 2016-02-24T12:17:19 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| InternalApiPort                           |                                               | OS::TripleO::Controller::Ports::InternalApiPort   | INIT_COMPLETE      | 2016-02-24T12:17:19 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| NodeAdminUserData                         | 907c4e70-085b-426f-aebc-6c029a03f3cc          | OS::TripleO::NodeAdminUserData                    | CREATE_COMPLETE    | 2016-02-24T12:17:19 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| NodeUserData                              | e497e1ac-85d7-4272-8e8d-54f703fa3e13          | OS::TripleO::NodeUserData                         | CREATE_COMPLETE    | 2016-02-24T12:17:19 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| UserData                                  | 484b340c-e93d-4bc9-b9a0-cb470985a328          | OS::Heat::MultipartMime                           | CREATE_COMPLETE    | 2016-02-24T12:17:19 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg                                |
| config                                    | 397b90a8-5ba7-4311-b59b-6c4ff804eaf2          | OS::Heat::SoftwareConfig                          | CREATE_COMPLETE    | 2016-02-24T12:17:19 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf-UpdateConfig-6pk7b7hi6ld6         |
| swapon_config                             | c88ab18f-4cd8-4a72-9727-9e979ffdbb3a          | OS::Heat::SoftwareConfig                          | CREATE_COMPLETE    | 2016-02-24T12:17:19 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf-NodeUserData-qi5rikf2vs3r         |
| userdata                                  | e74f1316-712f-4671-8d7a-3099cc7132ca          | OS::Heat::MultipartMime                           | CREATE_COMPLETE    | 2016-02-24T12:17:19 | overcloud-Compute-fdb52zqsuo5k-0-2k54jplbs6bf-NodeUserData-qi5rikf2vs3r         |
| swapon_config                             | a2466c2a-6269-4d0d-b68e-f6d20e0915db          | OS::Heat::SoftwareConfig                          | CREATE_COMPLETE    | 2016-02-24T12:17:21 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg-NodeUserData-nr6ixzosga5e      |
| user_config                               | 942f665a-e085-4010-ae9e-7c307d19a761          | OS::Heat::CloudConfig                             | CREATE_COMPLETE    | 2016-02-24T12:17:21 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg-NodeAdminUserData-74fczcuplz55 |
| userdata                                  | 4b6f1b62-6cf3-45d2-8318-2526fe61c302          | OS::Heat::MultipartMime                           | CREATE_COMPLETE    | 2016-02-24T12:17:21 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg-NodeUserData-nr6ixzosga5e      |
| userdata                                  | c8b19ee6-d789-47f2-a7b1-4607fea62f0b          | OS::Heat::MultipartMime                           | CREATE_COMPLETE    | 2016-02-24T12:17:21 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg-NodeAdminUserData-74fczcuplz55 |
| config                                    | c5b83ca2-336d-4c15-9b91-f3f582a95e51          | OS::Heat::SoftwareConfig                          | CREATE_COMPLETE    | 2016-02-24T12:17:22 | overcloud-Controller-3hewr3lbxngq-0-jimd45c2k5xg-UpdateConfig-gexelwiextkg      |
+-------------------------------------------+-----------------------------------------------+---------------------------------------------------+--------------------+---------------------+---------------------------------------------------------------------------------+
[stack@undercloud01 ~]$
```

### Overcloud creation complete

Once the "openstack overcloud deploy" command finishes:

```
[stack@undercloud01 ~]$ openstack overcloud deploy --templates /usr/share/openstack-tripleo-heat-templates --control-scale 1 --compute-scale 1 --neutron-tunnel-types vxlan --neutron-network-type vxlan --control-flavor control --compute-flavor compute -e /usr/share/openstack-tripleo-heat-templates/environments/network-isolation.yaml -e ~/templates/network-environment.yaml -e ~/templates/firstboot/firstboot.yaml
Deploying templates in the directory /usr/share/openstack-tripleo-heat-templates
```

It should output something similar to:

```
/home/stack/.ssh/known_hosts updated.
Original contents retained as /home/stack/.ssh/known_hosts.old
PKI initialization in init-keystone is deprecated and will be removed.
Warning: Permanently added '10.0.0.100' (ECDSA) to the list of known hosts.
No handlers could be found for logger "oslo_config.cfg"
2016-02-24 21:27:21.064 26031 WARNING keystone.cmd.cli [-] keystone-manage pki_setup is not recommended for production use.
The following cert files already exist, use --rebuild to remove the existing files before regenerating:
/etc/keystone/ssl/certs/ca.pem already exists
/etc/keystone/ssl/private/signing_key.pem already exists
/etc/keystone/ssl/certs/signing_cert.pem already exists
Connection to 10.0.0.100 closed.
Overcloud Endpoint: http://10.0.0.100:5000/v2.0/
Overcloud Deployed
[stack@undercloud01 ~]$

```

### Connecting to new cloud

Immediately we can source the Undercloud file (stackrc) and the Overcloud file
(overcloudrc) in turn to inspect the running OpenStack services and list of nova
instances. See below for some examples, note that the service list for the
Undercloud differs to the Overcloud.

```
[stack@undercloud01 ~]$ . stackrc
[stack@undercloud01 ~]$ openstack service list
+----------------------------------+------------+---------------+
| ID                               | Name       | Type          |
+----------------------------------+------------+---------------+
| 1a8cbbd1e49e4bb890f1858f1859e69a | nova       | compute       |
| 2fbeef8a38b54851be650b6af155353f | swift      | object-store  |
| 34935643c95e495d815d45b3396c4aa1 | heat       | orchestration |
| 36c6b4888d2a4e7b93205a3c4b03be32 | nova       | computev3     |
| 61eb15301e89487f9e9a68eb57b66196 | keystone   | identity      |
| 89e567684ff74953a03ecd3a27383bb4 | neutron    | network       |
| 9d4a707091614493b172ca4d8e74159e | ceilometer | metering      |
| a3528706832d44318a030995116ac2e7 | glance     | image         |
| f1c0820c69a8466aa93b5ed22ba4df56 | ironic     | baremetal     |
| f7f4c2f7545b4834a7728b946c67af69 | tuskar     | management    |
+----------------------------------+------------+---------------+
[stack@undercloud01 ~]$ nova list
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
| ID                                   | Name                    | Status | Task State | Power State | Networks             |
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
| 576bd474-8bc1-4a0a-9991-b14498e85f73 | overcloud-controller-0  | ACTIVE | -          | Running     | ctlplane=172.16.0.10 |
| 85c92cb7-c8fc-4fdb-b848-416635be5f45 | overcloud-novacompute-0 | ACTIVE | -          | Running     | ctlplane=172.16.0.9  |
+--------------------------------------+-------------------------+--------+------------+-------------+----------------------+
[stack@undercloud01 ~]$
```

And the same commands for the overcloud:

```
[stack@undercloud01 ~]$ . overcloudrc
[stack@undercloud01 ~]$ openstack service list
+----------------------------------+------------+---------------+
| ID                               | Name       | Type          |
+----------------------------------+------------+---------------+
| 15c0fef324fc47d5851e5c7cc6b8ff99 | swift      | object-store  |
| 2d37b99dfb2d4c85b074af04f7d0435b | nova       | compute       |
| 2e6132d6ef9542a3bc234d2209c59e94 | cinderv2   | volumev2      |
| 3b587260682d489ab1428c06857d0366 | horizon    | dashboard     |
| 745ff6484cac41b7ba9c04f140b3877b | neutron    | network       |
| 7e16510458f8427da684c9e8501c597f | heat       | orchestration |
| 84f00ea091664bb098c71f5504c90845 | cinder     | volume        |
| 920a63ce54434b49b1455032ce4f716a | glance     | image         |
| b54eeb4073094a8383770a94af93a564 | nova       | computev3     |
| c146ea983f0b4829a48ebb838b06dac0 | keystone   | identity      |
| e20e34379ad544aab3f3388c7f4ba485 | ceilometer | metering      |
+----------------------------------+------------+---------------+
[stack@undercloud01 ~]$ nova list
+----+------+--------+------------+-------------+----------+
| ID | Name | Status | Task State | Power State | Networks |
+----+------+--------+------------+-------------+----------+
+----+------+--------+------------+-------------+----------+
[stack@undercloud01 ~]$
```

The Undercloud nova list gave us the IP's for each Overcloud instances
(172.16.0.10 and 172.16.0.9 in mycase). We can ssh to each as the user
"heat-admin", they key from the stack user on the undercloud01 machine are
installed already. We can ask each's hostname and "ip -4 a" information:

```
[stack@undercloud01 ~]$ ssh heat-admin@172.16.0.10 hostname
The authenticity of host '172.16.0.10 (172.16.0.10)' can't be established.
ECDSA key fingerprint is dc:0e:b4:c9:8e:f6:97:6b:ae:ac:46:b1:3f:94:aa:96.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '172.16.0.10' (ECDSA) to the list of known hosts.
overcloud-controller-0.localdomain
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ ssh heat-admin@172.16.0.10 /usr/sbin/ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
    inet 172.16.0.10/24 brd 172.16.0.255 scope global eth0
       valid_lft forever preferred_lft forever
6: vlan10: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.10.13/24 brd 10.0.10.255 scope global vlan10
       valid_lft forever preferred_lft forever
    inet 10.0.10.10/32 scope global vlan10
       valid_lft forever preferred_lft forever
7: vlan13: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.13.11/24 brd 10.0.13.255 scope global vlan13
       valid_lft forever preferred_lft forever
8: br-ex: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.0.101/24 brd 10.0.0.255 scope global br-ex
       valid_lft forever preferred_lft forever
    inet 172.16.0.8/32 scope global br-ex
       valid_lft forever preferred_lft forever
    inet 10.0.0.100/32 scope global br-ex
       valid_lft forever preferred_lft forever
9: vlan12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.12.11/24 brd 10.0.12.255 scope global vlan12
       valid_lft forever preferred_lft forever
    inet 10.0.12.10/32 scope global vlan12
       valid_lft forever preferred_lft forever
10: vlan11: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.11.12/24 brd 10.0.11.255 scope global vlan11
       valid_lft forever preferred_lft forever
    inet 10.0.11.10/32 scope global vlan11
       valid_lft forever preferred_lft forever
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ ssh heat-admin@172.16.0.9 hostname
The authenticity of host '172.16.0.9 (172.16.0.9)' can't be established.
ECDSA key fingerprint is 3b:18:8f:29:85:bc:c3:89:00:ff:34:c0:df:45:a9:37.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '172.16.0.9' (ECDSA) to the list of known hosts.
overcloud-novacompute-0
[stack@undercloud01 ~]$

[stack@undercloud01 ~]$ ssh heat-admin@172.16.0.9 /usr/sbin/ip -4 a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
    inet 172.16.0.9/24 brd 172.16.0.255 scope global eth0
       valid_lft forever preferred_lft forever
7: vlan13: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.13.10/24 brd 10.0.13.255 scope global vlan13
       valid_lft forever preferred_lft forever
8: vlan10: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.10.12/24 brd 10.0.10.255 scope global vlan10
       valid_lft forever preferred_lft forever
9: vlan11: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN
    inet 10.0.11.11/24 brd 10.0.11.255 scope global vlan11
       valid_lft forever preferred_lft forever
[stack@undercloud01 ~]$
```

## Using OpenStack on Overcloud

### Initial configuration

The Overcloud OpenStack installation is now complete. This is where some guides
finish, however I want to show a few things so that it can be used. This is
where a little OpenStack knowledge is useful. The first thing I did was upload
the Debian OpenStack cloud image. You could pick any cloud image you like. I
used the glance command line to upload the image directly from a http location.
You can use the "- -file" option instead of the "- -location" option to upload
from the local filesystem.

```
[stack@undercloud01 ~]$ . overcloudrc
[stack@undercloud01 ~]$ glance image-create --name debian-8.3.0-openstack-amd64 --disk-format qcow2 --container-format bare --location http://cdimage.debian.org/mirror/cdimage/openstack/8.3.0/debian-8.3.0-openstack-amd64.qcow2 --is-public True --progress
+------------------+--------------------------------------+
| Property         | Value                                |
+------------------+--------------------------------------+
| checksum         | None                                 |
| container_format | bare                                 |
| created_at       | 2016-02-24T21:42:33.000000           |
| deleted          | False                                |
| deleted_at       | None                                 |
| disk_format      | qcow2                                |
| id               | a3e7e6dc-8c13-490f-a9b8-13af664ea409 |
| is_public        | True                                 |
| min_disk         | 0                                    |
| min_ram          | 0                                    |
| name             | debian-8.3.0-openstack-amd64         |
| owner            | 4919e54fb87d4016988853e30fed423f     |
| protected        | False                                |
| size             | 552301568                            |
| status           | active                               |
| updated_at       | 2016-02-24T21:42:34.000000           |
| virtual_size     | None                                 |
+------------------+--------------------------------------+
[stack@undercloud01 ~]$
```

If you fancy using the dashboard (Horizon) instead and having a play round you
can. By default there is a virtual host, so unless you do some extra DNS
configuration you need to make a new entry in the /etc/hosts file:

```
$ echo "10.0.0.100 overcloud-controller-0.localdomain" | sudo tee -a /etc/hosts
10.0.0.100 overcloud-controller-0.localdomain
$
```

Once this is done you can visit the horizon dashboard at
http://overcloud-controller-0.localdomain/ the username is admin and the
password is in /home/stack/overcloudrc file.

### Remote machine access

In our virtual example the 10.0.0.0/24 is the external network. This is
available from the libvirt host machine. In essence access from the libvirt host
(my laptop in my case) can been seen as access from the internet. If however you
use a larger test machine or a desktop and want to work on another machine I
found the [sshuttle](https://github.com/apenwarr/sshuttle) tool very useful. In
essence, from anywhere you "sshuttle user@libvirtmachine 10.0.0.0/24" and on
that local machine the 10.0.0.0/24 network is accessible.

### Kick the tires with tempest

There is test suite for OpenStack and it gets configured by default. This is not
necessary, however I found it interesting so I have left it in here. You run the
tempest utility on the undercloud machine and it runs test against the new
cloud. It does all sorts of things to make sure its working. Here is a sample
output of a run I tried. The first step is to set it up for a run:

```
[stack@undercloud01 ~]$ . overcloudrc
[stack@undercloud01 ~]$ mkdir ~/tempest
[stack@undercloud01 ~]$ cd ~/tempest
[stack@undercloud01 tempest]$ /usr/share/openstack-tempest-liberty/tools/configure-tempest-directory
[stack@undercloud01 tempest]$
[stack@undercloud01 tempest]$ tools/config_tempest.py --deployer-input ~/tempest-deployer-input.conf --debug --create identity.uri $OS_AUTH_URL identity.admin_password $OS_PASSWORD
2016-02-25 10:48:09.934 3142 INFO tempest [-] Using tempest config file /etc/tempest/tempest.conf
2016-02-25 10:48:10.057 3142 INFO __main__ [-] Reading defaults from file '/home/stack/tempest/etc/default-overrides.conf'
2016-02-25 10:48:10.059 3142 INFO __main__ [-] Adding options from deployer-input file '/home/stack/tempest-deployer-input.conf'
<SNIP>
2016-02-25 10:49:24.500 3710 INFO __main__ [-] Creating configuration file /home/stack/tempest/etc/tempest.conf
[stack@undercloud01 tempest]$
```

Then run the tests, which will take a long time. The below output is actually
from my faster test machine and it took an hour and a half to compete. As you
can see not all the test passed, I'm not sure why.

```
[stack@undercloud01 tempest]$ tools/run-tests.sh
<SNIP>
======
Totals
======
Ran: 1496 tests in 5570.0000 sec.
 - Passed: 1323
 - Skipped: 109
 - Expected Fail: 0
 - Unexpected Success: 0
 - Failed: 64
Sum of execute time for each test: 7021.6725 sec.

==============
Worker Balance
==============
 - Worker 0 (706 tests) => 1:16:35.859043
 - Worker 1 (790 tests) => 1:32:32.510836
[stack@undercloud01 tempest]$
```

### Create project and user

Now to do some more fun things and actually start an instance. Going from a bare
OpenStack deployment to running instance takes a few steps.

Firstly create a new project and user:

```
[stack@undercloud01 ~]$ openstack project create thomas
+-------------+----------------------------------+
| Field       | Value                            |
+-------------+----------------------------------+
| description | None                             |
| enabled     | True                             |
| id          | de53721d068640cca8fb9b93b1deb389 |
| name        | thomas                           |
+-------------+----------------------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ openstack user create thomas --project thomas --password oom8Wei4nie5eeTi --email thomas@stewarts.org.uk
+------------+----------------------------------+
| Field      | Value                            |
+------------+----------------------------------+
| email      | thomas@stewarts.org.uk           |
| enabled    | True                             |
| id         | f7be4d65419841f19cb9285dc8bf726d |
| name       | thomas                           |
| project_id | de53721d068640cca8fb9b93b1deb389 |
| username   | thomas                           |
+------------+----------------------------------+
[stack@undercloud01 ~]$
```

Then a overcloudrc.thomas file can be created so that operations can be
performed as that user:

```
[stack@undercloud01 ~]$ cat overcloudrc.thomas
export OS_USERNAME=thomas
export OS_TENANT_NAME=thomas
export OS_PASSWORD=oom8Wei4nie5eeTi
[stack@undercloud01 ~]$
```

### Setup external network

The next thing to do is create the external network. This will allow access from
the instances to the 10.0.0.0/24 network and the libvirst host. Which in turn
allows access to the internet be it NATed.

First we can see we don't have any existing networks or subnets:

```
[stack@undercloud01 ~]$ neutron net-list

[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ neutron  subnet-list

[stack@undercloud01 ~]$
```

We create the network with the "neutron net-create" command. The "- -shared"
option makes this network available to other tenants. The "- -provider" options
are a but more scary "datacenter" is a bridge. It's this that makes the link
form the virtual networking components to the outside (confusingly which are
also virtual)

```
[stack@undercloud01 ~]$ neutron net-create external --shared --router:external --provider:physical_network datacentre --provider:network_type flat
Created a new network:
+---------------------------+--------------------------------------+
| Field                     | Value                                |
+---------------------------+--------------------------------------+
| admin_state_up            | True                                 |
| id                        | d2a804ae-399b-43c8-911d-fede4032f7e1 |
| mtu                       | 0                                    |
| name                      | external                             |
| provider:network_type     | flat                                 |
| provider:physical_network | datacentre                           |
| provider:segmentation_id  |                                      |
| router:external           | True                                 |
| shared                    | True                                 |
| status                    | ACTIVE                               |
| subnets                   |                                      |
| tenant_id                 | 4919e54fb87d4016988853e30fed423f     |
+---------------------------+--------------------------------------+
[stack@undercloud01 ~]$
```

Next we create a subnet for this network, note that this matches the
ExternalAllocationPools option from the ~/templates/network-environment.yaml
file.

```
[stack@undercloud01 ~]$ neutron subnet-create external 10.0.0.0/24 --name external --allocation-pool start=10.0.0.100,end=10.0.0.200 --dns-nameserver 10.0.0.1 --gateway 10.0.0.1
Created a new subnet:
+-------------------+----------------------------------------------+
| Field             | Value                                        |
+-------------------+----------------------------------------------+
| allocation_pools  | {"start": "10.0.0.100", "end": "10.0.0.200"} |
| cidr              | 10.0.0.0/24                                  |
| dns_nameservers   | 10.0.0.1                                     |
| enable_dhcp       | True                                         |
| gateway_ip        | 10.0.0.1                                     |
| host_routes       |                                              |
| id                | b400a503-0e58-4b53-8fe0-6509770f7eb4         |
| ip_version        | 4                                            |
| ipv6_address_mode |                                              |
| ipv6_ra_mode      |                                              |
| name              | external                                     |
| network_id        | d2a804ae-399b-43c8-911d-fede4032f7e1         |
| subnetpool_id     |                                              |
| tenant_id         | 4919e54fb87d4016988853e30fed423f             |
+-------------------+----------------------------------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ neutron  subnet-list
+--------------------------------------+----------+-------------+----------------------------------------------+
| id                                   | name     | cidr        | allocation_pools                             |
+--------------------------------------+----------+-------------+----------------------------------------------+
| b400a503-0e58-4b53-8fe0-6509770f7eb4 | external | 10.0.0.0/24 | {"start": "10.0.0.100", "end": "10.0.0.200"} |
+--------------------------------------+----------+-------------+----------------------------------------------+
[stack@undercloud01 ~]$
```

### Start using new user

This is the end of the administrator setup. Next we can login as out new user
and start using the new cloud.

```
[stack@undercloud01 ~]$ . overcloudrc.thomas
[stack@undercloud01 ~]$
```

### Create private network

First create a new private network and subnet for our machine to connect to:

```
[stack@undercloud01 ~]$ neutron net-create private
Created a new network:
+-----------------+--------------------------------------+
| Field           | Value                                |
+-----------------+--------------------------------------+
| admin_state_up  | True                                 |
| id              | 848f7024-822a-4d76-86fd-cb008282025d |
| mtu             | 0                                    |
| name            | private                              |
| router:external | False                                |
| shared          | False                                |
| status          | ACTIVE                               |
| subnets         |                                      |
| tenant_id       | de53721d068640cca8fb9b93b1deb389     |
+-----------------+--------------------------------------+
[stack@undercloud01 ~]$ neutron subnet-create private 192.168.100.0/24 --name private --dns-nameserver 8.8.8.8 --gateway 192.168.100.1
Created a new subnet:
+-------------------+------------------------------------------------------+
| Field             | Value                                                |
+-------------------+------------------------------------------------------+
| allocation_pools  | {"start": "192.168.100.2", "end": "192.168.100.254"} |
| cidr              | 192.168.100.0/24                                     |
| dns_nameservers   | 8.8.8.8                                              |
| enable_dhcp       | True                                                 |
| gateway_ip        | 192.168.100.1                                        |
| host_routes       |                                                      |
| id                | 8cc4e632-d86c-4bd8-a23f-7ea043f43430                 |
| ip_version        | 4                                                    |
| ipv6_address_mode |                                                      |
| ipv6_ra_mode      |                                                      |
| name              | private                                              |
| network_id        | 848f7024-822a-4d76-86fd-cb008282025d                 |
| subnetpool_id     |                                                      |
| tenant_id         | de53721d068640cca8fb9b93b1deb389                     |
+-------------------+------------------------------------------------------+
[stack@undercloud01 ~]$
```

We will need to get traffic from the private network to the external network, so
we need to create a router:

```
[stack@undercloud01 ~]$ neutron router-create router
Created a new router:
+-----------------------+--------------------------------------+
| Field                 | Value                                |
+-----------------------+--------------------------------------+
| admin_state_up        | True                                 |
| external_gateway_info |                                      |
| id                    | 28b17ce6-dbe4-4e5b-9c0e-432021b263ad |
| name                  | router                               |
| routes                |                                      |
| status                | ACTIVE                               |
| tenant_id             | de53721d068640cca8fb9b93b1deb389     |
+-----------------------+--------------------------------------+
[stack@undercloud01 ~]$
```

Now we have to connect them all together. Set the routers default gateway to be
the external router and then add an interface on the router to connect to the
private network:

```
[stack@undercloud01 ~]$ neutron router-gateway-set router external
Set gateway for router router
[stack@undercloud01 ~]$ neutron router-interface-add router private
Added interface 1271b2c0-b231-4da7-9e88-9ed3ac1f4215 to router router.
[stack@undercloud01 ~]$
```

### Create security groups

Next are the security group rules. You can create multiple different security
groups according to function. However for speed we just want to modify the
default group. We want to allow all ICMP and SSH traffic.

```
[stack@undercloud01 ~]$ nova secgroup-list-rules default
+-------------+-----------+---------+----------+--------------+
| IP Protocol | From Port | To Port | IP Range | Source Group |
+-------------+-----------+---------+----------+--------------+
|             |           |         |          | default      |
|             |           |         |          | default      |
+-------------+-----------+---------+----------+--------------+
[stack@undercloud01 ~]$ nova secgroup-add-rule default icmp -1 -1 0.0.0.0/0
+-------------+-----------+---------+-----------+--------------+
| IP Protocol | From Port | To Port | IP Range  | Source Group |
+-------------+-----------+---------+-----------+--------------+
| icmp        | -1        | -1      | 0.0.0.0/0 |              |
+-------------+-----------+---------+-----------+--------------+
[stack@undercloud01 ~]$ nova secgroup-add-rule default tcp 22 22 0.0.0.0/0
+-------------+-----------+---------+-----------+--------------+
| IP Protocol | From Port | To Port | IP Range  | Source Group |
+-------------+-----------+---------+-----------+--------------+
| tcp         | 22        | 22      | 0.0.0.0/0 |              |
+-------------+-----------+---------+-----------+--------------+
[stack@undercloud01 ~]$ nova secgroup-list-rules default
+-------------+-----------+---------+-----------+--------------+
| IP Protocol | From Port | To Port | IP Range  | Source Group |
+-------------+-----------+---------+-----------+--------------+
|             |           |         |           | default      |
| tcp         | 22        | 22      | 0.0.0.0/0 |              |
|             |           |         |           | default      |
| icmp        | -1        | -1      | 0.0.0.0/0 |              |
+-------------+-----------+---------+-----------+--------------+
[stack@undercloud01 ~]$
```

Once we do create an instance we want to be able to ssh into it. With cloud
computing static passwords for new instances are not really used. There is a
program called cloud-init that is able to get ssh keys into newly create
instances. So we need to create a new key for use to use. I copy the key from my
tesk laptop onto the undercloud machine and upload the key.

### Create SSH key

```
[stack@undercloud01 ~]$ scp thomas@10.0.0.1:.ssh/id_rsa.pub thomas-lenovo.pub
id_rsa.pub                                         100%  395     0.4KB/s   00:00
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ openstack keypair create --public-key thomas-lenovo.pub thomas-lenovo
+-------------+-------------------------------------------------+
| Field       | Value                                           |
+-------------+-------------------------------------------------+
| fingerprint | 1f:16:7b:89:e0:3f:13:5d:3e:bb:8d:7c:37:0b:58:e0 |
| name        | thomas-lenovo                                   |
| user_id     | f7be4d65419841f19cb9285dc8bf726d                |
+-------------+-------------------------------------------------+
[stack@undercloud01 ~]$
```

### Create floating IP

Generate a floating IP for us to use:

```
[stack@undercloud01 ~]$ openstack ip floating pool list
+----------+
| Name     |
+----------+
| external |
+----------+
[stack@undercloud01 ~]$ openstack ip floating list
[stack@undercloud01 ~]$ openstack ip floating create external
+-------------+--------------------------------------+
| Field       | Value                                |
+-------------+--------------------------------------+
| fixed_ip    | None                                 |
| id          | e85a88b9-6050-4368-897b-545dd7601a21 |
| instance_id | None                                 |
| ip          | 10.0.0.101                           |
| pool        | external                             |
+-------------+--------------------------------------+
[stack@undercloud01 ~]$
```

### Gather information for instance creation

Get the ID of the image:

```
[stack@undercloud01 ~]$ openstack image list
+--------------------------------------+------------------------------+
| ID                                   | Name                         |
+--------------------------------------+------------------------------+
| a3e7e6dc-8c13-490f-a9b8-13af664ea409 | debian-8.3.0-openstack-amd64 |
+--------------------------------------+------------------------------+
[stack@undercloud01 ~]$ openstack flavor list
+--------------------------------------+-----------+-------+------+-----------+-------+-----------+
| ID                                   | Name      |   RAM | Disk | Ephemeral | VCPUs | Is Public |
+--------------------------------------+-----------+-------+------+-----------+-------+-----------+
| 1                                    | m1.tiny   |   512 |    1 |         0 |     1 | True      |
| 2                                    | m1.small  |  2048 |   20 |         0 |     1 | True      |
| 3                                    | m1.medium |  4096 |   40 |         0 |     2 | True      |
| 4                                    | m1.large  |  8192 |   80 |         0 |     4 | True      |
| 5                                    | m1.xlarge | 16384 |  160 |         0 |     8 | True      |
| a7cfedbc-2764-4f67-ab93-dcf1290e7387 | m1.demo   |   512 |   10 |         0 |     1 | True      |
+--------------------------------------+-----------+-------+------+-----------+-------+-----------+
[stack@undercloud01 ~]$
```

Get the ID of the private subnet:

```
[stack@undercloud01 ~]$ openstack network list
+--------------------------------------+----------+--------------------------------------+
| ID                                   | Name     | Subnets                              |
+--------------------------------------+----------+--------------------------------------+
| 848f7024-822a-4d76-86fd-cb008282025d | private  | 8cc4e632-d86c-4bd8-a23f-7ea043f43430 |
| d2a804ae-399b-43c8-911d-fede4032f7e1 | external | b400a503-0e58-4b53-8fe0-6509770f7eb4 |
+--------------------------------------+----------+--------------------------------------+
[stack@undercloud01 ~]$
```

### Create instance

```
[stack@undercloud01 ~]$ openstack server create --image debian-8.3.0-openstack-amd64 --flavor m1.small --key-name thomas-lenovo --nic net-id=private my_instance
+--------------------------------------+---------------------------------------------------------------------+
| Field                                | Value                                                               |
+--------------------------------------+---------------------------------------------------------------------+
| OS-DCF:diskConfig                    | MANUAL                                                              |
| OS-EXT-AZ:availability_zone          |                                                                     |
| OS-EXT-STS:power_state               | 0                                                                   |
| OS-EXT-STS:task_state                | scheduling                                                          |
| OS-EXT-STS:vm_state                  | building                                                            |
| OS-SRV-USG:launched_at               | None                                                                |
| OS-SRV-USG:terminated_at             | None                                                                |
| accessIPv4                           |                                                                     |
| accessIPv6                           |                                                                     |
| addresses                            |                                                                     |
| adminPass                            | uHZq5raRkUMT                                                        |
| config_drive                         |                                                                     |
| created                              | 2016-03-18T11:46:28Z                                                |
| flavor                               | m1.small (2)                                                        |
| hostId                               |                                                                     |
| id                                   | 77ab1773-b431-4812-963d-41f5db3bd2b4                                |
| image                                | debian-8.3.0-openstack-amd64 (e06f3280-3a0b-4c46-a9c5-91cae4b6a787) |
| key_name                             | thomas                                                              |
| name                                 | my_instance                                                         |
| os-extended-volumes:volumes_attached | []                                                                  |
| progress                             | 0                                                                   |
| project_id                           | 09bb44d7f42a49e9a6e98b64a277396a                                    |
| properties                           |                                                                     |
| security_groups                      | [{u'name': u'default'}]                                             |
| status                               | BUILD                                                               |
| updated                              | 2016-03-18T11:46:28Z                                                |
| user_id                              | f7ed24d64c03441a9586021abbbb92f8                                    |
+--------------------------------------+---------------------------------------------------------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ openstack ip floating add 10.0.0.104 my_instance
[stack@undercloud01 ~]$
```

### Instance is up

```
[stack@undercloud01 ~]$ ping -c 1 10.0.0.101
PING 10.0.0.101 (10.0.0.101) 56(84) bytes of data.
64 bytes from 10.0.0.101: icmp_seq=1 ttl=63 time=0.966 ms

--- 10.0.0.104 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 0.966/0.966/0.966/0.000 ms
[stack@undercloud01 ~]$ nc 10.0.0.101 22
SSH-2.0-OpenSSH_6.7p1 Debian-5+deb8u1
^C
[stack@undercloud01 ~]$
```

### SSH to instance

```
[stack@undercloud01 ~]$ ssh debian@10.0.0.101
The authenticity of host '10.0.0.101 (10.0.0.101)' can't be established.
ECDSA key fingerprint is SHA256:nk4PviGqnBP0mz9Smf+14At2iZRIsYOrJss3+dOOWi4.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '10.0.0.101' (ECDSA) to the list of known hosts.

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
X11 forwarding request failed
debian@my-instance:~$
debian@my-instance:~$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        20G  847M   19G   5% /
debian@my-instance:~$ free -m
             total       used       free     shared    buffers     cached
Mem:          2010        110       1899          5         12         53
-/+ buffers/cache:         44       1966
Swap:            0          0          0
debian@my-instance:~$
debian@my-instance:~$ exit
logout
Connection to 10.0.0.101 closed.
[stack@undercloud01 ~]$
```

### Destroy instance

```
[stack@undercloud01 ~]$ openstack server list
+--------------------------------------+-------------+--------+-----------------------------------+
| ID                                   | Name        | Status | Networks                          |
+--------------------------------------+-------------+--------+-----------------------------------+
| 77ab1773-b431-4812-963d-41f5db3bd2b4 | my_instance | ACTIVE | private=192.168.100.5, 10.0.0.101 |
+--------------------------------------+-------------+--------+-----------------------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ openstack server delete my_instance
[stack@undercloud01 ~]$ openstack server list

[stack@undercloud01 ~]$
```

### Heat example

```
[stack@undercloud01 ~]$ cat simple_template.yaml
heat_template_version: 2015-04-30

description: Simple template to deploy a single compute instance

resources:
  my_instance:
    type: OS::Nova::Server
    properties:
      key_name: thomas
      image: debian-8.3.0-openstack-amd64
      flavor: m1.small
      networks:
        - network: private
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ heat stack-create -f simple_template.yaml my_stack
+--------------------------------------+------------+--------------------+---------------------+--------------+
| id                                   | stack_name | stack_status       | creation_time       | updated_time |
+--------------------------------------+------------+--------------------+---------------------+--------------+
| 1c2b2007-faa3-4c2c-aed6-231e2416a511 | my_stack   | CREATE_IN_PROGRESS | 2016-03-18T12:06:41 | None         |
+--------------------------------------+------------+--------------------+---------------------+--------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ heat stack-list
+--------------------------------------+------------+-----------------+---------------------+--------------+
| id                                   | stack_name | stack_status    | creation_time       | updated_time |
+--------------------------------------+------------+-----------------+---------------------+--------------+
| 1c2b2007-faa3-4c2c-aed6-231e2416a511 | my_stack   | CREATE_COMPLETE | 2016-03-18T12:06:41 | None         |
+--------------------------------------+------------+-----------------+---------------------+--------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ openstack server list
+--------------------------------------+-----------------------------------+--------+-----------------------+
| ID                                   | Name                              | Status | Networks              |
+--------------------------------------+-----------------------------------+--------+-----------------------+
| 403ed7c5-78bf-4303-af46-84faa375a7e8 | my_stack-my_instance-c3rcyfo5da7a | ACTIVE | private=192.168.100.6 |
+--------------------------------------+-----------------------------------+--------+-----------------------+
[stack@undercloud01 ~]$
[stack@undercloud01 ~]$ heat stack-delete my_stack
+--------------------------------------+------------+--------------------+---------------------+--------------+
| id                                   | stack_name | stack_status       | creation_time       | updated_time |
+--------------------------------------+------------+--------------------+---------------------+--------------+
| 1c2b2007-faa3-4c2c-aed6-231e2416a511 | my_stack   | DELETE_IN_PROGRESS | 2016-03-18T12:06:41 | None         |
+--------------------------------------+------------+--------------------+---------------------+--------------+
[stack@undercloud01 ~]$ heat stack-list
+----+------------+--------------+---------------+--------------+
| id | stack_name | stack_status | creation_time | updated_time |
+----+------------+--------------+---------------+--------------+
+----+------------+--------------+---------------+--------------+
[stack@undercloud01 ~]$
```
