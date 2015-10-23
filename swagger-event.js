var swaggerFormBuilder;
$(function() {
  swaggerFormBuilder = new SwaggerFormBuilder.Builder({
    swaggerURL: "swagger-event.json",
    labelClass: "col-xs-4",
    fieldClass: "col-xs-8",
    targetSelector: "#output",
    parameters: {
      starttime: {
        label: "Start Time"
      },
      endtime: {
        label: "End Time"
      },
      minmag: {
        label: "Min Magnitude"
      },
      maxmag: {
        label: "Max Magnitude"
      },
      magtype: {
        label: "Magnitude Type"
      },
      catalog: {
      },
      contributor: {
      },
      includeallorigins: {
          label: "Include All Origins"
      },
      includeallmagnitudes: {
          label: "Include All Magnitudes"
      },
      includearrivals: {
          label: "Include Arrivals"
      },
      minlat: {
        label: "Min Lat",
      },
      maxlat: {
        label: "Max Lat"
      },
      minlon: {
        label: "Min Lon"
      },
      maxlon: {
        label: "Max Lon"
      },
      lat: {
          label: "Center Lat"
      },
      lon: {
          label: "Center Lon"
      },
      minradius: {
          label: "Min Radius"
      },
      maxradius: {
          label: "Max Radius"
      },
      orderby: {
          label: "Order By"
      },
      eventid: {
          label: "Event ID",
          checkbox: true
      },
      updatedafter: {
          label: "Updated After"
      },
      format: {
        enumLabels: {
          xml: "XML (QuakeML)",
          text: "Text (CSV)"
        }
      }
    },
    layout: [
      new SwaggerFormBuilder.Columns(
        [
          "starttime", "endtime",
          "minmag", "maxmag", "magtype",
          "mindepth", "maxdepth",
          "catalog", "contributor",
          "includeallorigins", "includeallmagnitudes", "includearrivals",
          "orderby", "format",
          "limit", "offset",
          new SwaggerFormBuilder.Fieldset("Advanced search",
              "eventid", "updatedafter"
          )
        ],
        [
          new SwaggerFormBuilder.Fieldset("Location",
            new SwaggerFormBuilder.OptGroup(
              '_location_type',
              ['All'],
              ['Lat/Lon Box',
                new SwaggerFormBuilder.CoordinateBox('maxlat', 'minlat', 'maxlon', 'minlon')
              ],
              ['Lat/Lon Radius',
                new SwaggerFormBuilder.CoordinateRadius('lat', 'lon', 'maxradius'),
                'minradius'
              ]
            )
          )
        ]
      )
    ]
  });
  swaggerFormBuilder.run().then(function() {
      // URLBuilder functions

      // Disable all query-oriented rows if the event id control is enabled
      $('div[id$="-row"]')
          .not('#includeallorigins-row, #includeallmagnitudes-row, #includearrivals-row, #eventid-row, #format-row')
          .urlBuilder('dependsOnNot', $("#eventid-check"));
      // Uncheck location radios if an event id is chosen
      $('input:radio[name="_location_type"]')
          .urlBuilder('dependsOnNot', $("#eventid-check"));
  });
});
