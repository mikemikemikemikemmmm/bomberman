package main

import (
	"log"
	"net/http"

	"bomberman/backend2/lobby"
	"bomberman/backend2/state"
	"bomberman/backend2/ws"
)

func main() {
	lobbyCh := make(chan state.LobbyCommand, 256)
	state.InitGlobalState(lobbyCh)
	appState := state.GetGlobalState()

	go lobby.RunLobbyActor(lobbyCh, appState)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		ws.HandleWs(w, r)
	})

	// Allow any origin (CORS equivalent)
	handler := corsMiddleware(mux)

	addr := "localhost:8082"
	log.Printf("Bomberman Go server listening on ws://%s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "*")
		w.Header().Set("Access-Control-Allow-Headers", "*")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
