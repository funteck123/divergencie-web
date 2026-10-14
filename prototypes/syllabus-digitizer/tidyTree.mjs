// Removes booklet furniture that the digitizer reads as chapters (TKT-0350).
//  - The "Faculty feedback" / "Feedback from" testimonial at the back of many booklets.
//  - Computer Science 9618: the "3 Subject content" and "A Level content" wrappers and the "Teacher guidance"
//    pages after chapter 20. The real chapters (1 to 20) stay, in order.
const FEEDBACK = /^(faculty feedback|feedback from)\b/i;
const CS_9618_WRAPPER = /^(subject content|as level content|as content|a level content)$/i;

export function tidyTree(syllabus) {
  if (!syllabus || !Array.isArray(syllabus.tree)) return syllabus;
  let tree = syllabus.tree.filter((n) => !FEEDBACK.test(n.title || ""));
  if (syllabus.code === "9618") {
    const lastChapter = tree.reduce((last, n, i) => (/^\d+$/.test(n.code || "") && n.title !== "Subject content" ? i : last), -1);
    tree = tree.slice(0, lastChapter + 1).filter((n) => !CS_9618_WRAPPER.test(n.title || ""));
  }
  return { ...syllabus, tree, topics: Array.isArray(syllabus.topics) ? syllabus.topics.filter((n) => !FEEDBACK.test(n.title || "")) : syllabus.topics };
}
