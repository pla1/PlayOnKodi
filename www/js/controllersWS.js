var pokApp = angular
.module('pokModule', [])
.constant("CONSTANTS", {
              getAllPlaylistItems:80,
              GET_ACTIVE_PLAYERS:1000,
              YouTube_API_KEY:"AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y",
              YouTube_REDIRECT_URI:"urn:ietf:wg:oauth:2.0:oob",
              YouTube_CLIENT_SECRET:"VTnAl8NEs9cePL9Yupi1VgE0",
              YouTube_CLIENT_ID:"856913298158-9gganedb2g4enp5dbf73mnfem2agea8a.apps.googleusercontent.com",
              FeedWrangler_CLIENT_ID:"159b60ce10497bda2185f9056411dcc7"
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
        var device = getActiveKodiDevice();
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
     // localStorage.removeItem("devices");
    var JSON_ID = 1;
    $scope.deviceType = "kodi";
    //$scope.googleUserCode=storageGet("googleUserCode", "");
    $scope.googleDeviceCode=storageGet("googleDeviceCode", "");
    $scope.googleAccessToken=storageGet("googleAccessToken", "");
    $scope.googleRefreshToken=storageGet("googleRefreshToken", "");
    $scope.combinedSearch=storageGet("combinedSearch", "YouTube and Podcasts");
    console.log("REFRESH TOKEN FROM STORAGE: " +$scope.googleRefreshToken);
    $scope.showSettings = false;
    $scope.maxResults = storageGet("maxResults", 5);
    $scope.ytOrder = storageGet("ytOrder", "date");
    $scope.ytSafeSearch = storageGet("ytSafeSearch", "moderate");
    $scope.pictureSlideshowAsBackground = storageGet("pictureSlideshowAsBackground", "yes");
    $scope.fanartAsBackground = storageGet("fanartAsBackground", "yes");
    $scope.transparentButtons = storageGet("transparentButtons", "yes");
    toggleTransparentButtons("yes" == $scope.transparentButtons);
    $scope.fiveHundredPixFeature = storageGet("fiveHundredPixFeature","editors");
    $scope.fiveHundredPixCategory = storageGet("fiveHundredPixCategory","Uncategorized");
    $scope.devices = JSON.parse(localStorage.getItem("devices"));
    $scope.notOnQueue = "notOnQueue";
    $scope.muteButtonText="Mute";
    $scope.playing = false;
    $scope.hdhomerunDevice="";

    $scope.volumeObject = {
        level : 50
    };
    $scope.fiveHundredPixFeatures = [{name:"editors"},{name:"popular"},{name:"upcoming"},{name:"fresh_today"},{name:"fresh_yesterday"},{name:"fresh_week"}];
    $scope.fiveHundredPixCategories = [{name:"Uncategorized"},{name:"Abstract"},{name:"Animals"},{name:"Black and White"},{name:"Celebrities"},{name:"City and Architecture"},{name:"Commercial"},{name:"Concert"},{name:"Family"},{name:"Fashion"},{name:"Film"},{name:"Fine Art"},{name:"Food"},{name:"Journalism"},{name:"Landscapes"},{name:"Macro"},{name:"Nature"},{name:"Nude"},{name:"People"},{name:"Performing Arts"},{name:"Sport"},{name:"Still Life"},{name:"Street"},{name:"Transportation"},{name:"Travel"},{name:"Underwater"},{name:"Urban Exploration"},{name:"Wedding"}];
    $scope.userAgent = navigator.userAgent;
    console.log("Devices: " + JSON.stringify($scope.devices));
    if (typeof $scope.devices == "undefined" || isBlank($scope.devices)) {
        console.log("Devices is blank.");
        $scope.devices = [];
        localStorage.setItem("devices", JSON.stringify($scope.devices));
        var msg = "No Kodi devices defined. Please add a Kodi device.";
        $scope.messageLabel = msg;
        $scope.settingsMessage = msg;
        $scope.showSettings="yes";
    }
    for (i = 0; i < $scope.devices.length; i++) {
        if ($scope.devices[i].type=='hdhomerun') {
            console.log("getHdhomerunDevice: " + JSON.stringify($scope.devices[i]));
            $scope.hdhomerunDevice = $scope.devices[i];
        }
    }

    if ($scope.devices.length > 0) {
        webSocketService.initialize();
        webSocketService.socket.onmessage = function(message) {
            var jsonObject = JSON.parse(message.data);
            console.log("WebSocket message received: " + message.data);
            console.log("Has property result: " + jsonObject.hasOwnProperty("result") + JSON.stringify(jsonObject));
            var messageId = jsonObject.id;
            if (messageId == CONSTANTS.GET_ACTIVE_PLAYERS) {
                console.log("Check for active audio player.");
                for (var i = 0 ;i< jsonObject.result.length;i++) {
                    if (jsonObject.result[i].type ='audio') {
                        $scope.playing = true;
                        console.log("Active audio player.");
                    }
                }
            }

            if (jsonObject.hasOwnProperty("result")) {
                if(jsonObject.result.hasOwnProperty("volume")) {
                    $scope.volumeObject.level = jsonObject.result.volume;
                    console.log("Setting volume to:" + $scope.volumeObject.level);
                }
            }
            var methodName = jsonObject.method;
            if (jsonObject.id == CONSTANTS.getAllPlaylistItems) {
                for (var i = 0;i < jsonObject.result.length; i++) {
                    kodiSend("Playlist.GetItems",{playlistid:jsonObject.result[i].playlistid},CONSTANTS.getAllPlaylistItems + jsonObject.result[i].playlistid + 1);
                }
            }
            if (methodName == "Player.OnStop") {
                $scope.playing = false;
                $scope.backgroundImageUrl="";
                $scope.album="";
                $scope.artist="";
                $scope.title ="";
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
                $scope.backgroundImageUrl="";
                if (type != 'picture') {
                    $scope.album="";
                    $scope.artist="";
                    $scope.title ="";
                }
                if (type == "movie") {
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
    $scope.hdhomerunChannelList = function() {
        var url = "http://"+$scope.hdhomerunDevice.name+":"+$scope.hdhomerunDevice.port+"/lineup.json";
        console.log("hdhomerunChannelList URL: " + url);
        $http.get(url).success(function(data) {
            $scope.items = data;
            for (var i = 0; i < $scope.items.length; i++) {
                $scope.items[i].age = "";
                $scope.items[i].kodiStatus = "";
                $scope.items[i].snippet={};
                $scope.items[i].snippet.thumbnails={};
                $scope.items[i].snippet.thumbnails.default={};
                $scope.items[i].snippet.thumbnails.default.url="";
                $scope.items[i].snippet.description=$scope.items[i].GuideNumber+" "+$scope.items[i].GuideName;
                $scope.items[i].type="hdhomerun";
                $scope.items[i].url=$scope.items[i].URL;
                $scope.items[i].kodiStatus = $scope.notOnQueue;
            }
        });

    }

    $scope.searchYouTube = function(searchTerm) {
        console.log('Looking up: ' + $scope.searchField + " max results:" + $scope.maxResults);
        var url = "https://www.googleapis.com/youtube/v3/search";
        var httpConfig = {
            method : "GET",
            params : {
                part : "snippet",
                type : "video",
                key : CONSTANTS.YouTube_API_KEY,
                q : searchTerm,
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
            document.getElementById("searchFieldId").blur();
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
            storageSet("googleUserCode", data.user_code);
            $scope.googleDeviceCode = data.device_code;
            storageSet("googleDeviceCode", data.device_code);
            var pollGoogleAuthServerInterval = setInterval(function() {$scope.pollGoogleAuthServer(pollGoogleAuthServerInterval)}, data.interval * 1000);
        });

    }
    $scope.pollGoogleAuthServer = function(pollGoogleAuthServerInterval) {
        console.log("************ POLL GOOGLE AUTHORIZATION SERVER *********** ");
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
              }).success(function (data) {
                  console.log("Google Auth Server Poll Response");
                  console.log(JSON.stringify(data));
                  if (data.hasOwnProperty("access_token")) {
                      storageSet("googleAccessToken", data.access_token);
                      storageSet("googleToken", data.refresh_token);
                      $scope.googleAccessToken = data.access_token;
                      $scope.googleRefreshToken = data.refresh_token;
                      clearInterval(pollGoogleAuthServerInterval);
                      var youtubeResponseElement = document.getElementById("youtubeResponse");
                      youtubeResponseElement.innerHTML = "<p>App authorized successfully to your YouTube account.</p>";
                  }
              });
    }
    $scope.refreshTokenYouTube = function(pollGoogleAuthServerInterval) {
        console.log("************ REFRESH TOKEN YOUTUBE *********** ");
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
                  data: {grant_type: "refresh_token", client_id: CONSTANTS.YouTube_CLIENT_ID, client_secret:CONSTANTS.YouTube_CLIENT_SECRET, refresh_token:$scope.googleRefreshToken}
              }).success(function (data) {
                  console.log("Google Auth Server Poll Response");
                  console.log(JSON.stringify(data));
                  if (data.hasOwnProperty("access_token")) {
                      storageSet("googleAccessToken", data.access_token);
                      if (data.hasOwnProperty("refresh_token")) {
                          storageSet("googleRefreshToken", data.refresh_token);
                      }
                      $scope.googleAccessToken = data.access_token;
                      $scope.googleRefreshToken = data.refresh_token;
                      var youtubeResponseElement = document.getElementById("youtubeResponse");
                      youtubeResponseElement.innerHTML = "<p>YouTube token refreshed.</p>";
                  }
              })
        .error(function(errorData){console.log("*** ERROR **** " + JSON.stringify(errorData))});
    }





    $scope.homePageActivitiesYouTube = function() {
        var url = "https://www.googleapis.com/youtube/v3/activities";

        var httpConfig = {
            method : "GET",
            headers: {'Authorization': 'Bearer '+$scope.googleAccessToken },
            params : {
                part : "snippet,contentDetails",
                type : "video",
                home : true,
                key : CONSTANTS.YouTube_API_KEY,
                maxResults : $scope.maxResults,
                safeSearch : $scope.ytSafeSearch
            }
        }
        console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
        $http.get(url, httpConfig).success(function(data) {
            console.log("RESPONSE: " + JSON.stringify(data));
            $scope.items = data.items;
            for (var i = 0; i < $scope.items.length; i++) {
                $scope.items[i].age = moment($scope.items[i].snippet.publishedAt).fromNow();
                $scope.items[i].kodiStatus = $scope.notOnQueue;
            }
        })
        .error(function (errorData){
            console.log("*** ERROR ***: " + JSON.stringify(errorData));
            if (errorData.hasOwnProperty("error")) {
                if (errorData.error.errors.length > 0) {
                    if (errorData.error.errors[0].hasOwnProperty("reason")) {
                        if (errorData.error.errors[0].reason == "authError") {
                            if (!isBlank($scope.googleRefreshToken)) {
                                $scope.refreshTokenYouTube();
                                $scope.messageLabel="YouTube authorization token refreshed. You should be good-to-go.";
                                $scope.$apply();
                                //$scope.homePageActivitiesYouTube();
                            }
                        }
                    }
                }
            }
        });


    }


    $scope.mostPopularYouTube = function() {
        var url = "https://www.googleapis.com/youtube/v3/videos";

        var httpConfig = {
            method : "GET",
            headers: {'Authorization': 'Bearer '+$scope.googleAccessToken },
            params : {
                part : "snippet",
                chart : "mostPopular",
                key : CONSTANTS.YouTube_API_KEY,
                maxResults : $scope.maxResults,
                safeSearch : $scope.ytSafeSearch
            }
        }
        console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
        $http.get(url, httpConfig).success(function(data) {
            console.log("RESPONSE: " + JSON.stringify(data));
            $scope.items = data.items;
            for (var i = 0; i < $scope.items.length; i++) {
                $scope.items[i].age = moment($scope.items[i].snippet.publishedAt).fromNow();
                $scope.items[i].kodiStatus = $scope.notOnQueue;
            }
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
        if (item.type=="hdhomerun") {
            console.log("HDHomeRun play " + JSON.stringify(item));
            kodiSend("Player.Open",{ item : { file : item.url }});
            return;
        }
        item.kodiStatus = "addedToQueue";
        console.log("kodiAddToPlaylist " + JSON.stringify(item) + " Playing? " + $scope.playing);
        if (!$scope.playing) {
            kodiSend("Playlist.Clear",{ playlistid : 0 });
        }
        if (item.type=="podcast") {
            console.log("Podcast added to playlist " + JSON.stringify(item));
            kodiSend("Playlist.Add",{ playlistid : 0, item : { file : item.url }});
            if (!$scope.playing) {
                kodiSend("Player.Open",{ item : { playlistid : 0 }});
            }
            return;
        }

        var videoId = "";

        if (item.hasOwnProperty("contentDetails")) {
            if (item.contentDetails.hasOwnProperty("playlistItem")) {
                videoId = item.contentDetails.playlistItem.resourceId.videoId;
            }
            if (item.contentDetails.hasOwnProperty("recommendation")) {
                if (item.contentDetails.recommendation.hasOwnProperty("playlistItem")) {
                    videoId = item.contentDetails.recommendation.playlistItem.resourceId.videoId;
                }

                if (item.contentDetails.recommendation.hasOwnProperty("resourceId")) {
                    videoId = item.contentDetails.recommendation.resourceId.videoId;
                }
            }
            if (item.contentDetails.hasOwnProperty("upload")) {
                videoId = item.contentDetails.upload.videoId;
            }
        } else {
            videoId = item.id.videoId;
        }
        if (item.kind== "youtube#video") {
            videoId = item.id;
        }

        console.log("VIDEO ID: ************************************ " + videoId);
        kodiSend("Playlist.Add",{ playlistid : 0, item : { file : "plugin://plugin.video.youtube/?action=play_video&videoid=" + videoId }});
        if (!$scope.playing) {
            kodiSend("Player.Open",{ item : { playlistid : 0 }});
        }
    }
    $scope.kodiClearPlaylist = function() {
        kodiSend("Playlist.Clear",{ playlistid : 0 });
    }
    $scope.kodiGetActivePlayers = function() {
        kodiSend("Player.GetActivePlayers",{},CONSTANTS.GET_ACTIVE_PLAYERS);
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
        setTimeout(function() {$scope.kodiMultiSend(["Input.Home","Input.Back"])}, 2000);

    }
    $scope.kodiNavigation = function(navigationAction) {
        kodiSend("Input."+navigationAction, {});
    }
    $scope.kodiActivateWindow = function(windowName) {
        kodiSend("GUI.ActivateWindow", {window:windowName});
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
    $scope.kodiMultiSend = function(commands) {
        for (var i = 0; i< commands.length;i++) {
            kodiSend(commands[i]);
        }
    }

    $scope.kodi500px = function() {
        kodiSend("Input.Home");
        kodiSend("Addons.ExecuteAddon", { addonid:"plugin.image.500px", params:"?mode=feature&feature="+$scope.fiveHundredPixFeature+"&category="+$scope.fiveHundredPixCategory });
        //        setTimeout($scope.kodiMultiSend(["Input.Left","Input.Down","Input.Down","Input.Select"]),5000);
        if ($scope.playing) {
            console.log("Playing and about to start slideshow via keystrokes.");
            setTimeout(function() {$scope.kodiMultiSend(["Input.Left","Input.Back","Input.Left","Input.Up","Input.Up","Input.Up","Input.Up","Input.Up","Input.Select"])},3000);
        } else {
            console.log("Not playing and about to start slideshow via keystrokes.");
            setTimeout(function() {$scope.kodiMultiSend(["Input.Left","Input.Back","Input.Left","Input.Up","Input.Up","Input.Up","Input.Select"])},3000);
        }


        //   setTimeout(function() {$scope.kodiMultiSend(["Input.Down","Input.ContextMenu","Input.Down","Input.Select"])},3000);
        //  kodiSend("Application.Slideshow");
        //    $scope.kodiGetPlaylists();
        //    kodiSend("Player.Open",{ item : { directory : "/home/htplainf/Pictures" }});
        //   kodiSend("Player.Open",{ item : { playlistid : 2 }});
        //   kodiSend("Player.Open",{ item : {  }}); # starts party mode music - unexpected
        //  kodiSend("Player.Open",{ path : {  }}); # returns - "Too many parameters"
        //   kodiSend("Player.Open", {});

    }
    $scope.test = function() {
        //   kodiSend("Player.Open",{ item : { playlistid : 2 }});
        //   kodiSend("Player.GoTo", {playerid: 2, to: "next"});
        kodiSend("xbmc.executebuiltin('Action(Play)')");

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
        console.log(new Date() + " kodiSend: " + JSON.stringify(data) );
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
        storageSet("fiveHundredPixFeature", $scope.fiveHundredPixFeature);
        storageSet("fiveHundredPixCategory", $scope.fiveHundredPixCategory);
        storageSet("combinedSearch", $scope.combinedSearch);
        toggleTransparentButtons("yes" == $scope.transparentButtons);
    }
    $scope.deleteYouTubeAuthorization = function() {
        $scope.googleAccessToken = "";
        storageSet("googleAccessToken", "");
        $scope.googleUserCode="";
        storageSet("googleUserCode", "");
        $scope.googleDeviceCode="";
        storageSet("googleDeviceCode", "");
    }

    $scope.deselectOtherDevices = function(device) {
        console.log("Deselecting " + $scope.devices.length + " devices.");
        for (i = 0; i < $scope.devices.length; i++) {
            if (device.id != $scope.devices[i].id) {
                $scope.devices[i].active = false;
            }
        }
    }

    $scope.getActiveKodiDevice = function() {
        for (i = 0; i < $scope.devices.length; i++) {
            if ($scope.devices[i].active) {
                console.log("getActiveKodiDevice: " + JSON.stringify($scope.devices[i]));
                return $scope.devices[i];
            }
        }
        if ($scope.devices.length > 0) {
            console.log("getActiveKodiDevice return the first one since none were active: " + JSON.stringify($scope.devices[0]));
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
        window.location.reload();
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
        device.name = $scope.deviceName;
        device.port = $scope.devicePort;
        device.description = $scope.deviceDescription;
        device.type = $scope.deviceType;
        if (device.type=='kodi') {
            device.active = true;
            $scope.deselectOtherDevices(device);
        }
        console.log("Devices before saving: " + $scope.devices);
        $scope.devices.push(device);
        localStorage.setItem("devices", JSON.stringify($scope.devices));
        console.log("Devices after saving: " + $scope.devices);
        if (device.type=='kodi') {
            window.location.reload();
        }
    }
    $scope.podcastSearch = function(searchTerm) {
        console.log("Podcast search: " + searchTerm);
        var url = "https://feedwrangler.net/api/v2/podcasts/search";
        $scope.items=[];
        var httpConfig = {
            method : "GET",
            params : {
                client_id : CONSTANTS.FeedWranger_CLIENT_ID,
                search_term : searchTerm
            }
        }
        $http.get(url,httpConfig).success(function(data) {
            console.log("Podcast search response: " + JSON.stringify(data));
            var podcasts = data.podcasts;
            url = "https://feedwrangler.net/api/v2/podcasts/show";
            for (var i = 0; i<podcasts.length;i++) {
                httpConfig = {
                    method : "GET",
                    params : {
                        client_id : CONSTANTS.FeedWranger_CLIENT_ID,
                        podcast_id : podcasts[i].podcast_id
                    }
                }
                $http.get(url,httpConfig).success(function(data) {
                    console.log(JSON.stringify(data));
                    for (var j = 0 ; j < data.podcast.recent_episodes.length;j++){
                        var item = {};
                        item.snippet={}
                        item.snippet.title = data.podcast.title;
                        item.snippet.thumbnails ={};
                        item.snippet.thumbnails.default={};
                        item.snippet.thumbnails.default.url=data.podcast.image_url;
                        item.url=data.podcast.recent_episodes[j].audio_url;
                        item.snippet.description=data.podcast.recent_episodes[j].title;
                        item.kodiStatus="notOnQueue";
                        item.type="podcast";
                        $scope.items.push(item);
                    }
                    document.getElementById("searchFieldId").blur();
                });
            }});
    }

    $scope.search = function() {
        var searchField = document.getElementById("searchFieldId");
        document.getElementById("searchFieldId");
        document.getElementById("remoteButtonId").focus();
        var searchTerm = searchField.value;
        if ($scope.combinedSearch=='YouTube and Podcasts' || $scope.combinedSearch=='Podcasts') {
            $scope.podcastSearch(searchTerm);
        }
        if ($scope.combinedSearch=='YouTube and Podcasts' || $scope.combinedSearch=='YouTube') {
            $scope.searchYouTube(searchTerm);
        }
    }

} ]);
function dumpXml(element) {
    var xmlString = (new XMLSerializer()).serializeToString(element);
    console.log("XML: " + xmlString);
}

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

function getActiveKodiDevice() {
    devices = JSON.parse(localStorage.getItem("devices"));
    for (i = 0; i < devices.length; i++) {
        if (devices[i].active) {
            console.log("getActiveKodiDevice: " + JSON.stringify(devices[i]));
            return devices[i];
        }
    }
    if (devices.length > 0) {
        console.log("getActiveKodiDevice return the first one since none were active: " + JSON.stringify(devices[0]));
        return devices[0];
    }
    return null;
}

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}
