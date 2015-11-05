// get Cloudant credentials
var services = process.env.VCAP_SERVICES
if (!services) {
  throw("Could not find a VCAP_SERVICES environment variable");
}
var opts = null;

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
    throw("Could not find an attached cloudantNoSQLDB service called 'devcenter-cloudant'")
  }  
  opts = service.credentials;
  opts.account = opts.username;
//  console.log(opts);
} 

var cloudant = require('cloudant')(opts);

module.exports = cloudant;