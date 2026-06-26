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
				Properties: map[string]any{
					"power": map[string]any{
						"type": map[string]any{
							"type": "direct",
							"list": false,
						},
					},
					"electric": map[string]any{
						"type": map[string]any{
							"type":        "direct",
							"list":        true,
							"maxListSize": 1200,
						},
					},
				},
				Constraints: map[string]any{
					"describablePresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
					},
					"sourceablePresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
					},
				},
			},
			{
				Space:       Space,
				ExternalId:  SensorId,
				Name:        strPtr("Sensor container"),
				Description: strPtr("Container for sensor"),
				UsedFor:     strPtr("node"),
				Properties: map[string]any{
					"asset": map[string]any{
						"type": map[string]any{
							"type": "direct",
							"list": false,
						},
					},
				},
				Constraints: map[string]any{
					"describablePresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
					},
					"sourceablePresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
					},
					"timeSeriesPresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
					},
				},
			},
			{
				Space:       Space,
				ExternalId:  FinanceId,
				Name:        strPtr("Finance container"),
				Description: strPtr("Container for financial data"),
				UsedFor:     strPtr("node"),
				Properties: map[string]any{
					"asset": map[string]any{
						"type": map[string]any{
							"type": "direct",
							"list": false,
						},
					},
					"currency": map[string]any{
						"type": map[string]any{
							"type": "text",
						},
					},
				},
				Constraints: map[string]any{
					"describablePresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteDescribable",
						},
					},
					"sourceablePresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteSourceable",
						},
					},
					"timeSeriesPresent": map[string]any{
						"constraintType": "requires",
						"require": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
					},
				},
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
							"identifier": "windTurbine",
						},
					},
					"power": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      Space,
							"externalId": WindTurbineId,
						},
						"containerPropertyIdentifier": "power",
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": SensorId,
							"version":    Version,
						},
					},
					"electric": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      Space,
							"externalId": WindTurbineId,
						},
						"containerPropertyIdentifier": "electric",
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": SensorId,
							"version":    Version,
						},
					},
					"windSpeed": map[string]any{
						"connectionType": "multi_edge_connection",
						"type": map[string]any{
							"space":      Space,
							"externalId": "distance",
						},
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": SensorId,
							"version":    Version,
						},
						"direction": "outwards",
					},
					"netCashFlow": map[string]any{
						"connectionType": "single_reverse_direct_relation",
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": FinanceId,
							"version":    Version,
						},
						"through": map[string]any{
							"source": map[string]any{
								"type":       "view",
								"space":      Space,
								"externalId": FinanceId,
								"version":    Version,
							},
							"identifier": "windTurbine",
						},
					},
					"maintenanceCost": map[string]any{
						"connectionType": "single_edge_connection",
						"type": map[string]any{
							"space":      Space,
							"externalId": "maintenanceCost",
						},
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": FinanceId,
							"version":    Version,
						},
					},
				},
			},
			{
				Space:       Space,
				ExternalId:  SensorId,
				Version:     Version,
				Name:        strPtr("Sensor"),
				Description: strPtr("Custom time series view used for EquipmentTab and Search testing"),
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
						"source": map[string]any{
							"type":       "view",
							"space":      "cdf_cdm",
							"externalId": "CogniteUnit",
							"version":    "v1",
						},
					},
					"sourceUnit": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "sourceUnit",
					},
					"windTurbine": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      Space,
							"externalId": SensorId,
						},
						"containerPropertyIdentifier": "asset",
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": WindTurbineId,
							"version":    Version,
						},
					},
				},
			},
			{
				Space:       Space,
				ExternalId:  FinanceId,
				Version:     Version,
				Name:        strPtr("FinanceTimeSeries"),
				Description: strPtr("Custom time series used to represent financial data"),
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
						"source": map[string]any{
							"type":       "view",
							"space":      "cdf_cdm",
							"externalId": "CogniteUnit",
							"version":    "v1",
						},
					},
					"sourceUnit": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      "cdf_cdm",
							"externalId": "CogniteTimeSeries",
						},
						"containerPropertyIdentifier": "sourceUnit",
					},
					"windTurbine": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      Space,
							"externalId": FinanceId,
						},
						"containerPropertyIdentifier": "asset",
						"source": map[string]any{
							"type":       "view",
							"space":      Space,
							"externalId": WindTurbineId,
							"version":    Version,
						},
					},
					"currency": map[string]any{
						"container": map[string]any{
							"type":       "container",
							"space":      Space,
							"externalId": FinanceId,
						},
						"containerPropertyIdentifier": "currency",
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
				{"view", Space, FinanceId, Version},
				{"view", "cdf_cdm", "CogniteUnit", "v1"},
			},
		}},
	})
	return err
}

func seedWindTurbinesAndSensors(ctx context.Context, client *cdf.CogniteClient) error {
	return nil
}
