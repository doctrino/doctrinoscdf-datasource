package main

import (
	"context"
	"fmt"

	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
)

func Seed(ctx context.Context, client *cdf.CogniteClient) error {
	if err := seedSpace(ctx, client); err != nil {
		return fmt.Errorf("failed to seed space: %w", err)
	}
	if err := seedContainers(ctx, client); err != nil {
		return fmt.Errorf("failed to seed containers: %w", err)
	}
	if err := seedViews(ctx, client); err != nil {
		return fmt.Errorf("failed to seed views: %w", err)
	}
	if err := seedTestDataModel(ctx, client); err != nil {
		return fmt.Errorf("failed to seed test data model: %w", err)
	}
	if err := seedWindTurbinesAndSensors(ctx, client); err != nil {
		return fmt.Errorf("failed to seed windturbines and sensors: %w", err)
	}
	return nil
}

func seedSpace(ctx context.Context, client *cdf.CogniteClient) error {
	_, err := client.Spaces.Upsert(ctx, cdf.SpaceUpsertRequest{
		Items: []cdf.SpaceRequest{{
			Space:       Space,
			Name:        strPtr("Grafana Plugin E2E Test"),
			Description: strPtr("All the data for the Grafana plugin e2e tests"),
		}},
	})
	return err
}

func seedContainers(ctx context.Context, client *cdf.CogniteClient) error {
	_, err := client.Containers.Upsert(ctx, cdf.ContainerCreateRequest{
		Items: []cdf.ContainerRequest{
			{
				Space:       Space,
				ExternalId:  WindTurbineId,
				Name:        strPtr("Wind Turbine container"),
				Description: strPtr("Container for wind turbine assets, used for EquipmentTab testing"),
				UsedFor:     strPtr("node"),
				Properties:  map[string]any{},
				Constraints: map[string]any{},
			},
			{
				Space:       Space,
				ExternalId:  SensorId,
				Name:        strPtr("Sensor container"),
				Description: strPtr("Container for sensor sensor"),
				Properties:  map[string]any{},
				Constraints: map[string]any{},
			},
		},
	})
	return err
}

func seedViews(ctx context.Context, client *cdf.CogniteClient) error {
	_, err := client.Views.Upsert(ctx, cdf.ViewCreateRequest{
		Items: []cdf.ViewRequest{
			{
				Space:       Space,
				ExternalId:  WindTurbineId,
				Version:     Version,
				Name:        strPtr("Wind Turbine"),
				Description: strPtr("Wind turbine, used for EquipmentTab testing"),
				Properties: map[string]any{
					"name": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
						"containerPropertyIdentifier": "name",
					},
					"description": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
						"containerPropertyIdentifier": "description",
					},
					"sourceId": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
						"containerPropertyIdentifier": "sourceId",
					},
					"sourceContext": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
						"containerPropertyIdentifier": "sourceContext",
					},
					"timeSeries": map[string]any{
						"connectionType": "multi_reverse_direct_relation",
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": SensorId,
							"version":    Version,
						},
						"through": map[string]any{
							"source": map[string]any{
								"type":       "view",
								"space":      Space,
								"externalId": SensorId,
								"version":    Version,
							},
							"identifier": "windTurbines",
						},
					},
				},
			},
			{
				Space:       Space,
				ExternalId:  SensorId,
				Version:     Version,
				Name:        strPtr("Sensor"),
				Description: strPtr("Custom time series view used for EquipmentTab and Search tesitng"),
				Properties: map[string]any{
					"name": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
						"containerPropertyIdentifier": "name",
					},
					"description": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
						"containerPropertyIdentifier": "description",
					},
					"sourceId": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
						"containerPropertyIdentifier": "sourceId",
					},
					"sourceContext": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
						"containerPropertyIdentifier": "sourceContext",
					},
					"isStep": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "isStep",
					},
					"type": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "type",
					},
					"unit": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "unit",
					},
					"sourceUnit": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "unit",
					},
					"windTurbines": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "assets",
					},
				},
			},
		},
	})
	return err
}

func seedTestDataModel(ctx context.Context, client *cdf.CogniteClient) error {
	_, err := client.DataModels.Upsert(ctx, cdf.DataModelCreateRequest{
		Items: []cdf.DataModelRequest{{
			Space:       Space,
			ExternalId:  ModelId,
			Version:     Version,
			Name:        strPtr("Grafana Plugin Test Model"),
			Description: strPtr("All the data for the Grafana plugin test model"),
			Views: []cdf.ViewId{
				{"view", Space, WindTurbineId, Version},
				{"view", Space, SensorId, Version},
			},
		}},
	})
	return err
}

func seedWindTurbinesAndSensors(ctx context.Context, client *cdf.CogniteClient) error {
	return nil
}
