'use strict';

var fs = require("fs");
var msgpack = require("msgpack-lite");

var [stem, para, sgat] = msgpack.decode(fs.readFileSync("morph.bin"));
var tags = new Map();
for (var i in sgat) tags.set(sgat[i],i);

//var stem = new Map(Object.entries(stem));
//var para = new Map(Object.entries(para));

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
//console.log(stem['привет']);
console.log(lookup('приветствие'));

var convert = require('./opencorpora_to_syntagrus.js');
var test = fs.readFileSync("UD_Russian-SynTagRus/ru_syntagrus-ud-train.conllu",'utf8');
var poserror = 0, tagerror=0, notfound=0, total = 0;
test.split('\n').forEach((line,num)=>{
  if (!line) return;
  if (line.startsWith('#')) return;
  line = line.split('\t');
  if (line[0].indexOf('.')>=0) return;
  if (line[1].indexOf('_')>=0) return; //dictionary lemmas like тем_не_менее 
  var word = line[1].toLowerCase();
  word = word.split('ё').join('е');
  if (!Array.from(word).every(x=>'абвгдеёжзиклмнопрстуфхцчшщэюя'.indexOf(x)>=0)) return;
  var guess = lookup(word).map(x=>convert(word, x, line[1]));
  if (!guess.length) {notfound++;guess=[convert(line[1])]}
  var correct_pos = line[3];
  var correct_tags = line[5].split('|');
  if (line[5]==='_') correct_tags = [];
  var pe = true, te=true;
  for (var i in guess) {
    var guess_pos = guess[i][0];
    var guess_tags = guess[i][1];
    if (guess_pos == correct_pos) pe=false;
    if (correct_tags.map(x=>guess_tags.has(x)).every(x=>x)) te=false;
  }
  if (pe) {poserror++;} //console.log(guess_pos+'', correct_pos, word);
  if (te) {tagerror++; if(false) console.log(correct_pos,word,correct_tags.filter(x=>!guess_tags.has(x)),Array.from(guess_tags))} //
  total++;
  process.stdout.write('Not found rate:'+(notfound*100/total).toFixed(2)+'% POS error rate:'+(poserror*100/total).toFixed(2)+'% tag error rate:'+(tagerror*100/total).toFixed(2)+'% Line number:'+(num/1e4).toFixed(2)+'%of1m\r');
});
//Not found rate:2.31% POS error rate:7.27% tag error rate:20.75% Line number:106.69%of1m

process.stdout.write('\n');