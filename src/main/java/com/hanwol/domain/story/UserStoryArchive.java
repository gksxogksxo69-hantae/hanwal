package com.hanwol.domain.story;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 유저 스토리 도감 아카이브 엔티티 (JPA 버전)
 */
@Entity
@Table(name = "user_story_archive", 
       uniqueConstraints = {@UniqueConstraint(columnNames = {"userId", "storyId"})})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStoryArchive {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Integer storyId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime unlockedAt;

    @PrePersist
    protected void onCreate() {
        unlockedAt = LocalDateTime.now();
    }
}
