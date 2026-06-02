package cdf

import (
	"context"
	"math/rand"
	"testing"
	"time"

	pb "github.com/cognite/doctrino-s-cdf-source/pkg/cdf/proto"
	"github.com/stretchr/testify/require"
)

var testTimeSeriesId = InstanceId{
	Space:      testSpace,
	ExternalId: "grafana_plugin_insert_retrieve_test",
}

func TestDatapoints_InsertRetrieve(t *testing.T) {
	ctx := context.Background()
	now := time.Now()

	// Create random points for the last week.
	numPoints := 100
	startTime := now.Add(-7 * 24 * time.Hour)
	interval := (7 * 24 * time.Hour) / time.Duration(numPoints)

	datapoints := make([]*pb.NumericDatapoint, numPoints)
	for i := 0; i < numPoints; i++ {
		ts := startTime.Add(time.Duration(i) * interval)
		datapoints[i] = &pb.NumericDatapoint{
			Timestamp: ts.UnixMilli(),
			Value:     rand.Float64() * 100,
		}
	}

	insertionItem := &pb.DataPointInsertionItem{
		TimeSeriesReference: &pb.DataPointInsertionItem_InstanceId{
			InstanceId: &pb.InstanceId{
				Space:      testTimeSeriesId.Space,
				ExternalId: testTimeSeriesId.ExternalId,
			},
		},
		DatapointType: &pb.DataPointInsertionItem_NumericDatapoints{
			NumericDatapoints: &pb.NumericDatapoints{
				Datapoints: datapoints,
			},
		},
	}
	insertRequest := &pb.DataPointInsertionRequest{
		Items: []*pb.DataPointInsertionItem{insertionItem},
	}
	err := testClient.Datapoints.Insert(ctx, insertRequest)
	require.NoError(t, err)

	// Retrieve the inserted datapoints.
	start := startTime.UnixMilli()
	end := now.UnixMilli() + 1
	retrieveRequest := DataPointsRetrieveRequest{
		Items: []DataPointQueryItem{
			{
				InstanceId: testTimeSeriesId,
				Start:      &start,
				End:        &end,
			},
		},
	}
	resp, err := testClient.Datapoints.Retrieve(ctx, retrieveRequest)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Len(t, resp.GetItems(), 1)

	item := resp.GetItems()[0]
	numericDps := item.GetNumericDatapoints()
	require.NotNil(t, numericDps)
	require.GreaterOrEqual(t, len(numericDps.GetDatapoints()), numPoints)

	// Verify the datapoints match what we inserted.
	retrievedDps := numericDps.GetDatapoints()
	// Build a map of timestamp -> value from inserted data for lookup.
	insertedMap := make(map[int64]float64, numPoints)
	for _, dp := range datapoints {
		insertedMap[dp.Timestamp] = dp.Value
	}
	for _, dp := range retrievedDps {
		if expected, ok := insertedMap[dp.Timestamp]; ok {
			require.InDelta(t, expected, dp.Value, 1e-9, "value mismatch at timestamp %d", dp.Timestamp)
		}
	}
}
