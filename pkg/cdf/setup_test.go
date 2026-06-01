package cdf

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/cognite/doctrino-s-cdf-source/pkg/auth"
	"github.com/joho/godotenv"
)

var testClient *CogniteClient
var testSpace string = "doctrinos_grafana_plugin"

func findRepoRoot(start string) (string, error) {
	dir := start
	for {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("no .git directory found")
		}
		dir = parent
	}
}

func TestMain(m *testing.M) {
	wd, _ := os.Getwd()
	root, err := findRepoRoot(wd)
	if err != nil {
		panic(err)
	}
	// If there is no .env file, we assume the environment variables
	// are set in the environment and continue without error.
	_ = godotenv.Load(filepath.Join(root, ".env"))

	// Runs once before all tests in this package (like a session-scoped fixture)
	settings := &auth.Settings{
		CdfProject:   os.Getenv("CDF_PROJECT"),
		CdfCluster:   os.Getenv("CDF_CLUSTER"),
		LoginFlow:    "clientCredentials",
		ClientId:     os.Getenv("IDP_CLIENT_ID"),
		ClientSecret: os.Getenv("IDP_CLIENT_SECRET"),
		IdpProvider:  "entra",
		IdpTenantID:  os.Getenv("IDP_TENANT_ID"),
		Mode:         "guided",
	}
	client, err := NewCogniteClientFromSettings(settings, nil)
	if err != nil {
		panic(err)
	}
	testClient = client

	ctx := context.Background()
	_, err = testClient.Instances.Upsert(ctx, InstanceUpsertRequest{
		Items: []InstanceRequest{{
			InstanceType: "node",
			Space:        testTimeSeriesId.Space,
			ExternalId:   testTimeSeriesId.ExternalId,
			Sources: []InstanceData{{
				Source: ViewId{"view", "cdf_cdm", "CogniteTimeSeries", "v1"},
				Properties: map[string]any{
					"isStep":     false,
					"type":       "numeric",
					"sourceUnit": "unknown",
				},
			}},
		}},
	})
	if err != nil {
		panic(fmt.Sprintf("Failed to create timeseries %v", err))
	}

	os.Exit(m.Run())
}
