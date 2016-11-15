(function($) {

    Vue.component('text-input', {
        template: '\
            <div class="form-group">\
              <label v-bind:for="randomId">{{ label }}:</label>\
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
          }
    });

    Vue.component('builder', {
        template: '\
            <div> \
                <h2>Builder</h2> \
                <slot>fields</slot> \
                <div>query?{{ url }}</div> \
            </div> \
        ',
        computed: {
            url: function() {
                return $.param(this.$store.state.query);
            }
        }
    });

    window.builder = function(options) {

        if (!options.getQuery) {
            options.getQuery = function(inputs) {
                var query = {};
                for (var k in inputs) {
                    if (inputs[k]) {
                        query[k] = inputs[k];
                    }
                }
                return query;
            };
        }

        var storeOptions = {
            state: {
                input: $.extend({}, options.initial),
                query: options.getQuery(options.initial)
            },
            mutations: {
                update: function(state, data) {
                    for (var k in data) {
                        Vue.set(state.input, k, data[k]);
                    }
                    state.query = options.getQuery(state.input);
                }
            }
        };

        var store = new Vuex.Store(storeOptions);
        window.vueWidget = new Vue({
            el: '#builder',
            store
        });
    }

})(jQuery);

