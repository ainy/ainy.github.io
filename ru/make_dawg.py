#coding: utf-8
from __future__ import unicode_literals

import sqlite3
conn = sqlite3.connect('morph.db')
conn.text_factory = unicode

dic = conn.execute('select stem.prefix, norm.suffix, stem.rule from stem join norm on stem.rule=norm.rule;').fetchall()

import codecs
freq = codecs.open('freqrnc2011.csv','r','utf8').readlines()
freq = dict([(line.split()[0].lower(),float(line.split()[2])) for line in freq])

vv = {}
seen = set()
for s,n,r in dic:
    w = s+n
    w = w.replace('ё','е')
    if w in freq:
        if freq[w]>0:
            vv[s] = vv.get(s,[])
            vv[s].append(r)
            seen.add(r)

print len(vv), len(freq)

#import bson as json
import umsgpack
f=open('morph.bin','wb')
s=umsgpack.packb(vv)
f.write(s)
f.close()

para = conn.execute('select rule, suffix, tag from form;').fetchall()
paradigm = {}
for r,s,t in para:
  if r not in seen: continue
  #r = str(r)
  t = set(t.split(','))
  paradigm[r]=paradigm.get(r, [[], t] )
  paradigm[r][0].append((s,t))
  paradigm[r][1] = paradigm[r][1] & t

for p in paradigm.values():
  p[0] = dict([(s,','.join(t-p[1])) for s,t in p[0]])
  p[1] = ','.join(p[1])

f=open('paradigm.bin','wb')
s=umsgpack.packb(paradigm)
f.write(s)
f.close()

#import dawg
#d = dawg.IntDAWG(vv.iteritems())
#d.save('morph.idawg')