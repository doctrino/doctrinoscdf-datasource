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

func TestDataModels_Upsert(t *testing.T) {
	ctx := context.Background()
	request := DataModelCreateRequest{
		[]DataModelRequest{
			{
				Space:       testSpace,
				ExternalId:  "GrafanaPluginTest",
				Version:     "v1",
				Name:        strPtr("Grafana Plugin Test"),
				Description: strPtr("Part of the test suite for the Grafana plugin"),
				Views: []ViewId{
					{"view", "cdf_cdm", "CogniteDescribable", "v1"},
				},
			},
		},
	}
	responses, err := testClient.DataModels.Upsert(ctx, request)
	require.NoError(t, err)
	require.NotNil(t, responses)
	require.Equal(t, 1, len(responses), "Expected exactly one model in the response")
	model := responses[0]
	require.Equal(t, "GrafanaPluginTest", model.ExternalId)
	require.Equal(t, "v1", model.Version)
	require.Equal(t, "Grafana Plugin Test", *model.Name)
	require.Equal(t, "Part of the test suite for the Grafana plugin", *model.Description)
	require.Equal(t, 1, len(model.Views), "Expected exactly one view in the model")
}
