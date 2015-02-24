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

    function youTubeSearch() {
        var searchText = document.getElementById('searchField').value;
        var maxResults=restore('maxResults',5);
        console.log('Looking up: ' + searchText + " max results:" + maxResults);
        var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y&q=" + searchText+"&maxResults="+maxResults;
        console.log("URL: " + url);
        $.ajax({
                   type: 'GET',
                   url: url,
                   success: youTubeSearchSuccess,
                   dataType:'jsonp',
                   contentType: "application/json"
               });
    }

    function youTubeSearchSuccess( data ){
        console.log("Sucess: " + JSON.stringify(data));
        console.log("Length of items: " + data.items.length);
        var html ="<ul data-role='listview'>";
        for (var i =0;i < data.items.length;i++) {
            var item = data.items[i];
            var videoId = item.id.videoId;
            var title = item.snippet.title;
            var description = item.snippet.description;
            var thumbnailUrl = item.snippet.thumbnails.default.url;
            html += "<div class='listContainer'><div class='imageContainer'><img src='" + thumbnailUrl + "'></div><div class='textContainer'><h3>" + title +  "</h3><p>" + description + "</p></div></div>\n";
            console.log("Video ID: " + videoId);
            kodiAddToPlaylist(videoId);
        }
        html+="</ul>";
        var resultList = document.getElementById('resultList');
        resultList.innerHTML =html;
        console.log(html);
        //   kodiPlay();
    }
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
        var urlString = "http://192.168.1.30:8080/jsonrpc";
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

    if(typeof Storage !== "undefined") {
        console.log("Yes local storage is supported." + restore("maxResults",0));
    } else {
        console.log("NO NO NO. WTF NO STORAGE CAPABILITIES.");
    }
    $(document).ready(function() {
        $('#searchField').keydown(function(event) {
            if (event.keyCode == 13) {
                youTubeSearch();
                return false;
            }
        });
    });
};

function save(name, value) {
    console.log("Saving " + name + " value is: "+ value);
    localStorage.setItem(name,value);
    return false;
}
function restore(name,defaultValue) {
    console.log("Restoring variable " + name + " default value: " + defaultValue);
    var value =  localStorage.getItem(name);
    if (value == 'undefined') {
        console.log("Value not found. Returning default value " + defaultValue);
        value = defaultValue;
        save(name,value);
    }
    return value;
}
