package com.devcollab;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "openrouter.api-key=test-key",
    "jwt.secret=test-secret-key-that-is-long-enough-for-hmac-256"
})
class DevCollabApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring Boot context starts without errors
    }
}
