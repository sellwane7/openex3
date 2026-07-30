package com.openex.dto

import com.openex.entity.OrderSide
import com.openex.entity.OrderStatus
import com.openex.entity.OrderType
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.util.UUID

data class CreateOrderRequest(
    @field:NotNull val side: OrderSide,
    @field:NotNull val type: OrderType,
    val price: BigDecimal? = null, // required for LIMIT, ignored for MARKET
    @field:DecimalMin(value = "0.00000001") val quantity: BigDecimal,
    val currencyPair: String = "BTC-USD"
)

data class OrderResponse(
    val id: UUID,
    val side: OrderSide,
    val type: OrderType,
    val price: BigDecimal?,
    val quantity: BigDecimal,
    val filledQuantity: BigDecimal,
    val status: OrderStatus,
    val currencyPair: String
)
