$(function() {
    /* Define a builder based on a Swagger definition */
    var swaggerBuilder = new Builder.Builder({
        /* URL of the Swagger JSON */
        swaggerURL: "swagger-dmsp.json",
        /* CSS classes for label and field divs, generally these will be Bootstrap grid classes */
        labelClass: "col-xs-3",
        fieldClass: "col-xs-9",
        /* Parameter-level customizations */
        parameters: {
            starttime: {
                /* Available customizations:
                 * `class`: Use a custom class that can control all aspects of how the parameter input is displayed.
                 *          Currently can be Builder.DateParameter or Builder.DateTimeParameter.  More to come.
                 * `label`: Customize the display label, by default uses title-cased parameter name (eg. "Starttime")
                 * `enum_labels`: For enum fields, customize the display labels for the enum options.
                 * `checkbox`: Set true or false to force/suppress a checkbox next to the parameter.  By default,
                 *          checkbox is shown for all non-required parameters.
                 * `inputSize`: For text-based inputs, set the input size.  Default is 10.
                 */
                label: "Start Time",
                class: new Builder.DateTimeParameter()
            },
            endtime: {
                label: "End Time",
                class: new Builder.DateTimeParameter()
            },
            email: {
                inputSize: 30
            },
            content: {
                enum_labels: {
                    files: "List of files",
                    extents: "Estimated total file size",
                    data: "Make a request to process data"
                }
            }
        },
        /* Define the form layout.  Each element of the layout can be one of:
         *  "parameter_name" : Render the given parameter input
         *  Builder.Columns : Takes a set of sub-layouts, and renders each one as a column
         *  Builder.Fieldset : Render a fieldset with the first argument as the legend, followed by one or more elements
         */
        layout: [
                 new Builder.Columns(
                     [
                      new Builder.Fieldset("Date/Time", "starttime", "endtime")
                      ],
                      [
                       new Builder.Fieldset("Location", "latitude", "longitude")
                       ]
                 ),
                 "email", "content", "satellite"
                 ]
    });
    swaggerBuilder.run().then(function() {
        // Additional builder functions should be added here
    });
});
