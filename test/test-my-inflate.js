var data = require('fs').readFileSync(__dirname + "/tiny.deflate");
var b = new Buffer(1);

var state = require('../inflate.js')(onByte);

for (var i = 0, l = data.length; i < l && state; i++) {
  console.log(state.name, data[i].toString(2))
  state = state(data[i]);
}

function onByte(byte) {
  b[0] = byte;
  process.stdout.write(b);
}