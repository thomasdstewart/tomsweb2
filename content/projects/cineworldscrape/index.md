---
title: "Cineworld Scrape"
summary: ""
authors: ["thomas"]
tags: ["movies", "python"]
categories: []
date: 2011-03-13
aliases: [/tomsweb/CineworldScrape/]
---

I love going to the cinema. I usually go once a week to my local
[Cineworld](http://www.cineworld.co.uk/) multiplex. Their website has changed a
few times over the years. Generally the changes have all been improvements and
my [local cinema listing](http://www.cineworld.co.uk/cinemas/61) is good.
However all cinema websites I have found lack an important view on the listings
data. That is a chronological order rather than a film title order. Why is this
useful you ask? Well if I want to go to the cinema on a particular evening I
really don't care what other films are showing outside my allocated timeslot. I
want to be able to easily see which films are going to start say between 7 and 8
that I have not already seen.

## Cineworld Scraper

So what I did first was email their webmaster, after which I got no response. So
I then decided to try to have a go at it myself. To show a different view of the
data I needed an actual data source. So I emailed a few other sites to ask where
they got their listings data. Surprise surprise no response from them either.
They say if you want something done, do it yourself. So I did.

I wrote a script that downloads the raw html pages from the cineworld website
and parses it and produces an xml file with the listings data. Initially it was
a perl script that was rather hacky and very prone to breakage. It then got
rewritten using a few cpan modules to parse the html and use xpath to search for
the relevant bits of data. I then rewrote it in a more general form in python.

The
[source](https://raw.githubusercontent.com/thomasdstewart/cw/master/cineworldscrape.py)
is available and is licensed under the GPLv3 or later, its
[complete history](https://github.com/thomasdstewart/cw/commits/master) is also
available via git.

Currently it is croned to get my local cinemas listings and creates the
http://www.stewarts.org.uk/cw/cw.xml each night (Currently broken). I'm not sure
if cinemas use an XML or have any standards so I went with my own
[dtd](https://github.com/thomasdstewart/cw/blob/master/cw.dtd) which heavily
reflects the data that Cineworld expose.

## Chooser

Having an XML file with the raw data is all very cool but it does not really
solve the problem. So next I created a
[transform](https://github.com/thomasdstewart/cw/blob/master/cw.xsl) that
displays all the showings in chronological order and outputs to a html file that
is easily viewable in both a normal browser and a phone (be warned the
resultant html is quite large). Both web browsers don't have good enough
xml/xstl brains to do the transform so the output (cw.html) is pre-generated
each night at the
end of the scrape process.

I then added some more javascript that tries to make the film selection process
easier. One link to only show films in my usual time slot and one to show films
that are going to start in the next hour. There are also links to hide showings,
this javascript stores the films that are seen in a cookie. So the next time the
page is viewed it will not show it. This it not ideal, but it works.

## An Alternative

Recently I found out with the help of google that Cineworld themselves publish
more of the raw listings data on their site. It seems to be quite a new thing,
03/03/2009 according to the http://www.cineworld.co.uk/syndication/Readme.txt. A
http://www.cineworld.co.uk/syndication/ list shows all the available exports but
the main one seems to be http://www.cineworld.co.uk/syndication/listings.xml. I'm
not sure why they split the data into so many xml files. The dtd is quite
similar but I'm not sure I like all of their choices. Plus they don't actually
export all the data, for instance no link to thumbnail of movie, which is a
showstopper for me.
