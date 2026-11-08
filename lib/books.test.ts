import { describe, expect, it } from "vitest";
import { canOpenBook, cleanBook, enrolledSubjectCodes, visibleBooks } from "./books";

const book = (id: string, code: string, o: Record<string, unknown> = {}) => ({ BookID: id, Title: `Book ${id}`, SubjectCode: code, Subject: "Subject", Level: "IGCSE", Pages: 120, SizeMB: 12.34, HasCover: true, Rights: "bought for the class", ...o });
const BOOKS = [book("a".repeat(12), "0500"), book("b".repeat(12), "0625"), book("c".repeat(12), "0500", { Hidden: true })];
const db = {
  services: [{ ServiceID: "S-ENG", Name: "Cambridge IGCSE 0500 First Language English" }, { ServiceID: "S-PHY", Name: "IGCSE Physics", SubjectCode: "0625" }],
  enrollments: [
    { UserID: "STU-1", ServiceID: "S-ENG", StartDate: "2026-07-01" },
    { UserID: "STU-2", ServiceID: "S-PHY" },
    { UserID: "STU-3", ServiceID: "S-ENG", EndDate: "2026-09-01" },
    { UserID: "STU-4", ServiceID: "S-ENG", StartDate: "2027-01-01" },
  ],
};
const stu = (id: string) => ({ userId: id, userType: "Student" });
const TODAY = "2026-11-08";
const ids = (list: { BookID: string }[]) => list.map((b) => b.BookID[0]);

describe("cleanBook", () => {
  it("keeps the fields and rounds the size", () => expect(cleanBook(book("a".repeat(12), "0500"))).toMatchObject({ BookID: "a".repeat(12), SubjectCode: "0500", SizeMB: 12.3, Pages: 120, HasCover: true }));
  it("refuses a bad id, an empty title, or a subject code that is not four digits", () => {
    expect(cleanBook(book("short", "0500"))).toBeNull();
    expect(cleanBook(book("a".repeat(12), "0500", { Title: "  " }))).toBeNull();
    expect(cleanBook(book("a".repeat(12), "05"))).toBeNull();
    expect(cleanBook(null)).toBeNull();
  });
  it("turns nonsense numbers into 0", () => expect(cleanBook(book("a".repeat(12), "0500", { Pages: "x", SizeMB: -4 }))).toMatchObject({ Pages: 0, SizeMB: 0 }));
});

describe("who sees which book", () => {
  it("Management sees every book, hidden ones and the Rights note included", () => {
    const list = visibleBooks(db, { userId: "M", userType: "Management" }, BOOKS, TODAY);
    expect(ids(list)).toEqual(["a", "b", "c"]);
    expect(list[0]!.Rights).toBe("bought for the class");
  });
  it("a student sees only books of subjects they are enrolled in now, never hidden ones, and never the Rights note", () => {
    const list = visibleBooks(db, stu("STU-1"), BOOKS, TODAY);
    expect(ids(list)).toEqual(["a"]);
    expect("Rights" in list[0]!).toBe(false);
    expect(ids(visibleBooks(db, stu("STU-2"), BOOKS, TODAY))).toEqual(["b"]);
  });
  it("an ended or not yet started enrollment shows nothing", () => {
    expect(visibleBooks(db, stu("STU-3"), BOOKS, TODAY)).toEqual([]);
    expect(visibleBooks(db, stu("STU-4"), BOOKS, TODAY)).toEqual([]);
  });
  it("a student with no enrollment, a teacher and a signed-out visitor see nothing", () => {
    expect(visibleBooks(db, stu("STU-9"), BOOKS, TODAY)).toEqual([]);
    expect(visibleBooks(db, { userId: "T", userType: "Teacher" }, BOOKS, TODAY)).toEqual([]);
    expect(visibleBooks(db, undefined, BOOKS, TODAY)).toEqual([]);
  });
  it("the subject code comes from the service's code or from the four digits in its name", () => expect([...enrolledSubjectCodes(db, "STU-2", TODAY)]).toEqual(["0625"]));
  it("a student cannot open a book by guessing its id", () => {
    expect(canOpenBook(db, stu("STU-1"), BOOKS, "a".repeat(12), TODAY)).toBe(true);
    expect(canOpenBook(db, stu("STU-1"), BOOKS, "b".repeat(12), TODAY)).toBe(false);
    expect(canOpenBook(db, stu("STU-1"), BOOKS, "c".repeat(12), TODAY)).toBe(false);
    expect(canOpenBook(db, stu("STU-1"), BOOKS, "zzzzzzzzzzzz", TODAY)).toBe(false);
  });
});
