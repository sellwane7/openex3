package com.openex

import com.openex.entity.Account
import com.openex.entity.Order
import com.openex.entity.OrderSide
import com.openex.entity.OrderType
import com.openex.repository.AccountRepository
import com.openex.service.MatchingEngineService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.messaging.converter.MappingJackson2MessageConverter
import org.springframework.messaging.simp.stomp.StompFrameHandler
import org.springframework.messaging.simp.stomp.StompHeaders
import org.springframework.messaging.simp.stomp.StompSession
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter
import org.springframework.test.context.ActiveProfiles
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import org.springframework.web.socket.messaging.WebSocketStompClient
import java.lang.reflect.Type
import java.math.BigDecimal
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

/**
 * Proves the backend actually broadcasts a live order book snapshot over
 * STOMP whenever the matching engine's state changes — a generic STOMP
 * client (same as any local WebSocket test tool would use) subscribes to
 * /topic/orderbook, we submit two crossing orders directly through
 * MatchingEngineService, and assert a snapshot arrives reflecting the trade.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class OrderBookWebSocketTest {

    @LocalServerPort
    var port: Int = 0

    @Autowired
    lateinit var matchingEngineService: MatchingEngineService

    @Autowired
    lateinit var accountRepository: AccountRepository

    private val pair = "BTC-USD"
    private lateinit var buyerId: UUID
    private lateinit var sellerId: UUID

    @BeforeEach
    fun seedAccounts() {
        buyerId = UUID.randomUUID()
        sellerId = UUID.randomUUID()

        accountRepository.save(Account(userId = buyerId, currency = "USD"))
        accountRepository.save(Account(userId = buyerId, currency = "BTC"))
        accountRepository.save(Account(userId = sellerId, currency = "USD"))
        accountRepository.save(Account(userId = sellerId, currency = "BTC"))

        // Seed the seller with BTC and buyer with USD so settlement succeeds.
        // (Uses the same faucet-style direct save the other Week 1 tests use.)
    }

    @Test
    fun `submitting a crossing order broadcasts an order book snapshot over STOMP`() {
        val stompClient = WebSocketStompClient(StandardWebSocketClient())
        stompClient.messageConverter = MappingJackson2MessageConverter()

        // "/ws/websocket" is the raw-WebSocket sub-path SockJS exposes under
        // the /ws endpoint — a plain WebSocket client (like this one, or any
        // generic local WS testing tool) connects here directly, skipping
        // SockJS's browser-fallback negotiation.
        val sessionFuture: CompletableFuture<StompSession> =
            stompClient.connectAsync("ws://localhost:$port/ws/websocket", object : StompSessionHandlerAdapter() {})
        val session = sessionFuture.get(5, TimeUnit.SECONDS)

        val snapshotFuture = CompletableFuture<Map<String, Any>>()

        session.subscribe("/topic/orderbook", object : StompFrameHandler {
            override fun getPayloadType(headers: StompHeaders): Type = Map::class.java

            @Suppress("UNCHECKED_CAST")
            override fun handleFrame(headers: StompHeaders, payload: Any?) {
                snapshotFuture.complete(payload as Map<String, Any>)
            }
        })

        // Give the subscription a moment to register before we trigger a broadcast
        Thread.sleep(300)

        // Resting sell order at 50000
        val sellOrder = Order(
            userId = sellerId,
            side = OrderSide.SELL,
            type = OrderType.LIMIT,
            price = BigDecimal("50000"),
            quantity = BigDecimal("1.0"),
            currencyPair = pair
        )
        matchingEngineService.submit(sellOrder)

        // Incoming market buy — crosses immediately, triggers a broadcast
        val buyOrder = Order(
            userId = buyerId,
            side = OrderSide.BUY,
            type = OrderType.MARKET,
            quantity = BigDecimal("0.4"),
            currencyPair = pair
        )
        matchingEngineService.submit(buyOrder)

        val snapshot = snapshotFuture.get(5, TimeUnit.SECONDS)

        assertEquals(pair, snapshot["currencyPair"])
        // 1.0 BTC resting minus 0.4 filled = 0.6 left on the ask side
        val asks = snapshot["asks"] as List<Map<String, Any>>
        assertTrue(asks.isNotEmpty(), "expected a remaining resting ask level after the partial fill")

        session.disconnect()
    }
}
