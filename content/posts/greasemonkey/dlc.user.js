/* DLC - Dead Link Checker
Created 26/10/2005, Last Changed 26/10/2005
Copyright (c) 2005, Released under the GPL http://www.gnu.org/copyleft/gpl.html
Created by Thomas Stewart, thomas@stewarts.org.uk

This is a Greasemonkey user script, see http://greasemonkey.mozdev.org/

This script checks every link on the page to see if its a dead link, ie a HEAD returns a 404. If it does it apends the text with "[dead]"

BTW this is a bit experemental, also it creats tons of requests, ~300 for slashdot, and close to 800 for planet.debian.org. This has the effect of being quite anoying.
*/

// ==UserScript==
// @name          DLC
// @namespace     http://www.stewarts.org.uk/stuff
// @description	  Checks for dead links
// @include       http://*
// ==/UserScript==

(function() {
        var links = document.evaluate(
                "//a",
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null);

        for (var i = 0; i < links.snapshotLength; i++) {
                var link = links.snapshotItem(i);

                GM_xmlhttpRequest({
                        link: link,
                        number: i,
                        method: 'HEAD',
                        url: link.href,
                        headers: {
                        'User-agent': 'Mozilla/4.0 (compatible) Greasemonkey',
                        'Accept': 'application/atom+xml,application/xml,text/xml',
                                },
                        onload: function(responseDetails) {
                                //alert(this.link.href + ' - ' +
                                //        responseDetails.status + '\n'); 
                                if(responseDetails.status == "404") {
                                        textNode = document.createTextNode("[Dead]");
                                        this.link.parentNode.insertBefore(textNode, this.link.nextSibling)
                                }
                        }
                });


             

        }


})();
