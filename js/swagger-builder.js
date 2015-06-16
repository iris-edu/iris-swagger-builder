/* globals jQuery */


var Builder = (function($) {

  var DEFAULTS = {
    swaggerURL: '/swagger-rkgravitymag.json',
    labelClass: 'col-xs-4',
    fieldClass: 'col-xs-8',
    path: '/query'
  }

  function Builder(options) {
    this.initialize(options);
  }

  Builder.prototype.initialize = function(options) {
    var self = this;
    self._done = $.Deferred();
    self._done.then(
      function() { console.log("Success"); },
      function(error) { console.log("Failure: " + error); }
    );
    self.done = self._done.promise();
    self.options = $.extend({}, DEFAULTS);
    if (options) {
      $.extend(self.options, options);
    }
  };

  Builder.prototype.run = function() {
    var self = this;
    self.initDOM();
    var $ajax = $.ajax(self.options.swaggerURL).then(
      function(data) {
        self.data = data;
        try { self.render(self.parseSwaggerData(data)); }
        catch(error) {
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
    var serviceDefinition = {
      title: data.info.title,
      description: data.info.description,
      host: data.host,
      basePath: data.basePath,
      path: this.options.path,
      operation: this.parseSwaggerOperation(data.paths[this.options.path].get)
    };
    return serviceDefinition;
  };

  Builder.prototype.parseSwaggerOperation = function(operationData) {
    var parameters = operationData.parameters;
    for (var i = 0, len = parameters.length; i < len; i++) {
      parameters[i] = this.parseSwaggerParameter(parameters[i]);
    }
    return operationData;
  };

  Builder.prototype.parseSwaggerParameter = function(parameterData) {
    parameterData.id = parameterData.name + '-id';
    return parameterData;
  };

  Builder.prototype.initDOM = function() {
    this.$serviceTitle = $('#service-title').empty();
    this.$serviceDescription = $('#service-description').empty();
    this.$operationSummary = $('#operation-summary').empty();
    this.$operationDescription = $('#operation-description').empty();
    this.$form = $('form#builder-form').empty();
    this.$usage = $('#usage-table').empty();
  };

  Builder.prototype.render = function(definition) {
    this.$serviceTitle.html(definition.title);
    this.$serviceDescription.html(definition.description);
    this.$operationSummary.html(definition.operation.summary);
    this.$operationDescription.html(definition.operation.description);
    this.$form.prop('action', "http://" + definition.host + definition.basePath + definition.path);
    var parameters = definition.operation.parameters;
    for (var i = 0, len = parameters.length; i < len; i++) {
      var parameter = parameters[i];
      if (parameter.in === 'query') {
        this.renderField(parameter);
        this.renderUsage(parameter);
      }
    }
  };

  Builder.prototype.renderUsage = function(parameter) {
    var $label = $('<th>').text(parameter.name);
    var $description = $('<td>').html(parameter.description);
    var $row = $('<tr>').append($label, $description);
    this.$usage.append($row);
  };

  Builder.prototype.renderField = function(parameter) {
    var $input = this.renderInput(parameter);
    var $label = $('<label>').prop('for', parameter.id).text(parameter.name);
    if (parameter.required) {
      $label.addClass('requiredField');
    }
    var $row = $('<div>').addClass('row').prop('id', parameter.id + '-row')
      .append(
        $('<div>').addClass(this.options.labelClass)
          .append($label))
      .append(
        $('<div>').addClass(this.options.fieldClass)
          .append($input)
          .append($('<div>').addClass('help-block').html(parameter.description)));
    this.$form.append($row);
  };

  Builder.prototype.renderInput = function(parameter) {
    var $input;
    if (parameter.type === 'boolean') {
      $input = $('<input type="checkbox" value="true" class="checkbox">');
    }
    else if (parameter.enum) {
      $input = $('<select class="form-control">');
      for (var i = 0, len = parameter.enum.length; i < len; i++) {
        var $option = $('<option>')
          .text(parameter.enum[i])
          .val(parameter.enum[i]);
        $input.append($option);
      }
    }
    else {
      $input = $('<input type="text" class="form-control">');
    }
    $input.prop('id', parameter.id)
          .prop('name', parameter.name);
    if (parameter.type != 'boolean') {
      if (parameter.default) {
        $input.val(parameter.default);
      }
      if (!parameter.required) {
        var $wrapper = $('<div>');
        $wrapper.append(
          $('<input type="checkbox">').prop('id', parameter.id + '-check'),
          " ",
          $input);
        return $wrapper;
      }
    }
    return $input;
  };

  return Builder;

})(jQuery);


