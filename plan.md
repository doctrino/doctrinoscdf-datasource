# Plan

* [ ] **Understand and update end-to-end tests** (Learning goal). Get into chromium.
* [ ] **Understand and create unit tests backend** (Learning goal). Understand 
  testing in golang and create unit tests (and if applicable, integration tests) for the backend.
* [ ] **Create a TimeSeries Search query editor**. Enable the user to search for specific
  time series in the UI. This should use the inspect endpoint to find time series views and
  then have predefined search options defined on the field type. 
* [ ] **Create a TimeSeries selector based on asset/equipment**. Basic idea is to have the user
  select a data model, then find all views that have single direct/reverse/edge connections
  to a time series views. This will be an equipment/asset-centric way to select time series. 
* [ ] **Create a variable query editor**. This should fit well with the selector
  based on asset/equipment. This should make it easy to create a dashboard with selected
  time series for, for example, a wind turbine. Then have the wind turbine as a variable
  that can be used to select different turbines in the dashboard. Including selecting multiple
  turbines and showing the same measurements in the same graph for easy comparison.