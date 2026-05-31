package cdf

import (
	"context"
	"errors"
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

type NumericDatapoint struct {
	Timestamp int64   `json:"timestamp"`
	Value     float64 `json:"value"`
}

type StringDatapoint struct {
	Timestamp int64  `json:"timestamp"`
	Value     string `json:"value"`
}

type AggregateDatapoint struct {
	Timestamp int64    `json:"timestamp"`
	Average   *float64 `json:"average,omitempty"`
	Max       *float64 `json:"max,omitempty"`
	Min       *float64 `json:"min,omitempty"`
	Count     *float64 `json:"count,omitempty"`
	Sum       *float64 `json:"sum,omitempty"`
}

type DatapointItem struct {
	Id                  int64                 `json:"id"`
	ExternalId          *string               `json:"externalId,omitempty"`
	IsString            bool                  `json:"isString"`
	NumericDatapoints   *[]NumericDatapoint   `json:"datapoints,omitempty"`
	StringDatapoints    *[]StringDatapoint    `json:"datapoints,omitempty"`
	AggregateDatapoints *[]AggregateDatapoint `json:"datapoints,omitempty"`
}

func (d *datapoints) retrieve(ctx context.Context, request DataPointsRetrieveRequest) ([]DatapointItem, error) {
	return nil, errors.New("Endpoint /timeseries/data/list Not yet implemented")
}
