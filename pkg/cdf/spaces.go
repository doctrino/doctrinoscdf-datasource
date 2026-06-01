package cdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type SpaceId struct {
	Space string `json:"space"`
}

type SpaceRequest struct {
	Space       string  `json:"space"`
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
}

type SpaceUpsertRequest struct {
	Items []SpaceRequest `json:"items"`
}

type SpaceResponse struct {
	Space           string  `json:"space"`
	Name            *string `json:"name"`
	Description     *string `json:"description,omitempty"`
	CreatedTime     int64   `json:"createdTime"`
	LastUpdatedTime int64   `json:"lastUpdatedTime"`
	IsGlobal        bool    `json:"isGlobal"`
}

type SpaceItemsResponse struct {
	Items []SpaceResponse `json:"items"`
}

type SpaceRetrieveRequest struct {
	Items []SpaceId `json:"items"`
}

type spaces struct {
	apiClient *apiClient
}

func (s *spaces) Upsert(ctx context.Context, request SpaceUpsertRequest) ([]SpaceResponse, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := s.apiClient.doBody(ctx, http.MethodPost, "/models/spaces", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp SpaceItemsResponse
	err = json.Unmarshal(body, &resp)
	if err != nil {
		return nil, fmt.Errorf("cdf /models/spaces: %w", err)
	}
	return resp.Items, nil
}

func (s *spaces) Retrieve(ctx context.Context, request SpaceRetrieveRequest) ([]SpaceResponse, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := s.apiClient.doBody(ctx, http.MethodPost, "/models/spaces/byids", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp SpaceItemsResponse
	err = json.Unmarshal(body, &resp)
	if err != nil {
		return nil, fmt.Errorf("cdf /models/spaces/byids: %w", err)
	}
	return resp.Items, nil
}
