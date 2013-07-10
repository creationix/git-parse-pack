var each = require('simple-stream-helpers/each.js');
var binarySource = require('simple-stream-helpers/binary-source.js');
var sha1 = require('sha1-digest');
var bops = require('bops');


module.exports = function () {
  
  // Store all objects in memory.
  var data = {};

  // Git objects have the following required fields
  //   type: string
  //   size: integer
  //   body: stream<binary>

  return {
    // load(hash) -> continuable<obj>
    load: c1(load),
    // save(obj) -> continuable<hash>
    save: c1(save),
    // remove(hash) -> continuable
    remove: c1(remove)
  };
  
  function load(hash, callback) {
    var obj = data[hash];
    if (!obj) return callback();
    callback(null, {
      type: obj.type,
      size: obj.size,
      body: binarySource(obj.body)
    });
  }
  
  function save(obj, callback) {
    var items = [];
    var sha1sum = sha1();
    sha1sum.update(obj.type + " " + obj.size + "\0");
    each(obj.body, onItem)(onDone);
    
    function onItem(item) {
      sha1sum.update(item);
      items.push(item);
    }
    
    function onDone(err) {
      if (err) return callback(err);
      var hash = sha1sum.digest();
      data[hash] = {
        type: obj.type,
        size: obj.size,
        body: bops.join(items)
      };
      callback(null, hash);
    }
  }
  
  function remove(hash, callback) {
    delete data[hash];
    callback();
  }
};

// Make a callback based function also work as a continuable based function
function c1(fn) {
  return function (arg, callback) {
    if (callback) return fn(arg, callback);
    return function (callback) {
      return fn(arg, callback);
    };
  };
}