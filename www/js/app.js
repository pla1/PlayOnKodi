/**
 * Wait before the DOM has been loaded before initializing the Ubuntu UI layer
 */
window.onload = function () {
    function addClass(elem, className) {
        elem.className += ' ' + className;
    };

    function removeClass(elem, className) {
        elem.className = elem.className.replace(className, '');
    };

    var UI = new UbuntuUI();
    UI.init();

    document.addEventListener("deviceready", function() {
        if (console && console.log) {
            console.log('Platform layer API ready');
        }
        toolbar = UI.toolbar("footer1");
    }, false);





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
