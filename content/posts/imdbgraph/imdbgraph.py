#!/usr/bin/env python
import urllib
import sys
import imdb
import imdb.helpers
import operator
import pickle
import random
import pprint
pp = pprint.PrettyPrinter(depth=6)
ia = imdb.IMDb('http')

url = 'http://www.stewarts.org.uk/tomsweb/EssentialFilmsRaw?action=raw'
ids = []
for movie in urllib.urlopen(url).read().split('\r\n'):
        if len(movie) > 0 and int(movie) > 0:
                ids.append(movie)

#ids = [ '0119217', '0097576', '0087469', '0064116', '0211915' ]
movies = []
for i in ids:
        movie = ia.get_movie(i)
        title = movie['title']
        if i in [  '0064116', '0457430', '0060196', '0211915', '0058461', \
                        '0245429', '0108394', '0059578' ]:
                title = movie['akas'][0]
                title = title[0:title.find("::")]
        year = movie['year']
        movies.append({"id": i, "title": "%s (%s)" % (title, year)})
        pp.pprint(title)

movies.sort(key=operator.itemgetter('id'))
pickle.dump(movies, open("imdbgraph.movies.p", "wb" ))

results = pickle.load(open("imdbgraph.results.p", "rb" ))

for i in range(50):
        match = random.sample(movies, 2)
        k = "%s+%s" % (min(match[0]['id'], match[1]['id']), \
                max(match[0]['id'], match[1]['id']))
        if k in results:
                print "%s > %s" % (match[0]['title'], match[1]['title']) 

        if k not in results:
                print "1. %s " % match[0]['title']
                print "2. %s " % match[1]['title']
                result = input('Which is better: ')

                if result == 1:
                        results[k] = True
                if result == 2:
                        results[k] = False
                if result == 3:
                        break

pp.pprint(results)
pickle.dump(results, open("imdbgraph.results.p", "wb" ))

