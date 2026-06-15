package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/auth"
	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
	pb "github.com/cognite/doctrino-s-cdf-source/pkg/cdf/proto"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
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

// newResourceHandler creates the HTTP mux for CallResource endpoints, bound to the datasource instance.
func newResourceHandler(d *Datasource) backend.CallResourceHandler {
	mux := http.NewServeMux()
	mux.HandleFunc("/device-code/start", d.handleDeviceCodeStart)
	mux.HandleFunc("/device-code/poll", d.handleDeviceCodePoll)
	mux.HandleFunc("/containers/inspect", resourceHandler("Containers inspect", d.client.Containers.Inspect))
	mux.HandleFunc("/views/retrieve", resourceHandler("Views Retrieve", d.client.Views.Retrieve))
	mux.HandleFunc("/dataModels/list", resourceHandlerGet("Data Models List", d.client.DataModels.List))
	mux.HandleFunc("/dataModels/retrieve", resourceHandler("Data Models Retrieve", func(ctx context.Context, request cdf.DataModelRetrieveRequest) ([]cdf.DataModelResponse, error) {
		return d.client.DataModels.Retrieve(ctx, request, true)
	}))
	mux.HandleFunc("/instances/search", resourceHandler("Instances search", d.client.Instances.Search))
	mux.HandleFunc("/instances/aggregate", resourceHandler("Instances aggregate", d.client.Instances.Aggregate))
	mux.HandleFunc("/spaces/statistics", resourceHandlerGet("Instances aggregate", d.client.Spaces.Statistics))
	return httpadapter.New(mux)
}

// CDFDatasource creates a new datasource instance.
func CDFDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	config, err := auth.LoadSettings(settings)
	if err != nil {
		return nil, err
	}
	provider, err := auth.NewTokenProviderFromSettings(config)
	if err != nil {
		return nil, err
	}

	client, err := cdf.NewCogniteClientFromSettings(config, &provider)
	if err != nil {
		return nil, err
	}

	d := &Datasource{client: client}
	d.resourceHandler = newResourceHandler(d)
	deviceCodeProvider, ok := provider.(*auth.DeviceCodeProvider)
	if ok {
		d.deviceCodeProvider = deviceCodeProvider
	}
	d.settings = config
	return d, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	client             *cdf.CogniteClient
	resourceHandler    backend.CallResourceHandler
	deviceCodeProvider *auth.DeviceCodeProvider
	settings           *auth.Settings
}

// CallResource delegates to the per-instance resource handler mux.
func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	return d.resourceHandler.CallResource(ctx, req, sender)
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

type selectedTimeSeries struct {
	Space       string `json:"space"`
	ExternalId  string `json:"externalId"`
	Aggregation string `json:"aggregation"`
	Label       string `json:"label"`
}

type queryModel struct {
	Items []selectedTimeSeries `json:"items"`
}

func (d *Datasource) query(ctx context.Context, _ backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}
	if len(qm.Items) == 0 {
		return backend.ErrDataResponse(backend.StatusBadRequest, "no time series selected")
	}
	start := query.TimeRange.From.UnixMilli()
	end := query.TimeRange.To.UnixMilli()
	limit := int64(10_000) / int64(len(qm.Items))

	granularityMS := (end - start) / query.MaxDataPoints
	granularity := granularityToString(granularityMS)

	var items = make([]cdf.DataPointQueryItem, len(qm.Items))
	for i, item := range qm.Items {
		items[i] = cdf.DataPointQueryItem{
			InstanceId: cdf.InstanceId{
				Space:      item.Space,
				ExternalId: item.ExternalId,
			},
			Start:       &start,
			End:         &end,
			Limit:       &limit,
			Aggregates:  []string{item.Aggregation},
			Granularity: &granularity,
		}
	}

	datapointResponse, err := d.client.Datapoints.Retrieve(ctx, cdf.DataPointsRetrieveRequest{
		Items: items,
	})
	if err != nil {
		return backend.ErrDataResponse(backend.StatusInternal, fmt.Sprintf("datapoints retrieve: %v", err))
	}

	// Convert each item in the response to a Grafana DataFrame.
	for i, item := range datapointResponse.GetItems() {
		label := qm.Items[i].Label
		if label == "" {
			label = fmt.Sprintf("%s/%s", item.GetInstanceId().GetSpace(), item.GetInstanceId().GetExternalId())
		}
		aggregation := qm.Items[i].Aggregation

		frame := data.NewFrame(label)

		switch dp := item.GetDatapointType().(type) {
		case *pb.DataPointListItem_AggregateDatapoints:
			points := dp.AggregateDatapoints.GetDatapoints()
			timestamps := make([]time.Time, len(points))
			values := make([]*float64, len(points))
			for j, p := range points {
				timestamps[j] = time.UnixMilli(p.GetTimestamp())
				values[j] = getAggregateValue(p, aggregation)
			}
			frame.Fields = append(frame.Fields,
				data.NewField("time", nil, timestamps),
				data.NewField(label, nil, values),
			)
		case *pb.DataPointListItem_NumericDatapoints:
			points := dp.NumericDatapoints.GetDatapoints()
			timestamps := make([]time.Time, len(points))
			values := make([]*float64, len(points))
			for j, p := range points {
				timestamps[j] = time.UnixMilli(p.GetTimestamp())
				if p.GetNullValue() {
					values[j] = nil
				} else {
					v := p.GetValue()
					values[j] = &v
				}
			}
			frame.Fields = append(frame.Fields,
				data.NewField("time", nil, timestamps),
				data.NewField(label, nil, values),
			)
		case *pb.DataPointListItem_StringDatapoints:
			points := dp.StringDatapoints.GetDatapoints()
			timestamps := make([]time.Time, len(points))
			values := make([]string, len(points))
			for j, p := range points {
				timestamps[j] = time.UnixMilli(p.GetTimestamp())
				values[j] = p.GetValue()
			}
			frame.Fields = append(frame.Fields,
				data.NewField("time", nil, timestamps),
				data.NewField(label, nil, values),
			)
		}

		response.Frames = append(response.Frames, frame)
	}

	return response
}

// getAggregateValue extracts the value for the requested aggregation from an AggregateDatapoint.
func getAggregateValue(p *pb.AggregateDatapoint, aggregation string) *float64 {
	var v float64
	switch aggregation {
	case "average":
		v = p.GetAverage()
	case "max":
		v = p.GetMax()
	case "min":
		v = p.GetMin()
	case "count":
		v = p.GetCount()
	case "sum":
		v = p.GetSum()
	case "interpolation":
		v = p.GetInterpolation()
	case "stepInterpolation":
		v = p.GetStepInterpolation()
	case "continuousVariance":
		v = p.GetContinuousVariance()
	case "discreteVariance":
		v = p.GetDiscreteVariance()
	case "totalVariation":
		v = p.GetTotalVariation()
	case "countGood":
		v = p.GetCountGood()
	case "countUncertain":
		v = p.GetCountUncertain()
	case "countBad":
		v = p.GetCountBad()
	case "durationGood":
		v = p.GetDurationGood()
	case "durationUncertain":
		v = p.GetDurationUncertain()
	case "durationBad":
		v = p.GetDurationBad()
	default:
		v = p.GetAverage()
	}
	return &v
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	response, err := d.client.Token.Inspect(ctx)
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
		Message:     fmt.Sprintf("CDF authentication successful for project %s: %s", d.client.CDFProject, string(body)),
		JSONDetails: body,
	}, nil
}
