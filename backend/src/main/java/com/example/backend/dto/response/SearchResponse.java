package com.example.backend.dto.response;

import com.example.backend.entity.Message;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SearchResponse {
    private String answer;
    private List<Message.Citation> citations;
}
