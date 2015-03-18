console.log("$$$$$$$$$$$$$$$$ Start app.js");
/**
 * Wait before the DOM has been loaded before initializing the Ubuntu UI layer
 */
window.onload = function () {
    console.log("****** WINDOW ONLOAD *******");
    function addClass(elem, className) {
        elem.className += ' ' + className;
    };

    function removeClass(elem, className) {
        elem.className = elem.className.replace(className, '');
    };


    document.addEventListener("deviceready", function() {
        if (console && console.log) {
            console.log('Platform layer API ready');
        }
        toolbar = UI.toolbar("footer1");
    }, false);

/*
    var UI = new UbuntuUI();
    UI.init();
    console.log(UI + "The ui object %o", UI);
  //  UI.pagestack.push('home');
    console.log("EXTERNAL: " + JSON.stringify(external));
    var api = external.getUnityObject('1.0');
    console.log("API: " + JSON.stringify(api));
    var oa = api.OnlineAccounts;
    console.log("OA: " + JSON.stringify(oa));
    var accountsList = UI.list('#accounts');
    console.log("ACCOUNTS LIST: "  + JSON.stringify(accountsList));
*/


};

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}
function storageSet(name, value) {
  console.log("Saving " + name + " value is: "+ value);
  localStorage.setItem(name,value);
  return false;
}
function storageGet(name,defaultValue) {
  var value =  localStorage.getItem(name);
  if (isBlank(value)) {
    console.log("Value not found. Returning default value " + defaultValue);
    value = defaultValue;
    storageSet(name,value);
  }
  console.log("storageGet variable: " + name + " default value: " + defaultValue + " value: " + value);
  return value;
}
console.log("$$$$$$$$$$$$$$ End of app.js");
