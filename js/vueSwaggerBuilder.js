// jshint multistr: true

/* Boilerplate to define module using AMD with fallback to global variable */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'irisUtil', 'Vue', 'Vuex'], factory);
    } else {
        // Browser globals
        root.vueBuilder = factory(jQuery, irisUtil, Vue, Vuex);
    }
}(this, function ($, irisUtil, Vue, Vuex) {

    /**
     * IMPORTANT: This library requires jQuery 3
     */

    /**
     * Base mixin for a field, this provides standard operations
     */
    var baseFieldMixin = {
        props: ['name', 'label', 'placeholder', 'default', 'required'],
        data: function () {
            return {
                // Used for the DOM id
                randomId: 'input-' + Math.random()
            };
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
                if (this.definition.default !== undefined) {
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

/* Experiment, trying to separate out the base field decorations */
    Vue.component('input-wrapper', {
        props: ['label', 'uid', 'checkbox', 'value', 'helpText'],
        template: '\
            <div class="form-group"> \
                <label :for="uid">{{ label }}:</label> \
                <input v-if="checkbox" v-model="checked" type="checkbox" /> \
                <div class="input-field"> \
                    <slot>widget</slot> \
                    <div class="help" v-if="helpText">{{ helpText }}</div> \
                </div> \
            </div> \
            ',
        computed: {
            // Get/set the field value
            // Subclasses should override (get/set/from/to)StateValue to
            // customize the details of how the value maps onto state
            checked: {
                get: function() {
                    return this.value;
                },
                set: function(v) {
                    this.$emit('input', v);
                }
            },
        }
    });

    Vue.component('text-widget', {
        props: ['checked', 'randomId', 'value', 'placeholderText'],
        template: '\
          <input :disabled="!checked" :id="randomId" v-model="value" \
            class="form-control" :placeholder="placeholderText"/> \
        '
    });

    Vue.component('test-input', {
        template: '\
            <input-wrapper :label="displayLabel" :checkbox="checkbox" v-model="checked" :helpText="helpText"> \
              <input :disabled="!checked" :id="randomId" v-model="value" \
                class="form-control" :placeholder="placeholderText"/> \
            </input-wrapper> \
            ',
        mixins: [baseFieldMixin]
    });


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
                if (this.definition.default !== undefined) {
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
                return this.url.replace(/(\?|\&)/g, ' $& ');
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
                    return !!this.$store.state.definition.service;
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
                var pathData = data.paths[options.path];
                if (!pathData) {
                    throw "Invalid service path given: " + options.path;
                }
                var operation = pathData[options.method];
                if (!operation) {
                    throw "Method " + options.method + " is not defined for " + options.path;
                }
                definition.operation = parseSwaggerOperation(operation);
                return definition;
            }

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
            }

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
        }

        irisUtil.Log.setLevel('debug');
        $(function() {
            window.vueWidget = new Vue({
                el: '#builder',
                store
            });
        });
}));
