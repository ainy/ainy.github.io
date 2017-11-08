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
            vv[s].append(str(r))
            seen.add(r)

print len(vv), len(freq)

import umsgpack #umsgpack.packb
f=codecs.open('morph.yaml','w','utf8')
for k in vv:
  f.write(k+':'+','.join(vv[k])+'\n')
f.close()

para = conn.execute('select rule, suffix, tag from form;').fetchall()
paradigm = {}
tags = set()
for r,s,t in para:
  if r not in seen: continue
  t = set(t.split(','))
  paradigm[r]=paradigm.get(r, [[], t, 0] )
  paradigm[r][0].append((s,t))
  paradigm[r][1] = paradigm[r][1] & t
  tags = tags | t

tags = dict(zip(tags,range(len(tags))))
for p in paradigm.values():
  p[0] = set([(s,','.join([str(tags[x]) for x in t-p[1]])) for s,t in p[0] if s or t-p[1] ])
  p[1] = ','.join([str(tags[x]) for x in p[1]])
  p[2] = p[0].copy()
  

i=0
for k,p in paradigm.iteritems():
  print '\r',i*100/len(paradigm),'%',
  i+=1
  if not p[0]: continue
  for kk,pp in paradigm.iteritems():
    if not len(pp[0]): continue
    if k==kk: continue
    if p[0] >= pp[2]: 
      p[0] -= pp[2]
      p[1] += (';' if ';' not in p[1] else (',' if p[1] else ''))+str(kk)


f=codecs.open('paradigm.yaml','w','utf8')
for k in paradigm:
  f.write(str(k)+':'+paradigm[k][1]+'\n')
  forms = (paradigm[k][0])
  for kk,vv in forms:
    f.write('\t'+kk+':'+vv+'\n')
f.close()

#import dawg
#d = dawg.IntDAWG(vv.iteritems())
#d.save('morph.idawg')