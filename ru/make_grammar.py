#coding: utf-8
from __future__ import unicode_literals
import sys
import json, uuid
from codecs import open

def from_conllu(f='UD_Russian-SynTagRus/ru_syntagrus-ud-train.conllu'):
    for sent in open(f, 'r','utf8').read().strip().split('\n\n'):
        yield SentanceRu(sent)

class SentanceRu(object):
    def __init__(self, ru=''):
        self.ru = ru
        
        self.data = [x.split() for x in ru.split('\n') if not x.startswith('#') and '.' not in  x.split()[0]]
        self.guess = [list(x)[:-4]+['0','','_','_'] for x in self.data]
        self.zd = zip(*self.data)
        self.w = self.zd[1]
        self.n = self.zd[2]
        self.p = self.zd[3]
        self.t = map(lambda x: set(x.split('|')), self.zd[5])
        try:
          self.l = map(int, self.zd[6])
        except:
          print ru
        self.ll = self.zd[7]
        
    
    def link(self, fr, to, ty):
        self.guess[fr][6] = str(to)
        self.guess[fr][7] = ty
    
    cases = {'Case=Nom','Case=Gen','Case=Acc','Case=Dat','Case=Loc','Case=Ins','Case=Voc'}
    rest = {'Mood=Imp','Voice=Pass','VerbForm=Inf','VerbForm=Trans','VerbForm=Part','Variant=Brev','Degree=Pos','Degree=Cmp'}
    def get_pos(self, i, ch={}):
        ret = [self.p[i]]
        if self.p[i] in {'SCONJ','PART','CCONJ','PUNCT'}: ret=[self.w[i]]
        if self.p[i] == 'AUX': ret=[self.n[i]]

        if self.p[i] == 'NOUN': ret += self.t[i] & self.cases
        ret += self.t[i] & self.rest
        return ret+['has:'+self.get_pos(c)[0] for c in ch]
    
    def learn(self, label, dif, k, i, f):
        #print label, dif, ' '.join(['leaf:'+x for x in k]),' '.join(i), ' '.join(f)
        feat = (frozenset(['leaf:'+x for x in k] + i + f))
        self.learned[feat].append((label, dif))
    
    def oracle(self):
        self.checks = 0
        t = tree()
        for i in range(len(self.w)):
            tt = t
            lnk_found = False
            while tt.keys():
                k = sorted(tt.keys())[-1]
                #print self.w[i], self.w[k]
                if k==i: 
                    if len(tt.keys()) < 2: break
                    k = sorted(tt.keys())[-2]
                
                label = self.ll[k] if self.l[k] == i+1 else ''                    
                ipos = self.get_pos(i, tt[i] if i in tt else {})
                kpos = self.get_pos(k, tt[k] if k in tt else {})
                common_tags = [tag.split('=')[0] for tag in self.t[i]&self.t[k]]
                    
                if tt==t:
                    self.checks += 1
                    self.learn(label, i-k, kpos, ipos, common_tags)
                    
                if tt==t and self.l[k] == i+1:
                    self.link(k, i+1, '')
                    tt[i][k] = tt[k]
                    del tt[k]
                    if tt.keys()>1: 
                        continue
                
                rlabel = self.ll[i] if self.l[i] == k+1 else ''
                self.learn(rlabel, k-i, ipos, kpos, common_tags)
                
                self.checks += 1
                if self.l[i] == k+1:
                    self.link(i, k+1, '')
                    if i in t: 
                        tt[k][i] = t[i]
                        del t[i]
                    else: 
                        tt[k][i]
                    lnk_found = True
                    break
                tt = tt[k] if k in tt else {}
            if not lnk_found: 
                t[i]
            
        self.tree = t
    
    def patch_infns(self):
        for i in range(len(self.w)):
            if 'VerbForm=Inf' in self.t[i]:
                print self.w[self.l[i]-1], self.w[i]
                print ' '.join(self.w)
    
    def check(self):
        self.oracle()
        self.link(-1, self.tree.keys()[0]+1, '')
        self.errors = [1 for x,y in zip(self.data, self.guess) if x[6]!=y[6]]
        return self.errors
    
    def _repr_html_(self):
        #print '\n'.join(map('\t'.join, self.guess))
        missed = [x if x[6]!=y[6] else x[:-4] for x,y in zip(self.data, self.guess)]
        data1 = '\n'.join(map('\t'.join, missed))
        
        return u'''<div id='{0}'></div><script>
        var conll = new ConllU.Document();
        var doc = conll.parse({1}).toBrat();
        Util.embed( '{0}', collData, doc, [] );
        </script>'''.format(uuid.uuid4().hex, json.dumps(data1, ensure_ascii=False))

a=from_conllu()

from collections import defaultdict
def tree(): return defaultdict(tree)

def print_tree(t, labels={}, sp=0):
    if isinstance(t, dict):
        print t.keys()
        for x in sorted(t.keys()): 
            print ' '*sp, labels.get(x,x),
            print_tree(t[x], labels, sp+1)
    else: print '=',t

learned = defaultdict(list)
i=0
for self in a:
    print '\rProcessed',i,'sentences',len(learned),'cases',
    i+=1
    self.learned = learned
    self.oracle()

"""decide = {}
stats = defaultdict(int)
for k,v in learned.iteritems():
    l,d = zip(*v)
    linked = sum(map(bool, l))
    total = len(l)
    decide[k] = linked > total/2.
    for tag in k:
        stats[tag] += total
"""

tags = set()
for k in learned:
  for x in k:
    tags.add(x)

tags = dict(zip(tags,range(len(tags))))
grammar = {}
for k in learned:
  if len(learned[k])>1:
    grammar[tuple([tags[x] for x in k])] = [len(learned[k]), sum([bool(x[0]) for x in learned[k]])]


import umsgpack
f=open('grammar.bin','wb')
f.write(umsgpack.packb([grammar, tags]))
f.close()

#train: 0.9368822334580313
#dev: 0.868754610144
#test: 0.874039657671