package com.hanwol.dto.map;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MapSyncRequest {
    private int x;
    private int y;
    private long timestamp;
}
