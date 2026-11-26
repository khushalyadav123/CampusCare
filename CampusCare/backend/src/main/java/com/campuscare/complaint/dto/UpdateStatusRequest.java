package com.campuscare.complaint.dto;

import com.campuscare.complaint.ComplaintStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(@NotNull ComplaintStatus status) {}
