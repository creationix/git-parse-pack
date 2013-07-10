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
    load: load,
    // save(obj) -> continuable<hash>
    save: save,
    // remove(hash) -> continuable
    remove: remove
  };
  
  function load(hash, callback) {
    if (!callback) return load.bind(this, hash);
    var obj = data[hash];
    if (!obj) return callback();
    callback(null, {
      type: obj.type,
      size: obj.size,
      body: binarySource(obj.body, obj.size)
    });
  }
  
  function save(obj, callback) {
    if (!callback) return save.bind(this, obj);
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
    if (!callback) return remove.bind(this, hash);
    delete data[hash];
    callback();
  }
};
