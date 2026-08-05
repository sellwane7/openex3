package com.openex

import com.fasterxml.jackson.databind.ObjectMapper
import com.openex.dto.DepositRequest
import com.openex.dto.LoginRequest
import com.openex.dto.RegisterRequest
import com.openex.entity.Account
import com.openex.repository.AccountRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndWalletTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var objectMapper: ObjectMapper
    @Autowired lateinit var accountRepository: AccountRepository

    private val faucetUsdId = UUID.fromString("00000000-0000-0000-0000-0000000000f1")

    @BeforeEach
    fun seedFaucet() {
        // In production Flyway seeds this (V2 migration). H2 tests use ddl-auto,
        // so we seed the same fixed faucet account id here for consistency.
        if (accountRepository.findById(faucetUsdId).isEmpty) {
            accountRepository.save(Account(id = faucetUsdId, userId = UUID.randomUUID(), currency = "USD"))
        }
    }

    @Test
    fun `register, login, and deposit correctly updates the ledger-backed balance`() {
        val email = "trader-${UUID.randomUUID()}@openex.test"

        // 1. Register
        val registerResult = mockMvc.post("/api/auth/register") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(RegisterRequest(email, "supersecret1"))
        }.andExpect { status { isCreated() } }.andReturn()

        // 2. Login
        val loginResult = mockMvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(LoginRequest(email, "supersecret1"))
        }.andExpect { status { isOk() } }.andReturn()

        val loginBody = objectMapper.readTree(loginResult.response.contentAsString)
        val token = loginBody.get("token").asText()

        // 3. Deposit 250 USD using the JWT from login
        mockMvc.post("/api/wallets/deposit") {
            header("Authorization", "Bearer $token")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(DepositRequest("USD", BigDecimal("250.00")))
        }.andExpect {
            status { isOk() }
            jsonPath("$.currency") { value("USD") }
            jsonPath("$.balance") { value(250.0) }
        }

        // 4. Confirm balance persists when re-queried
        val walletsResult = mockMvc.get("/api/wallets") {
            header("Authorization", "Bearer $token")
        }.andExpect { status { isOk() } }.andReturn()

        val wallets = objectMapper.readTree(walletsResult.response.contentAsString)
        val usdWallet = wallets.first { it.get("currency").asText() == "USD" }
        val usdBalance = BigDecimal(usdWallet.get("balance").asText())

        assertEquals(0, BigDecimal("250.00").compareTo(usdBalance))
    }

    @Test
    fun `deposit without a JWT is rejected`() {
        mockMvc.post("/api/wallets/deposit") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(DepositRequest("USD", BigDecimal("10.00")))
        }.andExpect { status { isForbidden() } }
    }
}
