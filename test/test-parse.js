var parse = require('../.');

var emit = parse(function (err, item) {
  if (err) throw err;
  console.log(item);
});

var sample = require('fs').readFileSync(__dirname + "/sample.pack");
emit(null, sample);