//document.addEventListener("DOMContentLoaded", function() {
    try {
        document.getElementById('ageverify').addEventListener('click', function () {
          //alert("HI");
            //document.querySelector('.showFraspy').style.display = 'block';
            document.getElementById('modal-background-first').style.display = 'block';
            document.getElementById('modal-content-first').style.display = 'block';
        });

        document.getElementById('fraspyModalHide').addEventListener('click', function () {
            document.getElementById('modal-background-first').style.display = 'none';
            document.getElementById('modal-content-first').style.display = 'none';
        });
    } catch (e) {}
//});


console.log('Test: '+window.location.pathname.indexOf('account'));
if (
    window.location.pathname.indexOf('account/register') >= 1 ||
	window.location.pathname.indexOf('account/login') >= 1
) {
  setCookieTlpxx("fraspy_success_account", "", 0);
}

var $fraspy_success_account = getCookieTlpxx('fraspy_success_account');
if (
	window.location.pathname.indexOf('account') < 1 && $fraspy_success_account != 1
) {
  //setCookieTlpxx("fraspy_return_url", "", 0);  
}

var $fraspy_success_account = getCookieTlpxx('fraspy_success_account');
var fraspy_return_url = getCookieTlpxx("fraspy_return_url");
if (customerIsLoggedIn && fraspy_return_url == '/checkout' && getCookieTlpxx("fraspy_login_clicked") == '') {
  console.log('WEITERLEITUNG AUF CHECKOUT 1!!!');
  setCookieTlpxx("first_name", "", 0);
  setCookieTlpxx("last_name", "", 0);
  setCookieTlpxx("note_street", "", 0);
  setCookieTlpxx("note_zipcode", "", 0);
  setCookieTlpxx("note_city", "", 0);
  setCookieTlpxx("note_country", "", 0);
  setCookieTlpxx("note_birthday", "", 0);
  setCookieTlpxx("emailname", "", 0);

  if ($fraspy_success_account == 1) {
    setCookieTlpxx("fraspy_return_url", "", 0);
    setCookieTlpxx("fraspy_login_clicked", "1", 0);
    setCookieTlpxx("fraspyVerified", "", 0);
    self.location.href = fraspy_return_url;  
  } 
} else if (getCookieTlpxx("fraspy_login_clicked") == 1 && fraspy_return_url == '/checkout') {

  if ($fraspy_success_account == 1) {
    console.log('WEITERLEITUNG AUF CHECKOUT MIT LOGIN 2!!!');
    setCookieTlpxx("fraspy_return_url", "", 0);
    setCookieTlpxx("fraspy_login_clicked", "2", 0);
    setCookieTlpxx("fraspyVerified", "", 0);
    self.location.href = fraspy_return_url;  
  }
} else if (getCookieTlpxx("fraspy_login_clicked") == 1 && fraspy_return_url == '/account') {

    console.log('WEITERLEITUNG AUF ACCOUNT MIT LOGIN 3!!!');
    setCookieTlpxx("fraspy_return_url", "", 0);
    setCookieTlpxx("fraspy_login_clicked", "3", 0);
    setCookieTlpxx("fraspyVerified", "", 0);
    self.location.href = fraspy_return_url;  
}

function setCookieTlpxx(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookieTlpxx(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
