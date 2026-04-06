package message

import "encoding/json"

// Base is the envelope for all WebSocket messages.
type Base struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Encode serializes a typed message to JSON.
func Encode(msgType string, payload any) ([]byte, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.Marshal(Base{Type: msgType, Payload: raw})
}

// MustEncode is like Encode but panics on error (safe for static payloads).
func MustEncode(msgType string, payload any) []byte {
	b, err := Encode(msgType, payload)
	if err != nil {
		panic(err)
	}
	return b
}
