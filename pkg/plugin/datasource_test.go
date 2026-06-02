package plugin

import (
	"context"
	"testing"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
	pb "github.com/cognite/doctrino-s-cdf-source/pkg/cdf/proto"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// mockDatapoints implements cdf.DatapointsAPI for testing.
type mockDatapoints struct {
	response *pb.DataPointListResponse
	err      error
}

func (m *mockDatapoints) Retrieve(_ context.Context, _ cdf.DataPointsRetrieveRequest) (*pb.DataPointListResponse, error) {
	return m.response, m.err
}

func (m *mockDatapoints) Insert(_ context.Context, _ *pb.DataPointInsertionRequest) error {
	return m.err
}

func TestQueryData(t *testing.T) {
	avg := 42.0
	mock := &mockDatapoints{
		response: &pb.DataPointListResponse{
			Items: []*pb.DataPointListItem{
				{
					InstanceId: &pb.InstanceId{
						Space:      "doctrinos_grafana_plugin",
						ExternalId: "grafana_plugin_insert_retrieve_test",
					},
					DatapointType: &pb.DataPointListItem_AggregateDatapoints{
						AggregateDatapoints: &pb.AggregateDatapoints{
							Datapoints: []*pb.AggregateDatapoint{
								{
									Timestamp: time.Now().Add(-1 * time.Hour).UnixMilli(),
									Average:   avg,
								},
							},
						},
					},
				},
			},
		},
	}

	ds := Datasource{
		client: &cdf.CogniteClient{
			Datapoints: mock,
		},
	}

	resp, err := ds.QueryData(
		context.Background(),
		&backend.QueryDataRequest{
			Queries: []backend.DataQuery{
				{
					RefID:         "A",
					MaxDataPoints: 100,
					TimeRange: backend.TimeRange{
						From: time.Now().Add(-7 * 24 * time.Hour),
						To:   time.Now(),
					},
					JSON: []byte(`{"refId":"A","items":[{"space":"doctrinos_grafana_plugin","externalId":"grafana_plugin_insert_retrieve_test","aggregation":"average","label":"test_ts"}]}`),
				},
			},
		},
	)
	if err != nil {
		t.Fatal(err)
	}

	if len(resp.Responses) != 1 {
		t.Fatal("QueryData must return a response")
	}

	res := resp.Responses["A"]
	if res.Error != nil {
		t.Fatalf("unexpected error in response: %v", res.Error)
	}
	if len(res.Frames) != 1 {
		t.Fatalf("expected 1 frame, got %d", len(res.Frames))
	}
	if res.Frames[0].Fields[1].At(0) == nil {
		t.Fatal("expected non-nil value")
	}
	got := *res.Frames[0].Fields[1].At(0).(*float64)
	if got != avg {
		t.Fatalf("expected %f, got %f", avg, got)
	}
}
