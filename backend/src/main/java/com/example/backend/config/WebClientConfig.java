package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

/**
 * WebClient configuration for connecting to the AI Server (FastAPI RAG
 * Backend).
 * 
 * Configures timeouts, buffer sizes, and base URL for all internal HTTP calls.
 */
@Configuration
public class WebClientConfig {

        @Value("${ai-server.base-url}")
        private String aiServerBaseUrl;

        @Value("${ai-server.timeout}")
        private int timeout;

        @Bean
        public WebClient aiServerWebClient() {
                HttpClient httpClient = HttpClient.create()
                                .responseTimeout(Duration.ofMillis(timeout));

                // Increase buffer size for large RAG responses (16 MB)
                ExchangeStrategies strategies = ExchangeStrategies.builder()
                                .codecs(configurer -> configurer
                                                .defaultCodecs()
                                                .maxInMemorySize(16 * 1024 * 1024))
                                .build();

                return WebClient.builder()
                                .baseUrl(aiServerBaseUrl)
                                .clientConnector(new ReactorClientHttpConnector(httpClient))
                                .exchangeStrategies(strategies)
                                .defaultHeader("Content-Type", "application/json")
                                .build();
        }
}
