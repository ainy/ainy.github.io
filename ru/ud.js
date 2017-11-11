'use strict';

function convert(w, tags, orig) {
    var tconv = {'actv':'Voice=Act', 'indc':'Mood=Ind', 'gen2':'Case=Par', 'datv':'Case=Dat', 'accs':'Case=Acc','acc2':'Case=Acc', 'ANim':'Animacy=Anim','anim':'Animacy=Anim', 'perf':'Aspect=Perf', 'plur':'Number=Plur', 'femn':'Gender=Fem', 'impf':'Aspect=Imp', 'pssv':'Voice=Pass', 'inan':'Animacy=Inan', 'sing':'Number=Sing', 'past':'Tense=Past', 'neut':'Gender=Neut', 'pres':'Tense=Pres', 'voct':'Case=Voc', 'nomn':'Case=Nom', 'futr':'Tense=Fut', 'Supr':'Degree=Sup', '2per':'Person=2', '3per':'Person=3', 'impr':'Mood=Imp', '1per':'Person=1', 'ablt':'Case=Ins', 'gent':'Case=Gen','gen1':'Case=Gen', 'masc':'Gender=Masc', 'loct':'Case=Loc', 'loc2':'Case=Loc', 'loc1':'Case=Loc'}

    var pconv = {
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
    //if (!pos_guess) guess_pos...
    tags_guess = new Set(tags_guess);
    if ((pos_guess == 'VERB' || pos_guess == 'AUX') && !tags_guess.has('Voice=Pass')) tags_guess.add(w.endsWith('ся')?'Voice=Mid':'Voice=Act');
    if ((pos_guess == 'DET' || pos_guess == 'ADV' || pos_guess == 'ADJ'||pos_guess=='VERB'&&tags_guess.has('VerbForm=Part'))  && !tags_guess.has('Degree=Cmp') && !tags_guess.has('Degree=Sup'))
      tags_guess.add('Degree=Pos');
    
    return [pos_guess, tags_guess];
}
var para, stem, tags;
function setMorph([s, p, sgat]) {
  para = p;
  stem = s;
  tags = new Map();
  for (var i in sgat) tags.set(sgat[i],i);
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

if (typeof module != 'undefined') module.exports = {convert, lookup, setMorph}