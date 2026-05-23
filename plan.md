# Plan

1. [ ] **Understand and create unit tests backend** (Learning goal). Understand
   testing in golang and create unit tests (and if applicable, integration tests) for the backend.
2. [x] **Hardening my golang understanding** (Learning goal). Refactor the auth package. There
   are a few functions and structs that can be privatized. In addition, there can be a cleaner
   separation between the auth package and the device code resource.
3. [ ] **Get more comfortable with Typescript and React** (Learning goal). Go through and refactor the
   components to make the code more understandable. There is likely some AI-slop in the code that
   can be simplified.
4. [ ] **Understand and update end-to-end tests** (Learning goal). Get into chromium.
5. [ ] **Create a TimeSeries Search query editor**. Enable the user to search for specific
   time series in the UI. This should use the inspect endpoint to find time series views and
   then have predefined search options defined on the field type. 
6. [ ] **Create a TimeSeries selector based on asset/equipment**. Basic idea is to have the user
   select a data model, then find all views that have single direct/reverse/edge connections
   to a time series views. This will be an equipment/asset-centric way to select time series. 
7. [ ] **Create a variable query editor**. This should fit well with the selector
   based on asset/equipment. This should make it easy to create a dashboard with selected
   time series for, for example, a wind turbine. Then have the wind turbine as a variable
   that can be used to select different turbines in the dashboard. Including selecting multiple
   turbines and showing the same measurements in the same graph for easy comparison.