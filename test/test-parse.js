var parse = require('../parse.js');
var bops = require('bops');

var i = 0;
var version;
var num;
var count = 0;
var done;
var emit = parse(function (item) {
  if (i++ === 0) {
    version = item.version;
    num = item.num;
  }
  else if (item === undefined) {
    done = true;
  }
  else if (!bops.is(item)) {
    count++;
  }
});

var sample = require('fs').readFileSync(process.argv[2] || __dirname + "/sample.pack");
emit(sample);
emit();

console.log({
  version: version,
  num: num,
  count: count,
  done: done
});

if (num !== count) throw new Error("Count mismatch " + num + " != " + count);
if (!done) throw new Error("Missing stream end");
