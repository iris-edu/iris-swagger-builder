var swaggerBuilder;
$(function() {
  swaggerBuilder = new Builder.Builder({
    swaggerURL: "swagger-event.json",
    labelClass: "col-xs-4",
    fieldClass: "col-xs-8",
    targetSelector: "#output",
    parameters: {
      starttime: {
        label: "Start Time",
        class: new Builder.DateTimeParameter(),
      },
      endtime: {
        label: "End Time",
        class: new Builder.DateTimeParameter()
      },
      minmag: {
        label: "Min Magnitude"
      },
      maxmag: {
        label: "Max Magnitude"
      },
      magtype: {
        label: "Magnitude Type",
        enum_labels: {
          "MB": "Body magnitude"
        }
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
          new Builder.Fieldset("Date/Time", "starttime", "endtime"),
          new Builder.Fieldset("Magnitude", "minmag", "maxmag", "magtype")
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
      ),
      "format"
    ]
  });
  swaggerBuilder.run().then(function() {
      // Builder functions
  });
});
