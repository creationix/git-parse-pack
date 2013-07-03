var filter = require('../.');

var emit = filter(function (err, item) {
  if (err) throw err;
  console.log("ITEM", item);
});

var sample = require('fs').readFileSync(__dirname + "/sample.pack");
emit(null, sample);