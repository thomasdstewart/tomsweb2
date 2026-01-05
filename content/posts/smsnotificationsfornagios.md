---
title: "SMS Notifications for Nagios"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "debian", "nagios", "sms"]
categories: []
date: 2010-08-27 16:10:00
---

I use [Nagios](http://www.nagios.org/) for monitoring. Up to recently I used a
regular modem to send sms text messages to various people when systems are going
wrong. The way this works is by using
[smsclient](http://packages.debian.org/sid/smsclient) which dials up to a TAP
server. [TAP] (http://en.wikipedia.org/wiki/Telelocator_Alphanumeric_Protocol)
is a fairly archaic way of sending messages. It's been fairly reliable however
it has two major drawbacks, sending takes a long time and it's limited to 160
characters. As far as I can tell it will not do long text messages, which are
really just multiple short message combined together in a special way.

I wanted a better way! Something that sounded nice was using the mobile network
to send messages, that way I could bypass most of the internal infrastructure
and take the notifying system as out of band as possible. After a good bit of
research I finally settled on a Maestro 100 from
[RF Solutions](http://www.rfsolutions.co.uk/acatalog/Maestro_GSM_Modem.html). It
also turns out that [smstools](http://packages.debian.org/sid/smstools) can use
it out of the box. I'm so pleased!
