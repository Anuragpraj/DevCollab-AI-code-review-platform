package com.devcollab.config;

import com.devcollab.entity.CodeReview;
import com.devcollab.entity.User;
import com.devcollab.repository.CodeReviewRepository;
import com.devcollab.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CodeReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail("demo@devcollab.io")) {
            return; // Already seeded
        }

        log.info("Seeding demo data...");

        User demoUser = User.builder()
                .username("demouser")
                .email("demo@devcollab.io")
                .password(passwordEncoder.encode("demo1234"))
                .fullName("Demo User")
                .role(User.Role.DEVELOPER)
                .build();
        userRepository.save(demoUser);

        User alice = User.builder()
                .username("alice_dev")
                .email("alice@devcollab.io")
                .password(passwordEncoder.encode("demo1234"))
                .fullName("Alice Johnson")
                .role(User.Role.REVIEWER)
                .build();
        userRepository.save(alice);

        // Sample Java code review
        CodeReview javaReview = CodeReview.builder()
                .title("User authentication service - login method")
                .description("Please review this authentication logic for security issues")
                .codeContent("""
                public String login(String username, String password) {
                    String query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
                    ResultSet rs = db.execute(query);
                    if (rs.next()) {
                        return generateToken(username);
                    }
                    return null;
                }
                """)
                .language("Java")
                .author(demoUser)
                .status(CodeReview.ReviewStatus.PENDING)
                .build();
        reviewRepository.save(javaReview);

        // Sample JavaScript review
        CodeReview jsReview = CodeReview.builder()
                .title("React component - fetch user data")
                .description("Check if this React hook follows best practices")
                .codeContent("""
                function UserProfile({ userId }) {
                    const [user, setUser] = useState(null);
                    
                    useEffect(() => {
                        fetch(`/api/users/${userId}`)
                            .then(res => res.json())
                            .then(data => setUser(data));
                    }, []);
                    
                    return <div>{user.name}</div>;
                }
                """)
                .language("JavaScript")
                .author(alice)
                .status(CodeReview.ReviewStatus.PENDING)
                .build();
        reviewRepository.save(jsReview);

        log.info("Demo data seeded successfully. Login: demo@devcollab.io / demo1234");
    }
}
