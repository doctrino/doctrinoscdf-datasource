package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestInstances_Aggregate(t *testing.T) {
	ctx := context.Background()
	viewId := ViewId{"view", "cdf_cdm", "CogniteTimeSeries", "v1"}
	resp, err := testClient.Instances.Aggregate(ctx, InstanceAggregateRequest{
		View: viewId, Aggregates: []AggregateItem{{Count: &AggregateProperty{"externalId"}}},
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Greater(t, resp[0].Aggregates[0].Value, float64(0))
}

func TestInstances_Search(t *testing.T) {
	ctx := context.Background()
	viewId := ViewId{"view", "cdf_cdm", "CogniteTimeSeries", "v1"}
	resp, err := testClient.Instances.Search(ctx, InstanceSearchRequest{View: viewId, Limit: 10})
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Greater(t, len(resp), 0)
}
