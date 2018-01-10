#coding: utf-8
from __future__ import unicode_literals

import sqlite3
conn = sqlite3.connect('morph.db')
conn.text_factory = unicode

dic = conn.execute('select stem.prefix, norm.suffix, stem.rule, form.tag from stem join norm on stem.rule=norm.rule join form on form.rule=norm.rule and form.suffix=norm.suffix;').fetchall()

import codecs
freq = codecs.open('freqrnc2011.csv','r','utf8').readlines()
freq = dict([(line.split()[0].lower(),(line.split()[1], float(line.split()[2]))) for line in freq])

tconv = {'a':'ADJF', 'adv':'ADVB', 'advpro':'ADVB', 'num':'NUMR', 'pr':'PREP', 'apro':'ADJF', 's.PROP':'NOUN', 
  'intj':'INTJ', 'spro':'NPRO', 's':'NOUN', 'part':'PRCL', 'v':'VERB', 'conj':'CONJ', 'anum':'NUMR'}
vv = {}
seen = set()
for s,n,r,t in dic:
    w = s+n
    w = w.replace('ё','е')
    if w in freq:
        if freq[w]>0:
            s = s.replace('ё','е') #testing! comment me
            vv[s] = vv.get(s,{})
            t = t.replace(' ',',').split(',')[0]
            pos, frq = freq[w];
            vv[s][r]=int(frq*10)+(tconv[pos] == t)
            seen.add(r)

print 'words:', len(vv), 'of', len(freq)

import umsgpack

para = conn.execute('select rule, suffix, tag from form;').fetchall()
paradigm = {}
tags = set()
for r,s,t in para:
  if r not in seen: continue
  t = set(t.replace(' ',',').split(','))
  s = s.replace('ё','е') #testing! comment me
  paradigm[r]=paradigm.get(r, [[], t, []] )
  paradigm[r][0].append((s,t))
  paradigm[r][1] = paradigm[r][1] & t
  tags = tags | t

tags = dict(zip(tags,range(len(tags))))
for p in paradigm.values():
  p[0] = set([(s, tuple([tags[x] for x in t-p[1]])) for s,t in p[0] if len(p[0])>1 or s or t-p[1] ])
  p[1] = tuple([(tags[x]) for x in p[1]])
  
i=0
import copy
paradigm_orig = copy.deepcopy(paradigm)
for k,p in paradigm.iteritems():
  print '\rCompress:',i*100/len(paradigm),'%',
  i+=1
  if not p[0]: continue
  for kk,pp in paradigm_orig.iteritems():
    if not len(pp[0]): continue
    if k==kk: continue
    if p[0] > pp[0]: 
      p[0] -= pp[0]
      p[-1].append(kk)


#this last part represents paradigm definition as dict(for compression and perfomance) but
#makes it ambiguous as-if a word can be both accs and nomn: neut,accs,nomn,sing,ADJF
#disable it to get list of pairs representation instead of dict
for p in paradigm.values(): 
  d = dict()
  for k,v in p[0]:
    d[k] = d.get(k, set())
    d[k] |= set(v)
  
  for k in d:
    d[k] = list(d[k])
  
  p[0] = d

import json

f=open('morph.bin','wb')
f.write(umsgpack.packb([vv,paradigm,tags,json.load(open('lemmas.json'))]))
f.close()

#import dawg
#d = dawg.IntDAWG(vv.iteritems())
#d.save('morph.idawg')
