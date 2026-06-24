package cdf

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestContainers_InspectNoArgs(t *testing.T) {
	ctx := context.Background()
	containerId := ContainerId{"cdf_cdm", "CogniteTimeSeries"}
	request := ContainersInspectRequest{[]ContainerId{containerId}, nil}
	resp, err := testClient.Containers.Inspect(ctx, request)
	require.NoError(t, err)
	require.NotNil(t, resp)
}

func TestContainers_InspectWithArgs(t *testing.T) {
	ctx := context.Background()
	containerId := ContainerId{"cdf_cdm", "CogniteTimeSeries"}
	request := ContainersInspectRequest{[]ContainerId{containerId}, &InspectionOperations{
		InvolvedViews:          InvolvedViewsFilter{true},
		TotalInvolvedViewCount: TotalInvolvedViewCountFilter{true, false},
	}}
	resp, err := testClient.Containers.Inspect(ctx, request)
	require.NoError(t, err)
	require.NotNil(t, resp)
}

func strPtr(s string) *string { return &s }

func TestContainers_Upsert(t *testing.T) {
	ctx := context.Background()
	containerRequest := ContainerCreateRequest{
		Items: []ContainerRequest{
			{
				Space:       testSpace,
				ExternalId:  "SensorContainer",
				Name:        strPtr("Sensor Container"),
				Description: strPtr("This is part of the Grafana plugin"),
				UsedFor:     strPtr("node"),
				Properties: map[string]any{
					"location": map[string]any{
						"type": map[string]any{
							"type": "text",
						},
					},
				},
				Constraints: map[string]any{
					"timeSeriesPresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]string{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
					},
				},
			},
		},
	}
	containerResponses, err := testClient.Containers.Upsert(ctx, containerRequest)
	require.NoError(t, err)
	require.NotNil(t, containerResponses)
}
