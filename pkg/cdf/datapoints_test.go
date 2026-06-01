package cdf

import (
	"context"
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
	insertionItem := pb.DataPointInsertionItem{
		TimeSeriesReference: pb.InstanceId{Space: testTimeSeriesId.Space, ExternalId: testTimeSeriesId.ExternalId},
	}
	insertRequest := pb.DataPointInsertionRequest{
		Items: []*pb.DataPointInsertionItem{&insertionItem},
	}
	err := testClient.Datapoints.Insert(ctx, insertRequest)
	require.Nil(t, err)

}
