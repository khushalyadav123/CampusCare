package com.campuscare.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return AuthDtos.AuthResponse.from(authService.register(request));
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request, HttpServletRequest servletRequest) {
        UserAccount user = authService.login(request);
        HttpSession session = servletRequest.getSession(true);
        servletRequest.changeSessionId();
        session.setAttribute("campuscareUser", SessionUser.from(user));
        return AuthDtos.AuthResponse.from(user);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDtos.AuthResponse> currentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object value = session == null ? null : session.getAttribute("campuscareUser");
        if (!(value instanceof SessionUser user)) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(new AuthDtos.AuthResponse(user.id(), user.name(), user.email(), user.role()));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }

}
