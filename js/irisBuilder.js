/**
 * jQuery plugin for managing a Builder form.
 *
 * Most of the functionality is concerned with input dependencies -- an input may be
 * enabled only when some other input has a particular state or value.
 *
 * As a simple example, many inputs have a checkbox next to them: if the checkbox isn't
 * checked, the input will be disabled.
 *
 * Another example is radio-based input groups: each radio button in a group has associated
 * inputs which are only enabled (or shown) when that radio is selected. For example, geographical
 * coordinates can be entered as a lat/long bounding box or a center/radius. The form contains
 * a radio with "box" and "radius" options. A set of four inputs (max/min lat and long) is dependent
 * on the "box" option, and a separate set of three inputs (lat/long/radius) is dependent on the
 * "radius" option.
 *
 * The other task of this library is to generate a clickable link (assumed to be a web service)
 * encoding all the form parameters. This is the reason for the input enable/disable functionality --
 * only enabled inputs are encoded into the form. This enables the form to ensure that invalid
 * input combinations aren't submitted.
 *
 */

/* Boilerplate to define module using AMD with fallback to global variable */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'irisUtil', 'jquery-ui', 'calendar/jquery-ui-timepicker-addon'], factory);
    } else {
        // Browser globals
        root.irisBuilder = factory(jQuery, irisUtil);
    }
}(this, function ($, irisUtil) {

    /**
     * The main builder object
     * @param form : A form
     * @param options : An object overriding any of the options in IrisBuilder.prototype.defaults
     */
    var IrisBuilder = function(form, options) {
        this.$form = $(form);
        this.options = $.extend( {}, this.defaults, options );
        this._start();
    };

    IrisBuilder.prototype = {

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
             * TODO: This is not yet implemented
             */
            queryParamNames: null,
            /**
             * If no explicit query parameters are given, this filter function can be used to
             * exclude any unwanted parameters.  By default, it excludes and parameter whose
             * name starts with '_', which should be adequate for most purposes.
             *
             * The main reason this may be needed is for radio buttons.  Most unwanted inputs
             * can be left unnamed, but radio button groups rely on a name, so if they're not
             * actually part of the query they have to be actively filtered out.
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
            var _irisBuilder = this;
            setTimeout(function() {
                _irisBuilder._queueUpdate($("[id]", _irisBuilder.$form));
            });
        },

        /**
         * Find all the inputs in the form, and listen for any changes to them.
         */
        _initInputs: function() {
            var _irisBuilder = this;
            if ( _irisBuilder.options.inputs ) {
                _irisBuilder.$inputs = $(_irisBuilder.options.inputs);
            } else {
                _irisBuilder.$inputs = $(_irisBuilder.options.inputSelector, _irisBuilder.$form);
            }
            // Watch for a wide range of events, and queue up the handler
            _irisBuilder.$inputs.on("change propertychange keyup input paste IrisBuilder.update changeDate", function() {
                _irisBuilder._queueUpdate($(this));
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
            var _irisBuilder = this;
            $elem.each(function() {
                var $this = $(this);
                var oldState = $this.data('IrisBuilder.state');
                var state = '' + _irisBuilder.getSetActive($this) + ':' + $this.val();
                var elemUID = _irisBuilder._getElemUID($this);
                irisUtil.Log.debug("State check for " + elemUID + ": '" + oldState + "' -> '" + state + "'");
                if (typeof(oldState) === 'undefined' || oldState != state) {
                    irisUtil.Log.debug("Triggering update");
                    $this.data('IrisBuilder.state', state);
                    $this.triggerHandler('IrisBuilder.update');
                }
            });
        },

        /**
         * Get/set an unique id for an element.
         * If an element has an "id" property, that is used.  This is necessary
         * because not all elements have a real id.
         */
        _getElemUID: function($elem) {
            var elemUID = $elem.data('IrisBuilder.uid');
            if (!elemUID) {
                elemUID = $elem.prop('id');
                if (!elemUID) {
                    // Generate a UID incorporating a private counter
                    elemUID = 'iris-builder-uid-' + this._elemUID++;
                }
                $elem.data('IrisBuilder.uid', elemUID);
            }
            return elemUID;
        },

        /**
         * Hook up related elements.  For example, if there's an input with
         * id="name" and a checkbox with id "name-check", the input will automatically
         * enable/disable itself according to the checkbox state.
         * @see IrisBuilder.defaults.relatedFieldSuffixes
         */
        _initDefaultTriggers: function() {
            var _irisBuilder = this;
            // Resolve ids to "base" ids (eg. "input", "input-check", and "input-row" are all base "input")
            var base_ids = {};
            $("[id]", _irisBuilder.$form).each(function() {
                var elem_id = $(this).prop("id");
                // Base id is the actual id by default
                var base_id = elem_id;
                $.each(_irisBuilder.options.relatedFieldSuffixes, function(i, suffix) {
                    // If the id ends with the given suffix, the base id is the prefix
                    if (suffix !== "" && elem_id.slice(-suffix.length) === suffix) {
                        base_id = elem_id.slice(0,-suffix.length);
                    }
                });
                // Find all inputs with the given base id and apply the default dependency rules
                // Mark the base id when finished so we don't repeat the process
                if (!(base_id in base_ids)) {
                    base_ids[base_id] = 1;
                    irisUtil.Log.debug("Connecting inputs for " + base_id);
                    // Iterate through the suffixes, making each depend on the previous one
                    var $child = null;
                    $.each(_irisBuilder.options.relatedFieldSuffixes, function(i, suffix) {
                        var $elem = $("#"+base_id+suffix);
                        if ($elem.length > 0) {
                            if ($child) {
                                _irisBuilder.addDependsOn($child, $elem);
                            }
                            $child = $elem;
                        }
                    });
                }
            });
            /* Make jQuery-UI date input buttons depend on the input, so they enable/disable in sync */
            $('.ui-datepicker-trigger').each(function() {
                var $dependency = $(this).prev('input');
                if (!$dependency.length) {
                  $dependency = $(this).closest('.input-group');
                }
               _irisBuilder.addDependsOn($(this), $dependency);
            });
            /* Make like-named radio buttons all depend on each other */
            var radio_names = {};
            $('input:radio').each(function() {
              var name = $(this).prop('name');
              if (name && !radio_names[name]) {
                radio_names[name] = true;
                _irisBuilder.addUpdateOnChange(
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
            // If there's a target selector for the output, override the click() behavior to
            // retrieve via AJAX and render the output to the target
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
         *
         * The goals of the queue are to
         * 1. Ensure that each update is only executed once (eg. prevent cycles), and
         * 2. Handle updates in the order they were generated
         *
         * An alternative way of describing #2 is that we want to go through the
         * updates Breadth First rather than Depth First.  Suppose that B and C depend
         * on A, and D depends on B and C, eg.
         * A->(B,C), B->(D), C->(D)
         *
         * If we handle dependencies Depth First, an update in A would spawn an update
         * in B and C.  So we evaluate B, which spawns an update in D.  Now we evaluate
         * D, but it's using a stale status for C!
         *
         * So instead we push B and C on to the queue, and they are evaluated as we move
         * down the queue.  When B spawns an update to D, that update gets pushed on the
         * end of the queue, so it's handled after C.
         *
         * We also track the elements that have been evaluated in the current update cycle,
         * and skip repeat evaluations.  So while both B and C will push D onto the queue,
         * the second evaluation of D will see that D has already been evaluated and no-op.
         *
         * NOTE: Obviously this doesn't handle circular dependencies.  It's up to the form
         * design to unwrap these.
         *
         * @param $elem : selector for the element(s) that changed
         */
        _queueUpdate: function($elem) {
            var _irisBuilder = this;
            // Check whether an update is in process.  If not, start a new one.
            if (!_irisBuilder._currentUpdate) {
                _irisBuilder._currentUpdate = {
                        timeout: setTimeout(function() { _irisBuilder._onUpdate(); }, 0),
                        updateMap: {},
                        updateList: []
                };
                irisUtil.Log.debug("Starting update " + _irisBuilder._currentUpdate.timeout);
            }
            // Add each element to the pending update
            if ($elem) {
                var selector = $elem.selector ? $elem.selector : '#'+_irisBuilder._getElemUID($elem);
                irisUtil.Log.debug("Examining " + selector);
                // Look at each individual element, and add it to the queue unless it's
                // already been handled in this update.
                $elem.each(function() {
                    var elemUID = _irisBuilder._getElemUID($(this));
                    // Store element id as identifier, or make up a unique one
                    if (elemUID in _irisBuilder._currentUpdate.updateMap) {
                        irisUtil.Log.debug("Item #" + elemUID + " is already in the update");
                    } else {
                        irisUtil.Log.debug("Queuing #" + elemUID);
                        // Add element to the list of pending updates
                        _irisBuilder._currentUpdate.updateList.push(this);
                        _irisBuilder._currentUpdate.updateMap[elemUID] = this;
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
                    irisUtil.Log.debug("Updating #" + elemUID );

                    // Set the element's active flag based on any conditions
                    var active = true;
                    var activeConditions = $oneElem.data('IrisBuilder.active-conditions');
                    if (activeConditions) {
                        $.each(activeConditions, function(i, fn) {
                            active = active && fn.call($oneElem);
                        });
                    }
                    this.getSetActive($oneElem, active);

                    // Run any update handlers
                    var updateHandlers = $oneElem.data('IrisBuilder.update-handlers');
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
            irisUtil.Log.debug("Finished update #" + updateId + " on " + numElements + " elements");
            this._currentUpdate = null;
            this._updateUrlLink();
        },

        /**
         * Update the url link.
         */
        _updateUrlLink: function() {
            var params = this.$form.serializeArray();
            if (this.options.queryParamNames) {
                // TODO: Implement this!

            } else if (this.options.queryParamFilter) {
                params = $.grep(params, this.options.queryParamFilter);
            }
            var url = this.$form.prop('action') + '?' + decodeURIComponent($.param(params));
            this.$urlLink.html(url);
            this.$urlLink.prop('href', url);
        },

        /**
         * Cause element(s) to be updated when other element(s) change.
         * @param $elem : the element(s) that will be updated
         * @param $src : the element(s) whose state triggers the update
         */
        addUpdateOnChange: function($elem, $src) {
            var _irisBuilder = this;
            // Add an event handler that queues the dependent element when the source element changes
            $src.on("IrisBuilder.update", function() {
                irisUtil.Log.debug("Triggering update of " + $elem.selector + " from " + $src.selector);
                _irisBuilder._queueUpdate($elem, this);
            });
            return $elem;
        },

        /**
         * Make element(s) inactive if a given condition isn't satisfied.
         *
         * The condition can be a selector, in which case the condition is that
         * the selected elements are all active.
         *
         * Alternatively, the condition can be a function returning a boolean; returning
         * false will make the element inactive.
         *
         * This can be called multiple times for an element; the element will be deactivated
         * unless all conditions are satisfied.
         *
         * @param $elem
         * @param condition : a selector indicating elements to depend on, or a function
         * @param invert : if true, condition is inverted; this is useful for making
         *          elements mutually exclusive, for example.
         */
        addDependsOn: function($elem, condition, invert) {
            var _irisBuilder = this;
            // If condition isn't a function, treat it as a selector and create a
            // condition function that checks whether the selector is active
            if (typeof(condition) !== 'function') {
                var $src = $(condition);
                _irisBuilder.addUpdateOnChange($elem, $src);
                condition = function() {
                    irisUtil.Log.debug($elem.selector + " is checking " + $src.selector);
                    return _irisBuilder.getSetActive($src);
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
                var conditions = $(this).data('IrisBuilder.active-conditions') || [];
                conditions.push(condition);
                $(this).data('IrisBuilder.active-conditions', conditions);
            });
            return $elem;
        },

        /**
         * Add a function that will be called whenever an element is updated.
         * This is called after the element has been enabled/disabled as a result
         * of the change.
         * @param $elem : element selector
         * @param fn : a function that takes a single element selector and does anything
         */
        addOnUpdate: function($elem, fn) {
            $elem.each(function() {
                var updateHandlers = $(this).data('IrisBuilder.update-handlers') || [];
                updateHandlers.push(fn);
                $(this).data('IrisBuilder.update-handlers', updateHandlers);
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
         * @param $elem : element selector
         * @param active : true/false to make active or not; if omitted, returns the active state
         */
        getSetActive: function($elem, active) {
            var _irisBuilder = this;
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
                _irisBuilder._checkState($elem);
            }
        }
    };

    // Single form per page for now
    var irisBuilder;

    $.fn.irisBuilder = function(options) {
        if (typeof(options) === 'string') {
            // If the first argument to the plugin is a string, it's taken as a function, eg.
            // $('#input1').irisBuilder('dependsOn', $('#input2'))
            // will cause #input1 to be disabled unless #input2 is enabled
            if (!irisBuilder) {
                throw "No builder form has been created";
            }
            var i;
            if (options === 'updateOnChange') {
                for (i=1; i<arguments.length; i++) {
                    irisBuilder.addUpdateOnChange(this, arguments[i]);
                }
                return this;
            } else if (options === 'dependsOn') {
                for (i=1; i<arguments.length; i++) {
                    irisBuilder.addDependsOn(this, arguments[i]);
                }
                return this;
            } else if (options === 'dependsOnNot') {
                for (i=1; i<arguments.length; i++) {
                    irisBuilder.addDependsOn(this, arguments[i], true);
                }
                return this;
            } else if (options === 'onUpdate') {
                for (i=1; i<arguments.length; i++) {
                    irisBuilder.addOnUpdate(this, arguments[i]);
                }
                return this;
            } else if (options === 'active') {
                return irisBuilder.getSetActive(this, arguments[1]);
            } else {
                throw "Unknown builder function " + options;
            }
        } else {
            // Call the plugin with a dictionary (or nothing) to set up a builder on the
            // given element (assumed to be a form)
            if (irisBuilder) {
                throw "Only one builder supported at a time";
            }
            options = options || {};
            irisBuilder = new IrisBuilder(this, options);
            this.data('IrisBuilder.irisBuilder', irisBuilder);
        }
        return this;
    };

    /* Configure jQuery UI datepickers. This code might be better off somewhere else. */

    irisUtil.Log.debug("Initializing datepickers");
    if (!$.datepicker) {
        irisUtil.Log.error("No datepicker plugin");
        return;
    }
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
    if (!$.timepicker) {
        irisUtil.Log.error("No timepicker plugin");
        return;
    }
    $.timepicker.setDefaults({
        showTime: false,
        showHour: false,
        showMinute: false,
        showSecond: false,
        timeFormat: 'HH:mm:ss',
        separator: 'T'
    });

}));
