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

    function kodiPlay() {
        console.log("kodiPlay");
        var date = new Date();
        var urlString = "http://192.168.1.30:8080/jsonrpc";
        console.log(date + ' ' + urlString);
        data ={
            jsonrpc:"2.0",
            method: "Player.Open",
            id: 1,
            params: {
                item: {
                    playlistid:1
                }
            }
        };
        $.ajax({
                   type: 'POST',
                   url: urlString,
                   data: JSON.stringify(data),
                   contentType: 'application/json',
                   success: function(data) {},
                   async: false
               });
        return;
    }
    function kodiAddToPlaylist(videoId) {
        console.log("kodiAddToPlaylist");
        var date = new Date();
        var urlString = "http://10.6.1.6:8080/jsonrpc";
        console.log(date + ' ' + urlString);
        data ={
            jsonrpc:"2.0",
            method: "Playlist.Add",
            id: 1,
            params: {
                playlistid:1,
                item: {
                    file:"plugin://plugin.video.youtube/?action=play_video&videoid=" + videoId
                }
            }
        };
        console.log("JSON request: " + JSON.stringify(data));
        $.ajax({
                   type: 'POST',
                   url: urlString,
                   data: JSON.stringify(data),
                   contentType: 'application/json',
                   success: function(data) {},
                   async: false
               });
        if (kodiIsPlaying()) {
            console.log("Kodi is playing");
        } else {
            console.log("Kodi is NOT playing.");
            kodiPlay();
        }

        return;

    }
    function kodiIsPlaying() {
        console.log("kodiIsPlaying");
        var date = new Date();
        var urlString = "http://192.168.1.30:8080/jsonrpc";
        console.log(date + ' ' + urlString);
        data ={
            jsonrpc:"2.0",
            method: "Player.GetActivePlayers",
            id: 1
        };
        console.log("JSON request: " + JSON.stringify(data));
        var playerQuantity =0;
        $.ajax({
                   type: 'POST',
                   url: urlString,
                   data: JSON.stringify(data),
                   contentType: 'application/json',
                   success: function(data) {
                       console.log(JSON.stringify(data));
                       playerQuantity = data.result.length;
                       console.log(playerQuantity + " players");
                   },
                   async: false
               });
        return playerQuantity > 0;
    }

    function mute() {
        console.log("Mute");
        var date = new Date();
        var urlString = "http://192.168.1.30:8080/jsonrpc";
        console.log(date + ' ' + urlString);
        data ={
            jsonrpc:"2.0",
            method: "Application.SetMute",
            id: 1,
            params: {
                mute:"toggle"
            }
        };
        $.ajax({
                   type: 'POST',
                   url: urlString,
                   data: JSON.stringify(data),
                   contentType: 'application/json',
                   success: function(data) {},
                   async: false
               });
        return;
    }



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
