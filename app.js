/*jshint node:true*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as it's web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

var cloudant = require('./lib/db.js');
var db = cloudant.db.use('devcenter');

// moment
var moment = require('moment');

// spider 
var spider = require('./lib/spider.js');

// body parsing
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

// sessions please
var session = require('express-session');
app.use(session({
  secret: 'devcenter'
}));

var schema = require('./lib/schema.js');

// automatically create meta data for a URL
var autoMeta = function(doc, callback) {
  
  // process the document text
  var str = [doc.name,doc.full_name, doc.description, doc.body].join(" ");
  str = str.replace(/\W+/g,' ');
  var words = str.split(' ');
  
  // grab existing values
  
  schema.load(function(err, s) {
    for(var i in s) {
      if (i != "_id" && i != "_rev") {
        var item = s[i];
        if(item.type == "arrayofstrings" && item.values && item.values.length >0) {
          for (var j in item.values) {
            var word = item.values[j];
            if(words.indexOf(word) > -1 && doc[i].indexOf(word)==-1) {
              doc[i].push(word)
            }
          }
        }
      }
    }

    callback(err, doc);
    
  });
};

// use the jade templating engine
app.set('view engine', 'jade');

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

var crypto = require('crypto');

var genhash = function(str) {
  var shasum = crypto.createHash('sha1');
  shasum.update(str);
  return shasum.digest('hex');
};


app.get('/', function(req,res) {
  if(req.session.loggedin) {
    res.redirect("/menu");
  } else {
    res.render('home', { });
  }

});

app.post('/login', function(req,res) {
  if(req.body.password == process.env.PASSWORD) {
    req.session.loggedin=true;
    res.send({"ok":true});
  } else {
    res.send({"ok":false});
  }
});

app.get('/menu', function(req,res) {
  if (req.session.loggedin) {
    db.view("search","bystatus", { reduce: false}, function(err,data) {
      res.render("menu", {session:req.session, docs: data});
    });
  } else {
    res.redirect("/");
  }
});

app.get('/doc', function(req,res) {
  if (req.session.loggedin) {
    schema.newDocument(function(err,d) {
      var fixedfields = require('./lib/fixedfields.js');
      schema.load(function(err, s) {
        res.render("doc", {session:req.session, doc:doc, fixedfields: fixedfields, schema: s});
      });
    });
  } else {
    res.redirect("/");
  }
});

app.get('/schema', function(req, res) {
  if (req.session.loggedin) {
    schema.load(function(err, s) {
      res.render("schema", {session:req.session, schema: s});
    });
  } else {
    res.redirect("/");
  }
});

app.post('/schema', function(req, res) {
  try {
    var parsed = JSON.parse(req.body.schema);
  } catch (e) {
    return res.send({ok: false, err: "Invalid JSON"});
  }
  schema.saveAndGenerate(parsed, function(err, data) {
    res.send(data);
  });
});

app.get('/doc/:id', function(req,res) {
  if (req.session.loggedin) {
   
    var id = req.params.id;
    var fixedfields = require('./lib/fixedfields.js');
    schema.load(function(err, s) {
      db.get(id, function(err, data) {
        if(err) {
          return res.status(404);
        }
        data.githuburl = (data.githuburl || "");
        data.videourl = (data.videourl || "");
        data.demourl = (data.demourl || "");
        data.documentationurl = (data.documentationurl || "");
        data.otherurl = (data.otherurl || "");
        data.namespace = (data.namespace || []);
        res.render("doc", {session:req.session, doc:data, fixedfields: fixedfields, schema: s});
      });
    });

    
  } else {
    res.redirect("/");
  }
});

var split = function(str) {
  if(!str || str.length==0) {
    return [];
  }
  var s = str.split(",");
  for(var i in s) {
    s[i] = s[i].replace(/^ +/,"").replace(/ +$/,"");
  }
  return s;
}

var now = function() {
  return moment().format("YYYY-MM-DD HH:mm:ss Z");
}

var submitProvisional = function(url, callback) {
  var u = require('url');
  var parsed = u.parse(url);
  if(!parsed.hostname || !parsed.protocol) {
    return callback("Invalid URL", null);
  }
  schema.newDocument(function(err, d) {
    var doc = d;
    delete doc._rev;
    doc.url = url;
    doc._id =  genhash(doc.url);
    spider.url(doc.url, function(err, data) {
      doc.body="";
      doc.full_name="";
      doc.updated_at = now();
      doc.created_at = now();
      if (!err) {
        doc.body=data.body;
        doc.name = doc.full_name= data.full_name
      }
      autoMeta(doc, function(err, data) {
        if(!err) {
          doc = data;
        }
        db.insert(doc, function(err, data){
          console.log(err,data);
          callback(err,data);
        })
      });
    }); 
  });
};

app.post('/submitprovisional', function(req,res) {
  submitProvisional(req.body.url, function(err,data) {
    res.send({"ok":(err==null), "error": err, "reply": data});
  });
});

app.post('/submitdoc', function(req,res) {

  
  if (req.session.loggedin) {
    
    schema.load(function(err, s) {
    
      var doc = req.body;
    
      if(!doc._id || doc._id.length==0) {
        doc._id =  genhash(doc.url);
        delete doc._rev;
      }
    
      for(var i in s) {
        var item = s[i];
        if (typeof item == "object" && item.type == "arrayofstrings") {
          doc[i] = split(doc[i]);
        }
      }
    

      if(!doc.created_at || doc.created_at.length==0) {
        doc.created_at = now();
      }
      
      if(doc.body.length==0) {
        spider.url(doc.url, function(err, data) {
          doc.body="";
          doc.full_name="";
          if(!err) {
            doc.body=data.body;
            doc.full_name= data.full_name
          }
          db.insert(doc, function(err, data){
            res.send({"ok":(err==null), "error": err, "reply": data});
          })
        }); 
      } else {
        db.insert(doc, function(err, data){
          res.send({"ok":(err==null), "error": err, "reply": data});
        });
      }
    
    });
    
  
  } else {
    res.redirect("/");
  }
});

app.get('/logout', function(req,res) {
  req.session.loggedin=false;
  res.redirect("/");
});

app.post('/slack', function(req,res) {
  if(req.body.token && req.body.token == process.env.SLACK_TOKEN) {
    var url = req.body.text;
    if (typeof url == "string" && url.length>0) {
      submitProvisional(url, function(err,data) {
        if (err) {
          res.send("There was an error :( " + err);
        } else {
          res.send("Thanks for submitting " + url + ". The URL will be published after it is reviewed by a human. " + 
                     "https://devcenter.mybluemix.net/doc/"+data.id);
        }
      });
    } else {
      res.send("Syntax: /devcenter <url>   e.g. /devcenter http://mysite.com/");
    }
  } else {
    res.send("Invalid request.");   
  }
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
