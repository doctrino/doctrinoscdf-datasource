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
	InstanceId InstanceId `json:"instanceId"`
	Cursor     *string    `json:",omitempty"`
}

type DataPointsRetrieveRequest struct {
	Items []DataPointQueryItem
}

func (d *datapoints) retrieve(ctx context.Context, request DataPointsRetrieveRequest) (*pb.DataPointListResponse, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	resp, err := d.apiClient.do(ctx, http.MethodPost, "/timeseries/data/list", bytes.NewReader(body), "accept/protobuf")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("datapoints list: status %d: %s", resp.StatusCode, respBody)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var result pb.DataPointListResponse
	if err := proto.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("unmarshal protobuf: %w", err)
	}

	return &result, nil
}
