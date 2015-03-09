var pokApp = angular.module('pokModule', []);

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

pokApp.controller('PokController', [ '$scope', '$http', 'webSocketService', function($scope, $http, webSocketService) {
  //  localStorage.removeItem("devices");
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
                key : "AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y",
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

    $scope.kodiAddToPlaylist = function(item) {
        console.log("kodiAddToPlaylist" + JSON.stringify(item));
        var data = {
            jsonrpc : "2.0",
            method : "Playlist.Add",
            id : 1,
            params : {
                playlistid : 0,
                item : {
                    file : "plugin://plugin.video.youtube/?action=play_video&videoid=" + item.id.videoId
                }
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
        console.log(data);
        item.kodiStatus = "addedToQueue";
        $scope.kodiPlayIfIdle();
    }
    $scope.kodiClearPlaylist = function() {
        console.log("kodiClearPlaylist");
        var data = {
            jsonrpc : "2.0",
            method : "Playlist.Clear",
            id : 1,
            params : {
                playlistid : 0,
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }
    $scope.kodiGetActivePlayers = function() {
        var data = {
            jsonrpc : "2.0",
            method : "Player.GetActivePlayers",
            id : 1
        };
        webSocketService.socket.send(JSON.stringify(data));
    }

    //TODO HANDLE IN THE WEBSOCKET ENVIRONMENT
    $scope.kodiPlayIfIdle = function() {
        var data = {
            jsonrpc : "2.0",
            method : "Player.GetActivePlayers",
            id : 1
        };
        webSocketService.socket.send(JSON.stringify(data));
        console.log("Play if idle " + JSON.stringify(data));
        $scope.kodiPlay();
    }

    $scope.kodiPlay = function() {
        console.log("Kodi play");
        var data = {
            jsonrpc : "2.0",
            method : "Player.Open",
            id : 1,
            params : {
                item : {
                    playlistid : 0
                }
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }
    $scope.kodiGetItemAll = function() {
        for (i =0;i<3;i++) {
            var data = {
                jsonrpc: "2.0",
                method: "Player.GetItem",
                id: 1,
                params : {
                    playerid : i,
                    properties: ["title", "album", "artist", "duration", "thumbnail", "file", "fanart", "streamdetails"],
                }
            }
            webSocketService.socket.send(JSON.stringify(data));
        }
    }

    $scope.kodiVolume = function() {
        console.log("Kodi volume: " + $scope.volumeObject.level);
        var data = {
            jsonrpc : "2.0",
            method : "Application.SetVolume",
            id : 1,
            params : {
                volume : parseInt($scope.volumeObject.level)
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }

    $scope.kodiGetVolume = function() {
        console.log("Kodi get volume");
        var data = {
            jsonrpc : "2.0",
            method : "Application.GetProperties",
            id : 1,
            params : {
                properties : [ 'volume' ]
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }

    $scope.kodiPlayPause = function(playerId) {
        console.log("Kodi play / pause toggle");
        var data = {
            jsonrpc : "2.0",
            method : "Player.PlayPause",
            id : 1,
            params : {
                playerid : playerId
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }
    $scope.kodiPlayPauseAll = function() {
        console.log("Kodi play / pause all players");
        for (i = 0; i < 3;i++) {
            $scope.kodiPlayPause(i);
        }
    }

    $scope.kodiStop = function(playerId) {
        console.log("Kodi stop playerid: " + playerId);
        var data = {
            jsonrpc : "2.0",
            method : "Player.Stop",
            id : 1,
            params : {
                playerid : playerId
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }
    $scope.kodiStopAll = function() {
        console.log("Kodi stop all players");
        for (i = 0; i < 3;i++) {
            $scope.kodiStop(i);
        }
    }

    $scope.kodiMusicParty = function() {
        console.log("Kodi stop");
        var data = {
            jsonrpc : "2.0",
            method : "Player.Open",
            id : 1,
            params : {
                item : {
                    partymode : "music"
                }
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
        setTimeout($scope.kodiBack, 4000);
        setTimeout($scope.kodiBack, 5000);
    }

    $scope.kodiPlayNext = function(playerId) {
        console.log("Kodi play next");
        var data = {
            jsonrpc : "2.0",
            method : "Player.Goto",
            id : 1,
            params : {
                playerid : playerId,
                to : "next"
            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }

    $scope.kodiPlayNextAll = function() {
        for (i = 0; i < 3;i++) {
            $scope.kodiPlayNext(i);
        }
    }

    $scope.kodiClearPlaylist = function(playListId) {
        console.log("Kodi play next");
        var data = {
            jsonrpc : "2.0",
            method : "Playlist.Clear",
            id : 1,
            params : {
                playlistid : playListId

            }
        };
        webSocketService.socket.send(JSON.stringify(data));
    }

    $scope.kodiClearPlaylistAll = function() {
        console.log("Kodi clear all playlists");
        for (i = 0; i < 3;i++) {
            $scope.kodiClearPlaylist(i);
        }
    }

    $scope.kodiMute = function() {
        console.log("Kodi mute");
        var data = {
            jsonrpc : "2.0",
            method : "Application.SetMute",
            id : 1,
            params : {
                mute : "toggle"
            }
        };
        console.log("Websocket sending: " + JSON.stringify(data));
        webSocketService.socket.send(JSON.stringify(data));
    }

    $scope.kodiShutdown = function() {
        console.log("Kodi shutdown");
        var data = {
            jsonrpc : "2.0",
            method : "System.Shutdown",
            id : 1
        };
        webSocketService.socket.send(JSON.stringify(data));
    }
    $scope.kodiBack = function() {
        console.log("Kodi back");
        var data = {
            jsonrpc : "2.0",
            method : "Input.Back",
            id : 1
        };
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
