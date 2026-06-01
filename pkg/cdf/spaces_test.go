package cdf

import (
	"context"

	"testing"

	"github.com/stretchr/testify/require"
)

func TestSPaces_RetrieveUpsert(t *testing.T) {
	ctx := context.Background()
	retrieveRequest := SpaceRetrieveRequest{
		[]SpaceId{{Space: testSpace}},
	}
	resp, err := testClient.Spaces.Retrieve(ctx, retrieveRequest)
	require.NoError(t, err)
	require.NotNil(t, resp)
	if len(resp) > 0 {
		require.Equal(t, testSpace, resp[0].Space)
	} else {
		name := "Grafana Test Space"
		description := "Space for testing Grafana datasource plugin"
		upsertRequest := SpaceUpsertRequest{
			[]SpaceRequest{{
				Space:       testSpace,
				Name:        &name,
				Description: &description,
			}},
		}
		resp2, err := testClient.Spaces.Upsert(ctx, upsertRequest)
		require.NoError(t, err)
		require.NotNil(t, resp2)
		require.Greater(t, len(resp2), 0)
		require.Equal(t, testSpace, resp2[0].Space)
	}
}
