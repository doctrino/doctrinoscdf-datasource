package cdf

import (
	"context"
	"errors"
)

type DataModelListRequest struct {
	Limit         *int    `json:"limit,omitempty"`
	Cursor        *string `json:"cursor,omitempty"`
	InlineViews   *bool   `json:"inlineViews,omitempty"`
	Space         *string `json:"space,omitempty"`
	AllVersions   *bool   `json:"allVersions,omitempty"`
	IncludeGlobal *bool   `json:"includeGlobal,omitempty"`
}

type DataModelResponse struct {
	Space           string         `json:"space"`
	ExternalId      string         `json:"externalId"`
	Version         string         `json:"version"`
	CreatedTime     int64          `json:"createdTime"`
	LastUpdatedTime int64          `json:"lastUpdatedTime"`
	IsGlobal        bool           `json:"isGlobal"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Views           []ViewResponse `json:"views"`
}

type DataModelItemsResponse struct {
	Items      []DataModelResponse `json:"items"`
	NextCursor *string             `json:"nextCursor,omitempty"`
}

type dataModels struct {
	apiClient *apiClient
}

func (d *dataModels) List(ctx context.Context) ([]DataModelResponse, error) {
	return nil, errors.New("Not yet implemented")
}
