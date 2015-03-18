var pokApp = angular
.module('pokModule', [])
.constant("CONSTANTS", {
              getAllPlaylistItems:80,
              YouTube_API_KEY:"AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y",
              YouTube_REDIRECT_URI:"urn:ietf:wg:oauth:2.0:oob",
              YouTube_CLIENT_SECRET:"VTnAl8NEs9cePL9Yupi1VgE0",
              YouTube_CLIENT_ID:"856913298158-9gganedb2g4enp5dbf73mnfem2agea8a.apps.googleusercontent.com"
          }
          );

pokApp.factory('webSocketService', function($rootScope) {
    console.log("webSocketService");
    var Chat = {};
    Chat.socket = null;
    Chat.connect = (function(host) {
        console.log("Chat.connect");
        if ('WebSocket' in window) {
            Chat.socket = new ReconnectingWebSocket(host);
        } else {
            console.log('Error: WebSocket is not supported by this browser.');
            return;
        }
        
    });
    Chat.initialize = function() {
        console.log("webSocketService Chat.initialize");
        var device = getActiveDevice();
        if (device == null) {
            console.log("Device is null. Exiting Chat.initialize function.");
            return;
        }
        var url = 'ws://' + device.name + ':' + device.port;
        console.log("WebSocket URL: " + url);
        Chat.connect(url);
        console.log("Chat initialized " + JSON.stringify(Chat));
    };
    Chat.sendMessage = (function() {
        
    });
    return Chat;
});

pokApp.config(function($httpProvider) {
    
    $httpProvider.interceptors.push(function($q, $rootScope) {
        return {
            'request' : function(config) {
                $rootScope.$broadcast('loading-started');
                return config || $q.when(config);
            },
            'response' : function(response) {
                $rootScope.$broadcast('loading-complete');
                return response || $q.when(response);
            }
        };
    });
    
});

pokApp.directive("loadingIndicator", function() {
    return {
        restrict : "A",
        template : "<div>Loading...</div>",
        link : function(scope, element, attrs) {
            scope.$on("loading-started", function(e) {
                element.css({ "display" : "" });
            });
            
            scope.$on("loading-complete", function(e) {
                element.css({ "display" : "none" });
            });
        }
    };
});

pokApp.controller('PokController', [ '$scope', '$http', 'webSocketService', 'CONSTANTS', function($scope, $http, webSocketService, CONSTANTS) {
    //  localStorage.removeItem("devices");
    var JSON_ID = 1;
    $scope.googleUserCode="";
    $scope.googleDeviceCode="";
    $scope.googleAccessToken="";
    $scope.showSettings = false;
    $scope.maxResults = storageGet("maxResults", 5);
    $scope.ytOrder = storageGet("ytOrder", "date");
    $scope.ytSafeSearch = storageGet("ytSafeSearch", "moderate");
    $scope.pictureSlideshowAsBackground = storageGet("pictureSlideshowAsBackground", "yes");
    $scope.fanartAsBackground = storageGet("fanartAsBackground", "yes");
    $scope.transparentButtons = storageGet("transparentButtons", "yes");
    toggleTransparentButtons("yes" == $scope.transparentButtons);
    $scope.devices = JSON.parse(localStorage.getItem("devices"));
    $scope.notOnQueue = "notOnQueue";
    $scope.muteButtonText="Mute";
    $scope.playing = false;
    $scope.volumeObject = {
        level : 50
    };
    $scope.userAgent = navigator.userAgent;
    console.log("Devices: " + JSON.stringify($scope.devices));
    if (typeof $scope.devices == "undefined" || isBlank($scope.devices)) {
        console.log("Devices is blank.");
        $scope.devices = [];
        localStorage.setItem("devices", JSON.stringify($scope.devices));
        var msg = "No Kodi devices defined. Please add a device and restart this app.";
        $scope.messageLabel = msg;
        $scope.settingsMessage = msg;
        $scope.showSettings="yes";
    }
    if ($scope.devices.length > 0) {
        webSocketService.initialize();
        webSocketService.socket.onmessage = function(message) {
            var jsonObject = JSON.parse(message.data);
            console.log("WebSocket message received: " + message.data);
            console.log("Has property result: " + jsonObject.hasOwnProperty("result") + JSON.stringify(jsonObject));
            if (jsonObject.hasOwnProperty("result")) {
                if(jsonObject.result.hasOwnProperty("volume")) {
                    $scope.volumeObject.level = jsonObject.result.volume;
                    console.log("Setting volume to:" + $scope.volumeObject.level);
                }
            }
            //    if (!jsonObject.hasOwnProperty("method")) {
            //      return;
            //    }
            var methodName = jsonObject.method;
            if (jsonObject.id == CONSTANTS.getAllPlaylistItems) {
                for (var i = 0;i < jsonObject.result.length; i++) {
                    kodiSend("Playlist.GetItems",{playlistid:jsonObject.result[i].playlistid},CONSTANTS.getAllPlaylistItems + jsonObject.result[i].playlistid + 1);
                }
            }
            if (methodName == "Player.OnStop") {
                $scope.playing = false;
            }

            if (methodName == "Application.OnVolumeChanged") {
                $scope.volumeObject.level = jsonObject.params.data.volume.toFixed(0);
                if (jsonObject.params.data.muted) {
                    $scope.muteButtonText="Unmute";
                } else {
                    $scope.muteButtonText="Mute";
                }
                $scope.messageLabel = "Volume: " + $scope.volumeObject.level + " muted: " + jsonObject.params.data.muted;
            }
            if (methodName == "Player.OnPlay") {
                $scope.playing = true;
                var type = jsonObject.params.data.item.type;
                if (type == "movie") {
                    $scope.backgroundImageUrl="";
                    $scope.album="";
                    $scope.artist="";
                    $scope.title = jsonObject.params.data.item.title;
                }
                
                if (type == "song") {
                    var id = jsonObject.params.data.item.id;
                    console.log("Player.OnPlay id: " + id + " type: " + type);
                    var data = {
                        jsonrpc : "2.0",
                        method : "AudioLibrary.GetSongDetails",
                        id : 1,
                        params : {
                            songid : id,
                            properties: ["title", "album", "artist", "duration", "thumbnail", "file", "fanart"]
                        }
                    }
                    webSocketService.socket.send(JSON.stringify(data));
                }
                if (type == "picture" && $scope.pictureSlideshowAsBackground == "yes") {
                    $scope.backgroundImageUrl = jsonObject.params.data.item.file;
                }
            }
            var fanartRegEx = /^image:\/\/(.*)\/$/;
            if (jsonObject.hasOwnProperty("result")) {
                var result = jsonObject.result;
                if (result.hasOwnProperty("item")) {
                    var item = jsonObject.result.item;
                    if (item.hasOwnProperty("fanart")) {
                        console.log("Has fanart.");
                        var type = jsonObject.result.item.type;
                        $scope.backgroundImageUrl="";
                        $scope.album="";
                        $scope.title="";
                        $scope.artist="";
                        if (type == "song") {
                            $scope.album = jsonObject.result.item.album;
                            $scope.title = jsonObject.result.item.title;
                            $scope.artist = jsonObject.result.item.artist[0];
                            var fanart = jsonObject.result.item.fanart;
                            fanart = decodeURIComponent(fanart);
                            if (fanartRegEx.test(fanart) && $scope.fanartAsBackground == "yes"){
                                fanart = fanartRegEx.exec(fanart)[1];
                                console.log("********** FANART: " + fanart);
                                $scope.backgroundImageUrl = fanart;
                            }
                        }
                        if (type == "unknown") {
                            var title = jsonObject.result.item.title;
                            console.log("Type is unknown. Most likely a YouTube video. Setting title to: " + title);
                            $scope.title = title;
                        }
                    }
                }
            }
            if (jsonObject.hasOwnProperty("result")) {
                var result = jsonObject.result;
                if (result.hasOwnProperty("songdetails")) {
                    var songdetails = jsonObject.result.songdetails;
                    if (songdetails.hasOwnProperty("fanart")) {
                        $scope.album = jsonObject.result.songdetails.album;
                        $scope.title = jsonObject.result.songdetails.title;
                        $scope.artist = jsonObject.result.songdetails.artist[0];
                        $scope.backgroundImageUrl="";
                        var fanart = jsonObject.result.songdetails.fanart;
                        fanart = decodeURIComponent(fanart);
                        if (fanartRegEx.test(fanart) && $scope.fanartAsBackground == "yes"){
                            fanart = fanartRegEx.exec(fanart)[1];
                            console.log("********** FANART: " + fanart);
                            $scope.backgroundImageUrl = fanart;
                        } else {
                            console.log("CLEAR FANART IN SCOPE");
                            $scope.backgroundImageUrl="";
                        }
                    }
                }
            }
            if (methodName == "Playlist.OnAdd") {
                var position = jsonObject.params.data.position;
                console.log("******** Playlist.OnAdd position: " + position);
            }
            
            $scope.$apply();
        };
        
        
        
        webSocketService.socket.onopen = function() {
            console.log('Info: WebSocket connection opened.');
            $scope.messageLabel = "WebSocket connection opened.";
            console.log($scope.messageLabel);
            $scope.kodiGetVolume();
            $scope.kodiGetActivePlayers();
            $scope.kodiGetItemAll();
            $scope.$apply();
        };
        webSocketService.socket.onclose = function() {
            console.log('Info: WebSocket closed.');
            $scope.messageLabel = "WebSocket closed. Will retry.";
            console.log($scope.messageLabel);
            $scope.$apply();
        };
    }

    $scope.searchYouTube = function() {
        console.log('Looking up: ' + $scope.searchField + " max results:" + $scope.maxResults);
        document.getElementById("searchFieldId").blur();
        var url = "https://www.googleapis.com/youtube/v3/search";
        var httpConfig = {
            method : "GET",
            params : {
                part : "snippet",
                type : "video",
                key : CONSTANTS.YouTube_API_KEY,
                q : $scope.searchField,
                maxResults : $scope.maxResults,
                safeSearch : $scope.ytSafeSearch,
                order : $scope.ytOrder
            }
        }
        console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
        $http.get(url, httpConfig).success(function(data) {
            $scope.items = data.items;
            for (var i = 0; i < $scope.items.length; i++) {
                $scope.items[i].age = moment($scope.items[i].snippet.publishedAt).fromNow();
                $scope.items[i].kodiStatus = $scope.notOnQueue;
            }
        });
    }
    $scope.authYouTube = function() {

        console.log("************ AUTHORIZATION OAUTH DANCE *********** ")


        var url = "https://accounts.google.com/o/oauth2/device/code?client_id=" + CONSTANTS.YouTube_CLIENT_ID + "&scope=https://www.googleapis.com/auth/youtube";
        var httpConfig = {
            method : "POST",
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }
        console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
        $http.post(url, httpConfig).success(function(data) {
            console.log("YouTube Auth response");
            var youtubeResponseElement = document.getElementById("youtubeResponse");
            console.log(JSON.stringify(data));
            storageSet("googleDeviceResponseData", data);
            $scope.googleUserCode = data.user_code;
            $scope.googleDeviceCode = data.device_code;
            setInterval($scope.pollGoogleAuthServer, data.interval * 1000);
        });

    }
    $scope.pollGoogleAuthServer = function() {
        console.log("************ POLL GOOGLE AUTHORIZATION SERVER *********** ")

        var url = "https://accounts.google.com/o/oauth2/token";

        $http({
                  method: 'POST',
                  url: url,
                  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                  transformRequest: function(obj) {
                      var str = [];
                      for(var p in obj)
                          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                      return str.join("&");
                  },
                  data: {grant_type: "http://oauth.net/grant_type/device/1.0", client_id: CONSTANTS.YouTube_CLIENT_ID, client_secret:CONSTANTS.YouTube_CLIENT_SECRET, code:$scope.googleDeviceCode}
              }).success(function () {
                  console.log("Google Auth Server Poll Response");
                  console.log(JSON.stringify(data));
                  storageSet("googleAccessTokenData", data);
                  $scope.googleAccessToken = data.access_token;
              });






    }

    $scope.listSubscriptionsYouTube = function() {
        console.log('List subscriptions YouTube.');





        var url = "https://www.googleapis.com/youtube/v3/subscriptions";
        var httpConfig = {
            method : "GET",
            params : {
                part : "snippet",
                mine : true,
                key : CONSTANTS.YouTube_API_KEY,
                maxResults : $scope.maxResults,
                order : "relevance"
            }
        }
        console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
        $http.get(url, httpConfig).success(function(data) {
            $scope.items = data.items;
            for (var i = 0; i < $scope.items.length; i++) {
                $scope.items[i].age = moment($scope.items[i].snippet.publishedAt).fromNow();
                $scope.items[i].kodiStatus = $scope.notOnQueue;
            }
        });
    }

    $scope.kodiAddToPlaylist = function(item) {
        item.kodiStatus = "addedToQueue";
        if (!$scope.playing) {
            kodiSend("Playlist.Clear",{ playlistid : 0 });
        }
        kodiSend("Playlist.Add",{ playlistid : 0, item : { file : "plugin://plugin.video.youtube/?action=play_video&videoid=" + item.id.videoId }});
        if (!$scope.playing) {
            kodiSend("Player.Open",{ item : { playlistid : 0 }});
        }
    }
    $scope.kodiClearPlaylist = function() {
        kodiSend("Playlist.Clear",{ playlistid : 0 });
    }
    $scope.kodiGetActivePlayers = function() {
        kodiSend("Player.GetActivePlayers");
    }
    
    $scope.kodiPlay = function() {
        kodiSend("Player.Open",{ item : { playlistid : 0 }});
    }
    $scope.kodiPlay = function(playlistid) {
        kodiSend("Player.Open",{ item : { playlistid : playlistid }});
    }
    $scope.kodiGetItemAll = function() {
        for (i =0;i<3;i++) {
            kodiSend("Player.GetItem",{ playerid : i, properties: ["title", "album", "artist", "duration", "thumbnail", "file", "fanart", "streamdetails"]});
        }
    }
    
    $scope.kodiVolume = function() {
        kodiSend("Application.SetVolume",{ volume : parseInt($scope.volumeObject.level) });
    }
    
    $scope.kodiGetVolume = function() {
        kodiSend("Application.GetProperties",{ properties : [ 'volume' ] });
    }
    
    $scope.kodiPlayPause = function(playerId) {
        kodiSend("Player.PlayPause",{ playerid : playerId });
    }
    $scope.kodiPlayPauseAll = function() {
        console.log("Kodi play / pause all players");
        for (i = 0; i < 3;i++) {
            $scope.kodiPlayPause(i);
        }
    }
    
    $scope.kodiStop = function(playerId) {
        kodiSend("Player.Stop",{ playerid : playerId });
    }
    
    $scope.kodiStopAll = function() {
        console.log("Kodi stop all players");
        for (i = 0; i < 3;i++) {
            $scope.kodiStop(i);
        }
    }
    
    $scope.kodiMusicParty = function() {
        kodiSend("Player.Open",{ item : { partymode : "music" }});
        setTimeout($scope.kodiHome, 4000);
        setTimeout($scope.kodiBack, 5000);
        setTimeout($scope.kodi500px(),6000);
    }
    
    $scope.kodiPlayNext = function(playerId) {
        kodiSend("Player.Goto",{ playerid : playerId, to : "next" });
    }
    
    $scope.kodiPlayNextAll = function() {
        for (i = 0; i < 3;i++) {
            $scope.kodiPlayNext(i);
        }
    }
    
    $scope.kodiClearPlaylist = function(playListId) {
        kodiSend("Playlist.Clear",{playlistid : playListId});
    }
    $scope.kodiGetPlaylists = function() {
        kodiSend("Playlist.GetPlaylists");
    }
    
    $scope.kodiClearPlaylistAll = function() {
        console.log("Kodi clear all playlists");
        for (i = 0; i < 3;i++) {
            $scope.kodiClearPlaylist(i);
        }
    }
    
    
    $scope.kodiShutdown = function() {
        kodiSend("System.Shutdown");
    }
    $scope.kodi500px = function() {
        kodiSend("Addons.ExecuteAddon", { addonid:"plugin.image.500px", params:"?mode=feature&feature=editors&category=Uncategorized" });
        kodiSend("Playlist.GetPlaylists",undefined,CONSTANTS.getAllPlaylistItems);
    }
    $scope.kodiBack = function() {
        kodiSend("Input.Back");
    }
    $scope.kodiHome = function() {
        kodiSend("Input.Home");
    }
    $scope.kodiMute = function() {
        kodiSend("Application.SetMute", {mute:'toggle'});
    }
    
    function kodiSend(method, params, id) {
        if (typeof id == 'undefined') {
            id = JSON_ID++;
        }
        
        var data = {
            jsonrpc : "2.0",
            method : method,
            id : id,
            params : params
        };
        console.log("kodiSend: " + JSON.stringify(data) );
        webSocketService.socket.send(JSON.stringify(data));
    }
    
    $scope.saveSettings = function() {
        console.log("saveSettings");
        storageSet("ytOrder", $scope.ytOrder);
        storageSet("maxResults", $scope.maxResults);
        storageSet("ytSafeSearch", $scope.ytSafeSearch);
        storageSet("fanartAsBackground", $scope.fanartAsBackground);
        storageSet("pictureSlideshowAsBackground", $scope.pictureSlideshowAsBackground);
        storageSet("transparentButtons", $scope.transparentButtons);
        toggleTransparentButtons("yes" == $scope.transparentButtons);
    }
    $scope.deselectOtherDevices = function(device) {
        console.log("Deselecting " + $scope.devices.length + " devices.");
        for (i = 0; i < $scope.devices.length; i++) {
            if (device.id != $scope.devices[i].id) {
                $scope.devices[i].active = false;
            }
        }
    }
    $scope.getActiveDevice = function() {
        for (i = 0; i < $scope.devices.length; i++) {
            if ($scope.devices[i].active) {
                console.log("getActiveDevice: " + JSON.stringify($scope.devices[i]));
                return $scope.devices[i];
            }
        }
        if ($scope.devices.length > 0) {
            console.log("getActiveDevice return the first one since none were active: " + JSON.stringify($scope.devices[0]));
            return $scope.devices[0];
        }
        return null;
    }
    $scope.deviceToggle = function(device) {
        console.log(JSON.stringify(device) + " active: " + device.active);
        if (device.active) {
            $scope.deselectOtherDevices(device);
        }
        $scope.saveDevice(device);
    }
    $scope.deleteDevice = function(device) {
        console.log("Delete device: " + JSON.stringify(device) + " device quantity: " + $scope.devices.length);
        for ( var i in $scope.devices) {
            if (device.id == $scope.devices[i].id) {
                $scope.devices.splice(i, 1);
            }
            if (device.active) {
                if ($scope.devices.length > 0) {
                    $scope.devices[0].active = true;
                }
            }
        }
        localStorage.setItem("devices", JSON.stringify($scope.devices));
    }
    
    $scope.saveDevice = function(device) {
        console.log("Saving device: " + JSON.stringify(device) + " device quantity: " + $scope.devices.length);
        for (i = 0; i < $scope.devices.length; i++) {
            console.log("Device number: " + i + " " + JSON.stringify($scope.devices[i]));
            if ($scope.devices[i].id == device.id) {
                $scope.devices[i] = device;
                localStorage.setItem("devices", JSON.stringify($scope.devices));
                console.log("Device match. Saving device to local storage: " + JSON.stringify(device));
                return;
            }
        }
        console.log("Device not matched. Saving device to local storage: " + JSON.stringify(device));
        $scope.devices.push(device);
        localStorage.setItem("devices", JSON.stringify($scope.devices));
    }
    
    $scope.saveNewDevice = function() {
        var device = {};
        device.id = generateUUID();
        device.active = true;
        device.name = $scope.deviceName;
        device.port = $scope.devicePort;
        device.description = $scope.deviceDescription;
        $scope.deselectOtherDevices(device);
        console.log("Devices before saving: " + $scope.devices);
        $scope.devices.push(device);
        localStorage.setItem("devices", JSON.stringify($scope.devices));
        console.log("Devices after saving: " + $scope.devices);
    }
    
    
} ]);

function toggleTransparentButtons(b) {
    var buttons = document.querySelectorAll("button");
    console.log(buttons.length + " buttons");
    for (var i = 0;i < buttons.length; i++) {
        console.log("button backgroundColor: " + buttons[i].style.backgroundColor);
        if (b) {
            buttons[i].style.backgroundColor = 'Transparent';
            buttons[i].style.color='white';
            buttons[i].style.textShadow='2px 2px 8px black';
        } else {
            buttons[i].style.backgroundColor = 'silver';
            buttons[i].style.color='black';
            buttons[i].style.textShadow='0px 0px 0px black';
        }
    }
}

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
};

function getActiveDevice() {
    devices = JSON.parse(localStorage.getItem("devices"));
    for (i = 0; i < devices.length; i++) {
        if (devices[i].active) {
            console.log("getActiveDevice: " + JSON.stringify(devices[i]));
            return devices[i];
        }
    }
    if (devices.length > 0) {
        console.log("getActiveDevice return the first one since none were active: " + JSON.stringify(devices[0]));
        return devices[0];
    }
    return null;
}

