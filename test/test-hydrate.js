var pushToPull = require('push-to-pull');
var parse = pushToPull(require('../parse.js'));
var hydrate = require('../hydrate.js');
var consume = require('./helpers.js').consume;
var readStream = require('./helpers.js').readStream;
var bops = require('bops');


// Stream is raw pack file as seen on disk
var stream = readStream(process.argv[2] || __dirname + "/sample.pack");

// stream is now flat stream of interpolated headers and bodies
stream = parse(stream, false);

// Stream is now nested streams with fully hydrated bodies.
stream = hydrate(stream, find);

consume(stream, function (item) {
  consume(item.body)(function (err) {
    if (err) throw err;
    console.log(item);
  });
})(function (err) {
  if (err) throw err;
  console.log("END");
});

// consume(hydrate(parse(stream), find), console.log)(function (err) {
//   if (err) throw err;
//   console.log("END");
// });

function find(item, callback) {
  throw new Error("TODO: Implement sample find");
}

