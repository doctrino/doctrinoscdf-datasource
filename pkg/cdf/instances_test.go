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

func TestInstances_UpsertRetrieve(t *testing.T) {
	ctx := context.Background()
	externalId := "grafana_plugin_upsert_instance_test"
	viewId := ViewId{"view", "cdf_cdm", "CogniteTimeSeries", "v1"}
	upsertRequest := InstanceUpsertRequest{
		Items: []InstanceRequest{{
			InstanceType: "node",
			Space:        testSpace,
			ExternalId:   externalId,
			Sources: []InstanceData{
				{
					Source: viewId,
					Properties: map[string]any{
						"isStep":     false,
						"type":       "numeric",
						"sourceUnit": "unknown",
					},
				},
			},
		}},
	}
	upsertedItems, err := testClient.Instances.Upsert(ctx, upsertRequest)
	require.NoError(t, err)
	require.NotNil(t, upsertedItems)
	require.Greater(t, len(upsertedItems), 0)
	require.Equal(t, testSpace, upsertedItems[0].Space)
	require.Equal(t, externalId, upsertedItems[0].ExternalId)

	instanceType := "node"
	retrieveRequest := InstanceRetrieveRequest{
		Sources: []InstanceRetrieveSource{
			{Source: viewId},
		},
		Items: []InstanceId{
			{Space: testSpace, ExternalId: externalId, InstanceType: &instanceType},
		},
	}

	retrievedItems, err := testClient.Instances.Retrieve(ctx, retrieveRequest)
	require.NoError(t, err)
	require.NotNil(t, retrievedItems)
	require.Greater(t, len(retrievedItems), 0)
	require.Equal(t, testSpace, retrievedItems[0].Space)
	require.Equal(t, externalId, retrievedItems[0].ExternalId)
}
