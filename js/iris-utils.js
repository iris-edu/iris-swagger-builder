/* Random utilities */

var IRIS;
if (!IRIS) {
  IRIS = {};

  /**
   * Simple logging object, supporting log levels
   * @example IRIS.Debug.setLevel('debug')
   * @example IRIS.Debug.warn("Watch out!")
   */
  IRIS.Debug = (function() {
    var _levels = ['error','warn','info','debug'];
    var _level = 1; // Default level = warn
    var _console = window.console;
    var _fns = [];
    if (_console) {
      for (var l=0; l<_levels.length; l++) {
        var fn = _console[_levels[l]];
        if (typeof(fn) !== 'function') {
          fn = _console.log;
        }
        if (typeof(fn) === 'function') {
          _fns[l] = fn;
        }
      }
    }
    var pad = function(n, count) {
      return ('0000' + n).slice(-count);
    };
    var _log = function(level, msg) {
      if (_level >= 0 && level <= _level && _console) {
        var fn = _fns[level];
        if (typeof(fn) !== 'function') { return; }
        var d = new Date();
        var timeString = [d.getHours(), pad(d.getMinutes(),2), pad(d.getSeconds(),2)].join(":");
        var msString = pad(d.getMilliseconds(),4);
        fn.call(_console, timeString + "." + msString + " -- " + msg);
      }
    };
    return {
      error: function(msg) { _log(0,msg); },
      warn: function(msg) { _log(1,msg); },
      info: function(msg) { _log(2,msg); },
      debug: function(msg) { _log(3,msg); },
      level: function() { return _levels[_level]; },
      setLevel: function(level) {
        if (typeof(level) === 'string') {
          var llc = level.toLowerCase();
          for (var i=0; i<_levels.length; i++) {
            if (_levels[i] === llc) {
              _level = i;
              return;
            }
          }
        }
      }
    };
  })();
  // IRIS.Debug.setLevel('warn');

  /**
   * Basic object inheritance, based on CoffeeScript
   */
  IRIS.Extend = function(child, parent) {
    var __hasProp = {}.hasOwnProperty;
    for (var key in parent) {
      if (__hasProp.call(parent, key)) { child[key] = parent[key]; }
    }
    function ctor() {
      this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
  };

  /** jQuery functions **/
  (function($) {
    /**
     * Normalize radio buttons, so that events and values can be read from them the same
     * way that they are from other input types.
     *
     * This is done by creating a hidden text field that gets updated with the selected
     * radio value, and generates a change() event when doing so.  So code can listen and read
     * from that hidden value.
     *
     */
    IRIS.NormalizeRadios = function(options) {
      options = options || {};
      if (!options.get_radio_id) {
        // Default is Django style -- the hidden field's id just prepends "id_" to the radio name
        options.get_radio_id = function(radio_name) {
          return "id_" + radio_name;
        };
      }
      var radio_names = [];
      if (options.name) {
        radio_names.push(options.name);
      } else {
        // Get all the radio groups on the page
        var name_lookup = {};
        $("input[type=radio]").each(function() {
          var name = $(this).prop('name');
          if (!name_lookup[name]) {
            name_lookup[name] = 1;
            radio_names.push(name);
          }
        });
      }
      $.each(radio_names, function(index, name) {
        var $radios = $("input[type=radio][name=" + name + "]");
        var $hidden = $('<input type="hidden" id="' + options.get_radio_id(name) + '">');
        // Insert after the first radio
        $radios.first().after($hidden);
        var onChange = function() {
          var val = $radios.filter(":checked").val();
          $hidden.val(val).change();
        };
        // Chain change event
        $radios.change(onChange);
        // Set initial value
        onChange();
      });
    };
  })(jQuery);
}
