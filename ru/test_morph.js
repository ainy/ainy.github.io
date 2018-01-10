'use strict';

var fs = require("fs");
var msgpack = require("msgpack-lite");
var {lookup, guess2, setMorph} = require('./ud.js');
setMorph(msgpack.decode(fs.readFileSync("morph.bin")));

//console.log(stem['привет']);
console.log(lookup('приветствие'));
//Not found rate:2.31% POS error rate:7.27% tag error rate:20.75% Line number:106.69%of1m

process.stdout.write('\n');
