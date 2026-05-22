package auth

import (
	"context"
)

type TokenProvider interface {
	Token(ctx context.Context) (string, error)
}

type StaticTokenProvider struct {
	token string
}

func (p *StaticTokenProvider) Token(_ context.Context) (string, error) {
	return p.token, nil
}
