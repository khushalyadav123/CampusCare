package com.campuscare.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class AuthService {
    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final String adminRegistrationCode;

    public AuthService(
            UserAccountRepository users,
            @Value("${campuscare.admin-registration-code:}") String adminRegistrationCode) {
        this.users = users;
        this.adminRegistrationCode = adminRegistrationCode;
    }

    @Transactional
    public UserAccount register(AuthDtos.RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        if (request.role() == UserRole.ADMIN &&
                (adminRegistrationCode.isBlank() || !adminRegistrationCode.equals(request.adminRegistrationCode()))) {
            throw new IllegalArgumentException("A valid admin registration code is required");
        }

        return users.save(new UserAccount(
                request.name().trim(),
                email,
                passwordEncoder.encode(request.password()),
                request.role()));
    }

    public UserAccount login(AuthDtos.LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        UserAccount user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect"));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect");
        }
        return user;
    }
}
