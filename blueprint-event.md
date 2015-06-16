# FDSN Event Webservice
Retrieves event data.

# Query [/query]
The fdsnws-event web service returns event (earthquake) information from the catalogs submitted to the IRIS DMC.

## GET

+ Parameters

     + starttime: `2012-05-08T12:20:12` (datetime) - Earliest event time

     + endtime: `2012-05-08T12:20:12` (datetime) - Latest event time

     + minmag: `6` (number) - Minimum magnitude

     + maxmag: `6` (number) - Maximum magnitude

     + magtype: (enum[string]) - Magnitude type

          Some common magnitude types are listed, other types may be specified by modifying the URL

          + Members
               + `MB`
               + `ML`
               + `MS`
               + `MW`

     + minlon: (number) - Western limit

     + maxlon: (number) - Eastern limit

     + orderby: (enum[string]) - Order by

          + Members
               + `time` - Time (descending)
               + `time-asc` - Time (ascending)
               + `magnitude` - Magnitude (descending)
               + `magnitude-asc` - Magnitude (ascending)

+ Response 200 (text/plain)

