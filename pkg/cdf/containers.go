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

type InvolvedViewsFilter struct {
	AllVersions bool `json:"allVersions,omitempty"`
}

type TotalInvolvedViewCountFilter struct {
	AllVersions             bool `json:"allVersions,omitempty"`
	IncludeUnavailableViews bool `json:"includeUnavailableViews,omitempty"`
}

type InspectionOperations struct {
	InvolvedViews          InvolvedViewsFilter          `json:"involvedViews"`
	TotalInvolvedViewCount TotalInvolvedViewCountFilter `json:"totalInvolvedViewCount"`
}

type inspectRequest struct {
	Items                []ContainerId         `json:"items"`
	InspectionOperations *InspectionOperations `json:"inspectionOperations"`
}

func (c *containers) Inspect(ctx context.Context, items []ContainerId, options *InspectionOperations) (*[]ContainerInspectItem, error) {
	reqBody := inspectRequest{Items: items}
	if options != nil {
		reqBody.InspectionOperations = options
	} else {
		reqBody.InspectionOperations = &InspectionOperations{}
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
