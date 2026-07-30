package com.openex.controller

import com.openex.dto.CreateOrderRequest
import com.openex.dto.OrderResponse
import com.openex.entity.Order
import com.openex.entity.OrderType
import com.openex.repository.OrderRepository
import com.openex.service.IdempotencyService
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
    private val idempotencyService: IdempotencyService
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
            val order = orderRepository.save(
                Order(
                    userId = userId,
                    side = req.side,
                    type = req.type,
                    price = req.price,
                    quantity = req.quantity,
                    currencyPair = req.currencyPair
                )
            )

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

    @GetMapping
    fun myOrders(authentication: Authentication): ResponseEntity<List<OrderResponse>> {
        val userId = UUID.fromString(authentication.principal as String)
        val orders = orderRepository.findAllByUserId(userId).map {
            OrderResponse(it.id, it.side, it.type, it.price, it.quantity, it.filledQuantity, it.status, it.currencyPair)
        }
        return ResponseEntity.ok(orders)
    }
}
