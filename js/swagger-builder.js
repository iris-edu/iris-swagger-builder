/* globals jQuery, IRIS */


var Builder = (function($) {

  function Renderable() {}
  Renderable.prototype.render = function(builder) {}
  Renderable.prototype.renderItems = function(builder, items) {
    var rendered = [];
    for (var _i = 0, _len = items.length; _i < _len; _i++) {
      var item = items[_i];
      if (!item.render) {
        item = builder.options.parameters[item];
      }
      rendered.push(item.render(builder));
    }
    return rendered;
  };

  function Parameter() {}
  IRIS.Extend(Parameter, Renderable);

  Parameter.prototype.initialize = function(paramDefinition) {
    $.extend(true, this, paramDefinition);
    this.id = this.name;
  };

  Parameter.prototype.renderUsage = function(builder) {
    var $label = $('<th>').text(builder.getFieldLabel(this.name));
    var $description = $('<td>').html(this.description);
    return $('<tr>').append($label, $description);
  };

  Parameter.prototype.render = function(builder) {
    var $input = this.renderInput(builder);
    var $label = $('<label>').prop('for', this.id).text(builder.getFieldLabel(this.name));
    if (this.required) {
      $label.addClass('requiredField');
    }
    var $row = $('<div>').addClass('row').prop('id', this.id + '-row')
      .append(
        $('<div>').addClass(builder.options.labelClass)
          .append($label))
      .append(
        $('<div>').addClass(builder.options.fieldClass)
          .append($input)
          .append($('<div>').addClass('help-block').html(this.description)));
    return $row;
  };

  Parameter.prototype.renderInput = function(builder) {
    var $widget = this.renderWidget(builder);
    $widget.prop('id', this.id)
          .prop('name', this.name);
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

  Parameter.prototype.renderWidget = function(builder) {
    if (this.type === 'boolean') {
      $widget = $('<input type="checkbox" value="true" class="checkbox">');
    }
    else if (this.enum) {
      $widget = $('<select class="form-control">');
      for (var _i = 0, _len = this.enum.length; _i < _len; _i++) {
        var val = this.enum[_i];
        var $option = $('<option>')
          .text(builder.getOptionLabel(this.name, val))
          .val(val);
        $widget.append($option);
      }
    }
    else {
      $widget = $('<input type="text" class="form-control">');
    }
    return $widget;
  };

  function DateParameter() {}
  IRIS.Extend(DateParameter, Parameter);
  DateParameter.prototype.renderWidget = function() {
    return $('<input type="date" class="form-control">');
  };

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


  function OptGroup() {
    this.options = [];
    this.name = arguments[0];
    for (var _i = 1, _len = arguments.length; _i < _len; _i++) {
      this.options.push(arguments[_i]);
    }
  }
  IRIS.Extend(OptGroup, Renderable);
  OptGroup.prototype.render = function(builder) {
    var $div = $('<div>')
    for (var _i = 0, _len = this.options.length; _i < _len; _i++) {
      var option = this.options[_i];
      $div.append(this.renderItems(builder, option));
    }
    return $div;
  }

  var DEFAULTS = {
    swaggerURL: 'swagger-rkgravitymag.json',
    path: '/query',
    labelClass: 'col-xs-2',
    fieldClass: 'col-xs-10',
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
    ).then(
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
    var parameters = operationData.parameters;
    this.parameter_names = [];
    this.parameter_map = {};
    for (var _i = 0, _len = parameters.length; _i < _len; _i++) {
      if (parameters[_i].in === 'query') {
        var param = parameters[_i];
        this.parameter_names.push(param.name);
        if (!this.options.parameters) {
          this.options.parameters = {};
        }
        if (!this.options.parameters[param.name]) {
          this.options.parameters[param.name] = new Parameter();
        }
        this.options.parameters[param.name].initialize(param);
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
    this.$usage.append(this.renderUsage());
    var items = this.options.layout;
    if (!items) {
      items = this.parameter_names;
    }
    this.$form.append(this.renderItems(this, items));
  };

  Builder.prototype.renderUsage = function() {
    var usage = []
    for (var _i = 0, _len = this.parameter_names.length; _i < _len; _i++) {
      var parameter = this.options.parameters[this.parameter_names[_i]];
      usage.push(parameter.renderUsage(this));
    }
    return usage;
  };

  Builder.prototype.getFieldLabel = function(name) {
    if (this.options.labels && this.options.labels[name]) {
      return this.options.labels[name];
    }
    else {
      return name;
    }
  };

  Builder.prototype.getOptionLabel = function(name, value) {
    if (this.options.options && this.options.options[name] && this.options.options[name][value]) {
      return this.options.options[name][value];
    }
    else {
      return value;
    }
  };

  return {
    Parameter: Parameter,
    DateParameter: DateParameter,
    Columns: Columns,
    OptGroup: OptGroup,
    Fieldset: Fieldset,
    Builder: Builder
  };

})(jQuery);


