package cdf

import (
	"context"

	"testing"

	"github.com/stretchr/testify/require"
)

func TestSpaces_UpsertRetrieve(t *testing.T) {
	ctx := context.Background()
	name := "Grafana Test Space"
	description := "Space for testing Grafana datasource plugin"
	upsertRequest := SpaceUpsertRequest{
		[]SpaceRequest{{
			Space:       testSpace,
			Name:        &name,
			Description: &description,
		}},
	}
	upsertResponse, err := testClient.Spaces.Upsert(ctx, upsertRequest)
	require.NoError(t, err)
	require.NotNil(t, upsertResponse)
	require.Greater(t, len(upsertResponse), 0)
	require.Equal(t, testSpace, upsertResponse[0].Space)
	retrieveRequest := SpaceRetrieveRequest{
		[]SpaceId{{Space: testSpace}},
	}
	retrieveResponse, err := testClient.Spaces.Retrieve(ctx, retrieveRequest)
	require.NoError(t, err)
	require.NotNil(t, retrieveResponse)
	require.Greater(t, len(retrieveResponse), 0)
	require.Equal(t, testSpace, retrieveResponse[0].Space)
}

func TestSpaces_Statistics(t *testing.T) {
	ctx := context.Background()
	statsResponse, err := testClient.Spaces.Statistics(ctx)
	require.NoError(t, err)
	require.NotNil(t, statsResponse)
	require.Greater(t, len(statsResponse), 0)
}
