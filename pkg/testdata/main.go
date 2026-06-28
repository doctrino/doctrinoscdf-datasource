package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/cognite/doctrino-s-cdf-source/pkg/auth"
	"github.com/cognite/doctrino-s-cdf-source/pkg/cdf"
	"github.com/joho/godotenv"
)

func main() {
	envFile := flag.String("env", ".env", "path to .env file")
	flag.Parse()

	if abs, err := filepath.Abs(*envFile); err == nil {
		_ = godotenv.Load(abs)
	}
	settings := &auth.Settings{
		CdfProject:   mustEnv("CDF_PROJECT"),
		CdfCluster:   mustEnv("CDF_CLUSTER"),
		LoginFlow:    "clientCredentials",
		ClientId:     mustEnv("IDP_CLIENT_ID"),
		ClientSecret: mustEnv("IDP_CLIENT_SECRET"),
		IdpProvider:  "entra",
		IdpTenantID:  mustEnv("IDP_TENANT_ID"),
		Mode:         "guided",
	}
	client, err := cdf.NewCogniteClientFromSettings(settings, nil)
	if err != nil {
		log.Fatalf("failed to create Cognite client: %v", err)
	}
	ctx := context.Background()
	if err := Seed(ctx, client); err != nil {
		log.Fatalf("failed to seed: %v", err)
	}
	fmt.Println("Seeding completed successfully")
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing env %s", k)
	}
	return v
}

func strPtr(s string) *string {
	return &s
}

func instancePtr(inst cdf.InstanceId) *cdf.InstanceId {
	return &inst
}
