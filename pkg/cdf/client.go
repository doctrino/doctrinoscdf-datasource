package cdf

import (
	"net/http"
	"time"
)

type CogniteClient struct {
	baseURL    string
	project    string
	httpClient *http.Client
	auth       TokenProvider
	token      *Token
}

func NewCogniteClient(baseURL, project string, auth TokenProvider) *CogniteClient {
	token := &Token{}

	return &CogniteClient{
		baseURL:    baseURL,
		project:    project,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		auth:       auth,
		token:      token,
	}
}
