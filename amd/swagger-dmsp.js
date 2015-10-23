define(['jquery', 'irisSwaggerBuilder'], function($, irisSwaggerBuilder) {
    $(function() {
        /* Define a builder based on a Swagger definition */
        var swaggerBuilder = new irisSwaggerBuilder.Builder({
            /* URL of the Swagger JSON */
            swaggerURL: "swagger-dmsp.json",
            /* Path of service for builder */
            path: '/dmsp/1/query',
            /* CSS classes for label and field divs, generally these will be Bootstrap grid classes */
            labelClass: "col-xs-3",
            fieldClass: "col-xs-9",
            /* Show help text inline in the form rather than in a popup */
            showHelpText: "inline",
            /* Parameter-level customizations */
            parameters: {
                /* Each parameter can be either a Parameter (or subclass) object, or a dictionary of Parameter options.
                 * In other words, these are equivalent:
                 * paramname: new irisSwaggerBuilder.Parameter({option1: "one", option2: "two"})
                 * paramname: {option1: "one", option2: "two"}
                 *
                 * For a complete set of options, see irisSwaggerBuilder.Parameter (or relevant subclass)
                 * Common options:
                 * `label`: Customize the display label, by default uses title-cased parameter name (eg. "Starttime")
                 * `enumLabels`: For enum fields, customize the display labels for the enum options.
                 * `checkbox`: Set true or false to force/suppress a checkbox next to the parameter.  By default,
                 *          checkbox is shown for optional enum parameters only.
                 * `inputSize`: For text-based inputs, set the input size.  Default is 20.
                 *
                 * You can also override values that are part of the Swagger JSON definition (eg. 'description')
                 */
                starttime: new irisSwaggerBuilder.DateTimeParameter({
                    label: "Start Time"
                }),
                endtime: new irisSwaggerBuilder.DateTimeParameter({
                    label: "End Time",
                }),
                email: {
                    inputSize: 30
                },
                content: {
                    enumLabels: {
                        files: "List of files",
                        extents: "Estimated total file size",
                        data: "Make a request to process data"
                    }
                }
            },
            /* Define the form layout.  Each element of the layout can be one of:
             *  "parameter_name" : Render the given parameter input
             *  irisSwaggerBuilder.Columns : Takes a set of sub-layouts, and renders each one as a column
             *  irisSwaggerBuilder.Fieldset : Render a fieldset with the first argument as the legend, followed by one or more elements
             */
            layout: [
                new irisSwaggerBuilder.Columns(
                    [
                        new irisSwaggerBuilder.Fieldset("Date/Time", "starttime", "endtime")
                    ],
                    [
                        new irisSwaggerBuilder.Fieldset("Location", "latitude", "longitude")
                    ]
                ),
                new irisSwaggerBuilder.Fieldset("Request", "email", "content", "satellite")
            ]
        });
        swaggerBuilder.run().then(
            function() {
                // Additional irisBuilder functions should be added here
            },
            function(error) { alert(error); }
        );
    });
});
