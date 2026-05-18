package com.example.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "clauses")
public class Clause {

    @Id
    private String id;

    @Indexed
    private String lawId;

    private String chapter;
    
    private String section;

    private String articleNo;
    
    private String clauseNo;

    private String text;

    private String vectorId;
}
