var renderError = function(str) {
  
  var html = '<div class="alert alert-danger" role="alert">';  
  html += '<button type="button" class="close" data-dismiss="alert" aria-label="Close">';
  html += '<span aria-hidden="true">&times;</span>'
  html += '</button>';
  html += str;
  html += '</div>'
  $('#error').html(html);
}

var renderStatus = function(str) {
  
  var html = '<div class="alert alert-warning" role="alert">';  
  html += '<button type="button" class="close" data-dismiss="alert" aria-label="Close">';
  html += '<span aria-hidden="true">&times;</span>'
  html += '</button>';
  html += str;
  html += '<br /><a href="/menu">BACK TO MENU</a>'
  html += '</div>'
  $('#error').html(html);
}

var checkLogin = function() {
  
  var password = $('#password').val();
  var req = {
    url: "/login",
    method: "post",
    data: {
      password:password
    },
    dataType: "json"
  };
  
  $.ajax(req).done(function(msg) {
    if(msg.ok==true) {
      window.location.href="/menu";
    } else {
      renderError("Invalid password");
    }
    

  }).fail(function(msg) {
    renderError("Something went wrong");
  });
  
  return false;
};

var submitDoc = function() {
  console.log("Submitting");
  var doc = $('#doc').serialize();
  console.log(doc);
  var req = {
    url: "/submitdoc",
    method: "post",
    data: $('#doc').serialize(),
    dataType: "json"
  };
  $.ajax(req).done(function(msg) {
    if(msg.ok==true) {
      renderStatus(JSON.stringify(msg))
    } else {
      renderError(msg.error);
    }
  }).fail(function(msg) {
    renderError("Something went wrong");
  });

  return false;
  
}