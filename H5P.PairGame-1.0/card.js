(function (PairGame, EventDispatcher, $) {

  /**
   * Controls all the operations for each card.
   *
   * @class H5P.PairGame.Card
   * @extends H5P.EventDispatcher
   * @param {Object} image
   * @param {number} id
   * @param {string} alt
   * @param {Object} l10n Localization
   * @param {string} [feedback]
   * @param {Object} [styles]
   */
  PairGame.Card = function (image, id, alt, l10n, feedback, styles) {
    /** @alias H5P.PairGame.Card# */
    var self = this;

    // Initialize event inheritance
    EventDispatcher.call(self);

    var path, width, height, $card, $wrapper, removedState, selectedState;

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
     * Update the cards label to make it accessible to users with a readspeaker
     *
     * @param {boolean} isMatched The card has been matched
     * @param {boolean} announce Announce the current state of the card
     * @param {boolean} reset Go back to the default label
     */
    self.updateLabel = function (isMatched, announce, reset) {

      // Determine new label from input params
      var label = (reset ? l10n.cardUnturned : alt);
      if (isMatched) {
        label = l10n.cardMatched + ' ' + label;
      }

      // Update the card's label
      $wrapper.attr('aria-label', l10n.cardPrefix.replace('%num', $wrapper.index() + 1) + ' ' + label);

      // Update disabled property
      $wrapper.attr('aria-disabled', reset ? null : 'true');

      // Announce the label change
      if (announce) {
        $wrapper.blur().focus(); // Announce card label
      }
    };

    /**
     * Select card.
     */
    self.select = function () {
      if (selectedState) {
        $wrapper.blur().focus(); // Announce card label again
        return;
      }

      $card.addClass('h5p-selected');
      self.trigger('selectcard');
      selectedState = true;
    };

    /**
     * Unselect card.
     */
    self.unselect = function () {
      self.updateLabel(null, null, true); // Reset card label
      $card.removeClass('h5p-selected');
      selectedState = false;
    };

    /**
     * Remove.
     */
    self.remove = function () {
      $card.addClass('h5p-selected');
      $card.addClass('h5p-matched');
      removedState = true;
    };

    /**
     * Reset card to natural state
     */
    self.reset = function () {
      self.updateLabel(null, null, true); // Reset card label
      selectedState = false;
      removedState = false;
      $card[0].classList.remove('h5p-matched');
      $card[0].classList.remove('h5p-selected');
    };

    /**
     * Get card feedback.
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
      return $card.find('img').clone();
    };

    /**
     * Append card to the given container.
     *
     * @param {H5P.jQuery} $container
     */
    self.appendTo = function ($container) {
      $wrapper = $('<li class="h5p-memory-wrap" tabindex="-1" role="button"><div class="h5p-memory-card">' +
                  '<div class="h5p-card"' + (styles && styles.back ? styles.back : '') + '>' +
                    (path ? '<img src="' + path + '" alt="' + alt + '" style="width:' + width + ';height:' + height + '"/>' : '') +
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
              // Move to last card
              self.trigger('last');
              event.preventDefault();
              return;
            case 36:
              // Move to first card
              self.trigger('first');
              event.preventDefault();
              return;
          }
        });

      $wrapper.attr('aria-label', l10n.cardPrefix.replace('%num', $wrapper.index() + 1) + ' ' + l10n.cardUnturned);
      $card = $wrapper.children('.h5p-memory-card')
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
     * Make the card accessible when tabbing
     */
    self.makeTabbable = function () {
      if ($wrapper) {
        $wrapper.attr('tabindex', '0');
      }
    };

    /**
     * Prevent tabbing to the card
     */
    self.makeUntabbable = function () {
      if ($wrapper) {
        $wrapper.attr('tabindex', '-1');
      }
    };

    /**
     * Make card tabbable and move focus to it
     */
    self.setFocus = function () {
      self.makeTabbable();
      if ($wrapper) {
        $wrapper.focus();
      }
    };

    /**
     * Check if the card has been removed from the game, i.e. if has
     * been matched.
     */
    self.isRemoved = function () {
      return removedState;
    };
  };

  // Extends the event dispatcher
  PairGame.Card.prototype = Object.create(EventDispatcher.prototype);
  PairGame.Card.prototype.constructor = PairGame.Card;

  /**
   * Check to see if the given object corresponds with the semantics for
   * a memory game card.
   *
   * @param {object} params
   * @returns {boolean}
   */
  PairGame.Card.isValid = function (params) {
    return (params !== undefined &&
             (params.image !== undefined &&
             params.image.path !== undefined));
  };

  /**
   * Checks to see if the card parameters should create cards with different
   * images.
   *
   * @param {object} params
   * @returns {boolean}
   */
  PairGame.Card.hasTwoImages = function (params) {
    return true;
  };

  /**
   * Determines the theme for how the cards should look
   *
   * @param {string} color The base color selected
   * @param {number} invertShades Factor used to invert shades in case of bad contrast
   */
  PairGame.Card.determineStyles = function (color, invertShades) {
    var styles =  {
      front: '',
      back: ''
    };

    // Create color theme
    if (color) {
      var frontColor = shade(color, 43.75 * invertShades);
      var backColor = shade(color, 56.25 * invertShades);

      styles.front += 'color:' + color + ';' +
                      'background-color:' + frontColor + ';' +
                      'border-color:' + frontColor +';';
      styles.back += 'color:' + color + ';' +
                     'background-color:' + backColor + ';' +
                     'border-color:' + frontColor +';';
    }

    // Prep style attribute
    if (styles.front) {
      styles.front = ' style="' + styles.front + '"';
    }
    if (styles.back) {
      styles.back = ' style="' + styles.back + '"';
    }

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
