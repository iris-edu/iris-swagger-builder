/* globals jQuery, IRIS */


var Builder = (function($) {

  /**
   * Base class for any component that needs to render itself onto the page
   */
  function Renderable() {}
  /* Render an item */
  Renderable.prototype.render = function(builder) {}
  /* Render a list of sub-items, which are assumed to be Renderable or a field name */
  Renderable.prototype.renderItems = function(builder, items) {
    var rendered = [];
    for (var _i = 0, _len = items.length; _i < _len; _i++) {
      var item = items[_i];
      if (!item.render) {
        item = builder.param_builders[item];
      }
      if (item && item.render) {
        rendered.push(item.render(builder));
      } else {
        throw "Could not render " + items[_i];
      }
    }
    return rendered;
  };

  /**
   * Base class for a query parameter which appears as a form input.
   */
  function ParameterBuilder() {}
  IRIS.Extend(ParameterBuilder, Renderable);

  ParameterBuilder.prototype.initialize = function(paramDefinition) {
    $.extend(true, this, paramDefinition);
    this.id = this.name;
  };

  /* Render a row in the usage popup */
  ParameterBuilder.prototype.renderUsage = function(builder) {
    var $label = $('<th>').text(this.label || this.name);
    var $description = $('<td>').html(this.description);
    return $('<tr>').append($label, $description);
  };

  /* Render the parameter as a row (label + field) in the form */
  ParameterBuilder.prototype.render = function(builder) {
    var $input = this.renderInput(builder);
    var label = builder.getFieldLabel(this.name);
    var $label = $('<label>').prop('for', this.id).text(label);
    if (this.required) {
      $label.addClass('requiredField');
    }
    var $row = $('<div>').addClass('row').prop('id', this.id + '-row');
    var $label = $('<div>').addClass(builder.options.labelClass).append($label);
    var $field = $('<div>').addClass(builder.options.fieldClass).append($input);
    if (builder.options.showHelpText.indexOf('inline') > -1) {
        $field.append($('<div>').addClass('help-block').html(this.description));
    }
    $row.append($label, $field);
    return $row;
  };

  /* Render the field area (widget with possible checkbox or other decoration) for the parameter */
  ParameterBuilder.prototype.renderInput = function(builder) {
    var $widget = this.renderWidget(builder);
    if (this.type != 'boolean') {
      if (this.default) {
        $widget.val(this.default);
      }
      if (!this.required) {
        var $wrapper = $('<div>');
        $wrapper.append(
          $('<input type="checkbox">').prop('id', this.id + '-check'),
          " ",
          $widget);
        return $wrapper;
      }
    }
    return $widget;
  };

  /* Render the actual widget for the parameter */
  ParameterBuilder.prototype.renderWidget = function(builder) {
    var $widget;
    if (this.type === 'boolean') {
      $widget = $('<input type="checkbox" value="true" class="checkbox">');
    }
    else if (this.enum) {
      $widget = $('<select class="form-control">');
      for (var _i = 0, _len = this.enum.length; _i < _len; _i++) {
        var val = this.enum[_i];
        var label = builder.getOptionLabel(this.name, val);
        var $option = $('<option>')
          .text(label)
          .val(val);
        $widget.append($option);
      }
    }
    else {
      $widget = $('<input type="text" class="form-control">');
    }
    $widget.prop('id', this.id).prop('name', this.name);
    return $widget;
  };

  /**
   * A parameter representing a date
   */
  function DateBuilder() {}
  IRIS.Extend(DateBuilder, ParameterBuilder);
  DateBuilder.prototype.renderWidget = function() {
    var $widget = $('<input type="date" class="date-input form-control">');
    $widget.prop('id', this.id).prop('name', this.name);
    var $field = $('<div class="input-group">');
    $field.prop('id', this.id + "-field");
    $field.append($widget);
    if ($.fn.datepicker) {
      $widget.datepicker();
      $('.ui-datepicker-trigger', $field).addClass('btn btn-default').wrap('<div class="input-group-btn">');
    }
    return $field;
  };

  /**
   * Defines a columnar layout, each argument to the constructor should be a list that can be
   * passed to Renderable.render_items(), eg. each element of each list should be a Renderable
   * or a field name.
   */
  function Columns() {
    this.columns = [];
    for (var _i = 0, _len = arguments.length; _i < _len; _i++) {
      this.columns.push(arguments[_i]);
    }
  }
  IRIS.Extend(Columns, Renderable);

  Columns.prototype.render = function(builder) {
    var $row = $('<div class="row">');
    for (var _i = 0, _len = this.columns.length; _i < _len; _i++) {
      var $col = $('<div class="col-xs-6">');
      $col.append(this.renderItems(builder, this.columns[_i]));
      $row.append($col);
    }
    return $row;
  };

  /**
   * Defines a fieldset.  The first argument is the legend, remaining arguments are
   * Renderables and/or field names.
   */
  function Fieldset() {
    this.legend = arguments[0];
    this.items = [];
    for (var _i = 1, _len = arguments.length; _i < _len; _i++) {
      this.items.push(arguments[_i]);
    }
  }
  IRIS.Extend(Fieldset, Renderable);
  Fieldset.prototype.render = function(builder) {
    var $fieldset = $('<fieldset>').append($('<legend>').html(this.legend));
    $fieldset.append(this.renderItems(builder, this.items));
    return $fieldset;
  };

  /**
   * Defines set of radio buttons, each of which is tied to a set of fields.
   */
  function OptGroup(name) {
    this.name = name;
    this.options = Array.prototype.slice.call(arguments, 1);
  }
  IRIS.Extend(OptGroup, Renderable);
  OptGroup.prototype.render = function(builder) {
    var $div = $('<div>')
    for (var _i = 0, _len = this.options.length; _i < _len; _i++) {
      var option = this.options[_i];
      var $radio = $('<input type="radio">');
      var id = option[0];
      $radio.prop('name', this.name).prop('value', id);
      var $label = $('<label>').append(
        $radio, option[0]
      );
      var $subdiv = $('<div class="hide-if-inactive">').append(
        this.renderItems(builder, option.slice(1))
      );
      $div.append($("<div>").append($label), $subdiv);
      (function(_radio, _subdiv) {
          builder.addBuilderAction(function() {
              _subdiv.builder('dependsOn', _radio);
              $("input", _subdiv).builder('dependsOn', _subdiv);
          });
      })($radio, $subdiv);
    }
    return $div;
  };


  var DEFAULTS = {
      /* URL to retrieve Swagger definition from */
      swaggerURL: 'swagger-rkgravitymag.json',
      /* Swagger path to generate a builder for */
      path: '/query',
      /* Bootstrap form classes */
      labelClass: 'col-xs-2',
      fieldClass: 'col-xs-10',
      /* Where to show parameter help text, options are 'inline', 'dialog', 'inline,dialog' or '' */
      showHelpText: 'dialog'
  };

  function Builder(options) {
    this.initialize(options);
  }
  IRIS.Extend(Builder, Renderable);

  Builder.prototype.initialize = function(options) {
    var self = this;
    self._done = $.Deferred();
    self._done.then(
      function() { console.log("Success"); },
      function(error) { console.log("Failure: " + error); }
    );
    self.done = self._done.promise();
    self.options = $.extend(true, {}, DEFAULTS);
    if (options) {
      $.extend(true, self.options, options);
    }
    self.builderActions = [];
  };

  Builder.prototype.run = function() {
    var self = this;
    self.initDOM();
    var $ajax = $.ajax(self.options.swaggerURL).then(
      function(data) {
        self.data = data;
        try {
          self.parseSwaggerData(data);
          self.render();
        }
        catch(error) {
          console.log("Error: " + (error.stack || error));
          return $.Deferred().reject(error.message);
        }
      },
      function(jqXHR, status, error) {
        return error || status;
      }
    ).then(function() {
      $("form#builder-form").builder(self.options);
      for (var _i=0, _len=self.builderActions.length; _i<_len; _i++) {
          self.builderActions[_i]();
      }
    }).then(
      self._done.resolve,
      self._done.reject,
      self._done.notify
    );
    return self.done;
  };

  Builder.prototype.parseSwaggerData = function(data) {
    this.service = {
      title: data.info.title,
      description: data.info.description,
      host: data.host,
      basePath: data.basePath,
      path: this.options.path
    };
    this.operation = data.paths[this.options.path].get;
    this.parseSwaggerOperation(this.operation);
  };

  Builder.prototype.parseSwaggerOperation = function(operationData) {
    this.parameters = operationData.parameters;
    this.parameter_names = [];
    this.param_builders = {};
    for (var _i = 0, _len = this.parameters.length; _i < _len; _i++) {
      if (this.parameters[_i].in === 'query') {
        var param = this.parameters[_i];
        if (this.options.parameters) {
          $.extend(true, param, this.options.parameters[param.name]);
        }
        this.parameter_names.push(param.name);
        var param_builder = param.builder;
        if (!param_builder) {
          param_builder = new ParameterBuilder();
        }
        this.param_builders[param.name] = param_builder;
        param_builder.initialize(param);
      }
    }
  };

  Builder.prototype.initDOM = function() {
    this.$serviceTitle = $('#service-title').empty();
    this.$serviceDescription = $('#service-description').empty();
    this.$operationSummary = $('#operation-summary').empty();
    this.$operationDescription = $('#operation-description').empty();
    this.$form = $('form#builder-form').empty();
    this.$usage = $('#usage-table').empty();
  };

  Builder.prototype.render = function() {
    this.$serviceTitle.html(this.service.title);
    this.$serviceDescription.html(this.service.description);
    this.$operationSummary.html(this.operation.summary);
    this.$operationDescription.html(this.operation.description);
    this.$form.prop('action', "http://" + this.service.host + this.service.basePath + this.service.path);
    if (this.options.showHelpText.indexOf('dialog') > -1) {
        this.$usage.append(this.renderUsage());
    }
    var items = this.options.layout;
    if (!items) {
      items = this.parameter_names;
    }
    this.$form.append(this.renderItems(this, items));
  };

  Builder.prototype.renderUsage = function() {
    var usage = []
    for (var _i = 0, _len = this.parameter_names.length; _i < _len; _i++) {
      var param_builder = this.param_builders[this.parameter_names[_i]];
      usage.push(param_builder.renderUsage(this));
    }
    return usage;
  };

  Builder.prototype.getFieldLabel = function(name) {
    var param_builder = this.param_builders[name];
    return param_builder.label || name;
  };

  Builder.prototype.getOptionLabel = function(name, value) {
    var param_builder = this.param_builders[name];
    if (!param_builder.enum_labels) {
      return value;
    }
    return param_builder.enum_labels[value] || value;
  };

  Builder.prototype.addBuilderAction = function(action) {
      this.builderActions.push(action);
  };

  return {
    ParameterBuilder: ParameterBuilder,
    DateBuilder: DateBuilder,
    Columns: Columns,
    OptGroup: OptGroup,
    Fieldset: Fieldset,
    Builder: Builder
  };

})(jQuery);


