package cdf

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type LoginFlow string

const (
	LoginFlowToken             LoginFlow = "token"
	LoginFlowClientCredentials LoginFlow = "clientCredentials"
	LoginFlowDeviceCode        LoginFlow = "deviceCode"
)

type CDFSettings struct {
	LoginFlow   LoginFlow `json:"loginFlow"`
	Mode        string    `json:"mode"`
	CdfCluster  string    `json:"cdfCluster"`
	CdfProject  string    `json:"cdfProject"`
	CdfUrl      string    `json:"cdfUrl"`
	ClientId    string    `json:"clientId"`
	IdpProvider string    `json:"idpProvider"`
	IdpTokenURL string    `json:"idpTokenURL"`
	IdpTenantID string    `json:"idpTenantID"`

	// Secrets (from DecryptedSecureJSONData)
	Token        string `json:"-"`
	ClientSecret string `json:"-"`
}

func LoadCDFSettings(source backend.DataSourceInstanceSettings) (*CDFSettings, error) {
	settings := CDFSettings{}
	err := json.Unmarshal(source.JSONData, &settings)
	if err != nil {
		return nil, fmt.Errorf("could not unmarshal PluginSettings json: %w", err)
	}

	settings.Token = source.DecryptedSecureJSONData["token"]
	settings.ClientSecret = source.DecryptedSecureJSONData["clientSecret"]

	return &settings, nil
}
