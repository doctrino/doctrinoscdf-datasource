package cdf

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	pb "github.com/cognite/doctrino-s-cdf-source/pkg/cdf/proto"
	"google.golang.org/protobuf/proto"
)

type datapoints struct {
	apiClient *apiClient
}

type DataPointQueryItem struct {
	InstanceId       InstanceId `json:"instanceId"`
	Start            *int64     `json:"start,omitempty"`
	End              *int64     `json:"end,omitempty"`
	Limit            *int64     `json:"limit,omitempty"`
	Aggregates       *string    `json:"aggregates,omitempty"`
	Granularity      *string    `json:"granularity,omitempty"`
	TargetUnit       *string    `json:"targetUnit,omitempty"`
	TargetUnitSystem *string    `json:"targetUnitSystem,omitempty"`
	// For now, omitting the includeOutsidePoints and the status options for now.
	Cursor *string `json:",omitempty"`
}

type DataPointsRetrieveRequest struct {
	Items []DataPointQueryItem
}

func (d *datapoints) retrieve(ctx context.Context, request DataPointsRetrieveRequest) (*pb.DataPointListResponse, error) {
	// Build initial items from request
	items := make([]DataPointQueryItem, len(request.Items))
	copy(items, request.Items)

	var allItems []*pb.DataPointListItem

	for {
		body, err := json.Marshal(DataPointsRetrieveRequest{Items: items})
		if err != nil {
			return nil, fmt.Errorf("marshal request: %w", err)
		}

		resp, err := d.apiClient.do(ctx, http.MethodPost, "/timeseries/data/list", bytes.NewReader(body), "accept/protobuf")
		if err != nil {
			return nil, err
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close() //nolint:errcheck
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("datapoints list: status %d: %s", resp.StatusCode, respBody)
		}
		if err != nil {
			return nil, fmt.Errorf("read response: %w", err)
		}

		var page pb.DataPointListResponse
		if err := proto.Unmarshal(respBody, &page); err != nil {
			return nil, fmt.Errorf("unmarshal protobuf: %w", err)
		}

		allItems = append(allItems, page.GetItems()...)

		// Check for remaining cursors
		var nextItems []DataPointQueryItem
		for i, item := range page.GetItems() {
			if item.GetNextCursor() != "" {
				cursor := item.GetNextCursor()
				nextItems = append(nextItems, DataPointQueryItem{
					InstanceId: request.Items[i].InstanceId,
					Cursor:     &cursor,
				})
			}
		}

		if len(nextItems) == 0 {
			break
		}
		items = nextItems
	}

	return &pb.DataPointListResponse{Items: allItems}, nil
}
