---
title: "Weather Station 2026"
summary: ""
authors: ["thomas"]
tags: ["pi", "weather"]
categories: []
date: 2026-07-11
showTableOfContents: true
---
## Background
I have always had an interest in weather so along with my interest in science and computers being able to monitor weather has interested me. One of my early idea's of a project was to build on and situate it in my parents house in West Clare, Ireland. It would have lots of rainfall and interesting wind paterns. This goes back to 2006 when I bought a Gumstix single board computer. With the idea that it could form an embedded like setup. A Gumstix Connex 400xm-bt was an arm based board smaller than a raspberry pi but came with a price tag of $200. However this didn't work out, and I can't remember what happened. However in 2010 I bought a few Asus Eee PC 701SD 7" 0.9 GHz. These were a short lived class device that were popular before tablets cam on the scene. The keyboards were mostly too small and the spec was not good enough for windows, but you could run an ok Linux setup. Single core 900Mhz, half a gig of ram and 8G of SD card class storage. They were i386 arch so 32bit and even as I got mine they were no longer desirable so I manged to get a few for about £50-60 each, I got a few thinking it would have good to have spares and good to have a 2nd system to dev on while at home. The setup of this predates my writing projects and such up so I don't have many records of the setup. It ran Debian, it used a 1-wire to usb converter for sensors, had a 3G dongle for Internet access to transfer data and ran w1retap to perform the logging. This ran fine for a number of years, however life got in the way and the station fell into disrepair sometime between 2018 and 2019. The batteries in the laptop expired, which mean that any power cut to the house would turn the laptop off which would need manually turning back on. I had planned on resurrecting it but never got round to it and more recently the news about i386 being retired means that I think it's time to put these old devices out to pasture.

## Station 2026
It's a new world now for building these types of projects. I think it's now far easier to get something setup, this I think is in short because of the Raspberry Pi revolution. Plainly the new station will have a Raspberry Pi as it's hub. Originally I planned to use of of the Pi 3's I had from my parts bin, however I was worried about the lack of real time clock, paired with no Internet access is a recipe for invalid data collection. I also remembered that the new Pi 5 has a built in RTC as long as you connect a button cell. Even more recently there is an IO board for the Pi module that has a button cell holder along with a metal case. So I've opted for something brand new. With any luck it will last 10 years.

The plan is similar have w1retap runnong on Debian Collecting data. I was never a fan of the dongle coming out of the laptop, it was also hard to maintain while on site and has no off site management. The new setup has also got to fit in a carry oh bag for the airport, so a self contained switch/router type case if ideal rather than an array of boards and wires.

## Parts

Pi Hut
 * Raspberry Pi Compute Module 5 IO Case REV2 £14.40
 * Raspberry Pi Compute Module 5 IO Board REV2 £19.20
 * Raspberry Pi Compute Module 4/5 Antenna Kit £4.80
 * Raspberry Pi Compute Module 5 Passive Cooler £4.80
 * Raspberry Pi Compute Module 5 32GB / 16GB / Wireless £312.00
 * Raspberry Pi 45W USB-C Power Supply UK £14.40 

Amazon
 * ESP32 ESP32-C3 * 5 £19.99

Pimoroni
 * Clipper LTE 4G Breakout (SP/CE) × 1 Board Only £16.25
 * 8 Pin JST-SH Cable (SP/CE) JST-SH to DuPont sockets £1.50
 * LTE 4G Antenna × 1 Medium Stick (108mm) £4.00
 * LTE 4G Antenna × 1 Right Angle SMA Extension Cable (150mm) £3.25


## Provisoning
Put jumper on ee disable boot jumper
Connect usb3 cable from host to pi
run rpiboot from https://github.com/raspberrypi/usbboot.git
write image 2026-06-18-raspios-trixie-arm64-lite.img

Boot, get keyboard, add user thomas
login
sudo raspi-config, System Option -> Wirelwess LAN


hostnamectl set-hostname piloggercol01.unix.phe.gov.uk

systemctl enable ssh; systemctl start ssh
thomas@192.168.7.154



hostnamectl hostname labradorite

apt-get install minicom

Set serial Console

/boot/firmware/config.txt
enable_uart=1
# Linux serial console
dtoverlay=uart0-pi5
# LTE modem
dtoverlay=uart2

/boot/firmware/cmdline.txt
console=tty1 console=serial0,115200

https://pinout.xyz/


USB-TTL Cable	Raspberry Pi GPIO       NanoBMC
                Pin 4 (5V)              5V
Black (GND)   	Pin 6 (GND)             GND
Yellow (RX)	    Pin 8 (GPIO14 / TX)     GPIO0
Orange (TX) 	Pin 10 (GPIO15 / RX)    GPIO1
                Pin                     GPIO4



UART4 Signal	GPIO	Physical Pin
TXD4	GPIO8	Pin 24
RXD4	GPIO9	Pin 21


GND     20    Black   GND - Ground (this is pin 1 on the SP/CE connector, nearest the SIM card holder)
GPIO17  11    Brown   PWRKEY - Power key pin, needs to be toggled low and then high to power up the module
GPIO04   7    Purple  RX - UART input to breakout
GPIO22  15    Blue    RESET - Reset pin, pull high to keep breakout active
NC      nc    Green   NETLIGHT - Output from LTE module, for blinking a LED when there is a network connection.
GPIO05  29    Yellow  TX - UART output from the breakout
3V3      1    Orange  VDDIO - IO voltage input, 3.0 - 3.6V recommended for reliable IO. Low current consumption.
5V       2    RED     VDD - 3.7V - 6.0V power input to the breakout (scroll down for current consumption info)



# keep modem out of reset
pinctrl set 22 op dh

# pulse power key
pinctrl set 17 op dl
sleep 1
pinctrl set 17 op dh




minicom ama2

AT
OK
AT+CMEE=2
OK
ATI
Manufacturer: SIMCOM INCORPORATED
Model: A7683E-LBXS
Revision: V11.0.01
IMEI: 862095064633685

OK
AT+CGMM
A7683E-LBXS

OK
AT+CGMR
+CGMR: 22110B06A7683M6A

OK
AT+GSN
862095064633685

OK

OK
AT+CPIN?
+CPIN: READY

OK
AT+CIMI
234103006567962


apt install modemmanager network-manager lsof ppp

cat >/etc/udev/rules.d/80-ttyama2-modemmanager.rules <<'EOF'
ACTION=="add|change", SUBSYSTEM=="tty", KERNEL=="ttyAMA2", ENV{ID_MM_CANDIDATE}="1"
EOF



/etc/chatscripts/simbase
/etc/ppp/peers/lte

