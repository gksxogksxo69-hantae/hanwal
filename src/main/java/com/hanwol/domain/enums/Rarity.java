package com.hanwol.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Rarity {
    S(0.002, "S"),      // 0.2%
    A(0.05, "A"),       // 5.0%
    B(0.30, "B"),       // 30.0%
    C(0.648, "C");      // 64.8%

    private final double probability;
    private final String code;

    public static Rarity getRandomRarity(double randomValue) {
        double cumulative = 0;
        for (Rarity r : Rarity.values()) {
            cumulative += r.probability;
            if (randomValue <= cumulative) {
                return r;
            }
        }
        return C;
    }
}
