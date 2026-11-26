package com.campuscare.complaint;

import java.util.List;

public final class Categories {
    private Categories() {}
    public static final List<String> ALL = List.of(
            "Classroom", "Cleanliness", "Wi-Fi / Internet", "Water Supply",
            "Electricity", "Library", "Washroom", "Other"
    );
}
