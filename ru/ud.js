'use strict';

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
  var ret = [];
  if (item[3] == 'PRCL' || item[3] == 'CONJ' || item[3] == 'PUNCT') ret = [item[1]];
  ret = ret.concat(item[5]);
  if (!ret.length) ret = ['_'];
  for (var c in ch) ret.push('has:'+pos(self[ch[c]]));
  return ret;
}
function set_link(self, i, j, label) {
  console.log('set_link', i, j);
  self[i][6]=j;
  self[i][7]=label;
}

function predict_link(dif, f1,f2,f3) {
  var feat = f1.map(x=>'leaf:'+x).concat(f2,f3)
  feat = feat.map(x=>gtags.get(x));
  feat.sort();
  var k = feat.join(',');
  console.log(k);
  while (feat.length && !(k in grammar)) {
    var min_tag;
    for (var f in feat)
      if ((stats.get(feat[f])||0) < stats.get(feat[min_tag])||Infinity)
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
      var tags = self[i][5].filter(x=>self[k][5].includes(x));
      for (var tag in tags)
        common_tags.push(tags[tag].split('=')[0]);
      
      if (tt==t && predict_link(i-k, kpos, ipos, common_tags)) {
        set_link(self, k, i+1, num++);
        tt.set(i, tt.get(i) || new Map());
        tt.get(i).set(k, tt.get(k)); //tt[i][k] = tt[k];
        tt.delete(k);
        if (tt.size > 1)
            continue
      }
        
      if (predict_link(k-i, ipos, kpos, common_tags)) {
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

function sentance(words){
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
    
    data.push([i,words[w],word,pos,morph[0],tags,0,0,0]);
    i++;
  }
  parse(data);
  for (var d in data) data[d][5] = Array.from(data[d][5]).join('|');
  return data.map(x=>x.join('\t')).join('\n');
}

if (typeof module != 'undefined') module.exports = {lookup, setMorph, setGrammar, parse, sentance}