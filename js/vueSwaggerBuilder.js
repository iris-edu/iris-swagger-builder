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
     * IMPORTANT: This library requires jQuery 3
     */

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
        var $widget = $('<Flatpickr v-model="" />');
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
    // irisUtil.Extend(OptGroup, Renderable);
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
//    irisUtil.Extend(CoordinateBox, Renderable);
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
//    irisUtil.Extend(CoordinateRadius, Renderable);
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

    /**
     * Base mixin for a field, this provides standard operations
     */
    var baseFieldMixin = {
        props: ['name', 'label', 'placeholder', 'default', 'required'],
        data: function () {
            return {
                // Used for the DOM id
                randomId: 'input-' + Math.random()
            }
        },
        computed: {
            // The definition of the parameter from Swagger
            definition: function() {
                return this.$store.state.definition.operation.params[this.name];
            },
            // Should this have a checkbox?
            checkbox: function() {
                return (this.required == "false") ||
                    (!this.required && !this.definition.required);
            },
            // Text for the field label
            displayLabel: function() {
                return (this.label || this.name);
            },
            // Get/set the checkbox state
            checked: {
                get: function() {
                    return (!this.checkbox || this.getState(this.name + "-check"));
                },
                set: function(v) {
                    this.setState(this.name + "-check", v);
                    this.updateQuery();
                }
            },
            // Get/set the field value
            // Subclasses should override (get/set/from/to)StateValue to
            // customize the details of how the value maps onto state
            value: {
                get: function() {
                    return this.fromStateValue(this.getStateValue());
                },
                set: function(v) {
                    this.setStateValue(this.toStateValue(v));
                }
            },
            // Get the value as a query parameter
            queryValue: function() {
                return this.toQueryValue(this.value);
            },
            // Placeholder text, if any
            placeholderText: function() {
                if (this.placeholder) {
                    return this.placeholder;
                }
                if (this.definition.default != undefined) {
                    return "" + this.definition.default;
                }
                if (this.definition.maximum) {
                    return "" + this.definition.minimum + " - " + this.definition.maximum;
                }
                return "";
            },
            helpText: function() {
                return this.definition.description || "";
            }
        },
        methods: {
            /* Simple translators for single values, usually this is what
             * subclasses should override
             */
            fromStateValue: function(v) {
                return v;
            },
            toStateValue: function(v) {
                return v;
            },
            // Translate a single value to a query parameter
            toQueryValue: function(v) {
                return v;
            },

            /* These implement a simple 1-1 mapping for state and query.
             * eg. state[this.name] = this.value
             */

            /* Get the component value from the state */
            getStateValue: function() {
                var v = this.getState(this.name);
                if (v === undefined) {
                    v = this.default;
                }
                if (v === undefined) {
                    v = "";
                }
                return this.fromStateValue(v);
            },
            /* Write the component value to the state */
            setStateValue: function(v) {
                this.setState(this.name, this.toStateValue(v));
                this.updateQuery();
            },
            /* Produce a dictionary of query parameters */
            getQuery: function() {
                var query = {};
                query[this.name] = this.checked ? this.toQueryValue(this.value) : "";
                return query;
            },

            /* These are basically class methods; usually,
                k = this.name
                but these allow the field to set or read things
                outside its own setting (ie. some fields may depend on
                or affect others (example?))
             */
            // Get any keyed value from the input state
            getState: function(k) {
                return this.$store.state.input[k];
            },
            // Set the current value for the indicated input
            setState: function(k, v) {
                var update = {};
                update[k] = v;
                this.$store.commit('update', update);
            },
            // Trigger an update to the full query URL
            updateQuery: function() {
                var query = this.getQuery();
                this.$store.commit('updateQuery', query);
            }
        }
    };

    Vue.component('text-input', {
        template: '\
            <div class="form-group"> \
              <label :for="randomId">{{ displayLabel }}:</label> \
              <input v-if="checkbox" v-model="checked" type="checkbox" /> \
              <input :disabled="!checked" :id="randomId" v-model="value" \
                class="form-control" :placeholder="placeholderText"/> \
              <div class="help" v-if="helpText">{{ helpText }}</div> \
            </div> \
            ',
        mixins: [baseFieldMixin]
    });

    Vue.component('date-input', {
        template: '\
            <div class="form-group"> \
              <label :for="randomId">{{ displayLabel }}:</label> \
              <input v-if="checkbox" v-model="checked" type="checkbox" /> \
              <Flatpickr :disabled="!checked" :id="randomId" v-model="value" class="form-control" /> \
            </div> \
            ',
        mixins: [baseFieldMixin],
        methods: {
            toQueryValue: function(v) {
                return v.replace(' ', 'T');
            },
            // Placeholder text, if any
            placeholderText: function() {
                if (this.placeholder) {
                    return this.placeholder;
                }
                if (this.definition.default != undefined) {
                    return "" + this.definition.default;
                }
                if (this.definition.maximum) {
                    return "" + this.definition.minimum + " - " + this.definition.maximum;
                }
                return "";
            }
        }
    });

    Vue.component('choice-input', {
        template: '\
            <div class="form-group"> \
              <label :for="randomId">{{ displayLabel }}:</label> \
              <input v-if="checkbox" v-model="checked" type="checkbox" /> \
              <select :disabled="!checked" :id="randomId" v-model="value" class="form-control"> \
                <option v-for="choice in choices">{{ choice }}</option> \
              </select> \
            </div> \
            ',
        mixins: [baseFieldMixin],
        computed: {
            choices: function() {
                return this.definition.enum;
            },

        }
    });

    Vue.component('boolean-input', {
        template: '\
            <div class="form-group"> \
              <label :for="randomId">{{ displayLabel }}:</label> \
              <input :id="randomId" v-model="value" type="checkbox" class="checkbox" value="true" /> \
            </div> \
            ',
        mixins: [baseFieldMixin],
        computed: {
            // The input is itself a checkbox, so never show the wrapper checkbox
            checkbox: function() {
                return false;
            },
            queryValue: function() {
                return this.value ? "true" : "";
            }
        }
    });

    Vue.component('field', {
        render: function(h) {
            return h('div', {
                'class': 'form-group'
            }, [
                'Test'
            ]);
        },
        render2: function(h) {
            var self = this;
            var checkbox = '';
            if (this.checkbox) {
                checkbox = h('input', {
                    attrs: {
                        type: 'checkbox'
                    },
                    domProps: {
                        value: self.checked
                    },
                    on: {
                        input: function(e) {
                            self.checked = e.target.value;
                        }
                    }
                });
            }
            var input = h('input', {
                attrs: {
                    type: 'text',
                    id: self.randomId
                },
                domProps: {
                    value: self.value
                },
                on: {
                    input: function(e) {
                        self.value = e.target.value;
                    }
                }
            });
            return h('div', {
                'class': 'form-group'
            }, [
                h('label', {
                    attrs: {
                        'for': self.randomId
                    }
                }, [
                        self.displayLabel
                    ]
                ),
                checkbox,
                input
            ]);
        },
        mixins: [baseFieldMixin]
    });


    /* The default escape (from $.param) overescapes things, so undo some
     */
    function friendlyURL(url) {
        // TODO: probably more substitutions should be here
        return url.replace(/%3A/g, ':');
    }

    Vue.component('query-link', {
        template: '\
            <div class="query"> \
                <a :href="url">{{ prettyURL }}</a> \
            </div> \
        ',
        props: ['url'],
        computed: {
            prettyURL: function() {
                return this.url.replace(/(\?|\&)/g, '$& ');
            }
        },
        methods: {
            affix: function() {
                $('.query').affix({
                  offset: {
                    top: $('.query').offset().top,
                    bottom: $('footer').outerHeight(true) + 40
                  }
                });
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
            // Main page template
            template: '\
                <div v-if="ready"> \
                    <h2>{{ serviceDefinition.title }}</h2> \
                    <p>{{ serviceDefinition.description }}</p> \
                    <form class="form-inline"> \
                        <slot>fields</slot> \
                    </form> \
                    <query-link :url="queryURL"></query-link> \
                </div> \
                <div v-else> \
                    <div v-if="error" class="error"> \
                        {{ error }} \
                    </div> \
                    <div v-else> \
                        Loading... \
                    </div> \
                </div> \
            ',
            props: ['definition', 'path', 'method'],
            data: function() {
                return {};
            },
            computed: {
                // Is everything loaded and ready to go
                ready: function() {
                    return this.$store.state.definition.service;
                },
                // Service definition from JSON (empty if not ready)
                serviceDefinition: function() {
                    return this.ready ? this.$store.state.definition.service : {};
                },
                // Operation definition from JSON (empty if not ready)
                operationDefinition: function() {
                    return this.ready ? this.$store.state.definition.operation : {};
                },
                // Full URL path for the query (eg. '/fdsnws/event/1/query')
                queryPath: function() {
                    return this.serviceDefinition.basePath + this.serviceDefinition.path;
                },
                // List of query parameters
                queryParams: function() {
                    return friendlyURL($.param(this.$store.state.query || []));
                },
                // Full query URL
                queryURL: function() {
                    return "" + this.queryPath + "?" + decodeURI(this.queryParams);
                },
                // The current error message, if one exists
                error: function() {
                    return this.$store.state.error;
                }
            },
            mounted: function() {
                // Initialize when mounted
                builder({
                   definition: this.definition,
                   path: this.path || '/query',
                   method: this.method || 'get'
                });
            }
        });

        // Simple Vuex store
        var storeOptions = {
            state: {
                query: {},
                input: {},
                definition: {},
                error: null
            },
            mutations: {
                updateQuery: function(state, data) {
                    // Update the service query URL
                    var query = $.extend({}, state.query, data);
                    for (var k in query) {
                        if (query[k] === "") {
                            delete query[k];
                        }
                    }
                    state.query = query;
                },
                update: function(state, data) {
                    // Update the state of the form inputs
                    state.input = $.extend({}, state.input, data);
                },
                load: function(state, definition) {
                    // Load a JSON definition
                    state.definition = definition;
                },
                error: function(state, error) {
                    // Enter (or clear) the error state
                    state.error = error;
                }
            }
        };
        var store = new Vuex.Store(storeOptions);

        function builder(options) {

            /* Convert swagger data to a flatter format
             * definition.service = "service" level information combining
             *  the Swagger JSON with some local settings
             * definition.operation = the Swagger JSON for this builder's
             *  Operation (each builder handles just one Operation, but
             *  the Swagger JSON may define many).
             */

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

            /* Note that this is written for jQuery 3.0, which changed how Deferreds work */

            // Load the Swagger definition
            return $.ajax(options.definition).then(
                // OK, parse the definition
                function(data) {
                    return parseSwaggerData(data);
                },
                // Error, consolidate into a single value
                function(jqXHR, status, error) {
                    throw (error || status);
                }
            ).then(
                // Store the parsed definition
                function(definition) {
                    irisUtil.Log.debug("Success");
                    store.commit('load', definition);
                },
                // Error
                function(error) {
                    irisUtil.Log.error("Error: " + error);
                    store.commit('error', error);
                }
            );
        };

        irisUtil.Log.setLevel('debug');
        $(function() {
            window.vueWidget = new Vue({
                el: '#builder',
                store
            });
        });
}));
