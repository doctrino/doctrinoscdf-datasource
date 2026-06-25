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
