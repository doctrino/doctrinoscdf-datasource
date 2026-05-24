package auth

import (
	"context"
)

type TokenProvider interface {
	Token(ctx context.Context) (string, error)
}

type staticTokenProvider struct {
	token string
}

func (p *staticTokenProvider) Token(_ context.Context) (string, error) {
	return p.token, nil
}
