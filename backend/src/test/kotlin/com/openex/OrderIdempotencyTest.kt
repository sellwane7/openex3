package com.openex

import com.fasterxml.jackson.databind.ObjectMapper
import com.openex.dto.CreateOrderRequest
import com.openex.dto.RegisterRequest
import com.openex.entity.OrderSide
import com.openex.entity.OrderType
import com.openex.repository.OrderRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderIdempotencyTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var objectMapper: ObjectMapper
    @Autowired lateinit var orderRepository: OrderRepository

    private fun registerAndGetToken(): String {
        val email = "trader-${UUID.randomUUID()}@openex.test"
        val result = mockMvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(RegisterRequest(email, "supersecret1"))
        }.andReturn()
        return objectMapper.readTree(result.response.contentAsString).get("token").asText()
    }

    @Test
    fun `submitting the same order 47 times with the same key creates exactly one order`() {
        val token = registerAndGetToken()
        val idempotencyKey = UUID.randomUUID().toString()
        val orderRequest = CreateOrderRequest(
            side = OrderSide.BUY,
            type = OrderType.LIMIT,
            price = BigDecimal("50000.00"),
            quantity = BigDecimal("0.01")
        )

        val countBefore = orderRepository.count()

        repeat(47) {
            mockMvc.post("/api/orders") {
                header("Authorization", "Bearer $token")
                header("Idempotency-Key", idempotencyKey)
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(orderRequest)
            }.andExpect { status { isCreated() } }
        }

        val countAfter = orderRepository.count()
        assertEquals(1, countAfter - countBefore, "47 identical submissions should create exactly 1 order")
    }

    @Test
    fun `a different Idempotency-Key creates a genuinely new order`() {
        val token = registerAndGetToken()
        val orderRequest = CreateOrderRequest(
            side = OrderSide.SELL,
            type = OrderType.MARKET,
            quantity = BigDecimal("0.05")
        )

        val countBefore = orderRepository.count()

        mockMvc.post("/api/orders") {
            header("Authorization", "Bearer $token")
            header("Idempotency-Key", UUID.randomUUID().toString())
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(orderRequest)
        }.andExpect { status { isCreated() } }

        mockMvc.post("/api/orders") {
            header("Authorization", "Bearer $token")
            header("Idempotency-Key", UUID.randomUUID().toString())
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(orderRequest)
        }.andExpect { status { isCreated() } }

        assertEquals(2, orderRepository.count() - countBefore)
    }
}
