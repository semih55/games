var Quento = function () {
  var touch = 'ontouchstart' in document.documentElement;
  var canShake = 'onorientationchange' in window;

  var public = {};

  var showSplash = document.location.hash.indexOf('#') == -1,
      desktop = true,
      sound = true,
      tutorial = 0,
      animations = true,
      fullVersion = false,

      action = [],
      solutions = [],
      availableChains = [true, true, false, false],
      actionElements = [],
      $currentNr = null,
      $currentOp = null,
      $selectedAction = null,
      drawing = false,
      lastCycle = 0,
      answers = [0,0,0,0],
      previousAnswers = [[],[],[],[]], // arrays of used previous answers
      lastSolution,
      deck,
      $currentHover = null;
      stars = [0,0,0,0];
      easy = true,
      messageTimeout = 0,
      noRefresh = false,
      $startedNr = null,
      $startedOp = null,
      lang = 'en',
      $lastTappedEl = null,
      round = 1,
      drawingNewBoard = false,
      color = '#FFBF00',
      gameStarted = false,      
      hintStartTimeout = 0,
      hintNextTimeout = 0,
      hintTimeouts = [],
      undone = false,
      freeplay = false,
      tipAfterRound = { '3': 1, '5': 3, '7': 4, '42': 42 },
      highestChainIndexForEasy = 0,
      highestChainIndexForHard = 1,
      unlocking = false;
      /*oldState = null,
      oldStateArray = null;
      loadStateUsed = false;*/



  // define the positions, and their allowed (adjacent) paths, for numbers and operators
  var positions = {
    'numbers': {
      'tl': { 't': 1, 'l': 1 },
      'tr': { 't': 1, 'r': 1 },
      'bl': { 'b': 1, 'l': 1 },
      'br': { 'b': 1, 'r': 1 },
      'c': { 't': 1, 'r': 1, 'b': 1, 'l': 1 }
    },
    'operators': {
      't': { 'tl': 1, 'tr': 1, 'c': 1 },
      'r': { 'tr': 1, 'br': 1, 'c': 1 },
      'b': { 'bl': 1, 'br': 1, 'c': 1 },
      'l': { 'tl': 1, 'bl': 1, 'c': 1 }
    }
  };

  var offsets = {
    'nr-tl':1,
    'op-t':1,
    'nr-tr':1,
    'op-l':1,
    'nr-c':1,
    'op-r':1,
    'nr-bl':1,
    'op-b':1,
    'nr-br':1
  };

  public.initialize = function(enableSound) {
    document.oncontextmenu = function() {return false;};

    // initially load values from datastorage
    round = window.loadRound(round);
    color = window.loadColor(color);
    Utils.setColor(color);

    if (round == 1) {
      tutorial = 1;
      $('html').addClass('tutorial');
    }

    $('body').removeAttr('style');
    $('html').addClass(canShake? 'shake' : 'no-shake');
    $(window).resize(resize);
    

    $('html').addClass('hide-info').addClass('game');
    sound = enableSound;
    lang = detectLanguage(lang);
    detectPurchases();
    $('#info-' + lang.toLowerCase()).show();
    insertStrings();
    if (sound)
      Sound.init();
    resize();
    dealLogo();
    //goHard(true);
    $('#game, #logo').addClass('show');
    
    setTimeout(splash, showSplash? 250 : 0);
  };

  function splash() {
    $(document).bind('touchstart touchmove', function(e){e.preventDefault()});
    $('html, body').bind('touchstart touchmove', function(e){e.preventDefault()});

    $('html.game').live('touchstart mousedown', touchStartOnGame)
    $('html.game').live('touchend mouseup', touchEndOnGame)
    $('html.game #canvas').live('touchmove mousemove', touchMoveOnGame);
    $('html.showtip').live('touchend click', closeTip);
    if (!showSplash) return skip();
    hintStartTimeout = setTimeout(playLogo, 1000);
  }

  function skip() {
    $('#logo').html('QUENTO');
    start();
  }

  function start(q) {
    stopHints();
    gameStarted = true;
    updateContent();
    addSlidingToChains();
    $('#answer').html('').removeClass('show');
    $('html').removeClass('splash');
    $('#logo').removeClass('intro');
    $('html').removeClass('hide-info');
    $('html.game .chainbox.locked').live('touchend click', clickLock);
    $('html.game .chainbox').live('touchend click', clickChain);
    $('#info-toggler, html.info').live('touchend click', toggleInfo);
    if (touch)
      $('html.info, html.info *').live('touchmove', Utils.eat);
    setTimeout(function(){
      $('#chains').addClass('show');
    }, 350);
    setTimeout(function() {
        //goEasy(true);
      $('#game').removeClass('hideText');
      $('html').addClass('game-started');
      prepareGame();
      dealNumbers();
      createChainAnswers();
      $('#game').addClass('show');
    }, 750);

    //return setTimeout(enableFreePlay, 800);

    setTimeout(function(){
      if (round > 1) 
        flashText(getString('round') + ' ' + round);
      else {
        setTimeout(playSolution, 3000);
      }
      setTimeout(function(){$('#logo').html(freeplay? getString('freeplay') : 'Quento');}, 200);
    }, 2500);
  }

  function insertStrings() {
    for (var i=0; i<4;i++) {
      var $el = $($('#chains .chainbox')[i]).find('.subtitle');
      var string = getString(['chain' + (i+2)]);
      $el.text(string);
    }
    $('#chaintext1').html(getString('make'));
    $('#chaintext2').html(getString('use'));
    $('#freeplay .title').html(getString('freeplay'));
    $('#logo').html(getString('swipe_quento'));
    $('#getitfor').html(getString('getquento'));
  }

  var getString = public.getString = function(id) {
    var strings = Strings[lang];
    if (!strings)
      return '';

    var string = strings[id];
    if (!string)
      string = '';

    return string;
  }

  function resize() {
    $('#canvas, .canvas').css('top', Math.max(0, Math.round($(window).height() / 2 - ($('#canvas').height() + 120)/2)));      
    $('#storebar').css('top', Math.max(0, Math.round($(window).height() / 2 + ($('#canvas').height() - 100)/2)));      

    for (var id in offsets) {
      offsets[id] = $('#' + id).offset();
      offsets[id].top -= $('#canvas').offset().top;
      offsets[id].left -= $('#canvas').offset().left;
      offsets[id].right = offsets[id].left + $('#' + id).width();
      offsets[id].bottom = offsets[id].top + $('#' + id).height();
    }
    offsets['canvas'] = $('#canvas').offset();
  }

  // creates a new answer based on the numbers and operators currently on the wheel
  // @chainLength is numbers only, operators not included
  var createAnswer = public.createAnswer = function createAnswer(chainLength, chainIndex) {
    if (!chainLength)
        chainLength = 2;
    var numberReuse = false, // set to true when number positions can be reused
        operatorReuse = false, // set to true when operator positions can be reused
        allowNegatives = false, // for now just don't do this
        chainLengthWithOperators = chainLength * 2 - 1,
        chain = [],
        numbers = [], operators = [],
        last = null,
        droppedBelowZero = false,
        solutionIds = [];

    // helper: gets a number from the entire pool of numbers, or of the numbers adjacent to the given operator
    function getNumber(op) {
      var pool = Utils.toArray(op ? positions.operators[op] : positions.numbers);
      if (!numberReuse) {
        for (var i = 0; i < numbers.length; i++)
          Utils.removeFromArray(pool, numbers[i]);
      }
      return Utils.pick(pool);
    }

    // helper: gets an operator from the entire pool of operators, or of the operators adjacent to the given number
    function getOperator(nr) {
      var pool = Utils.toArray(nr ? positions.numbers[nr] : positions.operators);
      if (!operatorReuse)
        for (var i = 0; i < operators.length; i++)
          Utils.removeFromArray(pool, operators[i]);
      return Utils.pick(pool);
    }

    var tries = 0, broken = false;
    // keep chaining until we've reached the desired length
    while (chain.length < chainLengthWithOperators && tries++ < 100) {
      var needsNumber = chain.length % 2 == 0;
      if (needsNumber) {
        last = getNumber(last);
        if (last == null) {
          broken = true;
          break;
        }
        if (last) {
          numbers.push(last);
          var number = $('#nr-' + last).text() * 1;
          chain.push(number);
          solutionIds.push('nr-' + last);
        }
      }
      else {
        last = getOperator(last);
        if (last == null) {
          broken = true;
          break;
        }
        if (last) {
          operators.push(last);
          var operator = $('#op-' + last).attr('data-op');
          chain.push(operator);
          solutionIds.push('op-' + last);
        }
      }
      // see if any chain steps drop below zero
      if (chain.length >= 3 && chain.length % 2 == 1) {
        var currentValue = calculateChain(chain);
        if (currentValue < 0) {
          droppedBelowZero = true;
          break;
        }
      }
    }
    // if dropped below zero try again
    if (droppedBelowZero || broken || tries >= 99)
      return createAnswer(chainLength, chainIndex);

    var answer = calculateChain(chain);

    // don't take 0 for an answer
    if (answer == 0) return createAnswer(chainLength, chainIndex);
    
    // if the same answer is generated as the previous one, ignore it   
    if (!freeplay) {
      var previousAnsersOfThisChain = previousAnswers[chainIndex];
      for (var i=0; i<previousAnsersOfThisChain.length; i++) {
        if (answer == previousAnsersOfThisChain[i]) {
          return createAnswer(chainLength, chainIndex);
        }
      }
    }

    lastSolution = chain.join('');
    solutions[chainIndex] = solutionIds;
    return answer;
  }

  // Main entry calls for interaction handling

  public.createChainAnswers = createChainAnswers = function() {
    clearAction();
    previousAnswers = [[],[],[],[]];
    clearPreviousValueForDisabledChains();
    for (var i=0; i<=3; i++) {
      if (availableChains[i])
        createChainAnswer(i);
    }
  }

  public.createChainAnswer = createChainAnswer = function(chainIndex, value, noAnim) {
    // pick a random chain
    if (freeplay) {
      var chainPossibilities = [0,0,1,1,1,2,2,3];
      chainIndex = Utils.draw(chainPossibilities);
    }

    var chainLength = chainIndex + 2;
    var answer = (typeof(value) == "number" && value * 1 >= 0)? value : createAnswer(chainLength, chainIndex);

    // always make the answer appear in the middle
    if (freeplay) chainIndex = 1;

    answers[chainIndex] = answer;
    previousAnswers[chainIndex].push(answer);

    // make previousAnswers not exceed count 3
    while (previousAnswers[chainIndex].length > 3)
      previousAnswers[chainIndex].splice(0, 1);

    var $answer = $($('#chains .values')[chainIndex]);
    var valueForInHTML = answer;
    if (valueForInHTML == 'X') valueForInHTML = '';

    $answer.attr('round', round).attr('value', valueForInHTML);
    if (animations && !noAnim) {
      $answer.append('<div class="value show">' + valueForInHTML + '</div>');
      if (value == 'X') {
        $answer.children('.value').last().addClass('finished');
        answers[chainIndex] = -999; // almost impossible to get to
      }

      $answer.children('.value.show').first().removeClass('show').addClass('hide');
      $answer.addClass('shift-up');
      setTimeout(function() {
        $answer.children('.value').first().remove();
        $answer.removeClass('shift-up');
      }, 1000);
    }
    else {
      var $firstAnswerEl = $answer.find('.value').first();
      $firstAnswerEl.html(valueForInHTML);
      if (value == 'X') {
        answers[chainIndex] = -999; // almost impossible to get to
        $firstAnswerEl.addClass('finished');
      }
      else
        $firstAnswerEl.removeClass('finished');

    }
  }

  function clearAction() {
    action = [];
    while (actionElements.length)
      removeActionFromChain();
    $currentOp = null;
    $currentNr = null;
    removeCast();
  }

  function trySolution(solutionChain) {
    if (!gameStarted) return trySolutionForIntro(solutionChain)
    var nr = calculateChain(solutionChain);

    // for freeplay mode, correct is always chain 1 (center view in easy mode)
    if (freeplay) {
      var isCorrect = answers[1] == nr;
      return isCorrect;
    }

    var solutionChainLength = solutionChain.join('').replace(/\D/g,'').length;
    var chainIndex = solutionChainLength - 2;
    var minChain = easy? 2 : 3;
    var maxChain = easy? 4 : 5;
    var isCorrect = solutionChainLength >= minChain && solutionChainLength <= maxChain && answers[chainIndex] == nr;
    if (isCorrect && tutorial == 1 && chainIndex > 0) isCorrect = false;
    return isCorrect;
  }

  function trySolutionForIntro(solutionChain) {
    var str = solutionChain.join('');
    switch (str) {
      case 'QUENTO':
      case 'Q42':
        return true;
        break;
    }
    return false;
  }

  function castSolution(solutionChain) {
    if (!gameStarted) return castSolutionForIntro(solutionChain)
    var isCorrect = trySolution(solutionChain);
    var solutionChainLength = solutionChain.join('').replace(/\D/g,'').length;
    var chainIndex = solutionChainLength - 2;
    if (isCorrect && !availableChains[chainIndex] && !freeplay)
      isCorrect = false;
    if (isCorrect) {
      stopHints();
      yay(chainIndex, true);
    }
    else
      Sound.play('wrong');
  }

  function castSolutionForIntro(solutionChain) {
    var isCorrect = trySolution(solutionChain);
    if (isCorrect) {

      var str = solutionChain.join('');
      var isQ = (str == 'Q42');
      $('#logo').html(isQ? getString('Q42'): 'QUENTO');
      $('#logo').removeClass('intro');
      $('#answer').html('').removeClass('show');
      $('html').removeClass('splash');
      $('#infobox').html(getString('getquento'));
      unselectActions();
      Sound.play(isQ? 'newboard': 'star');
      stopHints();
      unselectActions();
      setTimeout(function() {
        $('#game').addClass('hideText');
      }, 350);
      setTimeout(function(){
        start(isQ);
      }, 1000);
    }
  }

  var yay = public.yay = function(chainIndex, playSound) {
    stopHints();
    
    if (freeplay) {
      Sound.play('star');
      replaceUsedBoardNumbersInFreePlay();
      removeCast();
      createChainAnswer(chainIndex);
      return;
    }

    addStar(chainIndex);
    stopHints();
    if (stars[chainIndex] >= 3) {
      setTimeout(function(){finishedChain(chainIndex);}, 10);
      if (playSound)
        Sound.play('star');
    }
    else {
      createChainAnswer(chainIndex);
      if (playSound)
        Sound.play('correct');
    }
    removeCast();
  }

  function addStar(chainIndex) {
    var starsEl = $('#chain' + (chainIndex + 1) + ' .stars');
    var count = stars[chainIndex] = Math.min(3, stars[chainIndex] + 1);
    starsEl.removeClass().addClass('stars stars-' + count);
  }

  var setStars = public.setStars = function(chainIndex, starCount) {
    var starsEl = $('#chain' + (chainIndex + 1) + ' .stars');    
    starsEl.removeClass().addClass('stars stars-' + starCount);
    if (starCount == 3)
      createChainAnswer(chainIndex, 'X');
  }

  function addActionToChain($action) {
    actionElements.push($action);
    var selectedNrCount = actionElements.length? Math.ceil(actionElements.length / 2) : 0;
    $('#canvas').removeClass().addClass('nrs-selected-' + selectedNrCount);
    $('#answer').html(actionToCast().substr(0, 9));
    $('#answer').addClass('show');
  }

  function removeActionFromChain() {
    actionElements.pop();
    var selectedNrCount = actionElements.length? Math.ceil(actionElements.length / 2) : 0;
    $('#canvas').removeClass().addClass('nrs-selected-' + selectedNrCount);
    $('#answer').html(actionToCast());
    if (actionElements.length == 0)
      removeCast();
  }

  function removeCast() {
    $('#answer').removeClass('show');
  }

  // update locked / unlocked elements
  function updateContent() {
    $('#chain1, #chain2').addClass('unlocked');
    if (fullVersion)
      $('#chain3, #chain4').removeClass('locked').addClass('unlocked');
    else
      $('#chain3, #chain4').addClass('locked').removeClass('unlocked');

    for (i=0; i<availableChains.length; i++) {
      var enabled = availableChains[i], $chain = $('#chain' + (i + 1));
      if (enabled) {
        $chain.addClass('enabled').removeClass('disabled');
      }
      else {
        $chain.removeClass('enabled').addClass('disabled');
        if ($chain.find('.value').first().text() != 'X')
          $chain.find('.value').first().text('X');
      }
    }

    highestChainIndexForEasy = 0;
    for (var i=0; i<=2; i++)
      if (availableChains[i])
        highestChainIndexForEasy = i * 1;
    highestChainIndexForHard = 0;
    for (var i=1; i<=3; i++)
      if (availableChains[i])
        highestChainIndexForHard = i * 1;

    // make sure there are chains to go...
    var chainsToGo = 0;
    if (easy) {
      for (var i=0; i<=2; i++) {
        if (availableChains[i] && stars[i] < 3)
          chainsToGo++;
      }
    }
    if (!easy) {
      for (var i=1; i<=3; i++) {
        if (availableChains[i] && stars[i] < 3)
          chainsToGo++;
      }
    }
    // if the player closed a remaining chain for use, and the others were reached...
    if (chainsToGo == 0)
      finishedAllChains();
  }


  // Lower deck implementation follows

  function finishedChain(chainIndex) {
    // for tutorial mode at chain 2, leave tutorial mode
    if (tutorial == 2 && chainIndex == 1) {
      $('html').removeClass('tutorial-2').removeClass('tutorial').addClass('tutorial-end');
      tutorial = 0;
      setTimeout(function(){ $('html').removeClass('tutorial-end'); }, 10)
      stopHints();
    }

    // for tutorial mode at chain 1, go to chain 2
    if (tutorial == 1 && chainIndex == 0) {
      $('html').addClass('tutorial-2');
      tutorial = 2;      
      stopHints();
      hintStartTimeout = setTimeout(playSolution, 7500);
      setTimeout(function(){
        $('html').addClass('highlight-value-2');
      }, 2000);
      setTimeout(function(){
        $('html').addClass('de-highlight-value-2');
      }, 5000);
      setTimeout(function(){
        $('html').removeClass('de-highlight-value-2').removeClass('highlight-value-2');
      }, 8000);
    }
    
    createChainAnswer(chainIndex, 'X');
    var finishedAll = true;
    var minChainIndex = easy? 0 : 1;
    var maxChainIndex = easy? 3 : 4;
    for (var i=minChainIndex; i<maxChainIndex; i++) {
      if (!availableChains[i])
        continue;      
      if (stars[i] < 3)
        finishedAll = false;
    }
    if (finishedAll) {
      $('#game').addClass('hideText');
      setTimeout(finishedAllChains, 1400);
    }
  }

  var finishedAllChains = public.yay2 = function() {
    round++;
    
    var showTheTip = false;
    var tipNr = 1;
    
    if ((round + '') in tipAfterRound) {
      var tipNr = tipAfterRound[round + ''];
      showTheTip = true;
      if (tipNr == 3 && !isLocked()) 
        showTheTip = false;
    }

    if (showTheTip && tipNr > 0)
      showTip(tipNr);
    else
      flashText(getString('round') + ' ' + round);

    color = Utils.setColor(false, round-1);
    setTimeout(function() {
      newBoard();
    }, 10);
    setTimeout(function() {
      window.saveRound(round);
    }, 300);
    setTimeout(function() {
      window.saveColor(color);
    }, 800);
  }

  function newBoard() {
    drawingNewBoard = true;
    stars = [0,0,0,0];
    $('#chains .stars').removeClass().addClass('stars');
    dealNumbers();
    Sound.play('newboard');
    setTimeout(function(){    
      $('#game').removeClass('hideText');
      createChainAnswers();
      setTimeout(function(){
        drawingNewBoard = false;
      }, 750);
    }, 10);
  }

  // convert the current action array to a pretty string that can be put in the #answer balloon
  function actionToCast() {
    var s = action.join('');
    return s;
  }

  function touchStartOnGame(evt) {
    undone = false;
    drawing = true;
    $startedNr = $startedOp = null;
    var $hoverEl = $(evt.originalEvent.srcElement);

    //$hoverEl = getElementAtPointer(evt);

    if (!$hoverEl || !$hoverEl.length) return;

    var $nr = $hoverEl.closest('.number');

    if ($nr.length) {
      // see if this number should be treated as the first of a new action
      var treatAsFirstNumberOfNewAction = !allowNumber();
      if (!treatAsFirstNumberOfNewAction && $currentOp && $currentOp.length) {
        var pos = $nr.attr('data-pos');
        var allowed = pos in positions.operators[$currentOp.attr('data-pos')];
        if (!allowed)
          treatAsFirstNumberOfNewAction = true;
      }
      // if it's new, clear old stuff first
      if (treatAsFirstNumberOfNewAction) {
        clearAction();
        unselectActions();
      }
      // now go
      if (allowNumber()) {
        selectNumber($nr);
        $startedNr = $nr;
      }
    }
    var $op = $(evt.target).closest('.operator');
    if (allowOperator()) {
      if ($op.length) {
        selectOperator($op);
        $startedOp = $op;
      }
    }
    if (!$nr.length && !$op.length) {
      clearAction();
      unselectActions();
    }
  }

  function touchEndOnGame(evt) {    
    var $el = getElementAtPointer(evt);
    var tapped = !undone && checkForTaps($el);

    if (tapped) {
      // tapped twice on same element!
      if ($lastTappedEl && $lastTappedEl.length && $el && $el.length && $lastTappedEl.attr('id') == $el.attr('id')) {
        unselectActions();
        clearAction();
        $lastTappedEl = null;
        return;
      }
      $lastTappedEl = $el;
    }
    else {
      $lastTappedEl = null;
    }

    var canProceedAfterThis = hasNextActions();
    // at the end of each tap, see if the current chain matches any solutions
    if (tapped) {

      var isCorrect = trySolution(action);
      // when not correct and not tapped the max length of a chain
      if (!isCorrect && action.length < ((easy && gameStarted && !freeplay)? 7 : 9) && canProceedAfterThis)
        return;
      drawing = true;
    }
    unselectDelay = 0;
    if (drawing && action.length >= 3) {
      if (gameStarted && allowNumber()) {
        action.pop();
        removeActionFromChain();
      }
      castSolution(action);
      unselectDelay = 200;
    }
    setTimeout(unselectActions, unselectDelay);
    setTimeout(clearAction, unselectDelay);
    drawing = false;
  }

  function checkForTaps($hoverEl) {
    if (!$hoverEl || !$hoverEl.length) return;
    var tapped = false;
    if ($startedNr && $startedNr.length) {
      var $nr = $hoverEl.closest('.number');
      if ($nr.length && $nr.attr('id') == $startedNr.attr('id')) {
        tapped = true;
      }
    }
    if ($startedOp && $startedOp.length) {
      var $op = $hoverEl.closest('.operator');
      if ($op.length && $op.attr('id') == $startedOp.attr('id')) {
        tapped = true;
      }
    }
    if (tapped) {
      drawing = false;
    }
    return tapped;
  }

  function selectNumber($nr) {
    if (!drawing) return;
    if (!allowNumber()) return;
        nr = $nr.text(),
        pos = $nr.attr('data-pos');

    // don't allow to hover over already selected items, unless it was the previous one (length - 2)
    if ($nr.hasClass('selected') && actionElements[actionElements.length - 2]) {
      if ($nr.attr('id') != actionElements[actionElements.length - 2].attr('id'))
      return;
    }

    if ($currentNr && $currentNr.attr('id') == $nr.attr('id')) {
      unselectLastOperator();
      selectAction($currentNr);
      return;
    }

    var allowed = action.length == 0 || pos in positions.operators[$currentOp.attr('data-pos')];
    if (allowed) {
      $currentNr = $nr;
      action.push(nr);
      addActionToChain($nr);
      selectAction($currentNr);
    }
  }

  function selectOperator($op) {
    if (!drawing || action.length < 1) return;
    if (!allowOperator()) return;

    var op = $op.text(),
        opId = $op.attr('id'),
        pos = $op.attr('data-pos');

    // don't allow to hover over already selected items, unless it was the previous one (length - 2)
    if ($op.hasClass('selected')) {
      var testEl = actionElements[actionElements.length - 2];
      if (testEl && $op.attr('id') != testEl.attr('id'))
      return;
    }

    if ($currentOp && $currentOp.attr('id') == opId) {
      unselectLastNumber();
      selectAction($currentOp);
      return;
    }
    if (pos in positions.numbers[$currentNr.attr('data-pos')]) {
      $currentOp = $op;
      // if another operator was added to the action last, remove it
      if (!allowOperator()) {
        action.pop();
        removeActionFromChain();
      }
      action.push(op);
      addActionToChain($op);
      selectAction($currentOp);
    }
  }

  function unselectLastOperator() {
    undone = true;
    unselectAction($currentOp)
    $currentOp = null;
    action.pop();
    removeActionFromChain();
    for (var i=0; i<actionElements.length; i++) {
      if (actionElements[i].hasClass('operator'))
        $currentOp = actionElements[i];
    }
  }

  function unselectLastNumber() {
    undone = true;
    unselectAction($currentNr);
    $currentNr = null;
    action.pop();
    removeActionFromChain();
    for (var i=0; i<actionElements.length; i++) {
      if (actionElements[i].hasClass('number'))
        $currentNr = actionElements[i];
    }
  }

  function touchMoveOnGame(evt) {
    evt.preventDefault();
    if (!drawing) return;
    $hoverEl = getElementAtPointer(evt);
    if (!$hoverEl || !$hoverEl.length) return;
    var id = $hoverEl.attr('id');
    if ($hoverEl && $hoverEl != $currentHover) {
      $currentHover = $hoverEl;
      if (id.indexOf('nr') == 0)
        selectNumber($hoverEl);
      else
        selectOperator($hoverEl);
    }
    if (!$hoverEl)
      $currentHover = null;
  }

  function calculateChain(chain) {
    var answer = 0;
    if (chain.length && chain.length % 2 == 1) {
      for (var i = 0; i < chain.length; i++) {
        if (!i) answer = chain[i] * 1;
        else if (i % 2 == 0) {
          var nr = chain[i] * 1,
              op = chain[i - 1];
          if (op == '+') answer = answer + nr;
          if (op == '-') answer = answer - nr;
          if (op == '*') answer = answer * nr;
          if (op == '/') answer = answer / nr;
        }
      }
    }
    return answer;
  }

  function dealLogo() {
    var chars = ['Q', 4, 2, 'U', 'E', 'O', ' ', 'N', 'T'];
    for (i = 0; i<chars.length; i++) {
      var $el = $($('#game .box')[i]);
      dealNumberToEl($el, chars[i]);
    }
  }

  function playLogo() {
    var ids = ['nr-tl', 'op-l', 'nr-c', 'op-b', 'nr-br', 'op-r', 'next'];
    for (var i=0; i<ids.length; i++) {
      (function(i) {
        if (ids[i] == 'next') {
          hintStartTimeout = setTimeout(playLogo, 5000);
        }
        else {
          hintTimeouts[i] = setTimeout(function(){
            var id = ids[i];
            $('#' + ids[i]).removeClass('no-hint').addClass('hint');
          }, i * 350 + 400);
          hintTimeouts[10 + i] = setTimeout(function(){
            var id = ids[i];
            $('#' + ids[i]).addClass('no-hint').removeClass('hint');
          }, i * 350 + 1400);
        }
      })(i);
    }    
  }

  function stopHints() {
    clearTimeout(hintStartTimeout);
    for (var i=0; i<=30; i++) {
      if (hintTimeouts[i] && hintTimeouts[i] > 0) {
        clearTimeout(hintTimeouts[i]);
        hintTimeouts[i] = 0;
      }
    }
    hintStartTimeout = 0;
    $('.box').removeClass('no-hint').removeClass('hint');
  }


  // plays a solution to show what to do
  var playSolution = public.playSolution = function playSolution() {
    stopHints();
    var ids = [];
    if (tutorial > 0 && solutions.length > 0) {
      ids = solutions[tutorial - 1].slice();
      ids.push('repeat')
    }
    if (!ids.length) return;
    for (var i=0; i<ids.length; i++) {
      (function(i) {
        if (ids[i] == 'repeat') {
          hintStartTimeout = setTimeout(playSolution, 6000);
        }
        else {
          hintTimeouts[i] = setTimeout(function(){
            var id = ids[i];
            $('#' + ids[i]).removeClass('no-hint').addClass('hint');
          }, i * 350 + 400);
          hintTimeouts[10 + i] = setTimeout(function(){
            var id = ids[i];
            $('#' + ids[i]).addClass('no-hint').removeClass('hint');
          }, i * 350 + 1400);
        }
      })(i);
    }    
  }

  function prepareGame() {
    $('#op-t, #op-b').html('+');    
    $('#op-l, #op-r').html('-');
    var ids = ['nr-tl', 'op-l', 'nr-c', 'op-b', 'nr-br', 'op-r', 'animate-logo-up', 'start-game'];
  }

  function dealNumbers() {
    // fill the deck with numbers 1 to 9, each occuring once
    var occur = 1;
    deck = Utils.fillArray(1, 9, occur);
    for (var p in positions.numbers)
      dealNumber(p);
  }

  function dealNumber(pos, chr) {
    var $el = $('#nr-' + pos);
    dealNumberToEl($el, chr);
  }

  // draws a number from the deck, this allows for controlling the amount of re-occurring numbers
  function dealNumberToEl($el, chr) {
    if (!chr) chr = Utils.draw(deck);
    $el.text(chr).attr('data-nr', chr);
  }

  function allowNumber() {
    return action.length % 2 == 0;
  }

  function allowOperator() {
    return action.length % 2 == 1;
  }

  function hasNextActions() {
    // if the user still has chains locked, don't allow them to tap those amount of tiles (coz it's useless)
    
    if (gameStarted && !freeplay) {
      var chainIndexReached = Math.max(0, Math.floor((actionElements.length - 1) / 2) - 0);
      if (easy && chainIndexReached > highestChainIndexForEasy) return false;
      if (!easy && chainIndexReached > highestChainIndexForHard) return false;
      if (tutorial == 1 && actionElements.length >= 3) return false;
    }

    // fill a temp object with all used positions
    var usedPositions = {};
    for (var i=0; i<actionElements.length; i++)
      usedPositions[actionElements[i].attr('data-pos')] = true;

    // set the possible actions from the current (last) action, either a nr or op
    var allowedPositions = [];
    if (allowOperator() && $currentNr && $currentNr.length)
      allowedPositions = positions.numbers[$currentNr.attr('data-pos')];
    if (allowNumber() && $currentOp && $currentOp.length)
      allowedPositions = positions.operators[$currentOp.attr('data-pos')];

    // special situation: check if there's a next single operator at a dead end
    if (allowOperator()) {
      var remainingAllowedPositions = [];
      for (var pos in allowedPositions)
        if (!(pos in usedPositions))
          remainingAllowedPositions.push(pos);
      // so there's one final operator available...
      if (remainingAllowedPositions.length == 1) {
        var allowedPositionsForRemainingOperator = positions.operators[remainingAllowedPositions[0]];
        var stillOneAvailable = false;
        for (var pos in allowedPositionsForRemainingOperator)
          if (!(pos in usedPositions))
            stillOneAvailable = true;
        
        // so now if there would be one next operator which leads to no next numbers, this entire hasNextActions should return false!
        if (!stillOneAvailable)
          return false;
      }
    }

    // if an allowed position is not already used, it means there are next actions possible
    for (var pos in allowedPositions)
      if (!(pos in usedPositions))
        return true;

    return false;
  }

  function selectAction($action) {
    $selectedAction = $action;
    $selectedAction.addClass('selected');
    Sound.play('hover');
    var pos = $action.attr('data-pos');
    uncueAll();
    cueNext(pos);
    if (!gameStarted || tutorial > 0)
      $('html').removeClass('allow-hint');
    $('html').addClass('drawing');
  }

  function unselectAction() {
    uncueAll();
    if ($selectedAction == null) return;
    $selectedAction.removeClass('selected');
    $selectedAction = null;
  }

  function unselectActions() {
    $('#game .box').removeClass('selected').removeClass('cue');
    $selectedAction = null;
    if (!gameStarted || tutorial > 0)
      $('html').addClass('allow-hint');
    $('html').removeClass('drawing');
  }

  function cueNext(forId) {
    if (forId in positions.numbers) {
      var cueOps = positions.numbers[forId];
      for (var id in cueOps) {
        var $curEl = $('#op-' + id);
        $curEl.addClass('cue');
      }
    } else if (forId in positions.operators) {
      var cueNrs = positions.operators[forId];
      for (var id in cueNrs) {
        var $curEl = $('#nr-' + id);
        $curEl.addClass('cue');
      }
    }
  }

  function uncueAll() {
    $('#game .box').removeClass('cue');
  }

  function goEasy(noMsg) {
    easy = true;
    $('#chains').removeClass('hard').addClass('easy');
    if (!noMsg) {
      flashText(getString('easy'));
      Sound.play('difficulty');
    }
    var easyEnabled = (availableChains[0]? 1 : 0) + (availableChains[1]? 1 : 0) + (availableChains[2]? 1 : 0);
    if (easyEnabled == 0)
      toggleChain($('#chain1'));
  }

  function goHard(noMsg) {
    easy = false;
    $('#chains').removeClass('easy').addClass('hard');
    if (!noMsg) { 
      flashText(getString('hard'));
      Sound.play('difficulty');
    }
    var hardEnabled = (availableChains[1]? 1 : 0) + (availableChains[2]? 1 : 0) + (availableChains[3]? 1 : 0);
    if (hardEnabled == 0)
      toggleChain($('#chain2'));
  }

  function flashText(msg) {
    if (freeplay) {
      $('#message').removeClass('show');
      return;
    }
    if (messageTimeout)
      clearTimeout(messageTimeout);
    $('#message').html(msg);
    $('#message').addClass('show');
    messageTimeout = setTimeout(function(){$('#message').removeClass('show')}, 2500);
  }

  function toggleDifficulty() {
    if (easy) goHard();
    else goEasy();
  }

  function touchFinishedChain(evt) {
    if (noRefresh) 
      return;
    newBoard();
  }

  function getElementAtPointer(evt) {
    if (evt.originalEvent.changedTouches && evt.originalEvent.changedTouches.length > 0)
      evt = evt.originalEvent.changedTouches[0];
    else if (evt.originalEvent.touches && evt.originalEvent.touches.length > 0) 
      evt = evt.originalEvent.touches[0];
    var $el = null;
    var x = evt.pageX - offsets.canvas.left, 
        y = evt.pageY - offsets.canvas.top,
        id = '';
    for (id in offsets) {
      if (id == 'canvas') continue;
      var box = offsets[id], 
          isHovering = (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
      if (isHovering) {
        $el = $('#' + id);
        break;
      }
    }
    return $el;
  }



  function addSlidingToChains() {
  var sliding = startClientX = startPixelOffset = pixelOffset = 0;

  $('#chains').live('mousedown touchstart', slideStart);
  $('html').live('mouseup touchend', slideEnd);
  $('#chains').live('mousemove touchmove', slide);

  function slideStart(event) {
    if (event.originalEvent.touches)
      event = event.originalEvent.touches[0];
    if (sliding == 0) {
      sliding = 1;
      startClientX = event.clientX;
    }
  }

  function slide(event) {
    event.preventDefault();
    if (event.originalEvent.touches)
      event = event.originalEvent.touches[0];
    var deltaSlide = event.clientX - startClientX;

    if (sliding == 1 && deltaSlide != 0) {
      sliding = 2;
      //if (tutorial > 0) return;
      startPixelOffset = easy? 0 : -100;
      if (tutorial == 1) startPixelOffset = 200;
      if (tutorial == 2) startPixelOffset = 100;
      $('html').addClass('sliding');
      noRefresh = true;
      $('#freeplay .title').html(tutorial > 0? getString('skip') : getString('freeplay'));
    }

    if (sliding == 2) {
      //if (tutorial > 0) return;
      var touchPixelRatio = 1;
      var ds = Math.abs(deltaSlide) / 230;
      touchPixelRatio += ds;

      if (freeplay || tutorial > 0 || (easy && event.clientX > startClientX) || (!easy && event.clientX < startClientX))
        touchPixelRatio = 4;
      pixelOffset = startPixelOffset + deltaSlide / touchPixelRatio;

      if (tutorial > 0 && Math.abs(deltaSlide) > 0) {
        var darken = Math.min(1, Math.abs(deltaSlide) / 150);

        if (!$('#freeplay').hasClass('bringtofront'))
          $('#freeplay').addClass('bringtofront');
        Utils.cssVendor($('#freeplay'), 'opacity', darken);
        Utils.cssVendor($('#game'), 'opacity', 1 - darken);
      }
      else if (freeplay && pixelOffset < 0 && !$.browser.ie) {
        // TODO - do effect here for transitioning back to normal
      }
      else if (!tutorial && !freeplay && pixelOffset > 0 && !$.browser.ie) {
        var darken = Math.min(1, pixelOffset / 50);
        if (!$('#freeplay').hasClass('bringtofront'))
          $('#freeplay').addClass('bringtofront');
        Utils.cssVendor($('#freeplay'), 'opacity', darken);
        Utils.cssVendor($('#game'), 'opacity', 1 - darken);
      } else {
        if ($('#freeplay').hasClass('bringtofront'))
          $('#freeplay').removeClass('bringtofront');
      }
      
      Utils.cssVendor($('#chains'), 'transform', 'translate(' + pixelOffset + 'px,0)');
    }
  }

  function slideEnd(event) {
    setTimeout(function(){
      noRefresh = false;
    }, 250);
    if (sliding == 2) {
      if (!tutorial && !freeplay && pixelOffset > 25 && !$.browser.ie) {            
        var darken = Math.min(1, pixelOffset / 50);
        if (darken > 0.5) {
          sliding = 0;
          enableFreePlay();        
          $('html').removeClass('sliding');
          Utils.cssVendor($('#chains'), 'transform', '');
          setTimeout(function(){
            Utils.cssVendor($('#freeplay'), 'opacity', '');
            Utils.cssVendor($('#game'), 'opacity', 1);
          }, 1000)
          return;
        } 
      }
      else if (freeplay) {
        sliding = 0;
        $('html').removeClass('sliding');
        Utils.cssVendor($('#chains'), 'transform', '');
        var darken = Math.min(1, Math.abs(pixelOffset / 50));
        if (darken > 0.7)
          disableFreePlay();
        return;
      }
      else if (tutorial > 0) {
        var darken = Math.min(1, Math.abs((pixelOffset - startPixelOffset) / 50));
        sliding = 0;
        pixelOffset = 0;
        if (darken > 0.5)
          skipTutorial();
        $('html').removeClass('sliding');
        Utils.cssVendor($('#chains'), 'transform', '');
        Utils.cssVendor($('#freeplay'), 'opacity', '');
        Utils.cssVendor($('#game'), 'opacity', 1);
        $('#freeplay').removeClass('bringtofront');
        return;
      }
      else {
        var targetEasy = (pixelOffset < -50)? false : true;
        pixelOffset = 0;
        $('html').removeClass('sliding');
        Utils.cssVendor($('#chains'), 'transform', '');
        Utils.cssVendor($('#freeplay'), 'opacity', '');
        Utils.cssVendor($('#game'), 'opacity', 1);
        if (easy != targetEasy)
          toggleDifficulty();
      }
    }
    sliding = 0;
  }
  }

  // fired when the user unlocked the game, or when the system detected it needs to unlock
  var unlock = public.unlock = function unlock(silent) {
    fullVersion = true;
    availableChains[2] = true;
    availableChains[3] = true;
    updateContent();
    unlocking = false;
    if (!silent) {
      showTip(2);
      createChainAnswer(2);
      createChainAnswer(3);
    }
  }

  // fired when the user tapped the lock but decided to chicken out
  var chicken = public.chicken = function chicken() {
    unlocking = false;
  }

  function toggleInfo(evt) {
    if (freeplay) {      
      disableFreePlay();
      return Utils.eat(evt);  
    }

    if ($('#info:visible').length > 0)
      hideInfoPanel();
    else
      showInfoPanel();
    return Utils.eat(evt);
  }

  var shake = public.shake = function() {
    if (tutorial > 0) return;
    if (drawingNewBoard) return;
    newBoard();
    clearAction();
    unselectActions();
  };

  function clickLock(evt) {
    if (freeplay) return;
    if (noRefresh) return;
    if (unlocking) return;
    unlocking = true;
    setTimeout(window.unlockFullGame, 10);
  }

  function clickChain(evt) {
    if (freeplay || tutorial || noRefresh) return;
    var $chain = $(evt.srcElement || evt.target).closest('.chainbox');
    toggleChain($chain);
  }

  function toggleChain($chain) {
    if ($chain.hasClass('locked')) return;
    if ($chain.find('.value.finished').length > 0) return;

    var isEnabled = $chain.hasClass('enabled');
    var chainIndex = $chain.attr('id').replace(/\D/g,'') * 1 - 1;
    var easyEnabled = (availableChains[0]? 1 : 0) + (availableChains[1]? 1 : 0) + (availableChains[2]? 1 : 0);
    var hardEnabled = (availableChains[1]? 1 : 0) + (availableChains[2]? 1 : 0) + (availableChains[3]? 1 : 0);
    if (isEnabled) {
      if ((easy && easyEnabled > 1) || (!easy && hardEnabled > 1))
        availableChains[chainIndex] = false;
      // else follows a very specific case: when easy and the game is locked and disabling the final chain, toggle!!!
      else if (!fullVersion && easy && easyEnabled == 1) {
        availableChains[chainIndex] = false;
        if (chainIndex == 0) toggleChain($('#chain2'));
        else toggleChain($('#chain1'));
      }
    }
    else {
      availableChains[chainIndex] = true;
      var previousChainRound = $chain.find('.values').attr('round') * 1;
      var previousChainValue = $chain.find('.values').attr('value') * 1;
      if (previousChainRound == round && previousChainValue >= 0)
        createChainAnswer(chainIndex, previousChainValue, true);
      else
        createChainAnswer(chainIndex, false, true);
    }
    updateContent();
  }

  function detectPurchases() {
    if (window.isUnlocked())
      unlock(true);
  }

  function enableFreePlay() {
    easy = true;
    $('#chains').removeClass('hard').addClass('easy');
    freeplay = true;
    $('html').addClass('freeplay').addClass('nochainanims');
    $('#logo').html(getString('freeplay'));    
    $('.value').html(' ');
    createChainAnswers();
    Sound.play('freeplay');
    setTimeout(function() {
      $('html').removeClass('nochainanims');
    }, 10)
  }

  function disableFreePlay() {
    freeplay = false;
    $('html').addClass('closingfreeplay').addClass('nochainanims');
    $('html').removeClass('freeplay');    
    $('#game').addClass('hide-text');
    $('#logo').html('QUENTO');                
    $('.value').html(' ');
    setTimeout(function(){
      createChainAnswers();
      updateContent();
      // visually restore any big stars in normal play mode
      for (var i=0; i<stars.length; i++) {
        if (stars[i] >= 3) {
          $('#chain' + (i + 1) + ' .value').first().html(' ');
          $('#chain' + (i + 1) + ' .value').last().addClass('finished');
          answers[i] = -999; // almost impossible to get to
        }
      }

      $('#game').removeClass('hide-text');      
      $('html').removeClass('closingfreeplay');    
      setTimeout(function() {
        $('html').removeClass('nochainanims');
      }, 300);
    }, 800);
  }

  function replaceUsedBoardNumbersInFreePlay() {
    var unusedPos = ['tl', 'tr', 'c', 'bl', 'br'];
    var usedPos = [];
    var deck = Utils.fillArray(1, 9, 1);
    var unusedNrs = [];
    $(actionElements).each(function() {
      if ($(this).hasClass('number')) {
        var pos = $(this).attr('data-pos');
        usedPos.push(pos);
        Utils.draw(unusedPos, pos);
      }
    });

    for (var i=0; i<unusedPos.length; i++) {
      var unusedNr = $('.box[data-pos="' + unusedPos[i] + '"]').text() * 1;
      Utils.draw(deck, unusedNr);
    }

    for (var i=0; i<usedPos.length; i++) {
      var unusedNr = $('.box[data-pos="' + unusedPos[i] + '"]').text() * 1;
      var newNr = Utils.draw(deck);
      dealNumber(usedPos[i], newNr);
    }
  }

  var showTip = public.showTip = function showTip(nr) {
    if (!nr) nr = 1;
    $('#tip').addClass('bringtofront');
    $('#tiptext1').html(getString('tiptext' + nr + '_1'));
    $('#tiptext2').html(getString('tiptext' + nr + '_2'));
    $('html').addClass('showtip');
  }

  function hideTip() {
    $('html').removeClass('showtip');
    setTimeout(function() {
      $('#tip').removeClass('bringtofront');
    }, 400);
  }

  function closeTip() {
    hideTip();
    flashText(getString('round') + ' ' + round);
  }

  var skipTutorial = public.skipTutorial = function() {
    // for tutorial mode at chain 2, leave tutorial mode
    $('html').removeClass('tutorial-2').removeClass('tutorial').addClass('tutorial-end');
    tutorial = 0;
    setTimeout(function(){ $('html').removeClass('tutorial-end'); }, 10)
    stopHints();
    finishedAllChains();  
  }

  function isLocked() {
    return $('.chainbox.locked').length > 0;
  }

  // when a chain was disabled, the round and value were stored for reuse. This removes them.
  function clearPreviousValueForDisabledChains() {
    $('.values[round]').attr('round', '').attr('value', '');
  }


  public.disableAnimations = function() {
    $('html').addClass('NEVER-ANIMATE');
    animations = false;
  }

  public.backPressed = function() {
    if ($('#info:visible').length > 0)
      hideInfoPanel();
  }

  function hideInfoPanel() {
    window.releaseBackButton();
    $('#info').hide();
    $('html').removeClass('info').addClass('game');
    setTimeout(function() {
      $('html').removeClass('noanimlogo');
    }, 10);
  }

  function showInfoPanel() {
    window.claimBackButton();
    $('html').removeClass('game').addClass('info').addClass('noanimlogo');
    $('#info').show();
  }

  public.answers = answers
  return public;
} ();