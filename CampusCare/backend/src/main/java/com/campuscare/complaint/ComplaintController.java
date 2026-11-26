package com.campuscare.complaint;

import com.campuscare.auth.SessionUser;
import com.campuscare.auth.UserRole;
import com.campuscare.complaint.dto.CreateComplaintRequest;
import com.campuscare.complaint.dto.UpdateStatusRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {
    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @GetMapping
    public Page<Complaint> getAll(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            HttpServletRequest request) {
        return service.findAll(search, category, status, page, size, currentUser(request));
    }

    @GetMapping("/stats")
    public java.util.Map<String, Long> getStats(HttpServletRequest request) {
        return service.getStats(currentUser(request));
    }

    @GetMapping("/{id}")
    public Complaint getById(@PathVariable @NonNull Long id, HttpServletRequest request) {
        return service.findById(id, currentUser(request));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Complaint create(@Valid @RequestBody CreateComplaintRequest request, HttpServletRequest servletRequest) {
        SessionUser user = currentUser(servletRequest);
        if (user.role() != UserRole.STUDENT) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Students can submit complaints");
        return service.create(request, user);
    }

    @PatchMapping("/{id}/status")
    public Complaint updateStatus(@PathVariable @NonNull Long id, @Valid @RequestBody UpdateStatusRequest request, HttpServletRequest servletRequest) {
        return service.updateStatus(id, request, requireAdmin(servletRequest));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @NonNull Long id, HttpServletRequest request) {
        service.delete(id, requireAdmin(request));
    }

    private SessionUser currentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object user = session == null ? null : session.getAttribute("campuscareUser");
        if (user instanceof SessionUser sessionUser) return sessionUser;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in");
    }

    private SessionUser requireAdmin(HttpServletRequest request) {
        SessionUser user = currentUser(request);
        if (user.role() != UserRole.ADMIN) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        return user;
    }
}
