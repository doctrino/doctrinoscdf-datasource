package cdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type InstanceId struct {
	Space      string `json:"space"`
	ExternalId string `json:"externalId"`
}

type InstanceResponse struct {
	InstanceType    string         `json:"instanceType"`
	Version         int            `json:"version"`
	Space           string         `json:"space"`
	ExternalId      string         `json:"externalId"`
	Type            *InstanceId    `json:"type"`
	CreatedTime     int64          `json:"createdTime"`
	LastUpdatedTime int64          `json:"lastUpdatedTime"`
	DeletedTime     *int64         `json:"deletedTime"`
	Properties      map[string]any `json:"properties"`
}

type InstanceItemResponse struct {
	Items []InstanceResponse `json:"items"`
}

type InstanceAggregateRequest struct {
	View       ViewId           `json:"view"`
	Aggregates []AggregateItem  `json:"aggregates,omitempty"`
	Query      string           `json:"query,omitempty"`
	Properties []string         `json:"properties,omitempty"`
	Filter     []map[string]any `json:"filter,omitempty"`
	Limit      int              `json:"limit,omitempty"`
}

type AggregateValue struct {
	Aggregate string  `json:"aggregate"`
	Property  string  `json:"property"`
	Value     float64 `json:"value"`
}

type AggregateResponse struct {
	InstanceType string           `json:"instanceType"`
	Aggregates   []AggregateValue `json:"aggregates"`
}

type InstanceAggregateResponse struct {
	Items []AggregateResponse `json:"items"`
}

type AggregateProperty struct {
	Property string `json:"property,omitempty"`
}

type AggregateItem struct {
	Avg   *AggregateProperty `json:"avg,omitempty"`
	Count *AggregateProperty `json:"count,omitempty"`
	Max   *AggregateProperty `json:"max,omitempty"`
	Min   *AggregateProperty `json:"min,omitempty"`
	Sum   *AggregateProperty `json:"sum,omitempty"`
}

type InstanceSearchRequest struct {
	View       ViewId           `json:"view"`
	Query      string           `json:"query,omitempty"`
	Properties []string         `json:"properties,omitempty"`
	Filter     []map[string]any `json:"filter,omitempty"`
	Limit      int              `json:"limit,omitempty"`
}

type InstanceSlimItem struct {
	InstanceType    string `json:"instanceType"`
	Version         int    `json:"version"`
	WasModified     bool   `json:"wasModified"`
	Space           string `json:"space"`
	ExternalId      string `json:"externalId"`
	CreatedTime     int64  `json:"createdTime"`
	LastUpdatedTime int64  `json:"lastUpdatedTime"`
}

type InstanceSlimResponse struct {
	Items []InstanceSlimItem `json:"items"`
}

type InstanceData struct {
	Source     ViewId         `json:"source"`
	Properties map[string]any `json:"properties"`
}

type InstanceRequest struct {
	InstanceType    string         `json:"instanceType"`
	ExistingVersion *int           `json:"existingVersion,omitempty"`
	Space           string         `json:"space"`
	ExternalId      string         `json:"externalId"`
	Type            *InstanceId    `json:"type,omitempty"`
	Sources         []InstanceData `json:"sources,omitempty"`
}

type InstanceUpsertRequest struct {
	Items                     []InstanceRequest `json:"items"`
	AutoCreateDirectRelations *bool             `json:"autoCreateDirectRelations,omitempty"`
	AutoCreateStartNodes      *bool             `json:"autoCreateStartNodes,omitempty"`
	AutoCreateEndNodes        *bool             `json:"autoCreateEndNodes,omitempty"`
	SkipOnVersionConflict     *bool             `json:"skipOnVersionConflict,omitempty"`
	Replace                   *bool             `json:"replace,omitempty"`
}

type instances struct {
	apiClient *apiClient
}

func (i *instances) Search(ctx context.Context, request InstanceSearchRequest) ([]InstanceResponse, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := i.apiClient.doBody(ctx, http.MethodPost, "/models/instances/search", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp InstanceItemResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("cdf /models/instances/search: %w", err)
	}
	return resp.Items, nil
}

func (i *instances) Aggregate(ctx context.Context, request InstanceAggregateRequest) ([]AggregateResponse, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := i.apiClient.doBody(ctx, http.MethodPost, "/models/instances/aggregate", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp InstanceAggregateResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("cdf /models/instances/aggregate: %w", err)
	}
	return resp.Items, nil
}

func (i *instances) Upsert(ctx context.Context, request InstanceUpsertRequest) ([]InstanceSlimItem, error) {
	data, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	body, err := i.apiClient.doBody(ctx, http.MethodPost, "/models/instances", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp InstanceSlimResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("cdf /models/instances/upsert: %w", err)
	}
	return resp.Items, nil
}
