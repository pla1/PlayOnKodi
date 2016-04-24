# Play on Kodi
HTML5 app for Ubuntu Touch. Use this app with your Kodi entertainment system.

* Search for YouTube videos on your mobile device and play them on your Kodi entertainment system.
* Search for Podcasts on your mobile device and play them on your Kodi entertainment system.
* If you authenticate your YouTube account you can list your activity feed and play the videos on Kodi.
* Music Party button shuffles your music library and plays it on Kodi.
* Weather button to display weather information on Kodi.
* Basic remote control features.
* Mirrors fanart as a background on your mobile device.
* Start a 500px slideshow on Kodi and mirror the photos to your mobile device.
* List HDHomeRun channels on your mobile device and play them on Kodi.

**NOTE:** *Some features like the 500px button use keyboard navigation functions and may not work if you are not using the [Confluence](http://kodi.wiki/view/Confluence) theme.*

**Kodi system settings requirement**

Under System, Settings, Services, Remote control, enable "Allow programs on other systems to control Kodi". This will open port 9090 and allow this app to establish bi-directional communication with Kodi using WebSockets.

![](http://i.imgur.com/IbGT0Fn.png)

**TODO**
* Better handle when to clear playlists.
* Better handle refreshing YouTube token.
* Find a better method than using keyboard navigation for starting a 500px slideshow.

Please report bugs and feature requests on the [issues page](https://github.com/pla1/PlayOnKodi/issues).

### Software used in this app:
* AngularJS - https://angularjs.org/
* Reconnecting-websocket - https://github.com/joewalnes/reconnecting-websocket/blob/master/reconnecting-websocket.js
* Moment - http://momentjs.com/
* Kodi 500px addon
* Kodi YouTube addon

### API services used in this app:
* YouTube - For video search - https://developers.google.com/youtube/v3/
* Feed Wrangler - For podcast search and episode lists - https://feedwrangler.net/developers

### About Kodi http://kodi.tv/about/
