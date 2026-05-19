package cdf

import (
	"context"
	"fmt"
	"io"
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

func (c *CogniteClient) do(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	url := fmt.Sprintf("%s/api/v1/projects/%s%s", c.baseURL, c.project, path)
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}

	token, err := c.auth.Token(ctx)
	if err != nil {
		return nil, fmt.Errorf("auth: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	return c.httpClient.Do(req)
}

func (c *CogniteClient) Get(ctx context.Context, path string) (*http.Response, error) {
	return c.do(ctx, http.MethodGet, path, nil)
}

func (c *CogniteClient) Post(ctx context.Context, path string, body io.Reader) (*http.Response, error) {
	return c.do(ctx, http.MethodPost, path, body)
}
