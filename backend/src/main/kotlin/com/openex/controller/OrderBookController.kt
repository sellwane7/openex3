package com.openex.controller

import com.openex.dto.OrderBookSnapshot
import com.openex.service.MatchingEngineService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Answers "what does the book look like right now?" for a client that's
 * just opened or reloaded the page — the STOMP feed only pushes changes
 * going forward, so without this a fresh subscriber sees nothing until
 * the next order is submitted. The frontend fetches this once on mount,
 * then lets the WebSocket push keep it live from there.
 *
 * Public market data, same as the /topic/orderbook feed — see SecurityConfig.
 */
@RestController
@RequestMapping("/api/orderbook")
class OrderBookController(
    private val matchingEngineService: MatchingEngineService
) {
    @GetMapping("/{pair}")
    fun getSnapshot(@PathVariable pair: String): ResponseEntity<OrderBookSnapshot> {
        return ResponseEntity.ok(matchingEngineService.snapshot(pair))
    }
}
