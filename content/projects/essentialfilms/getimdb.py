#!/usr/bin/env python3
import urllib
import sys
import imdb
import operator
import re
from pprint import pprint as pp
# import ipdb; from IPython import embed; embed()
ia = imdb.IMDb('http')

f = open("films.txt", "r")
ids = f.read().split('\n')
ids = list(filter(None, ids))
f.close()

#ids = ['0119217', '0097576', '0087469', '0211915', '0058461']
movies = []
for i in ids:
    movie = ia.get_movie(i)
    title = movie['title']
#    if i in ['0064116',  '' ]:
#        title = movie['akas'][0]
#        title = title[0:title.find("::")]
    year = movie['year']
    rating = movie['rating']
    runtime = movie['runtime'][0]
    genres = movie['genres']
    director = movie['director'][0].data['name']
    cast = []
    for c in movie['cast']:
        cast.append(c.data['name'])
    movies.append({"title": title, "id": i, "year": year,
                   "rating": rating, "runtime": runtime, "genres": genres,
                   "director": director, "cast": cast})

movies.sort(key=operator.itemgetter('title'))

decs = []
genres = []
directors = []
cast = []
print('|Title|Year|IMDB Rating|Runtime|Genres|Director|Cast|')
print('|---  |--- |---        |---    |---   |---     |--- |')
for movie in movies:
    decs = decs + [str(movie['year'])[0:3]]
    genres = genres + movie['genres']
    directors = directors + [movie['director']]
    cast = cast + movie['cast']
    newcast = ", ".join(movie['cast'][0:2])
    #newcast = re.sub("([a-zA-Z]+[A-Z]+[a-z]+)", "!\\1", newcast)

    print("|[%s](http://www.imdb.com/title/tt%s/)|%s|%s|%s|%s|%s|%s|"
          % (movie['title'], movie['id'], movie['year'], movie['rating'],
             movie['runtime'], ", ".join(movie['genres']),
             movie['director'], newcast))
print('\n')

decscount = {}
for dec in set(decs):
    decscount[dec] = decs.count(dec)
decscount = sorted(decscount.items(), key=lambda d: d[1], reverse=True)

print('|Decade|Count|')
print('|---   |---  |')
for dec in decscount:
    print("|%s0|%s|" % (dec[0], dec[1]))
print('\n')

genrescount = {}
for genre in set(genres):
    genrescount[genre] = genres.count(genre)
genrescount = sorted(genrescount.items(), key=lambda d: d[1], reverse=True)

print('|Genre|Count|')
print('|---  |---  |')
for genre in genrescount:
    print("|%s|%s|" % (genre[0], genre[1]))
print('\n')

directorscount = {}
for director in set(directors):
    directorscount[director] = directors.count(director)
directorscount = sorted(directorscount.items(), key=lambda d: d[1], reverse=True)

print('|Director|Count|')
print('|---     |---  |')
for director in directorscount:
    if director[1] > 1:
        print("|%s|%s|" % (director[0], director[1]))
print('\n')

castcount = {}
for c in set(cast):
    castcount[c] = cast.count(c)
castcount = sorted(castcount.items(), key=lambda d: d[1], reverse=True)

print('|Actor|Count|')
print('|---  |---  |')
for cast in castcount:
    if cast[1] > 2:
        print("|%s|%s|" % (cast[0], cast[1]))
print('\n')
