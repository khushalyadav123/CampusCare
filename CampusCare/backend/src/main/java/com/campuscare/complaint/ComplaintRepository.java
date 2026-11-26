package com.campuscare.complaint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {
    long countByStatus(ComplaintStatus status);
    long countByOwnerId(Long ownerId);
    long countByOwnerIdAndStatus(Long ownerId, ComplaintStatus status);
}
