package com.hanwol.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/town")
    public String town() {
        return "town";
    }

    @GetMapping("/tutorial-cave")
    public String tutorialCave() {
        return "tutorial_cave";
    }

    @GetMapping("/stage-select")
    public String stageSelect() {
        return "stage_select";
    }

    @GetMapping("/battle")
    public String battle() {
        return "battle";
    }
}
