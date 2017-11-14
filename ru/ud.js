'use strict';

function convert(w, tags, orig) {
    const tconv = {'actv':'Voice=Act', 'indc':'Mood=Ind', 'gen2':'Case=Par', 'datv':'Case=Dat', 'accs':'Case=Acc','acc2':'Case=Acc', 'ANim':'Animacy=Anim','anim':'Animacy=Anim', 'perf':'Aspect=Perf', 'plur':'Number=Plur', 'femn':'Gender=Fem', 'impf':'Aspect=Imp', 'pssv':'Voice=Pass', 'inan':'Animacy=Inan', 'sing':'Number=Sing', 'past':'Tense=Past', 'neut':'Gender=Neut', 'pres':'Tense=Pres', 'voct':'Case=Voc', 'nomn':'Case=Nom', 'futr':'Tense=Fut', 'Supr':'Degree=Sup', '2per':'Person=2', '3per':'Person=3', 'impr':'Mood=Imp', '1per':'Person=1', 'ablt':'Case=Ins', 'gent':'Case=Gen','gen1':'Case=Gen', 'masc':'Gender=Masc', 'loct':'Case=Loc', 'loc2':'Case=Loc', 'loc1':'Case=Loc'}

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
    if ((pos_guess == 'VERB' || pos_guess == 'AUX') && !tags_guess.has('Voice=Pass')) tags_guess.add(w.endsWith('ся')?'Voice=Mid':'Voice=Act');
    if ((pos_guess == 'DET' || pos_guess == 'ADV' || pos_guess == 'ADJ'||pos_guess=='VERB'&&tags_guess.has('VerbForm=Part'))  && !tags_guess.has('Degree=Cmp') && !tags_guess.has('Degree=Sup'))
      tags_guess.add('Degree=Pos');
    
    return [pos_guess, tags_guess];
}
var para, stem, tags;
function setMorph([s, p, t]) {
  para = p;
  stem = s;
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

var grammar, gtags, stats;
function setGrammar([g,t]) {
  grammar = g;
  stats = new Map();
  gtags = new Map(Object.entries(t));
  
  //calculate stats
  var gk = Object.keys(grammar);
  for(var k in gk) {
    var spl = gk[k].split(',');
    for (var s in spl) {
      var tag = parseFloat(spl[s]);
      var val = grammar[gk[k]][0];
      stats.set(tag, (stats.get(tag)||0) + val);
    }
  }
    
}

function pos(item) {
  const freq = new Set(['SCONJ','PART','CCONJ','PUNCT']);
  var ret = item[3];
  if (freq.has(ret)) ret = item[1];
  if (ret == 'AUX') ret = 'быть';
  return ret;
}

function pos_features(self, item, ch) {
  //item = item[0];
  const cases = (['Case=Nom','Case=Gen','Case=Acc','Case=Dat','Case=Loc','Case=Ins','Case=Voc']);
  const rest = (['Mood=Imp','Voice=Pass','VerbForm=Inf','VerbForm=Trans','VerbForm=Part','Variant=Brev','Degree=Pos','Degree=Cmp']);
  var ret = [pos(item)];
  
  if (ret[0] == 'NOUN')
    ret = ret.concat(cases.filter(x=>item[5].has(x)));
  
  ret = ret.concat(rest.filter(x=>item[5].has(x)));
  for (var c in ch) ret.push('has:'+pos(self[ch[c]]));
  return ret;
}
function set_link(self, i, j, label) {
  console.log('set_link', i, j);
  self[i][6]=j;
  self[i][7]=label;
}

function check_link(dif, f1,f2,f3) {
  var feat = f1.map(x=>'leaf:'+x).concat(f2,f3)
  feat = feat.map(x=>gtags.get(x));
  feat.sort();
  var k = feat.join(',');
  console.log(k);
  while (feat.length && !(k in grammar)) {
    var min_tag;
    for (var f in feat)
      if (stats.get(feat[f]) < stats.get(feat[min_tag])||Infinity)
        min_tag = f;
    feat.splice(min_tag, 1);
    k = feat.join(',');
  }
  if (k in grammar) return grammar[k][1] > grammar[k][0]/2;
  console.log('tags not found',f1,f2,f3);
  return false;//TODO: guess how?
}

function parse(self) {
  var num = 1;
  var t = new Map()
  for (var i in self) {
    i = parseFloat(i);
    var tt = t;
    var lnk_found = false;
    
    while (tt.size) {
      var ttk = Array.from(tt.keys());
      ttk.sort();
      var k = parseFloat(ttk[ttk.length-1]);
      if (k==i) { 
        if (tt.size < 2) break;
        k = parseFloat(ttk[ttk.length-2]);
      }
      var ipos = pos_features(self, self[i], Array.from((tt.get(i)||new Map()).keys()) )
      var kpos = pos_features(self, self[k], Array.from((tt.get(k)||new Map()).keys()) )
      var common_tags = []
      var tags = Array.from(self[i][5]).filter(x=>self[k][5].has(x));
      for (var tag in tags)
        common_tags.push(tags[tag].split('=')[0]);
      
      if (tt==t && check_link(i-k, kpos, ipos, common_tags)) {
        set_link(self, k, i+1, num++);
        tt.set(i, tt.get(i) || new Map());
        tt.get(i).set(k, tt.get(k)); //tt[i][k] = tt[k];
        tt.delete(k);
        if (tt.size > 1)
            continue
      }
        
      if (check_link(k-i, ipos, kpos, common_tags)) {
        set_link(self, i, k+1, num++);
        if (t.has(i)) { 
          tt.set(k, tt.get(k) || new Map()); //tt[k][i] = t[i]
          tt.get(k).set(i, t.get(i));
          t.delete(i);
        }
        else {
          tt.set(k, tt.get(k) || new Map());
          tt.get(k).set(i, new Map()); //tt[k][i]
        }
        lnk_found = true;
        break;
      }
      tt = tt.get(k) || new Map();
    }
    if (!lnk_found) 
        t.set(i, new Map());
  }
}

function sentance(words){
  var data = [];
  words = words.split(' ');
  var i=1;
  for (var w in words) {
    var word = words[w]
    word = word.split('ё').join('е')
    var parts = word.match(/[a-я]+|[^а-я]/gi);
    for (var p in parts) {
      var part = parts[p].toLowerCase();
      var morph;
      if (!part.match(/[а-я]+/gi)) morph = ['PUNCT',new Set()];
      else {
        var guess = lookup(part).map(x=>convert(part, x));
        if (!guess.length) guess=[convert(parts[p])];
        morph = guess[0];
      }
      data.push([i,parts[p],part,morph[0],morph[0],morph[1],0,0,0]);
      i++;
    }
  }
  parse(data);
  console.log(data);
  for (var d in data) data[d][5] = Array.from(data[d][5]).join('|');
  return data.map(x=>x.join('\t')).join('\n');
}

if (typeof module != 'undefined') module.exports = {convert, lookup, setMorph, setGrammar, parse, sentance}