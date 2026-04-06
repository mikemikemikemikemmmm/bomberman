package main

import (
	"log"
	"net/http"

	"github.com/rs/cors"

	"bomberman-backend/internal/lobby"
	"bomberman-backend/internal/state"
	"bomberman-backend/internal/ws"
)

func main() {
	appState := state.Get()

	// Start singleton lobby actor
	go lobby.Run(appState)

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", ws.Handler(appState))

	handler := cors.AllowAll().Handler(mux)

	log.Println("Bomberman server listening on :8081")
	if err := http.ListenAndServe(":8081", handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
