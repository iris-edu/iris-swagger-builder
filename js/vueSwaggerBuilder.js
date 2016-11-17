/* Boilerplate to define module using AMD with fallback to global variable */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'irisUtil', 'Vue', 'Vuex', 'vueBuilder'], factory);
    } else {
        // Browser globals
        root.vueBuilder = factory(jQuery, irisUtil, Vue, Vuex);
    }
}(this, function ($, irisUtil, Vue, Vuex) {

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
    function Parameter(options) { this.options = options; }
    irisUtil.Extend(Parameter, Renderable);

    // Options, these can be overridden by passing them in the constructor
    Parameter.prototype.inputSize = 20;
    Parameter.prototype.checkbox = null;

    Parameter.prototype.setSwaggerDefinition = function(swaggerDefinition) {
        // Options come from (in order of precedence)
        // 1. this.options (passed into constructor)
        // 2. swaggerDefinition (come from Swagger JSON)
        // 3. prototype attributes (already set on the object)
        var self = this;
        $.extend(true, self, swaggerDefinition, self.options);
        // Default the form id to the parameter name
        self.id = self.id || self.name;
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
        if (!self.enumLabels) {
            return value;
        }
        return self.enumLabels[value] || value;
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
    irisUtil.Extend(DateParameter, Parameter);

    // Set/override some default options
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

    /**
     * A parameter representing date + time
     */
    function DateTimeParameter(options) { this.options = options; }
    irisUtil.Extend(DateTimeParameter, DateParameter);

    // Set/override options
    DateTimeParameter.prototype.includeTime = true;

    /**
     * Defines a columnar layout, each argument to the constructor should be a list that can be
     * passed to Renderable.render_items(), eg. each element of each list should be a Renderable
     * or a field name.
     */
    function Columns() {
        this.columns = Array.prototype.slice.call(arguments, 0)
    }
    irisUtil.Extend(Columns, Renderable);

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
     * Defines a fieldset. The first argument is the legend, remaining arguments are
     * the items in the fieldset.
     */
    function Fieldset(legend) {
        this.legend = legend;
        this.items = Array.prototype.slice.call(arguments, 1);
    }
    irisUtil.Extend(Fieldset, Renderable);
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
    irisUtil.Extend(OptGroup, Renderable);
    OptGroup.prototype.render = function(builder) {
        var self = this;
        var $div = $('<div>')
        $.each(self.options, function(_i, option) {
            // Add a radio button representing this option
            var $radio = $('<input type="radio">');
            var id = option[0];
            $radio.prop('name', self.name).prop('value', id);
            var $label = $('<label>').append(
                $radio, " ", id
            );
            // Add any child components
            var $subdiv = $('<div class="inactive hide-if-inactive">').append(
                self.renderItems(builder, option.slice(1))
            );
            $div.append($("<div>").append($label), $subdiv);
            // Set up irisBuilder dependencies.  This requires the irisBuilder functionality to have
            // run already, so it's done via a callback
            builder.addPostInitCallback(function() {
                // The div containing the child components depends on the radio being selected
                $subdiv.irisBuilder('dependsOn', $radio);
                // Any inputs within the subdiv depend on the subdiv
                $("input, button", $subdiv).irisBuilder('dependsOn', $subdiv);
                // Trigger the irisBuilder to act on the current state of the radio
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
    irisUtil.Extend(CoordinateBox, Renderable);
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
    irisUtil.Extend(CoordinateRadius, Renderable);
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


    Vue.component('text-input', {
        template: '\
            <div class="form-group">\
              <label v-bind:for="randomId">{{ displayLabel }}:</label>\
              <input v-bind:id="randomId" v-model="value">\
            </div>\
          ',
          props: ['name', 'label'],
          data: function () {
              return {
                  randomId: 'input-' + Math.random()
              }
          },
          computed: {
              displayLabel: function() {
                  if (this.label) {
                      return this.label;
                  } else if (this.definition()) {
                      return this.definition().description;
                  } else {
                      return this.name;
                  }
              },
              value: {
                  get: function() {
                      return this.$store.state.input[this.name];
                  },
                  set: function(v) {
                      var update = {};
                      update[this.name] = v;
                      this.$store.commit('update', update);
                  }
              }
          },
          methods: {
              definition: function() {
                  if (this.$store && this.$store.state.definition && this.$store.state.definition.operation.params[this.name]) {
                      return this.$store.state.definition.operation.params[this.name];
                  } else {
                      return {};
                  }
              }
          }
    });



    /**
     * Default builder options
     */
    var DEFAULTS = {
        /* URL to retrieve Swagger definition from */
        swaggerURL: 'example/swagger-event.json',
        /* Swagger path to generate a builder for */
        path: '/query',
        /* Method (eg. "get" or "post") to generate a builder for */
        method: 'get',
        /* jQuery selector to get the form to work on */
        form: 'form',
        /* Bootstrap form classes */
        labelClass: 'col-xs-2',
        fieldClass: 'col-xs-10',
        /* Where to show parameter help text, options are 'inline', 'dialog', 'inline,dialog' or '' */
        showHelpText: 'dialog'
    };

    /**
     * Main builder object.
     * @param options : a dictionary of options, supplementing/overriding DEFAULTS
     */

//    return {
//        Parameter: Parameter,
//        DateParameter: DateParameter,
//        DateTimeParameter: DateTimeParameter,
//        Columns: Columns,
//        OptGroup: OptGroup,
//        CoordinateBox: CoordinateBox,
//        CoordinateRadius: CoordinateRadius,
//        Fieldset: Fieldset,
//        Builder: Builder
//    };

        Vue.component('builder', {
            template: '\
                <div> \
                    <h2>Builder</h2> \
                    <slot>fields</slot> \
                    <div>{{ querypath }}?{{ url }}</div> \
                </div> \
            ',
            props: ['definition', 'path', 'method'],
            data: function() {
                return {
                    service: {},
                    operation: {}
                };
            },
            computed: {
                querypath: function() {
                    if (this.$store.state.service) {
                        return this.$store.state.service.basePath + this.$store.state.service.path;
                    } else {
                        return '-';
                    }
                },
                url: function() {
                    return $.param(this.$store.state.query || []);
                }
            },
            mounted: function() {
                builder({
                   definition: this.definition,
                   path: this.path || '/query',
                   method: this.method || 'get'
                });
            }
        });

        var storeOptions = {
            state: {
                input: {}
            },
            mutations: {
                update: function(state, data) {
                },
                load: function(state, definition) {
                    state.definition = definition;
                },
            }
        };
        var store = new Vuex.Store(storeOptions);

        function builder(options) {

            function parseSwaggerData(data) {
                var definition = {
                    service: {
                        title: data.info.title,
                        description: data.info.description,
                        host: data.host,
                        basePath: data.basePath,
                        path: options.path
                    }
                };
                // Extract the operation-level definition and parse that separately
                var pathData = data.paths[options.path]
                if (!pathData) {
                    throw "Invalid service path given: " + options.path;
                }
                operation = pathData[options.method];
                if (!operation) {
                    throw "Method " + options.method + " is not defined for " + options.path;
                }
                definition.operation = parseSwaggerOperation(operation);
                return definition;
            };

            function parseSwaggerOperation(operationData) {
                var operation = {
                    summary: operationData.summary,
                    description: operationData.description,
                    // List of parameter names, this is mostly to preserve the ordering
                    parameterNames: [],
                    // Information about each parameter
                    params: {}
                };
                $.each(operationData.parameters, function(_i, param) {
                    // Only handle the query parameters
                    if (param.in == 'query') {
                        operation.parameterNames.push(param.name);
                        operation.params[param.name] = param;
                    }
                });
                return operation;
            };

            return $.ajax(options.definition).then(
                function(data) {
                    self.data = data;
                    try {
                        // Parse the JSON definition and build out the DOM
                        return parseSwaggerData(data);
                    }
                    catch(error) {
                        irisUtil.Log.error("Error: " + (error.stack || error));
                        return $.Deferred().reject(error);
                    }
                },
                function(jqXHR, status, error) {
                    // Return a single error value, so that Ajax errors can be handled like any other error
                    return error || status;
                }
            ).then(
                function(definition) {
                    store.commit('load', definition);
                }
            ).then(
                function() { irisUtil.Log.debug("Success"); },
                function(error) { irisUtil.Log.error("Failure: " + error); return error; }
            );
        };


        $(function() {
            window.vueWidget = new Vue({
                el: '#builder',
                store
            });
        });
}));






