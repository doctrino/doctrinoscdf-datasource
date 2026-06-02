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

type DataPointQueryItem struct {
	InstanceId       InstanceId `json:"instanceId"`
	Start            *int64     `json:"start,omitempty"`
	End              *int64     `json:"end,omitempty"`
	Limit            *int64     `json:"limit,omitempty"`
	Aggregates       []string   `json:"aggregates,omitempty"`
	Granularity      *string    `json:"granularity,omitempty"`
	TargetUnit       *string    `json:"targetUnit,omitempty"`
	TargetUnitSystem *string    `json:"targetUnitSystem,omitempty"`
	// For now, omitting the includeOutsidePoints and the status options for now.
	Cursor *string `json:"cursor,omitempty"`
}

type DataPointsRetrieveRequest struct {
	Items []DataPointQueryItem `json:"items"`
}

// DatapointsAPI is the interface for datapoints operations, allowing mocking in tests.
type DatapointsAPI interface {
	Retrieve(ctx context.Context, request DataPointsRetrieveRequest) (*pb.DataPointListResponse, error)
	Insert(ctx context.Context, request *pb.DataPointInsertionRequest) error
}

type datapoints struct {
	apiClient *apiClient
}

func instanceIdKey(id *pb.InstanceId) string {
	if id == nil {
		return ""
	}
	return id.GetSpace() + "/" + id.GetExternalId()
}

// mergeDatapoints appends datapoints from src into dst for all supported datapoint types.
func mergeDatapoints(dst, src *pb.DataPointListItem) {
	switch s := src.GetDatapointType().(type) {
	case *pb.DataPointListItem_NumericDatapoints:
		if d, ok := dst.DatapointType.(*pb.DataPointListItem_NumericDatapoints); ok {
			d.NumericDatapoints.Datapoints = append(d.NumericDatapoints.Datapoints, s.NumericDatapoints.GetDatapoints()...)
		} else {
			dst.DatapointType = s
		}
	case *pb.DataPointListItem_StringDatapoints:
		if d, ok := dst.DatapointType.(*pb.DataPointListItem_StringDatapoints); ok {
			d.StringDatapoints.Datapoints = append(d.StringDatapoints.Datapoints, s.StringDatapoints.GetDatapoints()...)
		} else {
			dst.DatapointType = s
		}
	case *pb.DataPointListItem_AggregateDatapoints:
		if d, ok := dst.DatapointType.(*pb.DataPointListItem_AggregateDatapoints); ok {
			d.AggregateDatapoints.Datapoints = append(d.AggregateDatapoints.Datapoints, s.AggregateDatapoints.GetDatapoints()...)
		} else {
			dst.DatapointType = s
		}
	case *pb.DataPointListItem_StateDatapoints:
		if d, ok := dst.DatapointType.(*pb.DataPointListItem_StateDatapoints); ok {
			d.StateDatapoints.Datapoints = append(d.StateDatapoints.Datapoints, s.StateDatapoints.GetDatapoints()...)
		} else {
			dst.DatapointType = s
		}
	}
}

func (d *datapoints) Retrieve(ctx context.Context, request DataPointsRetrieveRequest) (*pb.DataPointListResponse, error) {
	// Build initial items from request
	items := make([]DataPointQueryItem, len(request.Items))
	copy(items, request.Items)

	// Map from instanceId key to merged DataPointListItem, preserving insertion order.
	mergedMap := make(map[string]*pb.DataPointListItem)
	var orderedKeys []string

	for {
		body, err := json.Marshal(DataPointsRetrieveRequest{Items: items})
		if err != nil {
			return nil, fmt.Errorf("marshal request: %w", err)
		}

		resp, err := d.apiClient.do(ctx, http.MethodPost, "/timeseries/data/list", bytes.NewReader(body), "application/json", "application/protobuf")
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

		// Merge page items into the map
		for _, item := range page.GetItems() {
			key := instanceIdKey(item.GetInstanceId())
			if existing, ok := mergedMap[key]; ok {
				mergeDatapoints(existing, item)
			} else {
				mergedMap[key] = item
				orderedKeys = append(orderedKeys, key)
			}
		}

		// Check for remaining cursors — match by position relative to current request items
		var nextItems []DataPointQueryItem
		for i, item := range page.GetItems() {
			if item.GetNextCursor() != "" {
				cursor := item.GetNextCursor()
				next := items[i] // copy all fields from current request item
				next.Cursor = &cursor
				nextItems = append(nextItems, next)
			}
		}

		if len(nextItems) == 0 {
			break
		}
		items = nextItems
	}

	// Build result preserving original order
	result := make([]*pb.DataPointListItem, 0, len(orderedKeys))
	for _, key := range orderedKeys {
		item := mergedMap[key]
		item.NextCursor = "" // clear cursor since all pages have been fetched
		result = append(result, item)
	}

	return &pb.DataPointListResponse{Items: result}, nil
}

func (d *datapoints) Insert(ctx context.Context, request *pb.DataPointInsertionRequest) error {
	body, err := proto.Marshal(request)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	resp, err := d.apiClient.do(ctx, http.MethodPost, "/timeseries/data", bytes.NewReader(body), "application/protobuf", "application/json")
	if err != nil {
		return err
	}

	respBody, err := io.ReadAll(resp.Body)
	resp.Body.Close() //nolint:errcheck
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("datapoints insert: status %d: %s", resp.StatusCode, respBody)
	}
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}
	return nil
}
