// Q42 boot loader ROM version 4.2
$(function() {

  var enableSound = true;

  function start() {
    Quento.initialize(enableSound);
  }

  window.fullGameUnlocked = true;

  window.detectLanguage = function(defaultLang) {
    var langDetected = (navigator.language + '').replace(/\-.*$/g, '').toLowerCase();
    for (var langSupported in Strings)
      if (langDetected == langSupported)
        return langDetected;
    return defaultLang;    
  };

  window.soundLoaded = function() {
    start();
  };

  window.QUIBackPressed = function() {
  };

  window.claimBackButton = function() {
  };

  window.releaseBackButton = function() {
  };

  window.unlockFullGame = function() {
  }

  window.isUnlocked = function() {
    return true;
  };

  window.loadRound = function(defaultRound) {
    var round = Utils.getCookie('round') * 1;
    if (round && (round * 1) > 0)
      return round;
    return defaultRound || 1;
  };

  window.saveRound = function(round) {
    Utils.setCookie('round', round);
  };

  window.loadColor = function(defaultColor) {
    var color = Utils.getCookie('color');
    if (color && color.length > 0 && color.indexOf('#') == 0)
      return color;
    return defaultColor || '#FFBF00';
  };

  window.saveColor = function(color) {
    Utils.setCookie('color', color);
  };

  var script = document.createElement('script');
  script.src = 'js/sound.js';
  $('body')[0].appendChild(script);
  enableSound = !$.browser.ios;


});