/**
 * Debug logging; turn off for production
 */
var DEBUG;
if (typeof(DEBUG) === 'undefined') {
    DEBUG = function(msg) {
        console.log(msg);
    };
}

/**
 * Form builder plugin.
 *
 * Usage:
 *
 * Enable builder functionality on a form
 * $("#myForm").builder();
 *
 *
 *
 *
 */
(function($) {

    /**
     * WSBuilder allows inputs to be tied to each other, respond to user
     * input, and update a query url link.
     * @param form A form
     * @param options An object overriding any of the options in WSBuilder.prototype.defaults
     * @returns
     */
    var WSBuilder = function(form, options) {
        this.$form = $(form);
        this.options = $.extend( {}, this.defaults, options );
        this._start();
    };

    WSBuilder.prototype = {

        /**
         * Defaults
         */
        defaults: {
            /** selector (typically by id) of the url link */
            urlLinkSelector: "#url",
            /**
             * Selector for a target DOM element.  If this is given, then rather than opening links
             * in a new window/tab, the URL will be opened via AJAX and pasted into the target.
             */
            targetSelector: null,
            /** selector to get all inputs */
            inputSelector: "input, select, textarea",
            /**
             * Suffixes that may be found on related element ids.  These are ordered
             * by dependency; for example, an input "cost" can be structured as:
             *
             * <div id="cost-row">
             *   <input type="checkbox" id="cost-check" />
             *   <span id="cost-field"><input id="cost"> Dollars</span>
             * </div>
             *
             * By the default suffixes:
             * "cost" is enabled only if "cost-field" is enabled,
             * "cost-field" is enabled only if "cost-check" is enabled (and checked),
             * "cost-check" is enabled only if "cost-row" is enabled
             *
             * The two common use cases are:
             * 1. Disabling "cost-row" to disable everything.
             * 2. Deselecting "cost-check" to disable the input as well as the "cost-field" span,
             *       so the text around the field is also greyed out.
             *
             * Any of these can be omitted; for example, if there's no checkbox and no text
             * around the input, you can just say:
             *
             * <div id="cost-row">
             *   <input id="cost" />
             * </div>
             *
             */
            relatedFieldSuffixes:
                [ "",       // The actual input
                  "-field", // An inner container (with any text around the input)
                  "-check", // A checkbox that turns the input on/off
                  "-row"    // The entire input row
                  ],
            /**
             * If the query URL needs to be serialized in a particular order (or with only
             * particular fields) a list of query parameter names can be given explicitly.
             */
            queryParamNames: null,
            /**
             * If no explicit query parameters are given, this filter function can be used to
             * exclude any unwanted parameters.  By default, it excludes and parameter whose
             * name starts with '_', which should be adequate for most purposes.
             *
             * The main reason this may be needed is for radio buttons.  Most unwanted inputs
             * can be left unnamed, but radio button groups rely on a name, so they have to be
             * actively filtered out of the query.
             */
            queryParamFilter: function(param) {
                return param.name.charAt(0) !== '_' && param.value != '';
            }
        },

        /**
         * Startup
         */
        _start: function() {
            this._pendingUpdate = null;
            this._currentUpdate = null;
            this._elemUID = 0;
            this._initInputs();
            this._initDefaultTriggers();
            this._initUrlLink();
            // Once everything is settled, trigger all elements to update
            var _builder = this;
            setTimeout(function() {
                _builder._queueUpdate($("[id]", _builder.$form));
            });
        },

        /**
         * Find all the inputs in the form, and listen for any changes to them.
         */
        _initInputs: function() {
            var _builder = this;
            if ( _builder.options.inputs ) {
                _builder.$inputs = $(_builder.options.inputs);
            } else {
                _builder.$inputs = $(_builder.options.inputSelector, _builder.$form);
            }
            // Watch for a wide range of events, and queue up the handler
            _builder.$inputs.on("change propertychange keyup input paste builder.update changeDate", function() {
                _builder._queueUpdate($(this));
            });
        },

        /**
         * Check an element for state changes.
         * We store state as "[isActive]:[value]", for example:
         * - an active text element with value "test" would be "true:test"
         * - an inactive div (not an input element) would be "false:"
         * So either a state change or a value change would be treated as a state
         * change, and trigger an update handler.
         */
        _checkState: function($elem) {
            var _builder = this;
            $elem.each(function() {
                var $this = $(this);
                var oldState = $this.data('builder.state');
                var state = '' + _builder.getSetActive($this) + ':' + $this.val();
                var elemUID = _builder._getElemUID($this);
                DEBUG("State check for " + elemUID + ": '" + oldState + "' -> '" + state + "'");
                if (typeof(oldState) === 'undefined' || oldState != state) {
                    DEBUG("Triggering update");
                    $this.data('builder.state', state);
                    $this.triggerHandler('builder.update');
                }
            });
        },

        /**
         * Get/set an unique id for an element.
         * If an element has an "id" property, that is used.  This is necessary
         * because not all elements have a real id.
         */
        _getElemUID: function($elem) {
            var elemUID = $elem.data('builder.uid');
            if (!elemUID) {
                elemUID = $elem.prop('id');
                if (!elemUID) {
                    elemUID = 'builder-uid-' + this._elemUID++;
                }
                $elem.data('builder.uid', elemUID);
            }
            return elemUID;
        },

        /**
         * Hook up related elements.  For example, if there's an input with
         * id="name" and a checkbox with id "name-check", the input will automatically
         * enable/disable itself according to the checkbox state.
         * @see WSBuilder.defaults.relatedFieldSuffixes
         */
        _initDefaultTriggers: function() {
            var _builder = this;
            // Resolve ids to "base" ids (eg. "input", "input-check", and "input-row" are all base "input")
            var base_ids = {};
            $("[id]", _builder.$form).each(function() {
                var elem_id = $(this).prop("id");
                // Base id is the actual id by default
                var base_id = elem_id;
                $.each(_builder.options.relatedFieldSuffixes, function(i, suffix) {
                    // If the id ends with the given suffix, the base id is the prefix
                    if (suffix !== "" && elem_id.slice(-suffix.length) === suffix) {
                        base_id = elem_id.slice(0,-suffix.length);
                    }
                });
                // If not already done, create dependencies among all the related containers
                if (!(base_id in base_ids)) {
                    base_ids[base_id] = 1;
                    DEBUG("Connecting inputs for " + base_id);
                    // Iterate through the suffixes, making each depend on the previous one
                    var $child = null;
                    $.each(_builder.options.relatedFieldSuffixes, function(i, suffix) {
                        var $elem = $("#"+base_id+suffix);
                        if ($elem.length > 0) {
                            if ($child) {
                                _builder.addDependsOn($child, $elem);
                            }
                            $child = $elem;
                        }
                    });
                }
            });
            /* Make date input buttons depend on the input, so they enable/disable in sync */
            $('.ui-datepicker-trigger').each(function() {
                var $dependency = $(this).prev('input');
                if (!$dependency.length) {
                  $dependency = $(this).closest('.input-group');
                }
               _builder.addDependsOn($(this), $dependency);
            });
            /* Make like-named radio buttons all depend on each other */
            var radio_names = {};
            $('input:radio').each(function() {
              var name = $(this).prop('name');
              if (name && !radio_names[name]) {
                radio_names[name] = true;
                _builder.addUpdateOnChange(
                  $('input:radio[name="'+name+'"]'),
                  $('input:radio[name="'+name+'"]'));
              }
            });
        },

        /**
         * Set up the url element that will be updated with the query.
         */
        _initUrlLink: function() {
            this.$urlLink = $(this.options.urlLinkSelector);
            // If there's a target for the output, override the click() behavior to retrieve via
            // AJAX and render the output to the target
            if (this.options.targetSelector) {
                var $target = $(this.options.targetSelector);
                this.$urlLink.click(function() {
                    $.ajax({
                        url: $(this).prop('href'),
                        dataType: 'text'
                    }).done(function(content) {
                        $target.text(content);
                    });
                    return false;
                });
            }
        },

        /**
         * Queue an element for handling a potential update.
         * The goals of the queue are to
         * 1. Ensure that each update is only executed once (eg. prevent cycles), and
         * 2. Handle updates in the order they were generated
         * An alternative way of describing #2 is that we want to go through the
         * updates Breadth First rather than Depth First.  Suppose that B and C depend
         * on A, and D depends on B and C, eg.
         * A->(B,C), B->(D), C->(D)
         * If we handle dependencies Depth First, an update in A would spawn an update
         * in B and C.  So we evaluate B, which spawns an update in D.  Now we evaluate
         * D, but it's using a stale status for C!
         * So instead we push B and C on to the queue, and evaluate them.  The update
         * of D gets pushed on the end of the queue, so it's handled after C.
         * @param $elem selector for the element(s) that changed
         */
        _queueUpdate: function($elem) {
            var _builder = this;
            // Check whether an update is in process.  If not, start a new one.
            if (!_builder._currentUpdate) {
                _builder._currentUpdate = {
                        timeout: setTimeout(function() { _builder._onUpdate(); }, 0),
                        updateMap: {},
                        updateList: []
                };
                DEBUG("Starting update " + _builder._currentUpdate.timeout);
            }
            // Add each element to the pending update
            if ($elem) {
                var selector = $elem.selector ? $elem.selector : '#'+_builder._getElemUID($elem);
                DEBUG("Examining " + selector);
                // Look at each individual element, and add it to the queue unless it's
                // already been handled in this update.
                $elem.each(function() {
                    var elemUID = _builder._getElemUID($(this));
                    // Store element id as identifier, or make up a unique one
                    if (elemUID in _builder._currentUpdate.updateMap) {
                        DEBUG("Item #" + elemUID + " is already in the update");
                    } else {
                        DEBUG("Queuing #" + elemUID);
                        // Add element to the list of pending updates
                        _builder._currentUpdate.updateList.push(this);
                        _builder._currentUpdate.updateMap[elemUID] = this;
                    }
                });
            }
        },

        /**
         * Update elements that have changed.  During the update, the changes may
         * spawn more updates.  These are added to the queue (in _queueUpdate),
         * so the queue can grow during the update.
         */
        _onUpdate: function() {
            if (this._currentUpdate) {
                var i=0;
                while (i<this._currentUpdate.updateList.length) {
                    var update = this._currentUpdate.updateList[i];
                    i++;
                    var $oneElem = $(update);
                    var elemUID = this._getElemUID($oneElem);
                    DEBUG("Updating #" + elemUID );

                    // Set the element's active flag based on any conditions
                    var active = true;
                    var activeConditions = $oneElem.data('builder.active-conditions');
                    if (activeConditions) {
                        $.each(activeConditions, function(i, fn) {
                            active = active && fn.call($oneElem);
                        });
                    }
                    this.getSetActive($oneElem, active);

                    // Run any update handlers
                    var updateHandlers = $oneElem.data('builder.update-handlers');
                    if (updateHandlers) {
                        $.each(updateHandlers, function(i, fn) {
                            fn.call($oneElem);
                        });
                    }
                }
                this._onUpdateComplete();
            }
        },

        /**
         * Callback executed when all element-level updates have completed.
         * This typically updates the url link.
         */
        _onUpdateComplete: function() {
            var updateId = this._currentUpdate.timeout;
            var numElements = this._currentUpdate.updateList.length;
            DEBUG("Finished update #" + updateId + " on " + numElements + " elements");
            this._currentUpdate = null;
            this._updateUrlLink();
        },

        /**
         * Update the url link.
         */
        _updateUrlLink: function() {
            var params = this.$form.serializeArray();
            if (this.options.queryParamNames) {
                // Make params into a map so we can list them according to the given list

            } else if (this.options.queryParamFilter) {
                params = $.grep(params, this.options.queryParamFilter);
            }
            var url = this.$form.prop('action') + '?' + decodeURIComponent($.param(params));
            this.$urlLink.html(url);
            this.$urlLink.prop('href', url);
        },

        /**
         * Cause element(s) to be updated when other element(s) change.
         * @param $elem the element(s) that will be updated
         * @param $src the element(s) whose state triggers the update
         */
        addUpdateOnChange: function($elem, $src) {
            var _builder = this;
            // Add to the list of
            $src.on("builder.update", function() {
                DEBUG("Triggering update of " + $elem.selector + " from " + $src.selector);
                _builder._queueUpdate($elem, this);
            });
            return $elem;
        },

        /**
         * Make an element or element inactive if a given condition isn't satisfied.
         *
         * The condition can be a selector, in which case the condition is that
         * the selected elements are all active.
         *
         * Alternatively, the condition can be a function returning a boolean; returning
         * false will make the element inactive.
         *
         * This can be called multiple times for an element; it will be deactivated
         * unless all conditions are satisfied.
         *
         * @param $elem
         * @param condition a selector indicating elements to depend on, or a function
         * @param invert if true, condition is inverted; this is useful for making
         *          elements mutually exclusive, for example.
         */
        addDependsOn: function($elem, condition, invert) {
            var _builder = this;
            // If condition isn't a function, treat it as a selector and create a
            // condition function that checks whether the selector is active
            if (typeof(condition) !== 'function') {
                var $src = $(condition);
                _builder.addUpdateOnChange($elem, $src);
                condition = function() {
                    DEBUG($elem.selector + " is checking " + $src.selector);
                    return _builder.getSetActive($src);
                };
            }
            // Invert the condition if necessary
            if (invert) {
                var original = condition;
                condition = function() {
                    return ! original.apply(this, arguments);
                };
            }
            // Add the condition to each element's data
            $elem.each(function() {
                var conditions = $(this).data('builder.active-conditions') || [];
                conditions.push(condition);
                $(this).data('builder.active-conditions', conditions);
            });
            return $elem;
        },

        /**
         * Add a function that will be called whenever an element is updated.
         * This is called after the element has been enabled/disabled as a result
         * of the change.
         * @param $elem element selector
         * @param fn a function that takes a single element selector and does anything
         */
        addOnUpdate: function($elem, fn) {
            $elem.each(function() {
                var updateHandlers = $(this).data('builder.update-handlers') || [];
                updateHandlers.push(fn);
                $(this).data('builder.update-handlers', updateHandlers);
            });
            return $elem;
        },

        /**
         * Activate/deactivate an element, or return its active state
         * An element is considered inactive if:
         * - it has the "inactive" CSS class
         * - its "disabled" property is set (for inputs)
         * - it is a radio/checkbox and isn't checked
         *
         * This keeps an internal state to prevent trigger updates on non-changes, so
         * it's inadvisable to touch the CSS class or disabled input state outside of here.
         *
         * @param $elem
         * @param {Boolean} [active] whether to make active or not; if omitted, returns the active state
         */
        getSetActive: function($elem, active) {
            var _builder = this;
            if (typeof(active) === 'undefined') {
                return !($elem.is('.inactive, :disabled, :checkbox:not(:checked), :radio:not(:checked)'));
            } else {
                // Make a real boolean
                active = !!active;
                // Set the CSS class
                $elem.toggleClass("inactive", !active);
                // Set the property -- this is mostly for input elements
                $elem.prop("disabled", !active);
                // Check for state changes and trigger updates appropriately
                _builder._checkState($elem);
            }
        }
    };

    // Single builder per page for now
    var builder;

    $.fn.builder = function(options) {
        if (typeof(options) === 'string') {
            // Functions that can be called on form elements.  Most of these can
            // be called with multiple additional arguments, which will each be
            // applied.
            if (!builder) {
                throw "No builder has been created";
            }
            var i;
            if (options === 'updateOnChange') {
                for (i=1; i<arguments.length; i++) {
                    builder.addUpdateOnChange(this, arguments[i]);
                }
                return this;
            } else if (options === 'dependsOn') {
                for (i=1; i<arguments.length; i++) {
                    builder.addDependsOn(this, arguments[i]);
                }
                return this;
            } else if (options === 'dependsOnNot') {
                for (i=1; i<arguments.length; i++) {
                    builder.addDependsOn(this, arguments[i], true);
                }
                return this;
            } else if (options === 'onUpdate') {
                for (i=1; i<arguments.length; i++) {
                    builder.addOnUpdate(this, arguments[i]);
                }
                return this;
            } else if (options === 'active') {
                return builder.getSetActive(this, arguments[1]);
            } else {
                throw "Unknown builder function " + options;
            }
        } else {
            // Main builder; should be called first and just once per page.
            if (builder) {
                throw "Only one builder supported at a time";
            }
            options = options || {};
            builder = new WSBuilder(this, options);
            this.data('builder.builder', builder);
        }
        return this;
    };

    /* Date inputs */

    DEBUG("Running datepickers");
    $(function() {
        /* Run this in a callback to ensure it runs after any other initialization */
        DEBUG("Running datepickers");
        setTimeout(function() {
          DEBUG("Running datepickers");
          if (!$.datetimeEntry) {
              DEBUG("No datetimeEntry plugin");
              return;
          }
          if (!$.datepicker) {
              DEBUG("No datepicker plugin");
              return;
          }
          if (!$.timepicker) {
              DEBUG("No timepicker plugin");
              return;
          }
          // DateTimeEntry
          $.datetimeEntry.setDefaults({
              datetimeFormat: 'Y-O-DTH:M:S',
              useMouseWheel: false,
              spinnerImage: ''
          });
          // JQueryUI datepicker
          $.datepicker.setDefaults({
              dateFormat: "yy-mm-dd",
              changeMonth: true,
              changeYear: true,
              yearRange: "-50:+0",
              showOn: "button",
              buttonImage: 'calendar/calendarIcon.png',
              buttonText: 'Click to browse a calendar',
              constrainInput: true
          });
          $.timepicker.setDefaults({
              showTime: false,
              showHour: false,
              showMinute: false,
              showSecond: false,
              timeFormat: 'HH:mm:ss',
              separator: 'T'
          });

//          $('input.datetime-input').datetimepicker();
//          $('input.date-input').datepicker();
//          /* Need to style the buttons explicitly */
//          $('.ui-datepicker-trigger').addClass('btn btn-default');
        });
    });

})(jQuery);




/* Popup dialog */
/*
$(function() {
 // Dialog
    $('#dialog').dialog({
        autoOpen: false,
        width: 550,
        height: 450,
        postion: ['center', 'center']

    });
    // Dialog Link
    $('#dialog_link').click(function(){
        $('#dialog').dialog('open');
        return false;
    });
});
*/
