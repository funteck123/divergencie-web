// 26 Nov 2026 (TKT-0450 follow-up, outage report): the question search index is built and searched in this worker thread, never on the server's main thread.
// Building it takes 20 to 90 seconds (19,000 texts); on the main thread that froze the whole service, every other request timed out, and the supervisor then
// killed the tunnel over and over. The main thread now only asks this worker for answers.
import { parentPort, workerData } from "node:worker_threads";
import fs from "node:fs";
import { buildIndex, search } from "./searchIndex.mjs";

let index = null;
parentPort.on("message", (m) => {
  try {
    if (m.type === "build") {
      const where = new Map(m.where); // qpId -> { component, msId, title }
      const entries = [];
      for (const paper of JSON.parse(fs.readFileSync(workerData.textPath, "utf8"))) {
        const w = where.get(paper.qpId);
        if (!w) continue; // a paper that is not in the library picker is left out, so every hit can be opened
        for (const [questionNumber, text] of Object.entries(paper.questions)) {
          if (text.trim().length < 25) continue; // a bare number or a picture-only question has nothing to search
          entries.push({ id: `${paper.qpId}:${questionNumber}`, text, also: `${w.title} ${w.component}`, qpId: paper.qpId, msId: w.msId, board: paper.board, subject: paper.subject, component: w.component, title: w.title, questionNumber, structured: paper.kind === "structured" });
        }
      }
      index = buildIndex(entries);
      parentPort.postMessage({ type: "ready", key: m.key, docs: index.docs.length });
    } else if (m.type === "search") {
      const f = m.filter || {};
      const filter = f.board || f.subject ? (d) => (!f.board || d.board === f.board) && (!f.subject || d.subject === f.subject) : undefined;
      parentPort.postMessage({ type: "result", id: m.id, body: search(index, m.q, { limit: m.limit, filter }) });
    }
  } catch (e) {
    parentPort.postMessage({ type: "error", id: m.id, key: m.key, message: String(e && e.message || e) });
  }
});
