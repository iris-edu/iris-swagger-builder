var swaggerBuilder;
$(function() {
  swaggerBuilder = new Builder.Builder({
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
      minlat: {
        label: "Min Lat",
        checkbox: false
      },
      maxlat: {
        label: "Max Lat",
        checkbox: false
      },
      minlon: {
        label: "Min Lon",
        checkbox: false
      },
      maxlon: {
        label: "Max Lon",
        checkbox: false
      },
      lat: {
          label: "Center Lat",
          checkbox: false
      },
      lon: {
          label: "Center Lon",
          checkbox: false
      },
      minradius: {
          label: "Min Radius",
          checkbox: false
      },
      maxradius: {
          label: "Max Radius",
          checkbox: false
      },
      orderby: {
          label: "Order By"
      },
      eventid: {
          label: "Event ID"
      },
      updatedafter: {
          label: "Updated After"
      },
      format: {
        enum_labels: {
          xml: "XML (QuakeML)",
          text: "Text (CSV)"
        }
      }
    },
    layout: [
      new Builder.Columns(
        [
          "starttime", "endtime",
          "minmag", "maxmag", "magtype",
          "mindepth", "maxdepth",
          "catalog", "contributor",
          "includeallorigins", "includeallmagnitudes", "includearrivals",
          "orderby", "format",
          "limit", "offset",
          new Builder.Fieldset("Advanced search",
              "eventid", "updatedafter"
          )
        ],
        [
          new Builder.Fieldset("Location",
            new Builder.OptGroup(
              '_location_type',
              ['All'],
              ['Lat/Lon Box',
                  new Builder.Columns(["minlat"], ["maxlat"]),
                  new Builder.Columns(["minlon"], ["maxlon"])],
              ['Lat/Lon Radius', "lat", "lon", "minradius", "maxradius" ]
            )
          )
        ]
      )
    ]
  });
  swaggerBuilder.run().then(function() {
      // Builder functions

      // Disable all query-oriented rows if the event id control is enabled
      $('div[id$="-row"]')
          .not('#includeallorigins-row, #includeallmagnitudes-row, #includearrivals-row, #eventid-row, #format-row')
          .builder('dependsOnNot', $("#eventid-check"));
      // Uncheck location radios if an event id is chosen
      $('input:radio[name="_location_type"]')
          .builder('dependsOnNot', $("#eventid-check"));
  });
});
