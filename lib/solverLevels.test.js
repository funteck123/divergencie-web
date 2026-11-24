import test from "node:test";
import assert from "node:assert/strict";
import { boardKeyOf, componentLevel, courseLevel, levelAllows, levelsFor, mergeLevels } from "./solverLevels.js";

test("files AS, A2 and A-Level courses under the A Levels board", () => {
    for (const c of ["AS Level", "AS Levels", "A2 Level", "A2 Levels", "A-Level", "A Level", "A Level "]) assert.equal(boardKeyOf(c), "a levels");
    assert.equal(boardKeyOf("IGCSE"), "igcse");
  });
test("reads the level of a course", () => {
    assert.equal(courseLevel("AS Level"), "as");
    assert.equal(courseLevel("A2 Levels"), "a2");
    assert.equal(courseLevel("A-Level"), "all");
    assert.equal(courseLevel("IGCSE"), "all");
    assert.equal(courseLevel(""), "all");
  });
test("gives an AS course only AS papers, an A2 course AS and A2, an older A-Level course everything", () => {
    assert.deepEqual([...levelsFor("AS Level")], ["as"]);
    assert.deepEqual([...levelsFor("A2 Level")].sort(), ["a2", "as"]);
    assert.deepEqual([...levelsFor("A-Level")], ["all"]);
  });
test("merges the levels of two services for the same subject", () => {
    assert.deepEqual([...mergeLevels(levelsFor("AS Level"), levelsFor("A2 Level"))].sort(), ["a2", "as"]);
    assert.deepEqual([...mergeLevels(levelsFor("AS Level"), levelsFor("A-Level"))], ["all"]);
  });
test("reads the level of a paper group from its name, as the real library writes it", () => {
    assert.equal(componentLevel("Paper 1: Theory Fundamentals (AS Level)"), "as");
    assert.equal(componentLevel("Paper 2: Fundamental Problem-solving and Programming Skills (AS Level)"), "as");
    assert.equal(componentLevel("Paper 2: AS Level Structured Questions"), "as");
    assert.equal(componentLevel("Paper 3: Advanced Theory (A Level)"), "a2");
    assert.equal(componentLevel("Paper 4: A Level Structured Questions (A Level)"), "a2");
    assert.equal(componentLevel("Paper 1: Pure Mathematics 1"), null);
  });
test("Computer Science: an AS student sees Paper 1 and 2 only, an A2 student sees all four", () => {
    const papers = ["Paper 1: Theory Fundamentals (AS Level)", "Paper 2: Fundamental Problem-solving and Programming Skills (AS Level)", "Paper 3: Advanced Theory (A Level)", "Paper 4: Further Problem-solving and Programming Skills (A Level)"];
    assert.deepEqual(papers.filter((p) => levelAllows(levelsFor("AS Level"), p)).map((p) => p.slice(0, 7)), ["Paper 1", "Paper 2"]);
    assert.equal(papers.filter((p) => levelAllows(levelsFor("A2 Level"), p)).length, 4);
    assert.equal(papers.filter((p) => levelAllows(levelsFor("A-Level"), p)).length, 4);
  });

