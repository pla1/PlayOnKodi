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
  function storageSet(name, value) {
    console.log("Saving " + name + " value is: "+ value);
    localStorage.setItem(name,value);
    return false;
  }
  function storageGet(name,defaultValue) {
    var value =  localStorage.getItem(name);
    if (value == 'undefined' || value == 'null') {
      console.log("Value not found. Returning default value " + defaultValue);
      value = defaultValue;
      storageSet(name,value);
    }
    console.log("storageGet variable: " + name + " default value: " + defaultValue + " value: " + value);
    return value;
  }
  $scope.maxResults = storageGet("maxResults",5);
  $scope.ytOrder = storageGet("ytOrder","date");
  $scope.ytSafeSearch = storageGet("ytSafeSearch","moderate");
  $scope.searchYouTube = function() {
    var searchText = $scope.searchField;
    console.log('Looking up: ' + searchText + " max results:" + maxResults);
    var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&key=AIzaSyDPxFL1smrq3bV6BlbPswsvgKnS1G97-4Y&q="+searchText+"&maxResults="+$scope.maxResults+"&safeSearch"+$scope.ytSafeSearch+"&order="+$scope.ytOrder;
    console.log("URL: " + url);
    $http.get(url).success(function(data) {
      $scope.items = data.items;
    });
  }
  $scope.saveYtOrder = function() {
      console.log("saveYtOrder " + $scope.ytOrder);
      storageSet("ytOrder",$scope.ytOrder);
  }
  $scope.saveMaxResults = function() {
    console.log("saveMaxResults " + $scope.maxResults);
    storageSet("maxResults", $scope.maxResults);
  }
  $scope.saveYtSafeSearch = function() {
    console.log("saveYtSafeSearch " + $scope.ytSafeSearch);
    storageSet("ytSafeSearch", $scope.ytSafeSearch);
  }


} ]);
