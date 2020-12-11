H5P.PairGame = (function (EventDispatcher, $) {

  // We don't want to go smaller than 100px per card(including the required margin)
  var CARD_MIN_SIZE = 100; // PX
  var CARD_STD_SIZE = 116; // PX
  var STD_FONT_SIZE = 16; // PX
  var LIST_PADDING = 1; // EMs
  var numInstances = 0;

  /**
   * Pair Game Constructor
   *
   * @class H5P.PairGame
   * @extends H5P.EventDispatcher
   * @param {Object} parameters
   * @param {Number} id
   */
  function PairGame(parameters, id) {
    /** @alias H5P.PairGame# */
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    var selectedpair, timer, popup, $top, $taskComplete, $feedback, $wrapper, maxWidth, numCols;
    var pairs = [];
    var leftpairs = [];
    var rightpairs = [];
    var unselectedpairs = []; // Que of pairs to be unselected
    var numSelected = 0;
    var removed = 0;
    numInstances++;

    // Add defaults
    parameters = $.extend(true, {
      l10n: {
        timeSpent: 'Time spent',
        feedback: 'Good work!',
        tryAgain: 'Reset',
        closeLabel: 'Close',
        label: 'PairGame. Find the matching pairs.',
        done: 'All of the pairs have been found.',
        pairPrefix: 'Pair %num: ',
        pairUnturned: 'Unturned.',
        pairMatched: 'Match found.'
      }
    }, parameters);

    /**
     * Check if these two pairs belongs together.
     *
     * @private
     * @param {H5P.PairGame.Pair} pair
     * @param {H5P.PairGame.Pair} second
     * @param {H5P.PairGame.Pair} correct
     */
    var check = function (pair, second, correct) {
      if (second !== correct) {
        // Incorrect, must be scheduled for unselected
        unselectedpairs.push(pair);
        unselectedpairs.push(second);

        // Wait for next click to unselect them.
        if (numSelected > 2) {
          // or do it straight away
          processUnselect();
        }
        return;
      }

      // Update counters
      numSelected -= 2;
      removed += 2;

      var isFinished = (removed === pairs.length);

      // Remove them from the game.
      pair.remove(!isFinished);
      second.remove();

      var desc = pair.getFeedback();
      if (desc !== undefined) {
        // Pause timer and show desciption.
        timer.pause();

        var imgs = [];
        if (second.getImage()) {
          imgs.push(second.getImage());
        }
        if (pair.getImage()) {
          imgs.push(pair.getImage());
        }

        var texts = [];
        if (second.getText()) {
          texts.push(second.getText());
        }
        if (pair.getText()) {
          texts.push(pair.getText());
        }

        popup.show(desc, imgs, texts, cardStyles, function (refocus) {
          if (isFinished) {
            // Game done
            pair.makeUntabbable();
            finished();
          }
          else {
            // Popup is closed, continue.
            timer.play();

            if (refocus) {
              pair.setFocus();
            }
          }
        });
      }
      else if (isFinished) {
        // Game done
        pair.makeUntabbable();
        finished();
      }
    };

    /**
     * Game has finished!
     * @private
     */
    var finished = function () {
      timer.stop();
      $taskComplete.show();
      $feedback.addClass('h5p-show'); // Announce
      $top.focus();

      // Create and trigger xAPI event 'completed'
      var completedEvent = self.createXAPIEventTemplate('completed');
      completedEvent.setScoredResult(1, 1, self, true, true);
      completedEvent.data.statement.result.duration = 'PT' + (Math.round(timer.getTime() / 10) / 100) + 'S';
      self.trigger(completedEvent);

      if (parameters.behaviour && parameters.behaviour.allowRetry) {
        // Create retry button
        var retryButton = createButton('reset', parameters.l10n.tryAgain || 'Reset', function () {
          // Trigger handler (action)

          retryButton.classList.add('h5p-pair-transout');
          setTimeout(function () {
            // Remove button on nextTick to get transition effect
            $wrapper[0].removeChild(retryButton);
          }, 300);

          resetGame();
        });
        retryButton.classList.add('h5p-pair-transin');
        setTimeout(function () {
          // Remove class on nextTick to get transition effectupd
          retryButton.classList.remove('h5p-pair-transin');
        }, 0);

        // Same size as pairs
        retryButton.style.fontSize = (parseFloat($wrapper.children('ul')[0].style.fontSize) * 0.75) + 'px';

        $wrapper[0].appendChild(retryButton); // Add to DOM
      }
    };

    /**
     * Shuffle the pairs and restart the game!
     * @private
     */
    var resetGame = function () {

      // Reset pairs
      removed = 0;

      // Remove feedback
      $feedback[0].classList.remove('h5p-show');
      $taskComplete.hide();

      // Reset timer
      timer.reset();

      // Randomize pairs
      H5P.shuffleArray(rightpairs);

      setTimeout(function () {
        // Re-append to DOM after unselecting
        for (var i = 0; i < rightpairs.length; i++) {
          rightpairs[i].reAppend();
        }
        for (var j = 0; j < pairs.length; j++) {
          pairs[j].reset();
        }

        // Scale new layout
        $wrapper.children('ul').children('.h5p-row-break').removeClass('h5p-row-break');
        maxWidth = -1;
        self.trigger('resize');
        leftpairs[0].setFocus();
      }, 600);
    };

    /**
     * Game has finished!
     * @private
     */
    var createButton = function (name, label, action) {
      var buttonElement = document.createElement('div');
      buttonElement.classList.add('h5p-pair-' + name);
      buttonElement.innerHTML = label;
      buttonElement.setAttribute('role', 'button');
      buttonElement.tabIndex = 0;
      buttonElement.addEventListener('click', function () {
        action.apply(buttonElement);
      }, false);
      buttonElement.addEventListener('keypress', function (event) {
        if (event.which === 13 || event.which === 32) { // Enter or Space key
          event.preventDefault();
          action.apply(buttonElement);
        }
      }, false);
      return buttonElement;
    };

    /**
     * Adds pairs to pair list and set up a select listener.
     *
     * @private
     * @param {H5P.PairGame.Pair} pair
     * @param {H5P.PairGame.Pair} second
     * @param {boolean} save
     */
    var addPair = function (pair, second, save) {
      if (save) {
        leftpairs.push(pair);
        rightpairs.push(second);
      }
      pair.on('selectpair', function () {
        // Always return focus to the pair last selected
        for (var i = 0; i < pairs.length; i++) {
          pairs[i].makeUntabbable();
        }
        pair.makeTabbable();

        popup.close();
        self.triggerXAPI('interacted');
        // Keep track of time spent
        timer.play();

        // Keep track of the number of selected pairs
        numSelected++;

        // Announce the pair unless it's the last one and it's correct
        var isMatched = (selectedpair === second);
        var isLast = ((removed + 2) === pairs.length);
        pair.updateLabel(isMatched, !(isMatched && isLast));

        if (selectedpair !== undefined) {
          var selectedold = selectedpair;
          // Reset the selected pair.
          selectedpair = undefined;

          setTimeout(function () {
            check(pair, selectedold, second);
          }, 100);
        }
        else {
          if (unselectedpairs.length > 1) {
            // Unselect any selected pairs
            processUnselect();
          }

          // Keep track of the selected pair.
          selectedpair = pair;
        }
      });

      /**
       * Create event handler for moving focus to the next or the previous
       * pair on the table.
       *
       * @private
       * @param {number} direction +1/-1
       * @return {function}
       */
      var createPairChangeFocusHandler = function (direction) {
        return function () {
          // Locate next pair
          for (var i = 0; i < pairs.length; i++) {
            if (pairs[i] === pair) {
              // Found current pair

              var nextPair, fails = 0;
              do {
                fails++;
                nextPair = pairs[i + (direction * fails)];
                if (!nextPair) {
                  return; // No more pairs
                }
              }
              while (nextPair.isRemoved());

              pair.makeUntabbable();
              nextPair.setFocus();

              return;
            }
          }
        };
      };

      // Register handlers for moving focus to next and previous pair
      pair.on('next', createPairChangeFocusHandler(1));
      pair.on('prev', createPairChangeFocusHandler(-1));

      /**
       * Create event handler for moving focus to the first or the last pair
       * on the table.
       *
       * @private
       * @param {number} direction +1/-1
       * @return {function}
       */
      var createEndPairFocusHandler = function (direction) {
        return function () {
          var focusSet = false;
          for (var i = 0; i < pairs.length; i++) {
            var j = (direction === -1 ? pairs.length - (i + 1) : i);
            if (!focusSet && !pairs[j].isRemoved()) {
              pairs[j].setFocus();
              focusSet = true;
            }
            else if (pairs[j] === pair) {
              pair.makeUntabbable();
            }
          }
        };
      };

      // Register handlers for moving focus to first and last pair
      pair.on('first', createEndPairFocusHandler(1));
      pair.on('last', createEndPairFocusHandler(-1));

      pairs.push(pair);
    };

    /**
     * Will unselect two and two pairs
     */
    var processUnselect = function () {
      unselectedpairs[0].unselect();
      unselectedpairs[1].unselect();
      unselectedpairs.splice(0, 2);
      numSelected -= 2;
    };

    /**
     * @private
     */
    var getPairsToUse = function () {
      return parameters.pairs;
    };

    var cardStyles, invertShades, pairOne, pairTwo;
    if (parameters.lookNFeel) {
      cardStyles = PairGame.Pair.determineStyles(parameters.lookNFeel.backgroundColor, parameters.lookNFeel.fontColor);
    }

    // Initialize pairs.
    var pairsToUse = getPairsToUse();
    for (var i = 0; i < pairsToUse.length; i++) {
      var pairParams = pairsToUse[i];
      if (PairGame.Pair.isValid(pairParams)) {
        // Create first pair
        if (pairParams.pairType == "images" || pairParams.pairType == "mixed") {
          pairOne = new PairGame.Pair(pairParams.pairingimage, id, pairParams.pairingimagealt, '', parameters.l10n, pairParams.feedback, cardStyles);
        } else {
          pairOne = new PairGame.Pair(null, id, null, pairParams.pairingtext, parameters.l10n, pairParams.feedback, cardStyles);
        }
        if (pairParams.pairType == "images") {
          pairTwo = new PairGame.Pair(pairParams.matchingimage, id, pairParams.matchingimagealt, pairParams.matchingtext, parameters.l10n, pairParams.feedback, cardStyles);
        } else {
          pairTwo = new PairGame.Pair(null, id, null, pairParams.matchingtext, parameters.l10n, pairParams.feedback, cardStyles);
        }

        // Add pairs to pair list for shuffeling
        addPair(pairOne, pairTwo, true);
        addPair(pairTwo, pairOne, false);
      }
    }
    H5P.shuffleArray(leftpairs);
    H5P.shuffleArray(rightpairs);

    /**
     * Attach this game's html to the given container.
     *
     * @param {H5P.jQuery} $container
     */
    self.attach = function ($container) {
      this.triggerXAPI('attempted');
      // TODO: Only create on first attach!
      $wrapper = $container.addClass('h5p-pair-game').html('');
      if (invertShades === -1) {
        $container.addClass('h5p-invert-shades');
      }

      // Add pairs to list
      var $leftlist = $('<ul/>', {
        role: 'application',
        'aria-labelledby': 'h5p-intro-' + numInstances
      });
      for (var i = 0; i < leftpairs.length; i++) {
        leftpairs[i].appendTo($leftlist);
      }
      var $rightlist = $('<ul/>', {
        role: 'application',
        'aria-labelledby': 'h5p-intro-' + numInstances
      });
      for (var i = 0; i < rightpairs.length; i++) {
        rightpairs[i].appendTo($rightlist);
      }

      if ($leftlist.children().length) {
        $top = $('<div/>', {
          'class': 'h5p-programatically-focusable',
          tabindex: '-1',
          appendTo: $container
        });
        $taskComplete = $('<div/>', {
          'class': 'h5p-pair-complete h5p-pair-hidden-read',
          html: parameters.l10n.done,
          appendTo: $top
        });

        $feedback = $('<div class="h5p-feedback">' + parameters.l10n.feedback + '</div>').appendTo($top);

        // Add status bar
        var $status = $('<dl class="h5p-status">' +
                        '<dt>' + parameters.l10n.timeSpent + ':</dt>' +
                        '<dd class="h5p-time-spent"><time role="timer" datetime="PT0M0S">0:00</time><span class="h5p-pair-hidden-read">.</span></dd>' +
                        '</dl>').appendTo($top);

        timer = new PairGame.Timer($status.find('time')[0]);
        popup = new PairGame.Popup($container, parameters.l10n);

        $('<div/>', {
          id: 'h5p-intro-' + numInstances,
          'class': 'h5p-pair-hidden-read',
          html: parameters.l10n.label,
          appendTo: $container
        });
        $leftlist.appendTo($container);
        $rightlist.appendTo($container);

        $container.click(function () {
          popup.close();
        });
      }
    };

    /**
     * Will try to scale the game so that it fits within its container.
     * Puts the pairs into a grid layout to make it as square as possible –
     * which improves the playability on multiple devices.
     *
     * @private
     */
    var scaleGameSize = function () {

      // Check how much space we have available
      var $list = $wrapper.children('ul');

      var newMaxWidth = parseFloat(window.getComputedStyle($list[0]).width);
      if (maxWidth === newMaxWidth) {
        return; // Same size, no need to recalculate
      }
      else {
        maxWidth = newMaxWidth;
      }

      // Get the pair holders
      var $elements = $list.children();
      if ($elements.length < 4) {
        return; // No need to proceed
      }

      // Determine the optimal number of columns
      var newNumCols = Math.ceil(Math.sqrt($elements.length));

      // Do not exceed the max number of columns
      var maxCols = Math.floor(maxWidth / CARD_MIN_SIZE);
      if (newNumCols > maxCols) {
        newNumCols = maxCols;
      }

      if (numCols !== newNumCols) {
        // We need to change layout
        numCols = newNumCols;

        // Calculate new column size in percentage and round it down (we don't
        // want things sticking out…)
        var colSize = Math.floor((100 / numCols) * 10000) / 10000;
        $elements.css('width', colSize + '%').each(function (i, e) {
          if (i === numCols) {
            $(e).addClass('h5p-row-break');
          }
        });
      }

      // Calculate how much one percentage of the standard/default size is
      var onePercentage = ((CARD_STD_SIZE * numCols) + STD_FONT_SIZE) / 100;
      var paddingSize = (STD_FONT_SIZE * LIST_PADDING) / onePercentage;
      var cardSize = (100 - paddingSize) / numCols;
      var fontSize = (((maxWidth * (cardSize / 100)) * STD_FONT_SIZE) / CARD_STD_SIZE);

      // We use font size to evenly scale all parts of the pairs.
      $list.css('font-size', fontSize + 'px');
      popup.setSize(fontSize);
      // due to rounding errors in browsers the margins may vary a bit…
    };

    if (parameters.behaviour && parameters.behaviour.useGrid && pairsToUse.length) {
      self.on('resize', scaleGameSize);
    }
  }

  // Extends the event dispatcher
  PairGame.prototype = Object.create(EventDispatcher.prototype);
  PairGame.prototype.constructor = PairGame;

  /**
   * Determine color contrast level compared to white(#fff)
   *
   * @private
   * @param {string} color hex code
   * @return {number} From 1 to Infinity.
   */
  var getContrast = function (color) {
    return 255 / ((parseInt(color.substr(1, 2), 16) * 299 +
                   parseInt(color.substr(3, 2), 16) * 587 +
                   parseInt(color.substr(5, 2), 16) * 144) / 1000);
  };

  return PairGame;
})(H5P.EventDispatcher, H5P.jQuery);
