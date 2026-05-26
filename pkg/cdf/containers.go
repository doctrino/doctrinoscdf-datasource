package cdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type ContainerId struct {
	Space      string `json:"space"`
	ExternalId string `json:"externalId"`
}

type InspectionResults struct {
	InvolvedViewCount int      `json:"involvedViewCount"`
	InvolvedViews     []ViewId `json:"involvedViews"`
}

type ContainerInspectItem struct {
	Space             string            `json:"space"`
	ExternalId        string            `json:"externalId"`
	InspectionResults InspectionResults `json:"inspectionResults"`
}

type ContainerInspectResponse struct {
	Items []ContainerInspectItem `json:"items"`
}

type containers struct {
	apiClient *apiClient
}

func (c *containers) Inspect(ctx context.Context, items []ContainerId, allVersions, includeUnavailableViews bool) (*[]ContainerInspectItem, error) {
	reqBody := struct {
		Items         []ContainerId `json:"items"`
		InvolvedViews struct {
			AllVersions bool `json:"allVersions"`
		} `json:"involvedViews"`
		TotalInvolvedViewCount struct {
			AllVersions             bool `json:"allVersions"`
			IncludeUnavailableViews bool `json:"includeUnavailableViews"`
		}
	}{
		Items: items,
		InvolvedViews: struct {
			AllVersions bool `json:"allVersions"`
		}{
			AllVersions: allVersions,
		},
		TotalInvolvedViewCount: struct {
			AllVersions             bool `json:"allVersions"`
			IncludeUnavailableViews bool `json:"includeUnavailableViews"`
		}{
			AllVersions:             allVersions,
			IncludeUnavailableViews: includeUnavailableViews,
		},
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}
	body, err := c.apiClient.doBody(ctx, http.MethodPost, "/models/containers/inspect", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	var resp ContainerInspectResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("cdf: token inspect: %w", err)
	}
	return &resp.Items, nil
}
