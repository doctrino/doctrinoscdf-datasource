package cdf

type Token struct{}

func (t *Token) Inspect() (*Token, error) {
	return t, nil
}
