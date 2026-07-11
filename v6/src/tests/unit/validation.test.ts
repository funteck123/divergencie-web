import { describe, it, expect } from "vitest";
import { loginSchema, createTicketSchema, calendarItemSchema } from "@/lib/validation";

describe("Input Validation Schemas", () => {
  describe("loginSchema", () => {
    it("validates correct email and password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "securepassword",
      });
      expect(result.success).toBe(true);
    });

    it("fails on invalid email", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "securepassword",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
      }
    });

    it("fails on short password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toBeDefined();
      }
    });
  });

  describe("createTicketSchema", () => {
    it("validates correct ticket data", () => {
      const result = createTicketSchema.safeParse({
        title: "Subject change request",
        body: "I would like to change my subject from Chemistry to Physics.",
        ticketTypeId: "cuid123456789012345678901234",
      });
      expect(result.success).toBe(true);
    });

    it("fails on short title or body", () => {
      const result = createTicketSchema.safeParse({
        title: "Hi",
        body: "Short",
        ticketTypeId: "cuid123456789012345678901234",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
        expect(result.error.flatten().fieldErrors.body).toBeDefined();
      }
    });
  });

  describe("calendarItemSchema", () => {
    it("validates correct calendar item data", () => {
      const result = calendarItemSchema.safeParse({
        entityType: "ACADEMIC_SESSION",
        entityId: "session-1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        title: "Chemistry Tutorial",
        colour: "#4a9fd4",
        status: "SCHEDULED",
      });
      expect(result.success).toBe(true);
    });

    it("fails on invalid entityType", () => {
      const result = calendarItemSchema.safeParse({
        entityType: "INVALID_TYPE",
        entityId: "session-1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        title: "Chemistry Tutorial",
        status: "SCHEDULED",
      });
      expect(result.success).toBe(false);
    });
  });
});
