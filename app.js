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
var dw = cloudant.db.use('dw');

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
}))

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
    dw.list({include_docs:true},function(err,data) {
      res.render("menu", {session:req.session, docs: data});
    });
  } else {
    res.redirect("/");
  }
});

app.get('/doc', function(req,res) {
  if (req.session.loggedin) {
    var template =  {  
       "_id": "",
       "_rev": "",
       "name":"",
       "full_name":"",
       "url":"",
       "created_at":"",
       "updated_at":"",
       "languages":[  
       ],
       "technologies":[  
       ],
       "friendly_name":"",
       "description":"",
       "topic":[  
       ],
       "featured":false,
       "body": "",
       "related": [],
       "imageurl":""
    };
    res.render("doc", {session:req.session, doc:template});
  } else {
    res.redirect("/");
  }
});

app.get('/doc/:id', function(req,res) {
  if (req.session.loggedin) {
   
    var id = req.params.id;
    dw.get(id, function(err, data) {
      res.render("doc", {session:req.session, doc:data});
    });
    
  } else {
    res.redirect("/");
  }
});

var split = function(str) {
  if(str.length==0) {
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

app.post('/submitdoc', function(req,res) {
  if (req.session.loggedin) {
    
    var doc = req.body;
    
    if(!doc._id || doc._id.length==0) {
      doc._id =  genhash(doc.url);
      delete doc._rev;
    }
    doc.languages = split(doc.languages);
    doc.technologies = split(doc.technologies);
    doc.topic = split(doc.topic);
    doc.related = split(doc.related);
    doc.featured = false;
    doc.updated_at = now();
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
        dw.insert(doc, function(err, data){
          res.send({"ok":(err==null), "error": err, "reply": data});
        })
      }); 
    } else {
      dw.insert(doc, function(err, data){
        res.send({"ok":(err==null), "error": err, "reply": data});
      });
    }
    
  } else {
    res.redirect("/");
  }
});

app.get('/logout', function(req,res) {
  req.session.loggedin=false;
  res.redirect("/");
})

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
