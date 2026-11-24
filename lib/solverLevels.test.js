import test from "node:test";
import assert from "node:assert/strict";
import { subjectKeyOf, boardKeyOf, componentLevel, courseLevel, levelAllows, levelsFor, mergeLevels } from "./solverLevels.js";

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
    assert.equal(componentLevel("Paper 1: Pure Mathematics 1"), null); // no subject given: no table, no words in the name
  });
test("Computer Science: an AS student sees Paper 1 and 2 only, an A2 student sees all four", () => {
    const papers = ["Paper 1: Theory Fundamentals (AS Level)", "Paper 2: Fundamental Problem-solving and Programming Skills (AS Level)", "Paper 3: Advanced Theory (A Level)", "Paper 4: Further Problem-solving and Programming Skills (A Level)"];
    assert.deepEqual(papers.filter((p) => levelAllows(levelsFor("AS Level"), p)).map((p) => p.slice(0, 7)), ["Paper 1", "Paper 2"]);
    assert.equal(papers.filter((p) => levelAllows(levelsFor("A2 Level"), p)).length, 4);
    assert.equal(papers.filter((p) => levelAllows(levelsFor("A-Level"), p)).length, 4);
  });


test("the Cambridge paper table wins over the library's own labels", () => {
  // the library calls Physics Paper 3 "(A Level)", the syllabus makes it part of the AS
  assert.equal(componentLevel("Paper 3: Advanced Practical Skills (A Level)", "Physics"), "as");
  assert.equal(componentLevel("Paper 3: Advanced Practical Skills (A Level)", "Chemistry"), "as");
  assert.equal(componentLevel("Paper 3: Advanced Practical Skills (A Level)", "Biology"), "as");
  assert.equal(componentLevel("Paper 4: A Level Structured Questions (A Level)", "Physics"), "a2");
  assert.equal(componentLevel("Paper 5: Planning, Analysis and Evaluation (A Level)", "Biology"), "a2");
  // Mathematics has no level words in its names
  for (const [name, level] of [["Paper 1: Pure Mathematics 1", "as"], ["Paper 2: Pure Mathematics 2", "as"], ["Paper 3: Pure Mathematics 3", "a2"], ["Paper 4: Mechanics", "as"], ["Paper 5: Probability & Statistics 1", "as"], ["Paper 6: Probability & Statistics 2", "a2"]]) assert.equal(componentLevel(name, "Mathematics"), level, name);
  assert.equal(componentLevel("Paper 4: Practical Programming (A Level)", "Computer Science"), "a2");
  assert.equal(componentLevel("Component 1: Essay", "English General Paper"), null);
});

test("an AS student sees Physics Paper 1 to 3, an AS Mathematics student does not see Paper 3 or 6", () => {
  const as = levelsFor("AS Level");
  const ph = ["Paper 1: Multiple Choice (AS Level)", "Paper 2: AS Level Structured Questions", "Paper 3: Advanced Practical Skills (A Level)", "Paper 4: A Level Structured Questions (A Level)", "Paper 5: Planning, Analysis and Evaluation (A Level)"];
  assert.deepEqual(ph.filter((p) => levelAllows(as, p, "Physics")).map((p) => p.slice(0, 7)), ["Paper 1", "Paper 2", "Paper 3"]);
  const ma = ["Paper 1: Pure Mathematics 1", "Paper 2: Pure Mathematics 2", "Paper 3: Pure Mathematics 3", "Paper 4: Mechanics", "Paper 5: Probability & Statistics 1", "Paper 6: Probability & Statistics 2"];
  assert.deepEqual(ma.filter((p) => levelAllows(as, p, "Mathematics")).map((p) => p.slice(0, 7)), ["Paper 1", "Paper 2", "Paper 4", "Paper 5"]);
});

test("a Mathematics service named Pure 1 or Statistics 1 files under the library subject Mathematics", () => {
  assert.equal(subjectKeyOf("Mathematics: Pure 1"), "mathematics");
  assert.equal(subjectKeyOf("Mathematics: Statistics 2"), "mathematics");
  assert.equal(subjectKeyOf("Mathematics"), "mathematics");
  assert.equal(subjectKeyOf("Further Mathematics"), "further mathematics");
  assert.equal(subjectKeyOf("Information & Communication Technology"), "ict");
});
