# Plan

1. [x] **Understand and create unit tests backend** (Learning goal). Understand
   testing in golang and create unit tests (and if applicable, integration tests) for the backend.
2. [x] **Hardening my golang understanding** (Learning goal). Refactor the auth package. There
   are a few functions and structs that can be privatized. In addition, there can be a cleaner
   separation between the auth package and the device code resource.
3. [x] **Get more comfortable with Typescript and React** (Learning goal). Go through and refactor the
   components to make the code more understandable. There is likely some AI-slop in the code that
   can be simplified.
4. [x] **Understand and update end-to-end tests** (Learning goal). Get into chromium.
5. [x] **Create a TimeSeries Search query editor**. Enable the user to search for specific
   time series in the UI. This should use the inspect endpoint to find time series views and
   then have predefined search options defined on the field type. 
6. [ ] **Create a TimeSeries selector based on asset/equipment**. Basic idea is to have the user
   select a data model, then find all views that have single direct/reverse/edge connections
   to a time series views. This will be an equipment/asset-centric way to select time series. 
7. [x] **Create a variable query editor**. This should fit well with the selector
   based on asset/equipment. This should make it easy to create a dashboard with selected
   time series for, for example, a wind turbine. Then have the wind turbine as a variable
   that can be used to select different turbines in the dashboard. Including selecting multiple
   turbines and showing the same measurements in the same graph for easy comparison.
--------------------------------------
8. [ ] **Update CheckHealth to check authorization**. Check which instance and schema space
   the user has access to and return that in the response. If the user doesn't have access to
   any instance or schema space, return an error.
9. [ ] **Improve Backend Datapoint Retrieval accuracy**: Always do count aggregate first to check if you can do a raw
   query. If the count is below the maxDatapoints, use a raw query. If the count is above then use the aggregation.
   In the frontend, add an information to the aggregation dropdown that explains it is only used in case of large
   time ranges.
10. [ ] **Improve Backend Datapoint Retrieval performance**: Fetch datapoints for all time series simultaneously and
    in parallel. 
11. [x] **Implement correct label in frontend** Currently, the label is just wrong. It should use the available text
    properties for the user to select or allow the user to type in a custom label.
12. [x] **Implement filtering options for TimeSeries Search editor**: Allow the user the option to filter
    on the selected time series view properties.
13. [ ] **Show the total number of timeseries in the TimeSeries Search editor**: Always show the total number of
    available timeseries in the search editor, even if there is more than 1000. 
14. [ ] **Add documentation strings for the frontend Search and Equipment tabs**.


-----------------------
Single tasks
* [x] Add data modeling list endpoint to backend for selecting data model. Should include the full view. Required for
   variable selection and asset/equipment-centric selection.
* [x] Add data modeling retrieve endpoint. Needed in the query editor for finding specific data model and show all
      views that has a connection to a time series view. Required for asset/equipment-centric selection.
* [ ] Refactor out the filtering selection used in the SearchTab to reuse in the Variable selection to narrow
      down the equipment that is shown and used.
* [ ] Add aggregation call to the Variable Editor such that the user can see how many assets/equipment that
      matches the filter + selected view. Give a warning if it is above 1000 (Search endpoint limit) and 
      suggest the user to narrow down the filter.