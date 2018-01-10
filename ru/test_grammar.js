'use strict';

var fs = require("fs");
var test = fs.readFileSync("UD_Russian-SynTagRus/ru_syntagrus-ud-train.conllu",'utf8');

var {parse, tokenize, prepare, setMorph} = require('./ud.js');
setMorph(require("msgpack-lite").decode(fs.readFileSync("morph.bin")), JSON.parse(fs.readFileSync("lemmas.json")));

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
    expected = prepare(expected);
    parse(expected);
  }
  if (line.startsWith('#')) return;
  line = line.split('\t');
  if (line[0].indexOf('.')>=0) return;
  if (!expected.length) {
    console.log('not expected', line);
    process.exit(1);
  }
  var ex = expected[0][1];
  var lin = line[1].split('ё').join('е');
  total++;
  if (ex !== lin) {
    err++; //tokenization errors included
    //console.log('expect', lin, 'we have', ex);
    if (ex.startsWith(lin))
      expected[0][1] = ex.slice(lin.length);
    
    else while (lin.startsWith(ex)) {
      lin = lin.slice(ex.length);
      expected.shift();
      ex = expected[0][1];
    }
  }
  else {
    if (parseInt(line[6]) !== parseInt(expected[0][6])) err++;
    expected.shift();
  }
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(''+(err*100/total));

});
console.log('Errors',err*100/total,'%');
//Errors 41.16011558168991 %
