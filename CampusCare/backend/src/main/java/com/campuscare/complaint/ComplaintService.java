package com.campuscare.complaint;

import com.campuscare.auth.SessionUser;
import com.campuscare.auth.UserRole;
import com.campuscare.complaint.dto.CreateComplaintRequest;
import com.campuscare.complaint.dto.UpdateStatusRequest;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Objects;

@Service
public class ComplaintService {
    private final ComplaintRepository repository;

    public ComplaintService(ComplaintRepository repository) {
        this.repository = repository;
    }

    public Page<Complaint> findAll(String search, String category, String status, int page, int size, SessionUser user) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Specification<Complaint> spec = (root, query, cb) -> cb.conjunction();
        if (user.role() != UserRole.ADMIN) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("ownerId"), user.id()));
        }

        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern),
                    cb.like(cb.lower(root.get("location")), pattern),
                    cb.like(cb.lower(root.get("submittedBy")), pattern)
            ));
        }
        if (category != null && !category.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        }
        if (status != null && !status.isBlank()) {
            ComplaintStatus parsed = parseStatus(status);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), parsed));
        }

        return repository.findAll(spec, PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
    }


    public java.util.Map<String, Long> getStats(SessionUser user) {
        long total = user.role() == UserRole.ADMIN
                ? repository.count()
                : repository.countByOwnerId(user.id());
        long pending = count(user, ComplaintStatus.PENDING);
        long inProgress = count(user, ComplaintStatus.IN_PROGRESS);
        long resolved = count(user, ComplaintStatus.RESOLVED);
        return java.util.Map.of(
                "total", total,
                "pending", pending,
                "inProgress", inProgress,
                "resolved", resolved
        );
    }

    public Complaint findById(@NonNull Long id, SessionUser user) {
        Complaint complaint = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Complaint " + id + " was not found"));
        if (user.role() != UserRole.ADMIN && !user.id().equals(complaint.getOwnerId())) {
            throw new EntityNotFoundException("Complaint " + id + " was not found");
        }
        return complaint;
    }

    @Transactional
    public Complaint create(CreateComplaintRequest request, SessionUser user) {
        String category = request.category().trim();
        if (!Categories.ALL.contains(category)) {
            throw new IllegalArgumentException("Please choose a valid complaint category");
        }
        Complaint complaint = new Complaint();
        complaint.setTitle(request.title().trim());
        complaint.setDescription(request.description().trim());
        complaint.setCategory(category);
        complaint.setLocation(request.location().trim());
        complaint.setSubmittedBy(user.name());
        complaint.setOwnerId(user.id());
        complaint.setStatus(ComplaintStatus.PENDING);
        return repository.save(complaint);
    }

    @Transactional
    public Complaint updateStatus(@NonNull Long id, UpdateStatusRequest request, SessionUser user) {
        Complaint complaint = findById(id, user);
        complaint.setStatus(request.status());
        return repository.save(complaint);
    }

    public void delete(@NonNull Long id, SessionUser user) {
        Complaint complaint = Objects.requireNonNull(findById(id, user));
        repository.delete(complaint);
    }

    private ComplaintStatus parseStatus(String status) {
        try {
            return ComplaintStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Status must be PENDING, IN_PROGRESS, or RESOLVED");
        }
    }

    private long count(SessionUser user, ComplaintStatus status) {
        return user.role() == UserRole.ADMIN
                ? repository.countByStatus(status)
                : repository.countByOwnerIdAndStatus(user.id(), status);
    }
}
