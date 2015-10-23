    requirejs.config({
        baseUrl: "js",
        paths: {
            "amd": "../amd",
            "calendar": "../calendar",
            "jquery": "//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min",
            "jquery-ui": "//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min"
        },
        // Timepicker addon specifies the jQuery UI dependency using a different name
        map: {
            'calendar/jquery-ui-timepicker-addon': {
                'jquery.ui': "jquery-ui",
            }
        }
    });

// Load the main app module to start the app
requirejs(["amd/swagger-dmsp"]);
