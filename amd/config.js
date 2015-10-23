requirejs.config({
    baseUrl: "js",
    paths: {
        "amd": "../amd",
        "async": "../amd/async",
        "bootstrap": "//netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min",
        "calendar": "../calendar",
        "iris-coordinate-picker": "../iris-coordinate-picker/iris-coordinate-picker",
        "jquery": "//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min",
        "jquery-ui": "//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min",
        "qtip2": "//cdn.jsdelivr.net/qtip2/2.2.1/jquery.qtip.min"
    },
    // Use a shim to inject jQuery dependency for Bootstrap 3
    shim : {
        "bootstrap" : { "deps" :['jquery'] }
    },
    // Timepicker addon specifies the jQuery UI dependency using a different name
    map: {
        'calendar/jquery-ui-timepicker-addon': {
            'jquery.ui': "jquery-ui",
        }
    }
});
