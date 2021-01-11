var Utils = {
  isTouch: function() {
    return 'ontouchstart' in document.documentElement;
  },
  padLeft: function (nr, n, str) {
    return Array(n - String(nr).length + 1).join(str || '0') + nr;
  },
  trim: function (s) {
    return s.replace(/^\s*|\s*$/gi, '');
  },
  between: function (min, max) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
  },
  index: function (obj, i) {
    var j = 0;
    for (var name in obj) {
      if (j == i)
        return obj[name];
      j++;
    }
  },
  count: function (obj) {
    var count = 0;
    for (var name in obj)
      count++;
    return count;
  },
  shuffle: function (arr) {
    var tmp = [];
    while (arr.length > 0)
      tmp.push(Utils.draw(arr));
    for (var i = 0; i < tmp.length; i++)
      arr[i] = tmp[i];
    return arr // arr!
  },
  eat: function (e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  },
  pick: function (arr) {
    var drawFromArr = arr;
    if (arr.constructor == Object) {
      drawFromArr = [];
      for (var id in arr)
        drawFromArr.push(id);
    }
    var drawIndex = Utils.between(0, drawFromArr.length - 1);
    if (drawFromArr.length == 0)
      return null;
    return drawFromArr[drawIndex];
  },
  draw: function (arr, optionalValueToMatch) {
    var drawFromArr = arr;
    if (arr.constructor == Object) {
      drawFromArr = [];
      for (var id in arr)
        drawFromArr.push(id);
    }
    if (drawFromArr.length == 0)
      return null;
    var drawIndex = Utils.between(0, drawFromArr.length - 1);
    // if a value was given, find that one
    if (optionalValueToMatch != undefined) {
      var foundMatch = false;
      for (var i = 0; i < drawFromArr.length; i++) {
        if (drawFromArr[i] == optionalValueToMatch) {
          drawIndex = i;
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch)
        return null;
    }
    var value = drawFromArr[drawIndex];
    drawFromArr.splice(drawIndex, 1);
    return value;
  },
  // removes the given value from arr
  removeFromArray: function (arr, val) {
    if (arr.length == 0)
      return null;
    var foundMatch = false, drawIndex = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == val) {
        drawIndex = i;
        foundMatch = true;
        break;
      }
    }
    if (!foundMatch)
      return null;
    var value = arr[drawIndex];
    arr.splice(drawIndex, 1);
    return value;
  },
  toArray: function (obj) {
    var arr = [];
    for (var id in obj)
      arr.push(id);
    return arr;
  },
  fillArray: function(min, max, repeatEachValue) {
    if (!repeatEachValue)
      repeatEachValue = 1;
    var arr = new Array();
    for (var repeat=0; repeat<repeatEachValue; repeat++)
      for (var i=min; i<=max; i++)
        arr.push(i);
    return arr;
  },
  setCookie: function(name, value, days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      var expires = "; expires=" + date.toGMTString();
    } else
      var expires = "";
    document.cookie = name + "=" + value + expires + "; path=/";
  },
  getCookie: function(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for ( var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ')
        c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0)
        return c.substring(nameEQ.length, c.length);
    }
    return null;
  },
  clearCookie: function(name) {
    this.setCookie(name, "", -1);
  },
  getColor: function(forRoundNr) {
    if (!isNaN(forRoundNr)) {
      var colorOrder = ["#FFBF00", "#00A3D9", "#FF00BF", "#80FF00", "#00FFA3", "#BFFF00", "#FF0080"];
      if (forRoundNr < colorOrder.length)
        return colorOrder[forRoundNr];
    }
    var colors = ['00', Utils.draw(['80', 'BF', 'A3']), Utils.draw(['D9', 'FF'])];
    var colorStr = '#';
    for (var i=0; i<3; i++)
      colorStr += Utils.draw(colors);
    return colorStr;
  },
  setColor: function(themeColor, forRoundNr) {
    var color = themeColor || Utils.getColor(forRoundNr);
    var styleStr = '.themed body,.themed #canvas,.themed #message,.themed #answer,.themed .stars,.themed .box.selected,.themed .subtitle, html.splash.allow-hint .box.hint, html.tutorial.allow-hint .box.hint { background: ' + color + ' }';
    $('#theme').remove();
    $('head').append('<style id="theme">' + styleStr + '</style>');
    $('html').addClass('theming');
    setTimeout(function(){$('html').addClass('themed');}, 0)
    setTimeout(function(){$('html').removeClass('theming');}, 10);
    return color;
  },
  cssVendor: function($el, prop, value) {
    switch (prop) {
      case 'opacity':
        if ($.browser.ie) {
          $el.css('-ms-filter', '"progid:DXImageTransform.Microsoft.Alpha(Opacity=' + Math.round(value * 100) + ')"');
        }
        else
          $el.css(prop, value);
        break;
      default:
        var prefixes = ['', '-webkit-', '-moz-', '-o-', '-ms-'];
        for (var i=0; i<prefixes.length; i++) {
          $el.css(prefixes[i] + prop, value);
        }
        break;
    }
  }
}

$.browser.chrome = /chrome/.test(navigator.userAgent.toLowerCase());
$.browser.android = /android/.test(navigator.userAgent.toLowerCase());
$.browser.safari = /safari/.test(navigator.userAgent.toLowerCase());
$.browser.ipad = /ipad/.test(navigator.userAgent.toLowerCase());
$.browser.iphone = /iphone|ipod/.test(navigator.userAgent.toLowerCase());
$.browser.ios = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
$.browser.ie = /msie/.test(navigator.userAgent.toLowerCase());

if ($.browser.ios) $('html').addClass('ios');
if ($.browser.iphone) $('html').addClass('iphone');
if ($.browser.chrome) $('html').addClass('chrome');
if ($.browser.safari && !$.browser.ios) $('html').addClass('mac');
if ($.browser.android) $('html').addClass('android');

window.requestAnimFrame = (function () {
  return window.requestAnimationFrame
		|| window.webkitRequestAnimationFrame
		|| window.mozRequestAnimationFrame
		|| window.oRequestAnimationFrame
		|| window.msRequestAnimationFrame
		|| function (callback, element) {
		  window.setTimeout(function () {
		    callback(+new Date);
		  }, 10);
		};
})();