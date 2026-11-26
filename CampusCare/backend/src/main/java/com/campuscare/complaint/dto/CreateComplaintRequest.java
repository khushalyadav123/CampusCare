package com.campuscare.complaint.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateComplaintRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String description,
        @NotBlank String category,
        @NotBlank @Size(max = 180) String location
) {}
