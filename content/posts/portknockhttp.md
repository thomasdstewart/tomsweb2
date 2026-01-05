---
title: "Port Knock with HTTP"
summary: ""
authors: ["thomas"]
tags: ["linux"]
categories: []
date: 2015-01-21
aliases: [/tomsweb/PortKnockHTTP/]
---

Port knocking is the act of connecting to a port or sequence of ports that in
turn opens up another port. There are many methods to do this; read more about
them on the [Port Knocking](https://wiki.archlinux.org/index.php/Port_Knocking)
page on the Arch Linux wiki. I like just using the built in iptables module
recent. I have used this for years to have port 22 closed unless the right port
connection sequence is performed. This does not really give much more security,
but it does clean up the system log from failed password attempts.

More recently I needed to ssh to my machine from an Internet connection that
only allowed port 80(http) or port 443(https) traffic. One way to do this is run
a second IP on the machine, however that feels like a bit of a waste of an IP.
So I decided to combine both the iptables recent module and iptables port
redirecting. My solution is to search for some secret text in the https
connection and if this secret text is found, to remember that source IP and when
the next connection comes in redirect to port 22 just for that source IP. Thus
connecting to the sshd process.

First you need to search for tcp connections coming in the INPUT chain of the
filter table. We are only interested in tcp connections to port 443. Also we
need that this connection is established, so make sure to have this rule before
any blanket acceptance of established connections. To help with performance we
only want to search for text at the start of the connection; we don't care about
long-standing connections. If all these things match then we set the recent name
to ssh. This records the source IP in temporary memory that can be later
checked. Something like this works for me:

```
iptables -A INPUT -p tcp -m tcp --dport 443 -m conntrack --ctstate ESTABLISHED -m connbytes --connbytes 0:255 --connbytes-mode bytes --connbytes-dir original -m string --string "secret" --algo bm --to 65535 -m recent --set --name ssh --rsource -j ACCEPT
```

Next we want to insert a rule in the PREROUTING chain in the nat table. We only
want to match on tcp connections to port 443. We also check to see if the source
IP address is in the ssh recent storage. If all these things are true, then
redirect this connection to port 22. Again, something like this works for me:

```
iptables -t nat -A PREROUTING -p tcp -m tcp --dport 443 -m recent --rcheck --seconds 300 --name ssh --rsource -j REDIRECT --to-ports 22
```

Then in my ~/.ssh/config file I can put in a stanza like this:

```
Host bob
        HostName bob.example.org
        ProxyCommand sh -c 'echo "secret" | nc -w30 %h 443 &> /dev/null && nc -w30 %h 443'
```

Finally remember to change the secret to something long. Also if you happen to
use [ferm](http://ferm.foo-projects.org/) iptables, then this should work:

```
domain ip chain INPUT proto tcp dport 443 mod conntrack ctstate ESTABLISHED
        mod connbytes connbytes 0:255 connbytes-dir original connbytes-mode
        bytes mod string algo bm string "secret"
        mod recent name ssh set ACCEPT;
domain ip table nat chain PREROUTING proto tcp dport 443
        mod recent name ssh rcheck seconds 300 REDIRECT to-ports 22;
```
