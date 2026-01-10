---
title: "MOT Mileage"
summary: ""
authors: ["thomas"]
tags: ["car", "graph"]
categories: []
date: 2021-06-30 22:50:00
---

Recently when checking the MOT on my car using the
[Check the MOT history of a vehicle](https://www.gov.uk/check-mot-history)
GOV.UK service I discovered that the entire car's mileage history is recorded.
This made me quite interested in my Toyota Celica 2002 mileage over the years.
I first got it in 2004 when it was 2 years old, and the first MOT was in 2005.
However it seems the service history starts in 2007, which, if I recall, was when
MOT became a lot more electronic.

Here is the mileage data; I calculated the miles since the last MOT column
myself. The average annual mileage is 9525.

| MOT Date   | Mileage on clock | Calculated miles since last MOT | Notes       |
| ---------- | ---------------- | ------------------------------- | ----------- |
| 2007-02-22 | 24971            |                                 |
| 2008-02-21 | 33622            | 8651                            |
| 2009-02-27 | 42398            | 8776                            |
| 2010-02-17 | 52661            | 10263                           |
| 2011-02-25 | 61946            | 9285                            |
| 2012-02-17 | 70854            | 8908                            |
| 2013-02-13 | 79319            | 8465                            |
| 2014-02-21 | 88099            | 8780                            |
| 2015-03-26 | 100933           | 12834                           | Changed job |
| 2016-03-15 | 110861           | 9928                            |
| 2017-03-22 | 122246           | 11385                           |
| 2018-03-21 | 132911           | 10665                           |
| 2019-03-20 | 144742           | 11831                           |
| 2020-03-17 | 153386           | 8644                            | COVID-19!   |
| 2021-03-27 | 158314           | 4928                            |
| 2022-03-25 | 165704           | 7390                            |
| 2023-03-24 | 173678           | 7974                            |
| 2024-02-08 | 174409           | 731                             | Sold        |

So just using Google Charts this looks like:

<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<script type="text/javascript">
        google.charts.load('current', {'packages':['corechart']});
        google.charts.setOnLoadCallback(drawChart);

        function drawChart() {
        var data = google.visualization.arrayToDataTable([
                ['Date', 'Distance'],
                [ new Date('2008-02-21'), 8651],
                [ new Date('2009-02-27'), 8776],
                [ new Date('2010-02-17'), 10263],
                [ new Date('2011-02-25'), 9285],
                [ new Date('2012-02-17'), 8908],
                [ new Date('2013-02-13'), 8465],
                [ new Date('2014-02-21'), 8780],
                [ new Date('2015-03-26'), 12834],
                [ new Date('2016-03-15'), 9928],
                [ new Date('2017-03-22'), 11385],
                [ new Date('2018-03-21'), 10665],
                [ new Date('2019-03-20'), 11831],
                [ new Date('2020-03-17'), 8644],
                [ new Date('2021-03-27'), 4928],
                [ new Date('2022-03-25'), 7390],
                [ new Date('2023-03-24'), 7974],
                [ new Date('2024-02-08'), 731]
        ]);

        var options = {
                title: 'Distance my Toyota Celica drove since last MOT',
                hAxis: {title: 'Year'},
                vAxis: {title: 'Distance (miles)'},
                legend: 'none'
        };

        var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));
        chart.draw(data, options);
      }

</script>
<div id="chart_div" style="width: 720px; height: 500px;"></div>
