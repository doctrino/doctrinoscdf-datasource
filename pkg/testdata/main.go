package main

import (
	"flag"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

func main() {
	envFile := flag.String("env", ".env", "path to .env file")
	flag.Parse()

	if abs, err := filepath.Abs(*envFile); err == nil {
		_ = godotenv.Load(abs)
	}

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
