var request = require('request');
var unfluff = require('unfluff');

var url = function(u, callback) {
  request(u, function (error, response, body) {
    try {
      var data = unfluff(body);
      var doc={}
      doc.full_name = data.title;
      doc.body = data.text;
      callback(null,doc);

    } catch(e) {
      callback(true,null);
    }
  });
}

module.exports = {
  url: url
};