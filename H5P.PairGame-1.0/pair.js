(function (PairGame, EventDispatcher, $) {

  /**
   * Controls all the operations for each pair.
   *
   * @class H5P.PairGame.Pair
   * @extends H5P.EventDispatcher
   * @param {Object} image
   * @param {number} id
   * @param {string} alt
   * @param {string} text
   * @param {Object} l10n Localization
   * @param {string} [feedback]
   * @param {Object} [styles]
   */
  PairGame.Pair = function (image, id, alt, text, l10n, feedback, styles) {
    /** @alias H5P.PairGame.Pair# */
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    var path, width, height, $pair, $wrapper, removedState, selectedState;

    if (image && image.path) {
      path = H5P.getPath(image.path, id);

      if (image.width !== undefined && image.height !== undefined) {
        if (image.width > image.height) {
          width = '100%';
          height = 'auto';
        }
        else {
          height = '100%';
          width = 'auto';
        }
      }
      else {
        width = height = '100%';
      }
    }

    /**
     * Update the pairs label to make it accessible to users with a readspeaker
     *
     * @param {boolean} isMatched The pair has been matched
     * @param {boolean} announce Announce the current state of the pair
     * @param {boolean} reset Go back to the default label
     */
    self.updateLabel = function (isMatched, announce, reset) {

      // Determine new label from input params
      var label = (reset ? l10n.pairUnturned : alt);
      if (isMatched) {
        label = l10n.pairMatched + ' ' + label;
      }

      // Update the pair's label
      $wrapper.attr('aria-label', l10n.pairPrefix.replace('%num', $wrapper.index() + 1) + ' ' + label);

      // Update disabled property
      $wrapper.attr('aria-disabled', reset ? null : 'true');

      // Announce the label change
      if (announce) {
        $wrapper.blur().focus(); // Announce pair label
      }
    };

    /**
     * Select pair.
     */
    self.select = function () {
      if (selectedState) {
        $wrapper.blur().focus(); // Announce pair label again
        return;
      }

      $pair.addClass('h5p-selected');
      self.trigger('selectpair');
      selectedState = true;
    };

    /**
     * Unselect pair.
     */
    self.unselect = function () {
      self.updateLabel(null, null, true); // Reset pair label
      $pair.removeClass('h5p-selected');
      selectedState = false;
    };

    /**
     * Remove.
     */
    self.remove = function () {
      $pair.addClass('h5p-selected');
      $pair.addClass('h5p-matched');
      removedState = true;
    };

    /**
     * Reset pair to natural state
     */
    self.reset = function () {
      self.updateLabel(null, null, true); // Reset pair label
      selectedState = false;
      removedState = false;
      $pair[0].classList.remove('h5p-matched');
      $pair[0].classList.remove('h5p-selected');
    };

    /**
     * Get pair feedback.
     *
     * @returns {string}
     */
    self.getFeedback = function () {
      return feedback;
    };

    /**
     * Get image clone.
     *
     * @returns {H5P.jQuery}
     */
    self.getImage = function () {
      if ($pair.find('img').length > 0) {
        return $pair.find('img').clone();
      }
      return false;
    };

    /**
     * Get Text clone.
     *
     * @returns {H5P.jQuery}
     */
    self.getText = function () {
      if ($pair.find('div.pairtext').length > 0) {
        return $pair.find('div.pairtext').clone();
      }
      return false;
    };

    /**
     * Append pair to the given container.
     *
     * @param {H5P.jQuery} $container
     */
    self.appendTo = function ($container) {
      $wrapper = $('<li class="h5p-pair-wrap" tabindex="-1" role="button"><div class="h5p-pair-card">' +
                  '<div class="h5p-card" ' + styles + '>' +
                    (path ?
                        '<img src="' + path + '" alt="' + alt + '" style="width:' + width + ';height:' + height + '"/>'
                        : '<div class="pairtext">' + text + '</div>'
                    ) +
                  '</div>' +
                '</div></li>')
        .appendTo($container)
        .on('keydown', function (event) {
          switch (event.which) {
            case 13: // Enter
            case 32: // Space
              self.select();
              event.preventDefault();
              return;
            case 39: // Right
            case 40: // Down
              // Move focus forward
              self.trigger('next');
              event.preventDefault();
              return;
            case 37: // Left
            case 38: // Up
              // Move focus back
              self.trigger('prev');
              event.preventDefault();
              return;
            case 35:
              // Move to last pair
              self.trigger('last');
              event.preventDefault();
              return;
            case 36:
              // Move to first pair
              self.trigger('first');
              event.preventDefault();
              return;
          }
        });

      $wrapper.attr('aria-label', l10n.pairPrefix.replace('%num', $wrapper.index() + 1) + ' ' + l10n.pairUnturned);
      $pair = $wrapper.children('.h5p-pair-card')
        .children('.h5p-card')
          .click(function () {
            self.select();
          })
          .end();
    };

    /**
     * Re-append to parent container.
     */
    self.reAppend = function () {
      var parent = $wrapper[0].parentElement;
      parent.appendChild($wrapper[0]);
    };

    /**
     * Make the pair accessible when tabbing
     */
    self.makeTabbable = function () {
      if ($wrapper) {
        $wrapper.attr('tabindex', '0');
      }
    };

    /**
     * Prevent tabbing to the pair
     */
    self.makeUntabbable = function () {
      if ($wrapper) {
        $wrapper.attr('tabindex', '-1');
      }
    };

    /**
     * Make pair tabbable and move focus to it
     */
    self.setFocus = function () {
      self.makeTabbable();
      if ($wrapper) {
        $wrapper.focus();
      }
    };

    /**
     * Check if the pair has been removed from the game, i.e. if has
     * been matched.
     */
    self.isRemoved = function () {
      return removedState;
    };
  };

  // Extends the event dispatcher
  PairGame.Pair.prototype = Object.create(EventDispatcher.prototype);
  PairGame.Pair.prototype.constructor = PairGame.Pair;

  /**
   * Check to see if the given object corresponds with the semantics for
   * a pairing game.
   *
   * @param {object} params
   * @returns {boolean}
   */
  PairGame.Pair.isValid = function (params) {
    if (params === undefined) return false;
    if (params.pairingimage === undefined && params.pairingtext === undefined) return false;
    if (params.pairingimage !== undefined && params.pairingimage.path === undefined) return false;
    if (params.matchingimage === undefined && params.matchingtext === undefined) return false;
    if (params.matchingimage !== undefined && params.matchingimage.path === undefined) return false;

    return true;
  };

  /**
   * Determines the theme for how the pair should look
   *
   * @param {string} backgroundcolor
   * @param {string} fontcolor
   */
  PairGame.Pair.determineStyles = function (backgroundcolor, fontcolor) {
    var styles =  'style = "background-color: ' + backgroundcolor + '; color: ' + fontcolor + '"';

    return styles;
  };

  /**
   * Convert hex color into shade depending on given percent
   *
   * @private
   * @param {string} color
   * @param {number} percent
   * @return {string} new color
   */
  var shade = function (color, percent) {
    var newColor = '#';

    // Determine if we should lighten or darken
    var max = (percent < 0 ? 0 : 255);

    // Always stay positive
    if (percent < 0) {
      percent *= -1;
    }
    percent /= 100;

    for (var i = 1; i < 6; i += 2) {
      // Grab channel and convert from hex to dec
      var channel = parseInt(color.substr(i, 2), 16);

      // Calculate new shade and convert back to hex
      channel = (Math.round((max - channel) * percent) + channel).toString(16);

      // Make sure to always use two digits
      newColor += (channel.length < 2 ? '0' + channel : channel);
    }

    return newColor;
  };

})(H5P.PairGame, H5P.EventDispatcher, H5P.jQuery);
