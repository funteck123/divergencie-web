// TKT-0420: the saved-copy steps of the Question Solver proxy (app/api/mcq/[...path]/route.js), kept here so the route's own change stays small.
// The route passes in its own enrollment helpers, so who may open what is decided in exactly one place.
import { loadCacheIndex, loadCachedPaper } from "./solverCache.js";
import { SOURCE_HEADER, cachedIdSet, cachedLibrary, markCached, mayOpenCached, savedPaperReply } from "./solverCacheCore.js";

export { liveFailed } from "./solverCacheCore.js";
export const FROM_CACHE = { headers: { [SOURCE_HEADER]: "cache" } };
/** Management can ask for the saved copy on purpose (header x-solver-source: cache), to check it. */
export const forcedCache = (req, session) => session.userType === "Management" && req.headers.get("x-solver-source") === "cache";

export function savedCopies({ enrolledSubjectKeys, filterLibraryByEnrollment, subjectMatchKey }) {
  return {
    /** The library of saved papers, narrowed to the person's subjects. null when there is no saved copy. */
    async library(session) {
      const index = await loadCacheIndex();
      if (!index) return null;
      const lib = cachedLibrary(index);
      return session.userType === "Management" ? lib : filterLibraryByEnrollment(lib, await enrolledSubjectKeys(session.userId));
    },
    /** The stored reply for the worksheet named in a fetch-and-digitize request body, or null. */
    async paper(session, bodyText) {
      let qpId = null;
      try {
        qpId = JSON.parse(bodyText)?.qpId;
      } catch {
        return null;
      }
      const index = await loadCacheIndex();
      const entry = index?.papers?.[qpId];
      if (!entry) return null;
      const allowed = session.userType === "Management" ? null : await enrolledSubjectKeys(session.userId);
      if (!mayOpenCached(entry, allowed, subjectMatchKey)) return null;
      return savedPaperReply(await loadCachedPaper(qpId));
    },
    /** The live library with cached: true on papers that have a saved copy. Any problem returns the library unchanged. */
    async mark(library) {
      try {
        return markCached(library, cachedIdSet(await loadCacheIndex()));
      } catch {
        return library;
      }
    },
  };
}
