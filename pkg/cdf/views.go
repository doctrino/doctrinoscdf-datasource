package cdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type ViewId struct {
	Type       string `json:"type,omitempty"`
	Space      string `json:"space"`
	ExternalId string `json:"externalId"`
	Version    string `json:"version"`
}

type ViewRetrieveRequest struct {
	Items []ViewId `json:"items"`
}

type ViewResponse struct {
	Space            string         `json:"space"`
	ExternalId       string         `json:"externalId"`
	Version          string         `json:"version"`
	Name             *string        `json:"name,omitempty"`
	Description      *string        `json:"description,omitempty"`
	Filter           map[string]any `json:"filter,omitempty"`
	Implements       []ViewId       `json:"implements,omitempty"`
	CreatedTime      int64          `json:"createdTime"`
	LastUpdatedTime  int64          `json:"lastUpdatedTime"`
	Writable         bool           `json:"writable"`
	Queryable        bool           `json:"queryable"`
	UsedFor          string         `json:"usedFor"`
	IsGlobal         bool           `json:"isGlobal"`
	Properties       map[string]any `json:"properties,omitempty"`
	MappedContainers []ContainerId  `json:"mappedContainers,omitempty"`
}

type ViewItemsResponse struct {
	Items []ViewResponse `json:"items"`
}

type ViewRequest struct {
	Space       string         `json:"space"`
	ExternalId  string         `json:"externalId"`
	Version     string         `json:"version"`
	Name        *string        `json:"name,omitempty"`
	Description *string        `json:"description,omitempty"`
	Filter      map[string]any `json:"filter,omitempty"`
	Implements  []ViewId       `json:"implements,omitempty"`
	Properties  map[string]any `json:"properties,omitempty"`
}

type ViewCreateRequest struct {
	Items []ViewRequest `json:"items"`
}

type views struct {
	apiClient *apiClient
}

func (v *views) Retrieve(ctx context.Context, request ViewRetrieveRequest) ([]ViewResponse, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := v.apiClient.doBody(ctx, http.MethodPost, "/models/views/byids", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp ViewItemsResponse
	err = json.Unmarshal(body, &resp)
	if err != nil {
		return nil, fmt.Errorf("cdf /models/views/byids: %w", err)
	}
	return resp.Items, nil
}

func (v *views) Upsert(ctx context.Context, request ViewCreateRequest) ([]ViewResponse, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := v.apiClient.doBody(ctx, http.MethodPost, "/models/views", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("request to failed /models/views: %w", err)
	}
	var resp ViewItemsResponse
	err = json.Unmarshal(body, &resp)
	if err != nil {
		return nil, fmt.Errorf("unmarshalling of response from /models/views: %w", err)
	}
	return resp.Items, nil
}
