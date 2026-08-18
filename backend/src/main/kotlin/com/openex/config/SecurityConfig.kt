package com.openex.config
import com.openex.security.JwtAuthFilter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class SecurityConfig(
    private val jwtAuthFilter: JwtAuthFilter
) {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val frontendOrigin = System.getenv("FRONTEND_ORIGIN")
        val origins = mutableListOf("http://localhost:*")
        if (!frontendOrigin.isNullOrBlank()) {
            origins.add(frontendOrigin)
        }
        val config = CorsConfiguration().apply {
            allowedOriginPatterns = origins
            allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
        }
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            cors { configurationSource = corsConfigurationSource() }
            csrf { disable() }
            sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
            authorizeHttpRequests {
                authorize("/api/health", permitAll)
                authorize("/api/auth/**", permitAll)   // register/login are public
                authorize("/ws/**", permitAll)         // WebSocket handshake — order book is public market data
                authorize("/api/orderbook/**", permitAll) // REST snapshot — same public market data, just pull instead of push
                authorize(anyRequest, authenticated)   // everything else needs a valid JWT
            }
        }
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
        return http.build()
    }
}