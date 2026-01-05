---
title: "Spotify Traffic Analysis"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "networking"]
categories: []
date: 2011-03-04 16:59:00
---

A colleague asked me how much bandwidth [Spotify](http://www.spotify.com/) uses.
I basically had no idea. I want to run Spotify on my mobile at some point, so it
got me thinking. I decided to do some basic analysis. I ran the client behind
a http proxy for a day or so and ran a tcpdump at the same time with a filter to
capture all the traffic to the proxy. The dump ran from 19/10/2010 11:46 to
20/10/2010 17:19 and produced a 362M capture file. For the most part I was not
playing any music, then for the last few hours I played music I had not played
before.

I then started trying to analyse the dump. As amazing as
[Wireshark](http://www.wireshark.org/) is it's really not too good at looking at
large dumps or large amounts of data. I then found
[Chaosreader](http://chaosreader.sourceforge.net/) which made it very easy. It
basically looks at one big pcap file and splits it into the individual tcp
streams, analyses them and produces a nice html report. Check out the example
report for some examples of what it can do.

The Spotify client tries a few ways of connecting. It first tries to connect to
a server on port 4070, which fails because the proxy does not allow CONNECTs to
that port.

```
c: CONNECT A1.spotify.com:4070 HTTP/1.0
s: HTTP/1.0 403 Forbidden
```

Next it tries port 80, which is also blocked.

```
c: CONNECT A2.spotify.com:80 HTTP/1.0
s: HTTP/1.0 403 Forbidden
```

And finally it tries 443 and establishes an SSL connection. It is this connection
that lasts for the duration that the Spotify client runs.

```
c: CONNECT A3.spotify.com:443 HTTP/1.0
s: HTTP/1.0 200 Connection established
```

I'll get back to the main stream of data in a minute. While the client is
running it makes various requests to some other sites. I think these only happen
when Spotify social is turned on. There are many short lived connections to
Twitter and Facebook.

```
GET http://api.twitter.com/1/statuses/user_timeline.json?id=spotify&count=100&since_id=1&include_entities=true HTTP/1.1
Host: api.twitter.com
User-Agent: Spotify-Win32/0.71/40800213
Keep-Alive: 300
Connection: keep-alive
Accept-Encoding: gzip
```

It made 354 connections and GET requests to the above twitter json api. It also
made 89 connections and GET requests to the below Facebook api. This works out
at about 12 connections per hour for twitter and 3 connections per hour for
Facebook. Which all sounds quite reasonable.

```
GET http://api.facebook.com/restserver.php?api_key=VERYLONGREQUESTSTRING HTTP/1.1
Host: api.facebook.com
User-Agent: Spotify-Win32/0.71/40800213
Keep-Alive: 300
Connection: keep-alive
Accept-Encoding: gzip
```

Now back to the main stream. Once the client gets a connection to the Spotify
servers and it establishes what looks like an encrypted stream. Once this
happens the entirety of the conversation with the server looks like gibberish.
This is a bit annoying as I can't really look further into how it works. However
I'm still able to see how much data is transferred and thus can calculate average
data rates.

I looked at the TCP stream between 0:00 and 6:00. The music was stopped for the
whole of the time. As you might expect not much activity happened during this
time, 7.5 KiB was sent to the server and 9.7 KiB was received. The average
packet size was 77 bytes long. The overall data rate was 5 bytes per second, i.e.
0.005 KiB/s. Almost no traffic!

I also looked at the half hour window from 12:00 to 12:30 where I played music I
had not played before and thus was not cached locally. Spotify relies heavily on
local cache, ~/.wine/drive_c/users/thomas/Local Settings/Application
Data/Spotify/Storage is currently 1.2G on my work desktop where I don't have any
offline play lists. During this 30 minute window, 10.2 KiB was sent from the
server and 26.4 MiB was received. The average packet size was 775 bytes long.
The overall data rate was 16.5 KiB/s. This is a lot less than I expected.

After looking at the Wikipedia list of
[mobile telephone bandwidths](http://en.wikipedia.org/wiki/List_of_device_bandwidths#Mobile_telephone_interfaces)
I conclude that to run Spotify on a phone both GSM and GPRS are too slow, 1.8
KiB/s and 7.2 KiB/s respectively. Only EDGE and faster is good enough at
48KiB/s. Of course this assumes that the mobile client uses the same bandwidth.
The other thing to note is that an 8M internet connection should be able to
sustain 62 Spotify users, assuming that they are all listening to new music.

(Note: I did most of this back in October 2010 but only got round to writing the
concluding 4 paragraphs today.)
