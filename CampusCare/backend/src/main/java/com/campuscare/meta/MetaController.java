package com.campuscare.meta;

import com.campuscare.complaint.Categories;
import com.campuscare.complaint.ComplaintStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/meta")
public class MetaController {
    @GetMapping("/categories")
    public List<String> categories() {
        return Categories.ALL;
    }

    @GetMapping("/statuses")
    public List<String> statuses() {
        return Arrays.stream(ComplaintStatus.values()).map(Enum::name).toList();
    }
}
