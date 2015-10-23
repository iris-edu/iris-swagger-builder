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
            /* Available customizations:
             * `class`: Use a custom class that can control all aspects of how the parameter input is displayed.
             *          Currently can be SwaggerFormBuilder.DateParameter or SwaggerFormBuilder.DateTimeParameter.  More to come.
             * `label`: Customize the display label, by default uses title-cased parameter name (eg. "Starttime")
             * `enumLabels`: For enum fields, customize the display labels for the enum options.
             * `checkbox`: Set true or false to force/suppress a checkbox next to the parameter.  By default,
             *          checkbox is shown for optional enum parameters only.
             * `inputSize`: For text-based inputs, set the input size.  Default is 20.
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
    swaggerFormBuilder.run().then(function() {
        // Additional URLBuilder functions should be added here
    });
});
