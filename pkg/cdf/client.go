package cdf

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

// internal transport shared by all resource APIs
type apiClient struct {
	baseURL    string
	project    string
	httpClient *http.Client
	auth       TokenProvider
}

func (a *apiClient) do(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	url := fmt.Sprintf("%s/api/v1/projects/%s%s", a.baseURL, a.project, path)
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}
	token, err := a.auth.Token(ctx)
	if err != nil {
		return nil, fmt.Errorf("auth: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	return a.httpClient.Do(req)
}

func (a *apiClient) doBody(ctx context.Context, method, path string, body io.Reader) ([]byte, error) {
	resp, err := a.do(ctx, method, path, body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("%s: %s", resp.Status, string(respBody))
	}
	return respBody, nil
}

type CogniteClient struct {
	Token *token
}

func NewCogniteClient(baseURL, project string, auth TokenProvider) *CogniteClient {
	apiClient := &apiClient{
		baseURL:    baseURL,
		project:    project,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		auth:       auth,
	}

	token := &token{apiClient: apiClient}

	return &CogniteClient{
		Token: token,
	}
}

func NewCogniteClientFromSettings(settings *CDFSettings) (*CogniteClient, error) {
	// Validation
	if settings.CdfProject == "" {
		return nil, fmt.Errorf("cdfProject is required")
	}
	baseURL := settings.CdfUrl
	if baseURL == "" {
		if settings.CdfCluster == "" {
			return nil, fmt.Errorf("either cdfUrl or cdfCluster is required")
		}
		baseURL = fmt.Sprintf("https://%s.cognitedata.com", settings.CdfCluster)
	}
	auth, err := newTokenProviderFromSettings(settings)
	if err != nil {
		return nil, err
	}
	return NewCogniteClient(baseURL, settings.CdfProject, auth), nil
}
