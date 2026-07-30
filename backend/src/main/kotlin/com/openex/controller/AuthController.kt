package com.openex.controller

import com.openex.dto.AuthResponse
import com.openex.dto.LoginRequest
import com.openex.dto.RegisterRequest
import com.openex.entity.Account
import com.openex.entity.User
import com.openex.repository.AccountRepository
import com.openex.repository.UserRepository
import com.openex.security.JwtUtil
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val accountRepository: AccountRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtUtil: JwtUtil
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody req: RegisterRequest): ResponseEntity<AuthResponse> {
        if (userRepository.existsByEmail(req.email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build()
        }

        val user = userRepository.save(
            User(email = req.email, passwordHash = passwordEncoder.encode(req.password))
        )

        // Every new trader starts with a USD and a BTC account, both at zero balance.
        accountRepository.save(Account(userId = user.id, currency = "USD"))
        accountRepository.save(Account(userId = user.id, currency = "BTC"))

        val token = jwtUtil.generateToken(user.id.toString(), user.email)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(AuthResponse(token, user.id.toString(), user.email))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody req: LoginRequest): ResponseEntity<AuthResponse> {
        val user = userRepository.findByEmail(req.email)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        if (!passwordEncoder.matches(req.password, user.passwordHash)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val token = jwtUtil.generateToken(user.id.toString(), user.email)
        return ResponseEntity.ok(AuthResponse(token, user.id.toString(), user.email))
    }
}
