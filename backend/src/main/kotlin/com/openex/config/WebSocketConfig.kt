package com.openex.config

import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

/**
 * Enables STOMP messaging over WebSocket.
 *
 * Clients connect to /ws (with SockJS fallback for browsers/networks that
 * block raw WebSocket), then subscribe to /topic/orderbook to receive live
 * order book snapshots pushed by MatchingEngineService on every trade or
 * resting-order change.
 *
 * Note: the /ws handshake is intentionally left open (see SecurityConfig) —
 * order book data is public market data, not account-specific, so it doesn't
 * need JWT auth the way REST endpoints do.
 */
@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig : WebSocketMessageBrokerConfigurer {

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Simple in-memory broker; topics clients can subscribe to
        registry.enableSimpleBroker("/topic")
        // Prefix for any client-to-server messages (not used yet, but conventional)
        registry.setApplicationDestinationPrefixes("/app")
    }

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
            .addEndpoint("/ws")
            .setAllowedOriginPatterns("*") // tighten this to your React origin in production
            .withSockJS()
    }
}
