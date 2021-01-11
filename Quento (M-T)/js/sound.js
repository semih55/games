var Sound = (function(){
  var public = {};

  var enabled = false;

  var effects = {
    'hover': { channels: 18, current: 0, channel: [] },
    'correct': { channels: 1, current: 0, channel: [] },
    'wrong': { channels: 3, current: 0, channel: [] },
    'star': { channels: 1, current: 0, channel: [] },
    'difficulty': { channels: 2, current: 0, channel: [] },
    'freeplay': { channels: 1, current: 0, channel: [] },
    'newboard': { channels: 1, current: 0, channel: [] }
  };

  public.init = function() {
    enabled = true;

    for (var name in effects) {
      var effect = effects[name];
      for (var i=0; i<effect.channels; i++) {
        var audio = new Audio('sound/' + name + '.wav');
        audio.preload = true;
        audio.load();
        effect.channel.push(audio);
      } 
    }
  }

  public.play = function (name) {
    if (!enabled) return;
    var effect = effects[name];
    if (!effect) return;
    effect.current = ++effect.current % effect.channels;
    effect.channel[effect.current].play();
  };

  return public;
})();

if (window.soundLoaded)
  window.soundLoaded();