$(function() {
    /* Define a builder based on a Swagger definition */
    var swaggerFormBuilder = new SwaggerFormBuilder.Builder({
        /* URL of the Swagger JSON */
        swaggerURL: "swagger-dmsp.json",
        /* Path of service for builder */
        path: '/dmsp/1/query',
        /* CSS classes for label and field divs, generally these will be Bootstrap grid classes */
        labelClass: "col-xs-3",
        fieldClass: "col-xs-9",
        /* Parameter-level customizations */
        parameters: {
            /* Each parameter can be either a Parameter (or subclass) object, or a dictionary of Parameter options.
             * In other words, these are equivalent:
             * paramname: new SwaggerFormBuilder.Parameter({option1: "one", option2: "two"})
             * paramname: {option1: "one", option2: "two"}
             *
             * For a complete set of options, see SwaggerFormBuilder.Parameter (or relevant subclass)
             * Common options:
             * `label`: Customize the display label, by default uses title-cased parameter name (eg. "Starttime")
             * `enumLabels`: For enum fields, customize the display labels for the enum options.
             * `checkbox`: Set true or false to force/suppress a checkbox next to the parameter.  By default,
             *          checkbox is shown for optional enum parameters only.
             * `inputSize`: For text-based inputs, set the input size.  Default is 20.
             *
             * You can also override values that are part of the Swagger JSON definition (eg. 'description')
             */
            starttime: new SwaggerFormBuilder.DateTimeParameter({
                label: "Start Time"
            }),
            endtime: new SwaggerFormBuilder.DateTimeParameter({
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
         *  SwaggerFormBuilder.Columns : Takes a set of sub-layouts, and renders each one as a column
         *  SwaggerFormBuilder.Fieldset : Render a fieldset with the first argument as the legend, followed by one or more elements
         */
        layout: [
            new SwaggerFormBuilder.Columns(
                [
                    new SwaggerFormBuilder.Fieldset("Date/Time", "starttime", "endtime")
                ],
                [
                    new SwaggerFormBuilder.Fieldset("Location", "latitude", "longitude")
                ]
            ),
            new SwaggerFormBuilder.Fieldset("Request", "email", "content", "satellite")
        ]
    });
    swaggerFormBuilder.run().then(
        function() {
            // Additional URLBuilder functions should be added here
        },
        function(error) { alert(error); }
    );
});
