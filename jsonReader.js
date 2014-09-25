module.exports = function (dragonName, callback) {


  var fs = require('fs');

  function readJSON(filePath, callback) {
    fs.readFile(filePath, function(err, data) {
      var parsedJson;

      // Always check for err first, and always use return
      if (err) {
         return callback(err);
      }

      // Parse JSON.  Parsing is a sync process so use try/catch to capture parser errors
      // Try / Catch only works on sync codeblocks
      try {
        parsedJson = JSON.parse(data);
      } catch (exception) {
        return callback(exception);
      }

      // Everything is ok, but always expose an error-first callback interface
      // Always return the callback
      return callback(null, parsedJson);
    });
  }

  readJSON('./package.json', function (err, pkg) { ... }


}
