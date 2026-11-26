package com.campuscare.auth;

public record SessionUser(Long id, String name, String email, UserRole role) {
    public static SessionUser from(UserAccount user) {
        return new SessionUser(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
