package com.openex.controller

import com.openex.dto.CreateOrderRequest
import com.openex.dto.OrderResponse
import com.openex.entity.Order
import com.openex.entity.OrderStatus
import com.openex.entity.OrderType
import com.openex.repository.OrderRepository
import com.openex.service.IdempotencyService
import com.openex.service.MatchingEngineService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/orders")
class OrderController(
    private val orderRepository: OrderRepository,
    private val idempotencyService: IdempotencyService,
    private val matchingEngineService: MatchingEngineService
) {

    @PostMapping
    fun createOrder(
        authentication: Authentication,
        @RequestHeader("Idempotency-Key") idempotencyKeyHeader: String,
        @Valid @RequestBody req: CreateOrderRequest
    ): ResponseEntity<OrderResponse> {
        val userId = UUID.fromString(authentication.principal as String)

        val idempotencyKey = try {
            UUID.fromString(idempotencyKeyHeader)
        } catch (ex: IllegalArgumentException) {
            return ResponseEntity.badRequest().build()
        }

        if (req.type == OrderType.LIMIT && req.price == null) {
            return ResponseEntity.badRequest().build()
        }

        return idempotencyService.execute(
            idempotencyKey = idempotencyKey,
            userId = userId,
            requestPath = "/api/orders",
            responseType = OrderResponse::class.java
        ) {
            // This is the real "place the order" logic. It only runs the
            // FIRST time a given Idempotency-Key is seen — every mashed
            // "Buy" click after that just replays this same response.
            val saved = orderRepository.save(
                Order(
                    userId = userId,
                    side = req.side,
                    type = req.type,
                    price = req.price,
                    quantity = req.quantity,
                    currencyPair = req.currencyPair
                )
            )

            // Hand it to the matching engine: this fills it against the
            // resting book as far as possible, persists any resulting
            // trades' balance changes through the ledger, and broadcasts
            // the updated order book to every WebSocket subscriber.
            matchingEngineService.submit(saved)
            val order = orderRepository.findById(saved.id).orElse(saved)

            ResponseEntity.status(HttpStatus.CREATED).body(
                OrderResponse(
                    id = order.id,
                    side = order.side,
                    type = order.type,
                    price = order.price,
                    quantity = order.quantity,
                    filledQuantity = order.filledQuantity,
                    status = order.status,
                    currencyPair = order.currencyPair
                )
            )
        }
    }

    @DeleteMapping("/{id}")
    fun cancelOrder(
        authentication: Authentication,
        @PathVariable id: UUID
    ): ResponseEntity<OrderResponse> {
        val userId = UUID.fromString(authentication.principal as String)
        val existing = orderRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (existing.userId != userId) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }
        if (existing.status == OrderStatus.FILLED ||
            existing.status == OrderStatus.CANCELLED
        ) {
            // Nothing left to cancel — already at a terminal state.
            return ResponseEntity.status(HttpStatus.CONFLICT).build()
        }

        val cancelled = matchingEngineService.cancel(id, userId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(
            OrderResponse(
                id = cancelled.id,
                side = cancelled.side,
                type = cancelled.type,
                price = cancelled.price,
                quantity = cancelled.quantity,
                filledQuantity = cancelled.filledQuantity,
                status = cancelled.status,
                currencyPair = cancelled.currencyPair
            )
        )
    }

    @GetMapping
    fun myOrders(authentication: Authentication): ResponseEntity<List<OrderResponse>> {
        val userId = UUID.fromString(authentication.principal as String)
        val orders = orderRepository.findAllByUserId(userId).map {
            OrderResponse(it.id, it.side, it.type, it.price, it.quantity, it.filledQuantity, it.status, it.currencyPair)
        }
        return ResponseEntity.ok(orders)
    }
}
