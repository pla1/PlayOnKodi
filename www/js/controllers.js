var pokApp = angular.module('pokModule', []);



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
        element.css({
          "display" : ""
        });
      });

      scope.$on("loading-complete", function(e) {
        element.css({
          "display" : "none"
        });
      });

    }
  };
});



pokApp.controller('PokController', [ '$scope', '$http', function($scope, $http) {
 // localStorage.removeItem("devices");
  $scope.showSettings=false;
  $scope.maxResults = storageGet("maxResults",5);
  $scope.ytOrder = storageGet("ytOrder","date");
  $scope.ytSafeSearch = storageGet("ytSafeSearch","moderate");
  $scope.devices = JSON.parse(localStorage.getItem("devices"));
  $scope.notOnQueue="notOnQueue";
  $scope.volumeObject = {level: 11};

  console.log("Devices: " + JSON.stringify($scope.devices));
  if (typeof $scope.devices == "undefined" || isBlank($scope.devices)) {
    console.log("Devices is blank.");
    $scope.devices=[];
    localStorage.setItem("devices",JSON.stringify($scope.devices));
  }

  $scope.searchYouTube = function() {
    console.log('Looking up: ' + $scope.searchField + " max results:" + $scope.maxResults);
    document.getElementById("searchFieldId").blur();
    var url = "https://www.googleapis.com/youtube/v3/search";
    var httpConfig = {
          method: "GET",
          params: {
              part: "snippet",
              type: "video",
              key: "AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y",
              q: $scope.searchField,
              maxResults: $scope.maxResults,
              safeSearch: $scope.ytSafeSearch,
              order: $scope.ytOrder
          }
    }
    console.log("URL:" + url + "HTTP Config: " + JSON.stringify(httpConfig));
    $http.get(url, httpConfig).success(function(data) {
      $scope.items = data.items;
      for (var i = 0;i<$scope.items.length;i++) {
          $scope.items[i].age=moment($scope.items[i].snippet.publishedAt).fromNow();
          $scope.items[i].kodiStatus=$scope.notOnQueue;
      }
    });
  }
  $scope.getUrl = function() {
    var device = $scope.getActiveDevice();
    var url = "http://"+device.name+":"+device.port+"/jsonrpc";
    console.log("Get URL: " + url);
    return url;
  }

  $scope.kodiAddToPlaylist = function(item) {
    console.log("kodiAddToPlaylist" + JSON.stringify(item));
    var url = $scope.getUrl();
    var data = {
          jsonrpc : "2.0",
          method : "Playlist.Add",
          id : 1,
          params : {
            playlistid:0,
            item : {
              file : "plugin://plugin.video.youtube/?action=play_video&videoid=" + item.id.videoId
            }
          }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
      item.kodiStatus="addedToQueue";
      $scope.kodiPlayIfIdle();
    });

  }
  $scope.kodiClearPlaylist = function() {
    console.log("kodiClearPlaylist");
    var url = $scope.getUrl();
    var data = {
          jsonrpc : "2.0",
          method : "Playlist.Clear",
          id : 1,
          params : {
            playlistid:0,
          }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
    });

  }

  $scope.kodiPlayIfIdle = function() {
    var url = $scope.getUrl();
    var data = {
      jsonrpc:"2.0",
      method: "Player.GetActivePlayers",
      id: 1
    };
    $http.post(url, data).success(function(data) {
      console.log("Play if idle " + JSON.stringify(data));
      if (data.result.length == 0) {
          $scope.kodiPlay();
      }
    });
  }

  $scope.kodiPlay = function() {
    console.log("Kodi play");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.Open",
      id: 1,
      params: {
        item: {
          playlistid:0
        }
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
    });
  }

  $scope.kodiVolume = function() {
    console.log("Kodi volume: "+$scope.volumeObject.level);
    var url = $scope.getUrl();
    var data = {
      jsonrpc:"2.0",
      method: "Application.SetVolume",
      id: 1,
      params: {
              volume: parseInt($scope.volumeObject.level)
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
    });
  }

  $scope.kodiGetVolume = function() {
    console.log("Kodi get volume");
    var url = $scope.getUrl();
    var data = {
      jsonrpc:"2.0",
      method: "Application.GetProperties",
      id: 1,
      params: {
              properties:['volume']
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
      $scope.volumeObject.level = data.result.volume;
    });
  }

  $scope.kodiPlayPause = function(playerId) {
    console.log("Kodi play / pause toggle");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.PlayPause",
      id: 1,
      params: {
        playerid:playerId
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
    });
  }
  $scope.kodiPlayPauseAll = function() {
    console.log("Kodi play / pause all players");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.GetActivePlayers",
      id: 1,
    };
    $http.post(url, data).success(function(data) {
      console.log("GetActivePlayers response: " + JSON.stringify(data));
      var playerArray = data.result;
      for (var i in playerArray) {
          $scope.kodiPlayPause(playerArray[i].playerid);
      }
    });
  }

  $scope.kodiStop = function(playerId) {
    console.log("Kodi stop playerid: " + playerId);
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.Stop",
      id: 1,
      params: {
        playerid:playerId
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
    });
  }

  $scope.kodiStopAll = function() {
    console.log("Kodi stop all players");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.GetActivePlayers",
      id: 1,
    };
    $http.post(url, data).success(function(data) {
      console.log("GetActivePlayers response: " + JSON.stringify(data));
      var playerArray = data.result;
      for (var i in playerArray) {
          $scope.kodiStop(playerArray[i].playerid);
      }
    });
  }

  $scope.kodiMusicParty = function() {
    console.log("Kodi stop");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.Open",
      id: 1,
      params: {
        item:{partymode:"music"}
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
      setTimeout($scope.kodiBack,4000);
      setTimeout($scope.kodiBack,5000);
    });
  }

  $scope.kodiPlayNext = function(playerId) {
    console.log("Kodi play next");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.Goto",
      id: 1,
      params: {
        playerid:playerId,
              to:"next"
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
    });
  }

  $scope.kodiPlayNextAll = function() {
    console.log("Kodi play / pause all players");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Player.GetActivePlayers",
      id: 1,
    };
    $http.post(url, data).success(function(data) {
      console.log("GetActivePlayers response: " + JSON.stringify(data));
      var playerArray = data.result;
      for (var i in playerArray) {
          $scope.kodiPlayNext(playerArray[i].playerid);
      }
    });
  }
  $scope.kodiClearPlaylist = function(playListId) {
    console.log("Kodi play next");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Playlist.Clear",
      id: 1,
      params: {
        playlistid:playListId

      }
    };
    $http.post(url, data).success(function(data) {
      console.log(data);
    });
  }

  $scope.kodiClearPlaylistAll = function() {
    console.log("Kodi clear all playlists");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Playlist.GetPlaylists",
      id: 1,
    };
    $http.post(url, data).success(function(data) {
      console.log("Get playlists response: " + JSON.stringify(data));
      var playlistArray = data.result;
      for (var i in playlistArray) {
          $scope.kodiClearPlaylist(playlistArray[i].playlistid);
      }
    });
  }

  $scope.kodiMute = function() {
    console.log("Kodi mute");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Application.SetMute",
      id: 1,
      params: {
              mute:"toggle"
      }
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
    });
  }
  $scope.kodiShutdown = function() {
    console.log("Kodi shutdown");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "System.Shutdown",
      id: 1
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
    });
  }
  $scope.kodiBack = function() {
    console.log("Kodi back");
    var url = $scope.getUrl();
    var data ={
      jsonrpc:"2.0",
      method: "Input.Back",
      id: 1
    };
    $http.post(url, data).success(function(data) {
      console.log(JSON.stringify(data));
    });
  }

  $scope.saveYtSettings = function() {
    console.log("saveYtSettings");
    storageSet("ytOrder", $scope.ytOrder);
    storageSet("maxResults", $scope.maxResults);
    storageSet("ytSafeSearch", $scope.ytSafeSearch);
  }
  $scope.deselectOtherDevices = function(device) {
    console.log("Deselecting " + $scope.devices.length + " devices.");
    for (i =0;i<$scope.devices.length;i++) {
      if (device.id!=$scope.devices[i].id) {
        $scope.devices[i].active=false;
      }
    }
  }
  $scope.getActiveDevice = function() {
    for (i =0;i<$scope.devices.length;i++) {
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
      for (var i in $scope.devices) {
          if (device.id==$scope.devices[i].id) {
              $scope.devices.splice(i,1);
          }
          if (device.active) {
              if ($scope.devices.length > 0) {
                  $scope.devices[0].active=true;
              }
          }
      }
  }

  $scope.saveDevice = function(device) {
    console.log("Saving device: " + JSON.stringify(device) + " device quantity: " + $scope.devices.length);
    for (i = 0; i < $scope.devices.length; i++) {
      console.log("Device number: " + i + " " + JSON.stringify($scope.devices[i]));
      if ($scope.devices[i].id==device.id) {
        $scope.devices[i] = device;
        localStorage.setItem("devices",JSON.stringify($scope.devices));
        console.log("Device match. Saving device to local storage: " + JSON.stringify(device));
        return;
      }
    }
    console.log("Device not matched. Saving device to local storage: " + JSON.stringify(device));
    $scope.devices.push(device);
    localStorage.setItem("devices",JSON.stringify($scope.devices));
  }

  $scope.saveNewDevice = function() {
    var device = {};
    device.id=generateUUID();
    device.active=true;
    device.name=$scope.deviceName;
    device.port=$scope.devicePort;
    device.userName=$scope.deviceUserName;
    device.password=$scope.devicePassword;
    device.description=$scope.deviceDescription;
    $scope.deselectOtherDevices(device);
    console.log("Devices before saving: " + $scope.devices);
    $scope.devices.push(device);
    localStorage.setItem("devices",JSON.stringify($scope.devices));
    console.log("Devices after saving: " + $scope.devices);
  }
  $scope.kodiGetVolume();

} ]);

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

