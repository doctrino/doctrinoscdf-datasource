package cdf

type ViewId struct {
	Type       string `json:"type"`
	Space      string `json:"space"`
	ExternalId string `json:"externalId"`
	Version    string `json:"version"`
}
