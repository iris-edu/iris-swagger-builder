Vue.component('Flatpickr', {
    template: '\
        <input type="text" :placeholder="placeholder" :value="value" @input="onInput"> \
    ',
    props: {
        placeholder: {
            type: String,
            default: ''
        },
        options: {
            type: Object,
            default: function() {
                return {
                    disableMobile: true,
                    enableTime: true,
                    enableSeconds: true,
                    time_24hr: true,
                    allowInput: true
                };
            }
        },
        value: {
            type: String,
            default: ''
        }
    },
    data: function() {
        return {
            fp: null
        };
    },
    computed: {
        fpOptions: function() {
            return JSON.stringify(this.options);
        }
    },
    watch: {
        value (val) {
            this.fp.setDate(val);
        },
        fpOptions (newOpt) {
            var option = JSON.parse(newOpt);
            for (var o in option) {
                this.fp.set(o, option[o]);
            }
        }
    },
    mounted () {
        this.fp = new Flatpickr(this.$el, this.options);
        this.fp.set('onChange', this.onChange);
        this.$emit('FlatpickrRef', this.fp);
    },
    destroyed () {
        this.fp = null;
    },
    methods: {
        onInput: function(e) {
            // this.$emit('input', e.target.value);
        },
        onChange (_, dateStr) {
            this.$emit('input', dateStr);
        }
    }
});
