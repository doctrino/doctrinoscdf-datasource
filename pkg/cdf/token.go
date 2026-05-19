package cdf

type token struct {
}

func (t *token) Inspect() (*token, error) {
	return t, nil
}

type InspectResponse struct {
	Subject string `json:"subject"`
}
