package cdf

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
)

type DataModelListRequest struct {
	Limit         *int    `json:"limit,omitempty"`
	Cursor        *string `json:"cursor,omitempty"`
	InlineViews   *bool   `json:"inlineViews,omitempty"`
	Space         *string `json:"space,omitempty"`
	AllVersions   *bool   `json:"allVersions,omitempty"`
	IncludeGlobal *bool   `json:"includeGlobal,omitempty"`
}

func (r *DataModelListRequest) asQueryParams() url.Values {
	queryParams := url.Values{}
	if r.Limit != nil {
		queryParams.Set("limit", fmt.Sprintf("%d", *r.Limit))
	}
	if r.Cursor != nil {
		queryParams.Set("cursor", *r.Cursor)
	}
	if r.InlineViews != nil {
		queryParams.Set("inlineViews", fmt.Sprintf("%t", *r.InlineViews))
	}
	if r.Space != nil {
		queryParams.Set("space", *r.Space)
	}
	if r.AllVersions != nil {
		queryParams.Set("allVersions", fmt.Sprintf("%t", *r.AllVersions))
	}
	if r.IncludeGlobal != nil {
		queryParams.Set("includeGlobal", fmt.Sprintf("%t", *r.IncludeGlobal))
	}
	return queryParams
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

func (d *dataModels) List(ctx context.Context, request *DataModelListRequest) ([]DataModelResponse, error) {
	if request == nil {
		request = &DataModelListRequest{}
	}
	queryParams := request.asQueryParams()
	var allItems []DataModelResponse
	for {
		body, err := d.apiClient.doQueryParam(ctx, "/models/datamodels", queryParams)
		if err != nil {
			return nil, err
		}
		var resp DataModelItemsResponse
		if err := json.Unmarshal(body, &resp); err != nil {
			return nil, fmt.Errorf("cdf /models/datamodels: %w", err)
		}
		allItems = append(allItems, resp.Items...)
		if resp.NextCursor == nil {
			break
		}
		queryParams.Set("cursor", *resp.NextCursor)
	}
	return allItems, nil
}
