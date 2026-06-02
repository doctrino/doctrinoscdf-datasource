package cdf

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cognite/doctrino-s-cdf-source/pkg/auth"
)

// internal transport shared by all resource APIs
type apiClient struct {
	baseURL       string
	project       string
	httpClient    *http.Client
	tokenProvider auth.TokenProvider
}

func (a *apiClient) do(ctx context.Context, method, path string, body io.Reader, contentType, accept string) (*http.Response, error) {
	var url string
	if strings.HasPrefix(path, "/api") {
		url = fmt.Sprintf("%s%s", a.baseURL, path)
	} else {
		url = fmt.Sprintf("%s/api/v1/projects/%s%s", a.baseURL, a.project, path)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, err
	}
	token, err := a.tokenProvider.Token(ctx)
	if err != nil {
		return nil, fmt.Errorf("auth: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Accept", accept)
	return a.httpClient.Do(req)
}

func (a *apiClient) doBody(ctx context.Context, method, path string, body io.Reader) ([]byte, error) {
	resp, err := a.do(ctx, method, path, body, "application/json", "application/json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() //nolint:errcheck

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
	CDFProject string
	Token      *token
	Spaces     *spaces
	Containers *containers
	Instances  *instances
	Datapoints DatapointsAPI
}

func NewCogniteClient(baseURL, project string, auth auth.TokenProvider) *CogniteClient {
	apiClient := &apiClient{
		baseURL:       baseURL,
		project:       project,
		httpClient:    &http.Client{Timeout: 30 * time.Second},
		tokenProvider: auth,
	}

	token := &token{apiClient}
	spaces := &spaces{apiClient}
	containers := &containers{apiClient}
	instances := &instances{apiClient}
	datapointsAPI := &datapoints{apiClient}

	return &CogniteClient{
		CDFProject: project,
		Token:      token,
		Spaces:     spaces,
		Containers: containers,
		Instances:  instances,
		Datapoints: datapointsAPI,
	}
}

func NewCogniteClientFromSettings(settings *auth.Settings, provider *auth.TokenProvider) (*CogniteClient, error) {
	if settings == nil {
		return nil, fmt.Errorf("settings is required")
	}
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
	if provider == nil {
		newProvider, err := auth.NewTokenProviderFromSettings(settings)
		if err != nil {
			return nil, err
		}
		provider = &newProvider
	}
	return NewCogniteClient(baseURL, settings.CdfProject, *provider), nil
}
