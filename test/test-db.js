var db = require('./db.js')();
var bops = require('bops');
var binarySource = require('simple-stream-helpers/binary-source.js');
var consume = require('simple-stream-helpers/consume.js');

// Test the test db.
var data = bops.create("Hello World\n");
db.save({
  type: "blob",
  size: data.length,
  body: binarySource(data)
})(function (err, hash) {
  if (err) throw err;
  console.log(hash);
  db.load(hash)(function (err, obj) {
  if (err) throw err;
    console.log(obj);
    consume(obj.body)(function (err, items) {
      if (err) throw err;
      console.log(items);
    });
  });
});