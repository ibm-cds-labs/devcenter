var opts = null;

// if there's a CLOUDANT_HOST then use it
if (process.env.CLOUDANT_HOST) {
  opts = {url: process.env.CLOUDANT_HOST};
} else {

  // get Cloudant credentials
  var services = process.env.VCAP_SERVICES
  if (!services) {
    throw("Could not find a VCAP_SERVICES environment variable");
  }


  // parse BlueMix config
  if (typeof services != 'undefined') {
    services = JSON.parse(services);
    var service = null;
    if (!services || !services.cloudantNoSQLDB) {
      throw("Could not find any attached cloudantNoSQLDB services")
    }
    for (var i in services.cloudantNoSQLDB) {
      if (services.cloudantNoSQLDB[i].name == "devcenter-cloudant") {
        service = services.cloudantNoSQLDB[i];
      } 
    }
    
    if (service == null) {
      service = services.cloudantNoSQLDB[0];
      console.log("Could not find an attached cloudantNoSQLDB service called 'devcenter-cloudant' so using the first one in the list.")
    }  
    
    opts = service.credentials;
    opts.account = opts.username;
    console.log("Using Cloudant service",opts.host);
  } 

}

var cloudant = require('cloudant')(opts);

module.exports = cloudant;