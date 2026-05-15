package com.kairos;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// Full app + Flyway + RLS smoke tests; skipped when Docker is unavailable (see @EnabledIf).
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIf("com.kairos.KairosApplicationTests#isDockerAvailable")
class KairosApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void redisOff(DynamicPropertyRegistry r) {
        // Point Redis at a closed port; filters fail open if Redis errors.
        r.add("spring.data.redis.host", () -> "localhost");
        r.add("spring.data.redis.port", () -> "16399");
    }

    @LocalServerPort int port;
    @Autowired TestRestTemplate http;

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void dashboardSummaryReturnsSeededObjectives() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Workspace-Id", "11111111-1111-1111-1111-111111111111");
        headers.set("X-User-Id", "user_demo");

        ResponseEntity<Map> res = http.exchange(
            "http://localhost:" + port + "/api/v1/dashboard/summary",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            Map.class
        );

        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> body = res.getBody();
        assertThat(body).isNotNull();
        assertThat(((Number) body.get("totalObjectives")).intValue()).isEqualTo(3);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rlsHidesDataFromOtherTenant() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Workspace-Id", "22222222-2222-2222-2222-222222222222");

        ResponseEntity<Map> res = http.exchange(
            "http://localhost:" + port + "/api/v1/dashboard/summary",
            HttpMethod.GET,
            new HttpEntity<>(headers),
            Map.class
        );

        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(((Number) res.getBody().get("totalObjectives")).intValue()).isEqualTo(0);
    }

    @SuppressWarnings("unused")
    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }
}
