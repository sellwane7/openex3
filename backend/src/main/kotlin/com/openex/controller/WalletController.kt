package com.openex.controller

import com.openex.dto.BalanceResponse
import com.openex.dto.DepositRequest
import com.openex.repository.AccountRepository
import com.openex.service.LedgerService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/wallets")
class WalletController(
    private val accountRepository: AccountRepository,
    private val ledgerService: LedgerService
) {

    // System faucet accounts seeded by V2__seed_faucet_account.sql
    private val faucetAccounts = mapOf(
        "USD" to UUID.fromString("00000000-0000-0000-0000-0000000000f1"),
        "BTC" to UUID.fromString("00000000-0000-0000-0000-0000000000f2")
    )

    @GetMapping
    fun getBalances(authentication: Authentication): ResponseEntity<List<BalanceResponse>> {
        val userId = UUID.fromString(authentication.principal as String)
        val accounts = accountRepository.findAllByUserId(userId)
        val balances = accounts.map { BalanceResponse(it.currency, ledgerService.getBalance(it.id)) }
        return ResponseEntity.ok(balances)
    }

    @PostMapping("/deposit")
    fun deposit(
        authentication: Authentication,
        @Valid @RequestBody req: DepositRequest
    ): ResponseEntity<BalanceResponse> {
        val userId = UUID.fromString(authentication.principal as String)
        val currency = req.currency.uppercase()

        val faucetAccountId = faucetAccounts[currency]
            ?: return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()

        val userAccount = accountRepository.findByUserIdAndCurrency(userId, currency)
            ?: return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()

        // Deposits are still double-entry: the faucet account is debited,
        // the user's account is credited, by the same amount.
        ledgerService.transfer(
            fromAccountId = faucetAccountId,
            toAccountId = userAccount.id,
            amount = req.amount
        )

        val newBalance = ledgerService.getBalance(userAccount.id)
        return ResponseEntity.ok(BalanceResponse(currency, newBalance))
    }
}
