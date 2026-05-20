package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ backend.CallResourceHandler   = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// CDFDatasource creates a new datasource instance.
func CDFDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	config, err := cdf.LoadCDFSettings(settings)
	if err != nil {
		return nil, err
	}
	client, err := cdf.NewCogniteClientFromSettings(config)
	if err != nil {
		return nil, err
	}
	return &Datasource{client}, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	client *cdf.CogniteClient
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

// queryModel mirrors the panel query JSON from MyQuery (src/types.ts); field names must match Grafana's camelCase keys.
type queryModel struct {
	QueryText string  `json:"queryText"`
	Constant  float64 `json:"constant"`
}

func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	// create data frame response.
	// For an overview on data frames and how grafana handles them:
	// https://grafana.com/developers/plugin-tools/introduction/data-frames
	frame := data.NewFrame("response")

	duration := query.TimeRange.To.Sub(query.TimeRange.From)
	mid := query.TimeRange.From.Add(duration / 2)

	s := rand.NewSource(time.Now().UnixNano())
	r := rand.New(s)

	lowVal := 10.0
	highVal := 20.0
	midVal := qm.Constant
	if midVal == 0 {
		midVal = lowVal + (r.Float64() * (highVal - lowVal))
	}

	frame.Fields = append(
		frame.Fields,
		data.NewField("time", nil, []time.Time{query.TimeRange.From, mid, query.TimeRange.To}),
		data.NewField("values", nil, []float64{lowVal, midVal, highVal}),
	)

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	config, err := cdf.LoadCDFSettings(*req.PluginContext.DataSourceInstanceSettings)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}
	client, err := cdf.NewCogniteClientFromSettings(config)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = fmt.Sprintf("Unable to create Cognite client: %v", err)
		return res, nil
	}
	response, err := client.Token.Inspect(ctx)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = fmt.Sprintf("Inspect call failed: %v", err)
		return res, nil
	}
	body, err := json.Marshal(response)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = fmt.Sprintf("Unable to marshal response: %v", err)
		return res, nil
	}

	// Todo: Check the ACLs
	return &backend.CheckHealthResult{
		Status:      backend.HealthStatusOk,
		Message:     fmt.Sprintf("CDF authentication successful for project %s: %s", config.CdfProject, string(body)),
		JSONDetails: body,
	}, nil
}
