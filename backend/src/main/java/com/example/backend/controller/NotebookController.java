package com.example.backend.controller;

import com.example.backend.dto.request.NotebookRequest;
import com.example.backend.dto.response.ApiResponse;
import com.example.backend.entity.Message;
import com.example.backend.entity.Notebook;
import com.example.backend.security.CustomUserDetails;
import com.example.backend.service.NotebookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notebooks")
@RequiredArgsConstructor
public class NotebookController {

    private final NotebookService notebookService;

    @GetMapping
    public ApiResponse<List<Notebook>> getNotebooks(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(notebookService.getUserNotebooks(userDetails.getId()));
    }

    @PostMapping
    public ApiResponse<Notebook> createNotebook(@AuthenticationPrincipal CustomUserDetails userDetails,
                                                @Valid @RequestBody NotebookRequest request) {
        return ApiResponse.success(notebookService.createNotebook(userDetails.getId(), request));
    }

    @PutMapping("/{id}")
    public ApiResponse<Notebook> updateNotebook(@PathVariable String id,
                                                @AuthenticationPrincipal CustomUserDetails userDetails,
                                                @Valid @RequestBody NotebookRequest request) {
        return ApiResponse.success(notebookService.updateNotebook(id, userDetails.getId(), request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteNotebook(@PathVariable String id,
                                              @AuthenticationPrincipal CustomUserDetails userDetails) {
        notebookService.deleteNotebook(id, userDetails.getId());
        return ApiResponse.success("Notebook deleted");
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<List<Message>> getMessages(@PathVariable String id,
                                                  @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(notebookService.getNotebookMessages(id, userDetails.getId()));
    }

    @DeleteMapping("/{id}/messages")
    public ApiResponse<String> deleteMessages(@PathVariable String id,
                                              @AuthenticationPrincipal CustomUserDetails userDetails) {
        notebookService.deleteNotebookMessages(id, userDetails.getId());
        return ApiResponse.success("Messages deleted");
    }

    @GetMapping("/{id}/suggestions")
    public ApiResponse<List<String>> getSuggestions(@PathVariable String id,
                                                    @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(notebookService.getSuggestions(id, userDetails.getId()));
    }
}
