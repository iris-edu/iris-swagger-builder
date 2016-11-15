/*
var TextInput = React.createClass({
    handleChange: function(evt) {
        console.log('TextInput.handleChange');
        if (this.props.onChange) {
            this.props.onChange(this.props.name, evt.target.value);
        }
    },
    render: function() {
        var value = this.props.query[this.props.name];
        return (
            <input type="text" value={value} onChange={this.handleChange} />
        );
    }
});

var ToggleTextInput = React.createClass({
    handleToggle: function(evt) {
        if (this.props.onChange) {
            if (evt.target.checked) {
                this.props.onChange(this.props.name, this.props.value);
            }
        }
    },
    render: function() {
        return (
            <span>
                <input type="checkbox" onClick={this.handleToggle} />
                <TextInput {...this.props} />
            <span>
        );
    }
});
*/

/* Simple extend function
 * This extends objects, not classes, because they go into React.createClass, which actually makes things simple.
 * Anything "overridden" is copied into super_xxx, eg. obj.foo() / obj.super_foo()
 */
function extend(o1, o2) {
    var o3 = {};
    for (var i in o2) {
        o3[i] = o2[i];
    }
    for (var i in o1) {
        if (o3[i]) {
            o3['super_'+i] = o1[i];
        } else {
            o3[i] = o1[i];
        }
    }
    return o3;
}


var BaseFieldDef = {
    handleToggle: function(evt) {
        if (this.props.onChange) {
            this.props.onChange(this.props.name + "_check", evt.target.checked);
        }
    },
    renderCheckbox: function() {
        var input = this.renderInput(true);
        return (
            <span>
                <input type="checkbox" onClick={this.handleToggle} />
                {input}
            </span>
        );
    },
    handleChange: function(evt) {
        console.log('BaseFieldDef.handleChange');
        if (this.props.onChange) {
            this.props.onChange(this.props.name, evt.target.value);
        }
    },
    renderInput: function(disabled) {
        var value = this.props.form[this.props.name];
        return (
            <input type="text" name={this.props.name} defaultValue={value} onChange={this.handleChange} />
        );
    },
    render: function() {
        var input = this.props.checkbox ? this.renderCheckbox() : this.renderInput();
        return (
            <div>
                <label>{this.props.label}</label>
                {input}
            </div>
        );
    }
};

// var TextFieldDef = extend(BaseFieldDef, {}, true);
var TextFieldDef = {
    getInitialState: function() {
        return {
            name: this.props.name,
            value: this.props.form[this.props.name]
        };
    },
    handleChange: function(evt) {
      console.log('TextFieldDef.handleChange');
      var value = evt.target.value;
      this.setState({value: value});
      if (this.props.onChange) {
          this.props.onChange(this.state.name, value);
      }
    },
    renderInput: function(disabled) {
      return (
        <input type="text" disabled={disabled} name={this.state.name} defaultValue={this.state.value} onChange={this.handleChange} />
      );
    },
    render: function() {
        return (
            <div>
                <label>{this.props.label}</label>
                {this.renderInput()}
            </div>
        );
    }
};


var TextField = React.createClass(TextFieldDef);

var CheckboxWrapper = React.createClass({
    getInitialState: function() {
        return {
            checked: this.props.defaultChecked
        };
    },
    contributeToForm: function() {
        var f = {};
        if (this.state.checked) {
            this.props.children.forEach(function(c) {
               f = extend(f, c.contributeToForm());
            });
        }
        return f;
    },
    handleChange: function(evt) {
        this.setState({checked: evt.target.checked});
        if (this.props.onChange) {
            this.props.onChange(this.state.name, value);
        }
    },
    handleToggle: function(evt) {
        this.setState({checked: evt.target.checked});
        if (this.props.onChange) {
            this.props.onChange(this.state.name, value);
        }
    },
    render: function() {
        return (
          <span>
            <input type="checkbox" onClick={this.handleToggle} />
            {this.props.children}
          </span>
        );
    }
});

var CheckboxMixin = {
    getInitialState: function() {
        var state = this.super_getInitialState();
        var checkbox_name = this.props.name + "_check";
        return extend(state, {
            checkbox_name: checkbox_name,
            checked: this.props.form[checkbox_name]
        });
    },
    renderInput: function(disabled) {
        var input = this.super_renderInput(disabled || !this.state.checked);
        return (
          <span>
            <input type="checkbox" defaultChecked={this.state.checked} onClick={this.handleToggle} />
            {input}
          </span>
        );
    },
    handleToggle: function(evt) {
        var checked = evt.target.checked;
        this.setState({checked: checked});
        if (this.props.onChange) {
            this.props.onChange(this.state.checkbox_name, checked);
        }
    }
};

var CheckboxTextField = React.createClass(
    extend(TextFieldDef, CheckboxMixin)
);


var Builder = React.createClass({
    getInitialState: function() {
        return {
            form: {
                net: "IU",
                sta: "*",
                loc: "",
                cha: "",
                starttime: "2015-01-01",
                starttime_check: false
            },
            query: {},
            queryKeys: [],
            queryString: ""
        };
    },
    formToQuery: function(form) {
        var query = {};
        for (var key in form) {
            if (key.substr(-6) == '_check') {
            }
            else {
                var check = form[key + '_check'];
                if (check !== false) {
                    query[key] = form[key];
                }
            }
        }
        return query;
    },
    queryString: function(query) {
        var queryKeys = null;
        if (!queryKeys) {
            queryKeys = ['net'];
            for (var k in query) { queryKeys.push(k); }
        }
        console.log('query:', query);
        console.log('queryKeys: ', queryKeys);
        var queryParams = [];
        queryKeys.forEach(function(k) {
            if (query[k] !== undefined && query[k] !== '') {
                queryParams.push('' + k + '=' + escape(query[k]));
            }
        });
        return queryParams.join('&');
    },
    handleFormChange: function(key, value) {
        console.log('Builder.handleChange: ' + key + ', ' + value);
        var partialState = {};
        partialState.form = extend(this.state.form, {});
        if (key) {
            partialState.form[key] = value;
        }
        partialState.query = this.formToQuery(partialState.form);
        partialState.queryString = this.queryString(partialState.query);
        console.log(partialState);
        this.setState(partialState);
    },
    componentDidMount: function() {
        this.handleFormChange();
    },
    render: function() {
        var common = {
            onChange: this.handleFormChange,
            form: this.state.form
        };
        var rows = [
            (<TextField name="net" label="Network" {...common} />),
            (<CheckboxWrapper name="net2_check"><TextField name="net2" label="Network" {...common} /></CheckboxWrapper>),
        ];
        return (
            <div>
                {rows}
                <TextField name="sta" label="Station" {...common} />
                <TextField name="loc" label="Location" {...common} />
                <TextField name="cha" label="Channel" {...common} />

                <CheckboxTextField name="starttime" label="Start Time" defaultValue="2015-01-01" {...common} />

                query?{this.state.queryString}
            </div>
        );
    }
});

ReactDOM.render(
    <Builder />,
    document.getElementById('builder')
);
