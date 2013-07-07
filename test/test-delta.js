var parse = require('../parse-delta.js');
var bops = require('bops');

var items = [];
var emit = parse(function (item) {
  items.push(item);
});

var sample = require('fs').readFileSync(process.argv[2] || __dirname + "/sample.delta");
emit(sample);
emit();

console.log(items);
