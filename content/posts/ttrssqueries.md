---
title: "TTRSS Queries"
summary: ""
authors: ["thomas"]
tags: ["ttrss"]
categories: []
date: 2007-11-15
---

Highest average entries per day for the last 7 days for all entries

```
select ttrss_feeds.title as feed, count(ttrss_user_entries.ref_id)/7 as postsperday from ttrss_feeds, ttrss_user_entries, ttrss_entries where ttrss_feeds.id = ttrss_user_entries.feed_id and ttrss_user_entries.ref_id = ttrss_entries.id and overlaps(ttrss_entries.date_entered, ttrss_entries.date_entered, now() - interval '7 day', now()) group by ttrss_feeds.title order by postsperday desc limit 10;
```

Lowest average entries per day for the last 7 days for all entries

```
select ttrss_feeds.title as feed, count(ttrss_user_entries.ref_id)/7 as postsperday from ttrss_feeds, ttrss_user_entries, ttrss_entries where ttrss_feeds.id = ttrss_user_entries.feed_id and ttrss_user_entries.ref_id = ttrss_entries.id and overlaps(ttrss_entries.date_entered, ttrss_entries.date_entered, now() - interval '7 day', now()) group by ttrss_feeds.title order by postsperday limit 10;
```

Average reads per hour for the last 7 days

```
select extract(hour from last_read) as hour, count(int_id)/7 as reads from ttrss_user_entries where last_read > 0 and overlaps(last_read, last_read, now() - interval '7 day', now()) group by hour order by hour;
```
