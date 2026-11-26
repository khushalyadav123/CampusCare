package com.campuscare.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotNull UserRole role,
            String adminRegistrationCode) {}

    public record LoginRequest(
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank String password) {}

    public record AuthResponse(Long id, String name, String email, UserRole role) {
        public static AuthResponse from(UserAccount user) {
            return new AuthResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
        }
    }
}
