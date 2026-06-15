package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDataModels_List(t *testing.T) {
	ctx := context.Background()
	resp, err := testClient.DataModels.List(ctx, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Greater(t, len(resp), 0, "There should be at least one model")
}

func TestDataModels_Retrieve(t *testing.T) {
	tests := []struct {
		name        string
		inlineViews bool
	}{
		{"With ViewIDs", false},
		{"Full View responses", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			resp, err := testClient.DataModels.Retrieve(ctx, DataModelRetrieveRequest{
				Items: []DataModelId{
					{
						Space:      "cdf_cdm",
						ExternalId: "CogniteCore",
						Version:    "v1",
					},
				},
			},
				tt.inlineViews,
			)
			require.NoError(t, err)
			require.Equal(t, 1, len(resp), "Expected exactly one model")
		})
	}
}
