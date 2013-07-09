var test = require('tape');
var applyDelta = require('../apply-delta.js');
var bops = require('bops');
var helpers = require('./helpers.js');

// taken from a `git gc`'d copy of plate
var fixture = {
  delta: "mwKaApA1KGQyNWNhMjVhYWJmOTkzZTg1MjdkN2I4NGFhNjMxODkxZjJlZWVmNDiRXUAFMDY5NTORokouMDY5NTMzIC0wODAwCgphZGQgYXNzZXJ0LmVuZCgpIHRvIHV0aWxzIHRlc3RzCg==",
  base: "dHJlZSA0YWRlOTdjMTgxMjNjNTdhNTBlM2I5OTIzZDA1M2ZkMmRiNGY2MDVmCnBhcmVudCA3N2ZlMTg0OTRiNGI3ZWJmMGVjY2E0ZDBjY2Y4NTA3M2ZiMjFiZGZiCmF1dGhvciBDaHJpcyBEaWNraW5zb24gPGNocmlzdG9waGVyLnMuZGlja2luc29uQGdtYWlsLmNvbT4gMTM1NjY1NDMwMyAtMDgwMApjb21taXR0ZXIgQ2hyaXMgRGlja2luc29uIDxjaHJpc3RvcGhlci5zLmRpY2tpbnNvbkBnbWFpbC5jb20+IDEzNTY2NTQzMDMgLTA4MDAKCmJ1bXAgdmVyc2lvbiBmb3IgY2kudGVzdGxpbmcuY29tCg==",
  out: "dHJlZSA0YWRlOTdjMTgxMjNjNTdhNTBlM2I5OTIzZDA1M2ZkMmRiNGY2MDVmCnBhcmVudCBkMjVjYTI1YWFiZjk5M2U4NTI3ZDdiODRhYTYzMTg5MWYyZWVlZjQ4CmF1dGhvciBDaHJpcyBEaWNraW5zb24gPGNocmlzdG9waGVyLnMuZGlja2luc29uQGdtYWlsLmNvbT4gMTM1NjA2OTUzMyAtMDgwMApjb21taXR0ZXIgQ2hyaXMgRGlja2luc29uIDxjaHJpc3RvcGhlci5zLmRpY2tpbnNvbkBnbWFpbC5jb20+IDEzNTYwNjk1MzMgLTA4MDAKCmFkZCBhc3NlcnQuZW5kKCkgdG8gdXRpbHMgdGVzdHMK"
};

test('test merge delta and source stream to produce new stream', function(assert) {
  
  var delta = arrayToStream([bops.from(fixture.delta, 'base64')]);
  var base = arrayToStream([bops.from(fixture.base, 'base64')]);
  
  applyDelta(delta, base)(function (err, output) {
    if (err) throw err;
    var parts = [];
    helpers.consume(output, function (part) {
      parts.push(part);
    })(function (err) {
      if (err) throw err;
      var result = bops.join(parts);
      assert.equal(output.targetLen, result.length);
      assert.equal(bops.to(result, "base64"), fixture.out);
      assert.end();
    });
  });
  
});

function arrayToStream(array) {
  return {
    read: function (callback) { callback(null, array.shift()); },
    abort: function (callback) { array.length = 0; callback(); }
  };
}