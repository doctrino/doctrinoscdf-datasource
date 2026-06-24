package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestViews_Retrieve(t *testing.T) {
	ctx := context.Background()
	viewId := ViewId{"", "cdf_cdm", "CogniteTimeSeries", "v1"}
	resp, err := testClient.Views.Retrieve(ctx, ViewRetrieveRequest{[]ViewId{viewId}})
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Greater(t, len(resp), 0)
}

func TestViews_Upsert(t *testing.T) {
	ctx := context.Background()
	request := ViewCreateRequest{
		[]ViewRequest{
			{
				Space:       testSpace,
				ExternalId:  "GrafanaTestView",
				Version:     "v1",
				Name:        strPtr("Grafana Test View"),
				Description: strPtr("This is part of the Grafana plugin"),
				Properties: map[string]any{
					"name": map[string]any{
						"container": map[string]string{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
						"containerPropertyIdentifier": "name",
					},
				},
			},
		},
	}
	resp, err := testClient.Views.Upsert(ctx, request)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Equal(t, 1, len(resp))
	view := resp[0]
	require.Equal(t, "GrafanaTestView", view.ExternalId)
}
