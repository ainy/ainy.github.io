'use strict';

const best = {'ADJ': 'obl',
  'ADP': 'advmod',
  'ADV': 'advmod',
  'AUX': 'cop',
  'CCONJ': 'cc',
  'DET': 'amod',
  'INTJ': 'parataxis',
  'NOUN': 'obl',
  'NUM': 'nummod',
  'PART': 'advmod',
  'PRON': 'nsubj',
  'PROPN': 'nsubj',
  'SCONJ': 'cc',
  'SYM': 'case',
  'VERB': 'xcomp',
}
const label = {
  '1':'fixed',
  //'2':'flat:name' if 'Case=Gen' not in self.t[i] else 'nmod',
  '3':'case',
  '4':'nmod',
  '5':'appos',
  '6':'amod',
  '7':'nummod',
  '8':'conj',
  '9':'cc',
  '10':'conj',
  '11':'advcl',
  '12':'conj',
  '13':'obj',
  '15':'mark',
  '16':'mark',
  '17':'punct',
  '18':'punct',
  '19':'punct'
}
const pconv = {
      "ADJF":["ADJ"],
      "ADJS":["ADJ","Variant=Short"],
      "COMP":["ADJ","Degree=Cmp"],
      "VERB":["VERB","VerbForm=Fin"],
      "INFN":["VERB","VerbForm=Inf"],
      "PRTF":["VERB","VerbForm=Part"],
      "PRTS":["VERB","VerbForm=Part", "Variant=Short"],
      "GRND":["VERB","VerbForm=Conv"],
      "NUMR":["NUM"],
      "ROMN":["NUM"],
      "LATN":["NUM"],
      "NUMB":["NUM"],
      "ADVB":["ADV"],
      "NPRO":["PRON"],
      "PRED":["ADV","Degree=Pos"],
      "PREP":["ADP"],
      "PRCL":["PART"],
      "NOUN":["NOUN"],
      "INTJ":["INTJ"],
      "CONJ":["CCONJ"]
    }
function get_label(self, i, j, l) {
  if (l in label) return label[l];
  if (l==2) return self[i][5].has('gent')?'nmod':'flat:name';
  let pos = self[i][3];
  if (!(pos in pconv)) return '-';
  return best[pconv[pos][0]] || '-';
}

function convert(w, tags) {
    const tconv = {'actv':'Voice=Act', 'indc':'Mood=Ind', 'gen2':'Case=Par', 'datv':'Case=Dat',
    'accs':'Case=Acc','acc2':'Case=Acc', 'ANim':'Animacy=Anim','anim':'Animacy=Anim', 'perf':'Aspect=Perf',
    'plur':'Number=Plur', 'femn':'Gender=Fem', 'impf':'Aspect=Imp', 'pssv':'Voice=Pass', 'inan':'Animacy=Inan',
    'sing':'Number=Sing', 'past':'Tense=Past', 'neut':'Gender=Neut', 'pres':'Tense=Pres', 'voct':'Case=Voc',
    'nomn':'Case=Nom', 'futr':'Tense=Fut', 'Supr':'Degree=Sup', '2per':'Person=2', '3per':'Person=3',
    'impr':'Mood=Imp', '1per':'Person=1', 'ablt':'Case=Ins', 'gent':'Case=Gen','gen1':'Case=Gen',
    'masc':'Gender=Masc', 'loct':'Case=Loc', 'loc2':'Case=Loc', 'loc1':'Case=Loc'}

    var tags_guess = new Set();
    var pos_guess = ''
    if (tags===undefined) {
      if (w === w.toUpperCase())
        if (Array.from(w).every(x=>'XIV'.indexOf(x)>=0))
          pos_guess = 'NUM';
        else
          pos_guess = 'NOUN';
      else if (/^\d+$/.test(w.replace(',','').replace('.','')))
        pos_guess = 'NUM';
      else if (w.endsWith('.'))
        pos_guess = 'NOUN';
      else if (w[0]==w[0].toUpperCase())
        pos_guess = 'PROPN';
    }
    else tags_guess = new Set(tags.split(',').join(' ').split(' '));
    
    if (tags_guess.has('котор+1805'))
      pos_guess = 'PRON';//PRON
    else if (tags_guess.has('эт+3102')) {
      //PRON||PART||DET
      pos_guess = 'DET';//DET
      tags_guess.add('Animacy=Inan');
    }
    else if (tags_guess.has('ADJF') && tags_guess.has('Apro')) pos_guess = 'DET';
    else if (tags_guess.has('CONJ') && w.length > 2)
      pos_guess = 'SCONJ';
    else if (tags_guess.has('Geox')||tags_guess.has('Surn')||tags_guess.has('Name')||tags_guess.has('Patr'))
      pos_guess = 'PROPN';
    else if (tags_guess.has('+600')) // быть
      if (tags_guess.has('PRTF'))
        pos_guess = 'ADJ';
      else
        pos_guess = 'AUX';
        //if 'past' in tags_guess: tags_guess.add('Tense=Pres')
    
    if (tags_guess.has('т+2908') || tags_guess.has('эт+3103')) tags_guess.add('Animacy=Inan');
    
    tags_guess = Array.from(tags_guess);
    for (var i in tags_guess) {
      var tg = tags_guess[i];
      if (!pos_guess && tg in pconv) {
        var p = pconv[tg].slice();
        pos_guess = p.shift();
        for (var j in p) tags_guess.push(p[j]);
      }
      else if (tg in tconv)
        tags_guess[i] = tconv[tg];
    }
    //if (!pos_guess) TODO: guess_pos...
    tags_guess = new Set(tags_guess);
    if ((pos_guess == 'VERB' || pos_guess == 'AUX') && !tags_guess.has('Voice=Pass')) 
      tags_guess.add(w.endsWith('ся')?'Voice=Mid':'Voice=Act');
    if ((pos_guess == 'DET' || pos_guess == 'ADV' || pos_guess == 'ADJ' || pos_guess=='VERB' 
    && tags_guess.has('VerbForm=Part'))  && !tags_guess.has('Degree=Cmp') && !tags_guess.has('Degree=Sup'))
      tags_guess.add('Degree=Pos');
    
    return [pos_guess, tags_guess];
}

var para, stem, tags, lemmas;
function setMorph([s, p, t, l]) {
  para = p;
  stem = s;
  lemmas = l;
  tags = new Map();
  for (var i in t) tags.set(t[i],i);
}

function look_para(ret, p, suffix, wsmi, freq) {
  var nosuffix = Object.keys(para[p][0]).length == 0 && !suffix;
  if (suffix in para[p][0] || nosuffix) {
    var info='0000000'+freq;
    info = info.substr(info.length-7) + ','
    for (var t in para[p][1])
      info += tags.get(para[p][1][t])+','
    for (var t in para[p][0][suffix])
      info += tags.get(para[p][0][suffix][t])+','
    
    ret.push(info+wsmi+'+'+p);
  }
  for (var k in para[p][2])
    look_para(ret,para[p][2][k],suffix, wsmi, freq);
}

function lookup(word) {
  var ret = [];
  word = word+'#';
  for(var i=1; i<=word.length; i++) {
    var wsmi = word.slice(0,-i);
    if(wsmi in stem)
      for(var j in stem[wsmi])
        look_para(ret, j, word.slice(-i,-1), wsmi, stem[wsmi][j]);
  }
  ret.sort();
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
  if (i != j && !self[i][7]) {
    self[i][6]=j+1;
    self[i][7]=get_label(self, i, j, label);
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
  var cur_lemma = self[i][1].toLowerCase()+'_';
  for (var i =0; i<lemmas.length; i++) {
      var l = lemmas[i];
      if (!l.startsWith(cur_lemma))
        continue;
      
      var ll = l.split('_');
      if (i+ll.length>self.length) 
        continue;
      
      if (ll.every((x, j)=>self[i+j][1].toLowerCase()==x))
          return ll;
  }
  return [];
}

function parse(self) { 
  var nsubj, ncase, nmod, amod = [], nummod, root = [], rest = [], npunct, firstroot, cases = [];
  for (var i = 0; i < self.length; i++) {
    let pl = get_possible_lemma(self, i);
    if (pl.length) {
      if (self[i+pl.length-1][3] == 'PREP') ncase = i;
      rest.push(i);
      for (let j = 1; j < pl.length; j++) {
          i++;
          link(self, i, i-1, 1);
      }
      i++;
      continue;
    }
    if (i-1>0 && (self[i][5].has('Surn') && self[i-1][5].has('Name') || self[i][5].has('Patr') && self[i-1][5].has('Name'))) 
      link(self, i, i-1, 2);
    else if (NPP.has(self[i][3]) && self[i][5].has('nomn')) {
        if (nsubj) root.unshift(i);
        else nsubj = i;
    }
    if (self[i][3] == 'PREP') ncase = i;
    
    if (ncase !== undefined)
        if (NPP.has(self[i][3]) && !per3.has(self[i][1]) || 
          i+1 < self.length && self[i+1][1] == ',' && detadj.has(self[i][3])) {
            link(self, ncase, i, 3);
            ncase = undefined;
            cases.push(i);
    }
    if (i+1 < self.length && self[i+1][3]=='PUNCT' && detadj.has(self[i][3])) 
        root.unshift(i);
    
    if (nprop.has(self[i][3]) && nmod !== undefined && self[i][5].has('gent'))
        link(self, i, nmod, 4);
    
    if (self[i][3] == 'PRTF')
        amod.push(i);
    
    if (nmod !== undefined && self[i][1]=='"' && i+2<self.length && self[i+2][1]=='"')
        link(self, i+1, nmod, 5);
    
    if (nprop.has(self[i][3])) nmod = i;
    else if (!adjc.has(self[i][3])) nmod = undefined;
    
    if (detadj.has(self[i][3]))
        amod.push(i);
    
    else if (amod.length)
        if (NPP.has(self[i][3])) {
            for (let j = 0; j < amod.length; j++) {
                let a = amod[j];
                let inter = Array.from(self[a][5]).filter(x=>self[i][5].has(x));
                let hasCase = inter.filter(x=>Case.has(x));
                let hasNumb = inter.filter(x=>Numb.has(x));
                let hasGender = inter.filter(x=>Gender.has(x));
                
                if (hasCase.length && hasNumb.length && (hasGender.length || self[i][5].has('plur')))
                    link(self, a, i, 6);
            }
            amod = [];
        }
        else if (!unamod.has(self[i][3]))
            amod = [];
    
    if (self[i][3] == 'NUMR') nummod = i;
    if (NPP.has(self[i][3]) && nummod !== undefined)
        link(self, nummod, i, 7);
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
        if (self[i-1][3] == self[i+1][3] && Array.from(self[i-1][5]).join(',') == Array.from(self[i+1][5]).join(',') ) {
            link(self, i+1, i-1, 8);//conj
            link(self, i, i+1, 9);//cc
            checki=false;
    }
    
    let checkp = true;
    if (self[i][1]==',' && i-1>0 && i+1<self.length )
        if (self[i-1][3] == self[i+1][3] && Array.from(self[i-1][5]).join(',') == Array.from(self[i+1][5]).join(',') ) {
            link(self,i+1, i-1, 10);//conj
            checkp=false;
    }
    if ((checkp && self[i][3] == 'PUNCT' && self[i][1]!='"' || checki &&
        self[i][1]=='и') && (root.length || cases.length)) {
            let r;
            if (root.length) r = root.pop();
            else r = cases.shift();
                
            if (firstroot !== undefined) 
                if (self[firstroot][3]=='GRND' || self[firstroot][3]=='PRTF')
                    link(self, firstroot, r, 11);
                else
                    link(self, r, firstroot, 12);
            
            let inf;
            for(let j = 0; j<root.length; j++)
                if (self[root[j]][3] == 'INFN')
                    inf=root[j];
            
            for(let j = 0; j<rest.length; j++) {
                let x = rest[j];
                if (inf !== undefined && NPP.has(self[x][3]) && self[x][5].has('accs'))
                    link(self, x, inf, 13);
                
            }
            links(self, rest, r, 14);
            rest = [];
            root = [];
            cases = [];
                
            if (i-1>0 && i+1<self.length && self[i-1][5].has('т+2908') && self[i+1][1].startsWith('что')) {
                firstroot = i-1;
                link(self,i+1, i-1, 15);
            }
            else
                firstroot=r;
            
            if (i+1<self.length && self[i+1][1].startsWith('что'))
                link(self,i+1, r, 16);
            
    }
    if (self[i][3] == 'PUNCT')
        if (self[i][1] == '"' && self[i][9]=='SpaceAfter=No' && i+1 < self.length && self[i+1][3] != 'PUNCT')
            link(self, i, i+1, 17);
        else if (npunct !== undefined) link(self, i, npunct, 18);
        else link(self, i, i+1, 19);
    else npunct = i;
    
    rest.push(i);
  }
    
  if (!root.length) {
    let r;
    if (firstroot !== undefined) r = firstroot;
    else r=rest.pop(0);
    if (self[r][3] == 'PUNCT') r++;
    links(self, rest, r, 20);
  }
  else links(self, rest, root.shift(), 21); 
  /*TODO return score*/
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
        if (splu || !lu.length && prt.indexOf('-то')>=0 || prt.indexOf('-то')<0 && 
        prt.indexOf('-либо')<0 && prt.indexOf('-нибудь')<0 && lu[0] && lu[0].indexOf('ADJF')>=0 && spl.length==2) {
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

function convert_all(words) {
  var data = [];
  for (var w=0; w < words.length; w++) {
    var word = words[w][1].toLowerCase();
    var all_morph = lookup(word);
    if (!all_morph.length) all_morph=[guess2(words[w][1])||''];
    var max_score = 0;
    var best_guess;
    for (var m in all_morph) {
      var [pos_guess, tags_guess] = convert(words[w][1], all_morph[m]);
      var score = words[w][5].split('|').filter(x=>tags_guess.has(x)).length;
      if (words[w][3]==pos_guess)
        score += 2;
      if (score >= max_score) {
        max_score = score;
        best_guess = [pos_guess, tags_guess];
      }
    }
    var [pos, tags] = best_guess;
    data.push([words[w][0],words[w][1],word,pos,pos,tags,0,'','',words[w][9]]);
  }
  return data;
}

function prepare(words) {
  var i=1;
  var data = [];
  for (var w=0; w < words.length; w++) {
    let SpaceAfter;
    if (words[w]==='') {
      SpaceAfter = 'SpaceAfter=No';
      w++;
    }
    var word = words[w].toLowerCase();
    var all_morph = lookup(word);
    if (!all_morph.length) all_morph=[guess2(words[w])||''];
    var morph = all_morph[all_morph.length-1].split(' ').join(',').split(',');//last is most frequent
    var pos = morph[0]; 
    var tags = [];
    for(let m in morph) {
      if (morph[m].indexOf('+')>=0) word = morph[m];
      else if (morph[m].toUpperCase() == morph[m]) pos = morph[m];
      //else tags.push(morph[m]);
    }
    // we will collect all tags from definitions with the same part of speech
    for(let a in all_morph) {
      morph = all_morph[a].split(' ').join(',').split(',');
      if (morph.indexOf(pos)<0) continue;
      for(let m in morph)
        tags.push(morph[m]);
    }
    
    data.push([i,words[w],word,pos,pos,new Set(tags),0,'','',SpaceAfter]);
    i++;
  }
  return data;
}
function sentence(words) {
  words = tokenize(words);
  words = prepare(words);
  parse(words);
  for (var d in words) words[d][5] = Array.from(words[d][5]).join('|');
  return words.map(x=>x.join('\t')).join('\n');
}

if (typeof module != 'undefined') module.exports = {lookup, setMorph, guess2, parse, sentence, tokenize, prepare, convert, convert_all}
