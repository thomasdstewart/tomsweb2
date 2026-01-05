#!/usr/bin/env python
import sys
import pickle
import imdb
import imdb.helpers
import pydot
import pprint
pp = pprint.PrettyPrinter(depth=6)
ia = imdb.IMDb('http')

movies = pickle.load(open("imdbgraph.movies.p", "rb" ))
results = pickle.load(open("imdbgraph.results.p", "rb" ))

newmovies = {}
for movie in movies:
        newmovies[movie['id']] = movie['title']
movies = newmovies

graph = pydot.Dot(graph_type='digraph')

for result in results:
        movieid1 = result[0:7]
        movieid2 = result[8:15]
        movie1 = movies[movieid1].encode('ascii', 'ignore').replace(':', '')
        movie2 = movies[movieid2].encode('ascii', 'ignore').replace(':', '')
        if results[result] == True:
                #movie1 better
                edge = pydot.Edge(movie2, movie1)
        else:
                #movie2 better
                edge = pydot.Edge(movie1, movie2)
        
        graph.add_edge(edge)

#graph.write_png('imdbgraph.png', prog='circo')
graph.write_svg('imdbgraph.svg', prog='circo')
graph.write_ps('imdbgraph.ps', prog='circo')

