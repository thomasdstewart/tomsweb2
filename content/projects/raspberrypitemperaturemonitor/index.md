---
title: "Raspberry Pi Temperature Monitor"
summary: ""
authors: ["thomas"]
tags: ["pi"]
categories: []
date: 2018-07-06
aliases: [/tomsweb/RaspberryPITemperatureMonitor/]
showTableOfContents: true
---

## Introduction

I recently needed to monitor temperature, log it, and alert on high readings. I
had a look in my parts bin and I found a Raspberry Pi, a 1-Wire HBA, a 1-Wire
temperature IC and a 3G dongle.

## Solution

I needed a quick way to create an image I could throw on the Pi. I didn't want
to have to maintain it, and if it fails I want to be able to generate a
replacement image easily.

In the end I created the below script. It's not particularly nice, but it
works.

## Method

```
#!/bin/bash -x
umount /dev/loop0
rm -r -f /home/thomas/rpi23-gen-image
export proxy=1.2.3.4:3128
export somemirror=debmirror
export ntpserver=1.2.3.4
export pinghost=1.2.3.4
export nhostname=logger
export smarthost=smarthost.isp.com
export http_proxy="http://$proxy/"
export https_proxy="http://$proxy/"
git clone https://github.com/drtyhlpr/rpi23-gen-image.git /home/thomas/rpi23-gen-image
sed -i 's/\(.*firmware_install\)/#\1/' /home/thomas/rpi23-gen-image/bootstrap.d/13-kernel.sh
cd /home/thomas/rpi23-gen-image

cat << EOF > bootstrap.d/80-local.sh
. ./functions.sh
sed -i 's/ftp.debian.org/$somemirror/' "\${ETC_DIR}/apt/sources.list"

echo "Europe/London" > "\${ETC_DIR}/timezone"

sed -i "s/^pool/#pool/" "\${ETC_DIR}/ntp.conf"
echo "server $ntpserver iburst\n" >> "\${ETC_DIR}/ntp.conf"

echo "Acquire::http::Proxy \"http://$proxy/\";\n" > "\${ETC_DIR}/apt/apt.conf.d/99proxy"

cat files/ferm.conf > "\${ETC_DIR}/ferm/ferm.conf"
cat files/50unattended-upgrades-local > "\${ETC_DIR}/apt/apt.conf.d/50unattended-upgrades-local"

cat files/sms-service-notification.sh > "\${ETC_DIR}/icinga2/scripts/sms-service-notification.sh"
chmod +x "\${ETC_DIR}/icinga2/scripts/sms-service-notification.sh"

cat files/check_w1retap > "\${ETC_DIR}/icinga2/scripts/check_w1retap"
chmod +x "\${ETC_DIR}/icinga2/scripts/check_w1retap"

cat files/prometheus-w1retap.sh > "\${ETC_DIR}/icinga2/scripts/prometheus-w1retap.sh"
chmod +x "\${ETC_DIR}/icinga2/scripts/prometheus-w1retap.sh"

cat files/local.conf > "\${ETC_DIR}/icinga2/conf.d/local.conf"

#sed -i 's/}//' "\${ETC_DIR}/icinga2/conf.d/apt.conf"
#echo "\ninterval = 86400\n}\n" >> "\${ETC_DIR}/icinga2/conf.d/apt.conf"

sed -i 's/vars.backup_downtime/#vars.backup_downtime/' "\${ETC_DIR}/icinga2/conf.d/services.conf"
sed -i 's/^/#/' "\${ETC_DIR}/icinga2/conf.d/users.conf"

cat files/backup.sh > "\${ETC_DIR}/cron.daily/backup.sh"
chmod +x "\${ETC_DIR}/cron.daily/backup.sh"

echo "* * * * * root ping -c 1 -n $pinghost  > /dev/null" > "\${ETC_DIR}/cron.d/pinghome"

echo "0 * * * * root chmod -R o+r /var/log/icinga2/compat" > "\${ETC_DIR}/cron.d/fix-icinga-perm"

sed -i 's#^dc_eximconfig_configtype=.*#dc_eximconfig_configtype=satellite#' "\${ETC_DIR}/exim4/update-exim4.conf.conf"
sed -i 's#^dc_readhost=.*#dc_readhost=$nhostname#' "\${ETC_DIR}/exim4/update-exim4.conf.conf"
sed -i 's#^dc_smarthost=.*#dc_smarthost=$smarthost#' "\${ETC_DIR}/exim4/update-exim4.conf.conf"
sed -i 's#^dc_hide_mailname=.*#dc_hide_mailname=true#' "\${ETC_DIR}/exim4/update-exim4.conf.conf"

sed -i 's#^device = .*#device = /dev/modem00#' "\${ETC_DIR}/smsd.conf"
sed -i 's#^GROUP=.*#GROUP=\"smsd\"#' "\${ETC_DIR}/default/smstools"

echo 'ACTION=="add", SUBSYSTEM=="tty", ATTRS{idVendor}=="12d1", ATTRS{idProduct}=="1001", SYMLINK+="modem%E{ID_USB_INTERFACE_NUM}"' > "\${ETC_DIR}/udev/rules.d/99-usb-serial.rules"

sed -i 's#^log.*#log = w1sqlite=/var/lib/w1retap/w1retap.sqlite#' "\${ETC_DIR}/w1retap.conf"
echo "282BE781080000A8|DS1820|ROOM|Temperature #1|°C|||||" >> "\${ETC_DIR}/w1retap-sensors.dat"

mkdir -p "\${ETC_DIR}/systemd/system/w1retap.service.d"
echo "[Service]\nExecStart=\nExecStart=/usr/bin/w1retap -d -R -t 60\nRestart=always\n" > "\${ETC_DIR}/systemd/system/w1retap.service.d/override.conf"

mkdir -p "\${ETC_DIR}/systemd/system/paths.target.wants"
echo "[Unit]\nDescription=Read data from w1retap database when .w1retap.dat is updated\n\n[Path]\nPathChanged=/var/lib/w1retap/.w1retap.dat\n\n[Install]\nWantedBy=paths.target\n" > "\${ETC_DIR}/systemd/system/prometheus-w1retap.path"
echo "[Unit]\nDescription=Publish w1retap readings to prometheus\n\n[Service]\nType=oneshot\nExecStart=/etc/icinga2/scripts/prometheus-w1retap.sh\n" > "\${ETC_DIR}/systemd/system/prometheus-w1retap.service"

ln -s /etc/systemd/system/prometheus-w1retap.path "\${ETC_DIR}/systemd/system/paths.target.wants/prometheus-w1retap.path"
ln -s /lib/systemd/system/w1retap.service "\${ETC_DIR}/systemd/system/multi-user.target.wants/w1retap.service"
ln -s /lib/systemd/system/prometheus-node-exporter.service "\${ETC_DIR}/systemd/system/multi-user.target.wants/prometheus-node-exporter.service"

EOF

cat <<EOF > files/ferm.conf
domain (ip ip6) chain (INPUT OUTPUT FORWARD) policy DROP;
domain (ip ip6) chain (INPUT OUTPUT) {
        mod conntrack ctstate INVALID DROP;
        mod conntrack ctstate (ESTABLISHED RELATED) ACCEPT;
}

domain (ip ip6) chain INPUT interface lo ACCEPT;
domain (ip ip6) chain OUTPUT interface lo ACCEPT;

domain ip chain (INPUT FORWARD OUTPUT) proto icmp ACCEPT;
domain ip6 chain (INPUT FORWARD OUTPUT) proto icmpv6 ACCEPT;

domain (ip ip6) chain INPUT {
        proto tcp dport (ssh http https 9100) ACCEPT;
}
domain (ip ip6) chain OUTPUT {
        proto (tcp udp) dport domain ACCEPT;
        proto udp dport ntp ACCEPT;
        proto tcp dport (ssh smtp http https 3128 8080) ACCEPT;
}

domain (ip ip6) chain INPUT NFLOG nflog-prefix 'INPUT';
domain (ip ip6) chain FORWARD NFLOG nflog-prefix 'FORWARD';
domain (ip ip6) chain OUTPUT NFLOG nflog-prefix 'OUTPUT';

domain ip chain (INPUT FORWARD OUTPUT) REJECT reject-with icmp-admin-prohibited;
domain ip6 chain (INPUT FORWARD OUTPUT) REJECT reject-with icmp6-adm-prohibited;
EOF

cat <<EOF > files/50unattended-upgrades-local
Unattended-Upgrade::Origins-Pattern {
	"o=Debian,a=stable";
	"o=Debian,a=stable-updates";
	"o=Debian,a=proposed-updates";
	"o=Debian,a=stable-backports";
	"origin=Debian,archive=stable,label=Debian-Security";
};
Unattended-Upgrade::Mail "root";
Unattended-Upgrade::Automatic-Reboot "false";
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

cat <<EOF > files/backup.sh
#!/bin/sh
set -eu

export OS_TOKEN="*********"
export OS_OBJECT_STORE="https://openstackapi.endpoint:port/swift/v1"

curl -k -H "X-Auth-Token: \$OS_TOKEN" -X PUT "\$OS_OBJECT_STORE/logger"
cat /var/lib/w1retap/w1retap.sqlite | gzip > /var/lib/w1retap/w1retap.sqlite.gz
curl -k -H "X-Auth-Token: \$OS_TOKEN" -X PUT -T /var/lib/w1retap/w1retap.sqlite.gz "\$OS_OBJECT_STORE/logger/w1retap.sqlite.gz"
EOF

cat <<EOF > files/sms-service-notification.sh
#!/bin/sh
template=\$(cat <<TEMPLATE
To: \$USERPAGER

\$NOTIFICATIONTYPE - \$SERVICEDISPLAYNAME is \$SERVICESTATE - \$SERVICEOUTPUT at \$LONGDATETIME
TEMPLATE
)

/usr/bin/printf "%b" "\$template" > /var/spool/sms/outgoing/\$(date +%s%N)
EOF

cat <<EOF > files/prometheus-w1retap.sh
#!/bin/bash
set -eu

dir=/var/lib/prometheus/node-exporter

if [[ ! -d \$dir ]]; then
    echo 'prometheus-node-exporter not installed?' >&2
    exit 0
fi

q=$'
    SELECT "w1retap_temp_celsius{id=""" || value || """,type=""" || abbrv1 || """,name=""" || name1 || """} " || value
    FROM readings
    INNER JOIN w1sensors
        ON readings.name = w1sensors.name1
    WHERE date > strftime(\'%s\', \'now\') - 60
    GROUP BY type,abbrv1,name1,value
    ;
'

(
    echo "# HELP w1retap_temp_celsius Temperature in Celsius"
    echo "# TYPE w1retap_temp_celsius gauge"
    sqlite3 -cmd "\$q" /var/lib/w1retap/w1retap.sqlite < /dev/null
) > "\$dir/w1retap.prom.tmp"

mv "\$dir/w1retap.prom.tmp" "\$dir/w1retap.prom"
EOF


cat <<EOF > files/check_w1retap
#!/bin/bash
set -eu

sensor_name="ROM"
#warning=20
#critical=21

warning=27
critical=28

udate=\$(awk -F= '/udate=/{print \$2}' /var/lib/w1retap/.w1retap.dat)
now=\$(date +%s)

if [[ \$(( \$now - \$udate )) -ge 65 ]]; then
    echo "UNKNOWN - Data out of date"
    exit 3
fi

value=\$(awk -F= "/\$sensor_name=/{print \\\$2}" /var/lib/w1retap/.w1retap.dat | awk '{print \$1}')

if [[ \$( echo "\$value > \$critical" | bc -l) -eq 1 ]]; then
    echo "CRITICAL - w1retap temperature \$value C"
    exit 2
elif [[ \$( echo "\$value > \$warning" | bc -l) -eq 1 ]]; then
    echo "WARNING - w1retap temperature \$value C"
    exit 1
else
    echo "OK - w1retap temperature \$value C"
    exit 0
fi
EOF

cat <<EOF > files/local.conf
apply Service "w1retap" {
  import "generic-service"
  check_command = "w1retap"
  assign where host.name == NodeName
  check_interval = 15s
  retry_interval = 15s
}

object UserGroup "icingaadmins" {
  display_name = "Icinga 2 Admin Group"
}

object User "thomas" {
  import "generic-user"

  display_name = "thomas"
  groups = [ "icingaadmins" ]

  email = "thomas@stewarts.org.uk"
  pager = "447987654321"
}

object CheckCommand "w1retap" {
  command = [ "/etc/icinga2/scripts/check_w1retap" ]
}

object NotificationCommand "sms-service-notification" {
  command = [ "/etc/icinga2/scripts/sms-service-notification.sh" ]

  env = {
    NOTIFICATIONTYPE = "\$notification.type$"
    SERVICEDESC = "\$service.name$"
    HOSTALIAS = "\$host.display_name$"
    HOSTADDRESS = "\$address$"
    SERVICESTATE = "\$service.state$"
    LONGDATETIME = "\$icinga.long_date_time$"
    SERVICEOUTPUT = "\$service.output$"
    NOTIFICATIONAUTHORNAME = "\$notification.author$"
    NOTIFICATIONCOMMENT = "\$notification.comment$"
    HOSTDISPLAYNAME = "\$host.display_name$"
    SERVICEDISPLAYNAME = "\$service.display_name$"
    USERPAGER = "\$user.pager$"
  }
}

apply Notification "sms-icingaadmin" to Service {
  import "mail-service-notification"
  command = "sms-service-notification"

  user_groups = host.vars.notification.mail.groups
  users = host.vars.notification.mail.users

  assign where host.vars.notification.mail
}

object ScheduledDowntime "weeklytest-downtime" {
  host_name = "logger"
  service_name = "w1retap"

  author = "icingaadmin"
  comment = "Scheduled downtime for weekly test"

  ranges = {
    "friday" = "13:30-13:32"
  }
}
EOF

#TODO
#check email setup re root email
#root resize seems to fail

# in notification:
#       if (service.vars.notification_interval) {
#               interval = service.vars.notification_interval
#       }
# in service:
#       vars.notification_interval = 43200

#root@logger:~# cat /etc/cron.d/check
#* * * * * root /root/check.sh
#root@logger:~# grep . /root/check.sh
##!/bin/bash
#set -eu
#files="$(find /var/spool/sms/incoming -type f)"
#for file in $files; do
#	if [ "$(tail -1 $file | grep temp | wc -l)" -eq 1 ]; then
#		from="$(grep "From:" $file | awk '{print $2}')"
#		hist="$(sqlite3 -cmd "SELECT date, value FROM readings ORDER BY date DESC LIMIT 10;" /var/lib/w1retap/w1retap.sqlite < /dev/null | sed 's/|/ /' | while read line; do d=$(echo $line | awk '{print $1}'); d=$(date -d @$d --iso-8601=minutes | sed 's/:00//'); v=$(echo $line | awk '{print $2}'); echo "$d $v"; done)"
#		echo -en "To: $from\n\n$(cat /var/lib/w1retap/.w1retap.dat | grep -v udate | xargs)\n$hist" \
#			> /var/spool/sms/outgoing/$(date +%s%N)
#		sed -i 's/temp/TEMP/' $file
#	fi
#done
#root@logger:~#

#INFO
#send test txt: echo -en "To: 447987654321\n\ntest\n" > /var/spool/sms/outgoing/test

#FIRST BOOT
# sudo passwd user
# sudo dpkg-reconfigure tzdata
# echo "exim4-config exim4/dc_postmaster string thomas@stewarts.org.uk" | sudo debconf-set-selections
# sudo update-exim4.conf
# echo "root: thomas@stewarts.org.uk" | sudo tee -a /etc/aliases
# sudo usermod -a -G smsd nagios
# sudo htpasswd /etc/icinga2-classicui/htpasswd.users icingaadmin
# sudo -u w1retap sqlite3 /var/lib/w1retap/w1retap.sqlite < /usr/share/doc/w1retap-doc/mksens.sql
# sudo w1find DS2490-1 | w1sensors | sed 's/NULL,NULL,//' | sed 's/TMP_1/ROOM/' | sudo -u w1retap sqlite3 /var/lib/w1retap/w1retap.sqlite
# sudo systemctl reboot

export proxy="http://$proxy/"

cat <<EOF > templates/logger
export http_proxy="$proxy"
export https_proxy="$proxy"
export no_proxy="$mirror"
export APT_PROXY="$proxy"
export APT_SERVER="$mirror"
export APT_INCLUDES="aptitude,atop,bash-completion,bc,bind9-host,busybox,curl,debian-goodies,debsums,dnsutils,dstat,etckeeper,fake-hwclock,ferm,file,firmware-linux-free,git,htop,less,mtr,netcat-openbsd,nmap,ntp,ntpdate,parted,psmisc,psutils,pv,resolvconf,rsync,screen,tcpdump,telnet,ulogd2,unattended-upgrades,usbutils,vim,vnstat,w1retap,w1retap-sqlite,w1retap-doc,smstools,prometheus-node-exporter,icinga2,sqlite3,apache2,icinga2-classicui,monitoring-plugins-basic,exim4-daemon-light,dphys-swapfile,strace,mailutils"
export RPI_MODEL=2
export RELEASE="stretch"
export HOSTNAME="$hostname"
export USER_PASSWORD="password"
export DEFLOCAL="en_GB.UTF-8"
export TIMEZONE="Europe/London"
export EXPANDROOT=true
export ENABLE_DHCP=true
export ENABLE_CONSOLE=true
export ENABLE_NONFREE=true
export ENABLE_SOUND=false
export ENABLE_MINGPU=false
export ENABLE_USER=true
export USER_NAME=user
export BUILD_KERNEL=false
export ENABLE_HARDNET=true
export NET_NTP_1="$ntpserver"
EOF

CONFIG_TEMPLATE=logger ./rpi23-gen-image.sh

exit
#sudo bmaptool copy /home/thomas/rpi23-gen-image/images/stretch/*.img /dev/mmcblk0
```
