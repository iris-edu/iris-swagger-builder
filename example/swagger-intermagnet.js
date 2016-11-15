$(function() {
    /* Define a builder based on a Swagger definition */
    var swaggerBuilder = new SwaggerBuilder.Builder({
        /* URL of the Swagger JSON */
        swaggerURL: "swagger-intermagnet.json",
        /* Path of service for builder */
        path: '/intermagnet/1/query',
        showHelpText: 'dialog'
    });
    swaggerBuilder.run();
});
