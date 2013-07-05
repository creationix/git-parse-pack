var pushToPull = require('push-to-pull');
var subStream = require('sub-stream');
var bops = require('bops');
var parse = pushToPull(require('./parse.js'));

module.exports = function (stream) {
  return subStream(stream, isHead, "body");
};

function isHead(item) {
  return !bops.is(item);
};

