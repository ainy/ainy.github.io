'use strict';

var para, stem, tags, lemmas;
function setMorph([s, p, t], l) {
  para = p;
  stem = s;
  lemmas = l;
  tags = new Map();
  for (var i in t) tags.set(t[i],i);
}

function look_para(ret, p, suffix, wsmi) {
  var nosuffix = Object.keys(para[p][0]).length == 0 && !suffix;
  if (suffix in para[p][0] || nosuffix) {
    var info=''
    for (var t in para[p][1])
      info += tags.get(para[p][1][t])+','
    for (var t in para[p][0][suffix])
      info += tags.get(para[p][0][suffix][t])+','
    
    ret.push(info+wsmi+'+'+p);
  }
  for (var k in para[p][2])
    look_para(ret,para[p][2][k],suffix, wsmi);
}

function lookup(word) {
  var ret = [];
  word = word+'#';
  for(var i=1; i<=word.length; i++) {
    var wsmi = word.slice(0,-i);
    if(wsmi in stem) 
      for(var j in stem[wsmi])
        look_para(ret, stem[wsmi][j], word.slice(-i,-1), wsmi);
  }
  return ret;
}

//light version pos guessing, can return undefined
function guess(w) {
  var pos_guess;
  if (w === w.toUpperCase())
    if (Array.from(w).every(x=>'XIV'.indexOf(x)>=0))
      pos_guess = 'NUMR';
    else
      pos_guess = 'NOUN';
  else if (/^\d+$/.test(w.replace(',','').replace('.','')))
    pos_guess = 'NUMR';
  else if (w.endsWith('.'))
    pos_guess = 'NOUN';
  else if (w[0]==w[0].toUpperCase())
    pos_guess = 'NPRO';

  return pos_guess;
}

function guess2(w) {
  var pos_guess;
  if (w.match(/[а-я]+/gi)) //куздра, Ту-154, см^2, а_также, млрд., г.
  {
    if (w === w.toUpperCase())
      if (Array.from(w).every(x=>'XIV'.indexOf(x)>=0))
        pos_guess = 'NUMR';
      else
        pos_guess = 'NOUN';
    else if (w[0]==w[0].toUpperCase())
      pos_guess = 'NPRO';
    else if (w.endsWith('.'))
      pos_guess = 'NOUN';
    else if (w.indexOf('_')>=0)
      pos_guess = 'CONJ';
  
  }
  else if (w.match(/[0-9]+/gi)) //10_000, 0.2%, 5,31x2,11, 1941-1945
    pos_guess = 'NUMR';
  else pos_guess = 'PUNCT';
  
  return pos_guess;
}
function links(self, ii, j, label) {
  for (var i = 0; i < ii.length; i++)
    link(self, ii[i], j, label);
}

function link(self, i, j, label) {
  label = label||'-';
  if (i != j && !self[i][7]) {
    self[i][6]=j;
    self[i][7]=label;
  }
}

var NPP = new Set(['NOUN','NPRO']);
var per3 = new Set(['её','ее','его']);
var detadj = new Set(['PRTF','ADJF']);
var nprop = new Set(['NOUN']);
var adjc = new Set(['ADJF','ADVB','CONJ','PRTF']);
var unamod = new Set(['ADJF','ADVB','PUNCT','ADV','NUMR','CONJ','PRTF']);//'ADJ','DET','PUNCT','NUM','ADV','CCONJ'
var verb = new Set(['GRND','PRTF','INFN']);
var Case = new Set(['nomn','gen2','gen1','gent','datv','accs','acc2','voct','ablt','loct','loc2','loc1']);
var Numb = new Set(['sing','plur']);
var Gender = new Set(['masc','neut','femn']);


function get_possible_lemma(self, i) {
  var cur_lemma = self[i][1].toLower()+'_';
  for (var i =0; i<lemmas.length; i++) {
      var l = lemmas[i];
      if (!l.startsWith(cur_lemma))
        continue;
      
      var ll = l.split('_');
      if (self.slice(i,i+ll.length).every((x, j)=>x[1].toLower()==ll[j]))
          return ll;
  }
  return [];
}

function parse(self) { 
  var nsubj, ncase, nmod, amod = [], nummod, root = [], rest = [], npunct, firstroot, cases = [];
  for (var i = 0; i < self.length; i++) {
    let SpaceAfter;
    if (self[i][1]==='') {
      SpaceAfter = 'no';
      i++;
    }
    let pl = get_possible_lemma(self, i);
    if (pl.length) {
      if (self[i+pl.length-1][3] == 'PREP') ncase = i;
      rest.push(i);
      for (let j = 1; j < pl.length; j++) {
          i+=1;
          link(self, i, i-1);
      }
      i+=1;
      continue;
    }
    if (self[i][5].has('Surn') && self[i-1][5].has('Name') || self[i][5].has('Patr') && self[i-1][5].has('Name')) 
      link(self, i, i-1);
    else if (NPP.has(self[i][3]) && self[i][5].has('nomn')) {
        if (nsubj) root.unshift(i);
        else nsubj = i;
    }
    if (self[i][3] == 'PREP') ncase = i;
    
    if (ncase !== undefined)
        if (NPP.has(self[i][3]) && !per3.has(self[i][1]) || 
          i+1 < self.length && self[i+1][1] == ',' && self[i][3] in detadj) {
            link(self, ncase, i);
            ncase = undefined;
            cases.push(i);
    }
    if (i+1 < self.length && self[i+1][3]=='PUNCT' && self[i][3] in detadj) 
        root.unshift(i);
    
    if (self[i][3] in nprop && nmod !== undefined && self[i][5].has('gent'))
        link(self, i, nmod);
    
    if (self[i][3] == 'PRTF')
        amod.push(i);
    
    if (nmod !== undefined && self[i][1]=='"' && i+2<self.length && self[i+2][1]=='"')
        link(self, i+1, nmod);
    
    if (nprop.has(self[i][3])) nmod = i;
    else if (!adjc.has(self[i][3])) nmod = undefined;
    
    if (detadj.has(self[i][3]))
        amod.push(i);
    
    else if (amod.length)
        if (NPP.has(self[i][3]))
            for (let j = 0; j < amod.length; j++) {
                let a = amod[j];
                let inter = self[a][5].filter(x=>self[i][5].has(x));
                let hasCase = inter.filter(x=>Case.has(x));
                let hasNumb = inter.filter(x=>Numb.has(x));
                let hasGender = inter.filter(x=>Gender.has(x));
                
                if (hasCase.size && hasNumb.size && (hasGender.size || self[i][5].has('plur')))
                    link(self, a, i);
            amod = [];
        }
        else if (!unamod.has(self[i][3]))
            amod = [];
    
    if (self[i][3] == 'NUMR') nummod = i;
    if (NPP.has(self[i][3]) && nummod !== undefined)
        link(self, nummod, i);
    else if (!unamod.has(self[i][3]) )
        nummod = undefined;
    
    if (self[i][5].has ('надо+244')) root.push(i);
    if (self[i][5].has ('можно+244')) root.push(i);
    if (self[i][5].has ('долж+69')) root.push(i);
    
    if (self[i][3] == 'VERB' && !self[i][5].has('+600')) //быть
            root.push(i);
    else if (verb.has(self[i][3]))
            root.unshift(i);
            
    if (self[i][3] == 'COMP' || self[i][3] == 'ADJS' || self[i][3] == 'PRTS')
        root.unshift(i);
    
    let checki = true;
    if (self[i][3]=='CONJ' && i-1>0 && i+1<self.length )
        if (self[i-1][3] == self[i+1][3] && self[i-1][5] == self[i+1][5] ) {
            link(self, i+1, i-1);//conj
            link(self, i, i+1);//cc
            checki=false;
    }
    
    let checkp = true;
    if (self[i][1]==',' && i-1>0 && i+1<self.length )
        if (self[i-1][3] == self[i+1][3] && self[i-1][5] == self[i+1][5] ) {
            link(self,i+1, i-1);//conj
            checkp=false;
    }
    if ((checkp && self[i][3] == 'PUNCT' && self[i][1]!='"' || checki &&
        self[i][1]=='и') && (root.length || cases.length)) {
            let r;
            if (root.length) r = root.pop();
            else r = cases.shift();
                
            if (firstroot !== undefined) 
                if (self[firstroot][3]=='GRND' || self[firstroot][3]=='PRTF')
                    link(self, firstroot, r);
                else
                    link(self, r, firstroot);
            
            let inf;
            for(let j = 0; j<root.length; j++)
                if (self[root[j]][3] == 'INFN')
                    inf=x;
            
            for(let j = 0; j<rest.length; j++) {
                let x = rest[j];
                if (inf !== undefined && NPP.has(self[x][3]) && self[x][5].has('accs'))
                    link(self, x, inf);
                
            }
            self.links(rest, r);
            rest = [];
            root = [];
            cases = [];
                
            if (i-1>0 && i+1<self.length && self[i-1][5].has('то+') && self[i+1][1].startsWith('что')) {
                firstroot = i-1;
                link(self,i+1, i-1);
            }
            else
                firstroot=r;
            
            if (i+1<self.length && self[i+1][1].startsWith('что'))
                link(self,i+1, r);
            
    }
    if (self[i][3] == 'PUNCT')
        if (SpaceAfter=='no' && i+1 < self.length && self[i+1][3] != 'PUNCT')
            link(self,i, i+1)
        else if (npunct !== undefined) link(self, i, npunct);
        else link(self, i, i+1);
    else npunct = i;
    
    rest.push(i);
  }
    
  if (!root.length) {
    let r;
    if (firstroot !== undefined) r = firstroot;
    else r=rest.pop(0);
    if (self.p[r] == 'PUNCT') r++;
    self.links(rest, r);
  }
  else links(self, rest, root.shift()); /**/
}

function tokenize(line) {
  var data = [];
  var words = line.split(' ');
  for (var w in words) {
    var word = words[w];
    if (!word.match(/[a-zа-я]/gi)) {
      var parts = word.match(/[0-9_]+|[^0-9_]/gi);
      if (parts && (parts[1]=='.'||parts[1]==',') && parts[2])
        data.push(parts.shift()+parts.shift()+parts.shift());
      for (var p in parts) data.push(parts[p]);
      continue;
    }
    word = word.split('ё').join('е');
    var parts = word.match(/[a-я0-9\-_&%]+|[^а-я0-9\-_&%]/gi);
    if (parts[0].match(/^[А-Я]$/gi) && parts[1] == '.')
      data.push(parts.shift()+parts.shift());
    
    for (var p in parts) {
      if (p==0) data.push('');
      var prt = parts[p];
      if (prt.indexOf('-')>=0) {
        var lu = lookup(prt.toLowerCase());
        var spl = prt.split('-');
        var splc = prt.toLowerCase().split('-');
        var splu;
        if (!lu.length) splu = splc.map(lookup).every(x=>x.length);
        if (splu || !lu.length && prt.indexOf('-то')>=0 || prt.indexOf('-то')<0 && prt.indexOf('-либо')<0 && prt.indexOf('-нибудь')<0 && lu[0] && lu[0].indexOf('ADJF')>=0 && spl.length==2) {
          for(var i in spl) {
            if (spl[i]) data.push(spl[i]);
            data.push('-');
          }
          data.pop();
          //console.log(data);
        } else data.push(prt);
      }
      else data.push(prt);
    }
  }
  return data;
}

function sentence(words) {
  words = tokenize(words);
  var i=1;
  var data = [];
  for (var w in words) {
    var word = words[w].toLowerCase();
    var morph = lookup(word);
    if (!morph.length) morph=[guess2(words[w])||''];
    morph = morph[0].split(' ').join(',').split(',');
    var pos = morph[0];
    var tags = [];
    for(var m=0; m<morph.length; m++) {
      if (morph[m].indexOf('+')>=0) word = morph[m];
      else if (morph[m].toUpperCase() == morph[m]) {pos = morph[m];tags.push(pos);}
      else tags.push(morph[m]);
    }
    
    data.push([i,words[w],word,pos,morph[0],new Set(tags),0,0,0]);
    i++;
  }
  parse(data);
  for (var d in data) data[d][5] = Array.from(data[d][5]).join('|');
  return data.map(x=>x.join('\t')).join('\n');
}

if (typeof module != 'undefined') module.exports = {lookup, setMorph, guess2, parse, sentence, tokenize}
