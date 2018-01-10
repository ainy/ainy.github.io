'use strict';

var fs = require("fs");
var test = fs.readFileSync("UD_Russian-SynTagRus/ru_syntagrus-ud-train.conllu",'utf8');

var {tokenize, setMorph} = require('./ud.js');
setMorph(require("msgpack-lite").decode(fs.readFileSync("morph.bin")));

var lemmas=[];// = JSON.parse(fs.readFileSync("lemmas.json"));
function lemmatize(line) {
  for (var l in lemmas)
    line = line.split(l.split('_').join(' ')).join(l);
  return line;
}


var expected = [];
var err=0, total=0;
test.split('\n').forEach((line,num)=>{
  if (!line) return;
  if (line.startsWith('# text = ')) {
    if (expected.length) {
      console.log('expected', expected);
      process.exit(1);
    }
    expected = tokenize((line.slice(9).split(' ').join(' ')));
  }
  if (line.startsWith('#')) return;
  line = line.split('\t');
  if (line[0].indexOf('.')>=0) return;
  if (!expected.length) {
    console.log('not expected', line);
    process.exit(1);
  }
  var ex = expected[0];
  if (ex==='') {
    expected.shift();
    ex = expected[0];
  }
  var lin = line[1].split('ё').join('е');
  total++;
  if (ex !== lin) {
    err++;
    console.log('expect', lin, 'we have', ex);
    if (ex.startsWith(lin))
      expected[0] = ex.slice(lin.length);
    
    else while (lin.startsWith(ex)) {
      lin = lin.slice(ex.length);
      expected.shift();
      ex = expected[0];
    }
  }
  else expected.shift();
  
});
console.log('Errors',err*100/total,'%');
//Errors 0.3253895824760871 %
