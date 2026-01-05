---
title: "ODBC 2 OpsCenter Access"
summary: ""
authors: ["thomas"]
tags: ["blog", "linux", "backup", "netbackup"]
categories: []
date: 2010-09-17
---

This is a quick guide on how to configure an ODBC connection from windows to a
Symantec OpsCenter Server.
[OpsCenter](http://www.symantec.com/business/opscenter-analytics) is a
[Symantec](http://www.symantec.com) product that integrates various backup
products including [Netbackup](http://www.symantec.com/business/netbackup) to
generate various reports and warnings about how the systems are performing. It
used to be a purchasable option with NetBackup 6, however since the release of
NetBackup 7 a cut down version is bundled in. It works quite well and can
generate pretty reports in various forms and do various things to them. However
it's not very customisable. OpsCenter actually uses
[SQL Anywhere](http://www.sybase.com/products/databasemanagement/sqlanywhere)
RDBMS as a back end for all the data. Thus if ODBC is configured anything can
query the very same data and produce reports. I'm going to use crystal reports
to generate many pretty pie charts.

- Step one is to download the ODBC driver, I'm guessing that any SQL Anywhere
  driver would work however it seems better to use a more officially one. There
  is one on the Veritas ftp site,
  ftp://ftp.veritas.com/pub/opscenter/sqlanywhere_11_odbc.zip Veritas used to
  make NetBackup until they got bought by Symantec. I'm not sure about the
  licensing of this, it looks really like the SQL Anywhere driver.
- Anyway licensing aside, unzip and install the driver.
- In ODBC Data Source Administrator add a new data source with the driver
  "OPSCENTER SQL Anywhere".
- The next part is the tricky bit, most settings were either guessed, googled or
  found out from digging about in /opt on the OpsCenter server.
  - In the ODBC tab give it a meaningful "Data source name"
  - In the Login tab use the "DBA" as the "User ID" and "SQL" as the "Password",
    (yes every OpsCenter install has this default username and password open to
    the world for all to use, yikes!)
  - In the "Server name" you put in a concatenation of "OPSCENTER\_" and the
    OpsCenter host name, eg "OPSCENTER_kunzite"
  - In the Network tab check TCP/IP and uncheck "Shared memory". In the TCP/IP
    box enter "HOST=hostname;PORT=13786" replacing hostname with the OpsCenter
    hostname, eg "HOST=kunzite;PORT=13786".
  - In the Advanced tab enter "utf8" in the "Character set".
- That is it, ODBC aware applications can now query the database!
