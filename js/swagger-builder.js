/* globals jQuery, IRIS */


var Builder = (function($) {

    /**
     * Base class for any component that needs to render itself onto the page
     */
    function Renderable() {}
    /**
     * Render an item
     * @param builder: the main Builder
     * @returns a jQuery DOM object
     */
    Renderable.prototype.render = function(builder) {}
    /**
     * Render a list of sub-items, which are assumed to be Renderable or a field name
     * @param builder: the main Builder
     * @param items: list of Renderable objects and/or field names
     * @returns an array of jQuery DOM objects
     */
    Renderable.prototype.renderItems = function(builder, items) {
        var self = this;
        var rendered = [];
        $.each(items, function(_i, item) {
            if (!item.render) {
                item = builder.params[item];
            }
            if (item && item.render) {
                rendered.push(item.render(builder));
            } else {
                throw "Could not render " + item;
            }
        });
        return rendered;
    };

    /**
     * Base class for a query parameter which appears as a form input.
     */
    function Parameter() {}
    IRIS.Extend(Parameter, Renderable);

    // Options, these can be overridden by specifying them in the builder definition
    Parameter.prototype.inputSize = 10;
    Parameter.prototype.checkbox = null;

    Parameter.prototype.initialize = function(paramDefinition) {
        var self = this;
        $.extend(true, self, paramDefinition);
        self.id = self.name;
    };

    /* Return the parameter label */
    Parameter.prototype.getLabel = function(builder) {
        var self = this;
        if (self.label) {
            return self.label;
        } else {
            return self.name[0].toUpperCase() + self.name.slice(1);
        }
    };

    /* Return the label for the given enum value */
    Parameter.prototype.getEnumLabel = function(value) {
        var self = this;
        if (!self.enum_labels) {
            return value;
        }
        return self.enum_labels[value] || value;
    };

    /* Render a row in the usage popup */
    Parameter.prototype.renderUsage = function(builder) {
        var self = this;
        var $label = $('<th>').text(self.getLabel(builder));
        var $description = $('<td>').html(self.description);
        return $('<tr>').append($label, $description);
    };

    /* Render the parameter as a row (label + field) in the form */
    Parameter.prototype.render = function(builder) {
        var self = this;
        var $field = self.renderField(builder);
        var label = self.getLabel(builder);
        var $label = $('<label>').prop('for', self.id).text(label);
        if (self.required) {
            $label.addClass('requiredField');
        }
        var $row = $('<div>').addClass('row').prop('id', self.id + '-row');
        var $labelCol = $('<div>').addClass(builder.options.labelClass).append($label);
        var $fieldCol = $('<div>').addClass(builder.options.fieldClass).append($field);
        if (builder.options.showHelpText.indexOf('inline') > -1) {
            $fieldCol.append($('<div>').addClass('help-block').html(self.description));
        }
        $row.append($labelCol, $fieldCol);
        return $row;
    };

    /* Render the field area (widget with possible checkbox or other decoration) for the parameter */
    Parameter.prototype.renderField = function(builder) {
        var self = this;
        var $widget = self.renderWidget(builder);
        if (self.checkbox === true || (self.checkbox === null && self.enum && !self.required)) {
            var $wrapper = $('<div>');
            var $checkbox = $('<input type="checkbox">').prop('id', self.id + '-check')
            $wrapper.append(
                $checkbox,
                " ",
                $widget);
            return $wrapper;
        }
        return $widget;
    };

    /* Render the actual widget for the parameter */
    Parameter.prototype.renderWidget = function(builder) {
        var self = this;
        var $widget;
        if (self.type === 'boolean') {
            $widget = $('<input type="checkbox" value="true" class="checkbox">');
        }
        else {
            if (self.enum) {
                $widget = $('<select class="form-control">');
                $.each(self.enum, function(_i, val) {
                    var label = self.getEnumLabel(val);
                    var $option = $('<option>')
                        .text(label)
                        .val(val);
                    $widget.append($option);
                });
            }
            else {
                $widget = $('<input type="text" class="form-control">');
                $widget.prop('size', self.inputSize);
            }
            if (self.default) {
                $widget.val(self.default);
            }
        }
        $widget.prop('id', self.id).prop('name', self.name);
        return $widget;
    };

    /**
     * A parameter representing a date
     */
    function DateParameter(options) { this.options = options; }
    IRIS.Extend(DateParameter, Parameter);
    DateParameter.prototype.inputSize = 18;
    DateParameter.prototype.includeTime = false;
    DateParameter.prototype.renderWidget = function(builder) {
        var self = this;
        var $widget = $('<input type="date" class="date-input form-control">');
        $widget.prop('id', self.id).prop('name', self.name);
        $widget.prop('size', self.inputSize);
        if (self.default) {
            $widget.val(self.default);
        }
        var $field = $('<div class="input-group">').prop('id', self.id + '-field').append($widget);
        if (self.includeTime) {
            if ($.fn.datetimepicker) {
                $widget.datetimepicker();
                $('.ui-datepicker-trigger', $field).addClass('btn btn-default').wrap('<div class="input-group-btn">');
            }
        } else {
            if ($.fn.datepicker) {
                $widget.datepicker();
                $('.ui-datepicker-trigger', $field).addClass('btn btn-default').wrap('<div class="input-group-btn">');
            }
        }
        return $('<div class="date-input-wrapper">').append($field);
    };

    function DateTimeParameter(options) { this.options = options; }
    IRIS.Extend(DateTimeParameter, DateParameter);
    DateTimeParameter.prototype.includeTime = true;

    /**
     * Defines a columnar layout, each argument to the constructor should be a list that can be
     * passed to Renderable.render_items(), eg. each element of each list should be a Renderable
     * or a field name.
     */
    function Columns() {
        this.columns = Array.prototype.slice.call(arguments, 0)
    }
    IRIS.Extend(Columns, Renderable);

    Columns.prototype.render = function(builder) {
        var self = this;
        var $row = $('<div class="row">');
        $.each(self.columns, function(_i, column) {
            var $col = $('<div class="col-xs-6">');
            $col.append(self.renderItems(builder, column));
            $row.append($col);
        });
        return $row;
    };

    /**
     * Defines a fieldset.    The first argument is the legend, remaining arguments are
     * the items in the fieldset.
     */
    function Fieldset(legend) {
        this.legend = legend;
        this.items = Array.prototype.slice.call(arguments, 1);
    }
    IRIS.Extend(Fieldset, Renderable);
    Fieldset.prototype.render = function(builder) {
        var self = this;
        var $fieldset = $('<fieldset>').append($('<legend>').html(self.legend));
        $fieldset.append(self.renderItems(builder, self.items));
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
        var self = this;
        var $div = $('<div>')
        $.each(self.options, function(_i, option) {
            var $radio = $('<input type="radio">');
            var id = option[0];
            $radio.prop('name', self.name).prop('value', id);
            var $label = $('<label>').append(
                $radio, " ", id
            );
            var $subdiv = $('<div class="inactive hide-if-inactive">').append(
                self.renderItems(builder, option.slice(1))
            );
            $div.append($("<div>").append($label), $subdiv);
            // Add dependency information to pass to the builder later
            builder.addBuilderAction(function() {
                    $subdiv.builder('dependsOn', $radio);
                    $("input, button", $subdiv).builder('dependsOn', $subdiv);
                    $radio.change();
            });
        });
        return $div;
    };

    /**
     * Defines a lat/lon box coordinate picker
     * Pass the constructor a list of n/s/e/w parameter names
     */
    function CoordinateBox() {
        this.nsewInputs = Array.prototype.slice.call(arguments, 0);
    }
    IRIS.Extend(CoordinateBox, Renderable);
    CoordinateBox.prototype.render = function(builder) {
        var self = this;
        var $div = $('<div class="coord_box">');
        var $openBtn = $('<button type="button" class="btn btn-default">Use Map</button>');
        $div.append($openBtn).append(self.renderItems(builder, self.nsewInputs));
        $div.coordinate_picker({
            nsewInputs: $('input[type=text]', $div),
            drawingModes: 'rect',
            openBtn: $openBtn
        });
        return $div;
    };


    /**
     * Defines a lat/lon/radius coordinate picker
     * Pass the constructor a list of lat/lon/radius parameter names
     */
    function CoordinateRadius() {
        this.crInputs = Array.prototype.slice.call(arguments, 0);
    }
    IRIS.Extend(CoordinateRadius, Renderable);
    CoordinateRadius.prototype.render = function(builder) {
        var self = this;
        var $div = $('<div class="coord_radius">');
        var $openBtn = $('<button type="button" class="btn btn-default">Use Map</button>');
        $div.append($openBtn).append(self.renderItems(builder, self.crInputs));
        $div.coordinate_picker({
            crInputs: $('input[type=text]', $div),
            drawingModes: 'circle',
            openBtn: $openBtn
        });
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

    /* Main execution block for the Swagger Builder */
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
        }).then(function() {
            $.each(self.builderActions, function(_i, action) {
                    action();
            })
        }).then(
            self._done.resolve,
            self._done.reject,
            self._done.notify
        );
        return self.done;
    };

    /* Parse and build based on the top level Swagger JSON */
    Builder.prototype.parseSwaggerData = function(data) {
        var self = this;
        self.service = {
            title: data.info.title,
            description: data.info.description,
            host: data.host,
            basePath: data.basePath,
            path: self.options.path
        };
        self.operation = data.paths[self.options.path].get;
        self.parseSwaggerOperation(self.operation);
    };

    /* Parse and build for a particular Swagger operation */
    Builder.prototype.parseSwaggerOperation = function(operationData) {
        var self = this;
        self.parameters = operationData.parameters;
        self.parameter_names = [];
        self.params = {};
        $.each(self.parameters, function(_i, param) {
            if (param.in == 'query') {
                if (self.options.parameters) {
                    $.extend(true, param, self.options.parameters[param.name]);
                }
                self.parameter_names.push(param.name);
                var paramObj = param.class;
                if (!paramObj) {
                    if (param.type == "string") {
                        if (param.format == "date") {
                            paramObj = new DateParameter();
                        }
                        else if (param.format == "date-time") {
                            paramObj = new DateTimeParameter();
                        }
                    }
                    if (!paramObj) {
                        paramObj = new Parameter();
                    }
                }
                self.params[param.name] = paramObj;
                paramObj.initialize(param);
            }
        });
    };

    /* Initialize the page DOM elements that this builder will control */
    Builder.prototype.initDOM = function() {
        this.$serviceTitle = $('#service-title').empty();
        this.$serviceDescription = $('#service-description').empty();
        this.$operationSummary = $('#operation-summary').empty();
        this.$operationDescription = $('#operation-description').empty();
        this.$form = $('form#builder-form').empty();
        this.$usage = $('#usage-table').empty();
    };

    /* Main render function */
    Builder.prototype.render = function() {
        var self = this;
        self.$serviceTitle.html(self.service.title);
        self.$serviceDescription.html(self.service.description);
        self.$operationSummary.html(self.operation.summary);
        self.$operationDescription.html(self.operation.description);
        self.$form.prop('action', "http://" + self.service.host + self.service.basePath + self.service.path);
        if (self.options.showHelpText.indexOf('dialog') > -1) {
                self.$usage.append(self.renderUsage());
        }
        var items = self.options.layout;
        if (!items) {
            items = self.parameter_names;
        }
        self.$form.append(self.renderItems(self, items));
    };

    /* Render the usage dialog content */
    Builder.prototype.renderUsage = function() {
        var self = this;
        var usage = []
        $.each(self.parameter_names, function(_i, param_name) {
            var paramObj = self.params[param_name];
            usage.push(paramObj.renderUsage(self));
        });
        return usage;
    };

    Builder.prototype.addBuilderAction = function(action) {
        var self = this;
        self.builderActions.push(action);
    };

    return {
        Parameter: Parameter,
        DateParameter: DateParameter,
        DateTimeParameter: DateTimeParameter,
        Columns: Columns,
        OptGroup: OptGroup,
        CoordinateBox: CoordinateBox,
        CoordinateRadius: CoordinateRadius,
        Fieldset: Fieldset,
        Builder: Builder
    };

})(jQuery);


