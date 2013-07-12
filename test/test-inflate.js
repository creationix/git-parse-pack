var inf = require('../todo/inflate')();
var fs = require('fs');
var data = fs.readFileSync(__dirname + "/test.deflate");
for (var x = 0; x < 10; x++) {
  console.log("Inflating %s/100", x);
  for (var i = 0, l = data.length; i < l; i++) {
    inf.write(data[i]);
    if (i % 0x1000 === 0xfff) inf.flush();
  }
  inf.recycle();
}
console.log("Done");