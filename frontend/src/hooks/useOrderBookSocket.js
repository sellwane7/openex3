import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { apiFetch, WS_BASE } from "../api/client";

/**
 * Opens a STOMP connection to the backend and subscribes to /topic/orderbook,
 * keeping the latest snapshot for the given currency pair in state.
 *
 * Connects straight to "/ws/websocket" — the raw-WebSocket sub-path SockJS
 * exposes under the /ws endpoint (same one the backend's own
 * OrderBookWebSocketTest connects to). That means no sockjs-client
 * dependency is needed in the browser bundle; a native WebSocket works.
 *
 * The order book is public market data (see SecurityConfig), so no JWT is
 * sent on the handshake.
 */
export function useOrderBookSocket(currencyPair) {
  const [book, setBook] = useState({ bids: [], asks: [] });
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // Pull the current book once on mount — the STOMP feed below only
    // pushes *changes* from this point forward, so without this a client
    // that opens or reloads the page after orders already exist would
    // see an empty book until the next trade happens to trigger a push.
    async function loadInitialSnapshot() {
      try {
        const res = await apiFetch(`/api/orderbook/${currencyPair}`);
        if (res.ok && !cancelled) {
          const snapshot = await res.json();
          setBook({ bids: snapshot.bids, asks: snapshot.asks });
        }
      } catch {
        // Non-fatal — the live WebSocket feed will still populate the
        // book as soon as the next order is submitted.
      }
    }
    loadInitialSnapshot();

    const client = new Client({
      brokerURL: `${WS_BASE}/ws/websocket`,
      reconnectDelay: 3000, // auto-retry if the backend restarts or drops the connection
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/orderbook", (message) => {
          const snapshot = JSON.parse(message.body);
          if (snapshot.currencyPair === currencyPair) {
            setBook({ bids: snapshot.bids, asks: snapshot.asks });
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      cancelled = true;
      client.deactivate();
    };
  }, [currencyPair]);

  return { ...book, connected };
}
