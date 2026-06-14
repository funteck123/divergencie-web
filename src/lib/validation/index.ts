import { z } from "zod";

// User & Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Ticket validation schemas
export const createTicketSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  body: z.string().min(10, "Body must be at least 10 characters"),
  ticketTypeId: z.string().cuid("Invalid ticket type ID"),
});

// CalendarItem validation schemas
export const calendarItemSchema = z.object({
  entityType: z.enum([
    "ACADEMIC_SESSION",
    "MEETING",
    "AMBASSADOR_MEETING",
    "GENERAL_MEETING",
    "TASK_DUE",
    "MOCK",
    "SKILL_CHECK",
    "EXAM"
  ]),
  entityId: z.string().min(1, "Entity ID is required"),
  startTime: z.string().datetime("Start time must be a valid ISO string"),
  endTime: z.string().datetime("End time must be a valid ISO string"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  colour: z.string().nullable().optional(),
  status: z.string().min(1, "Status is required"),
});

export const updateCalendarItemSchema = calendarItemSchema.partial().extend({
  id: z.string().cuid("Invalid calendar item ID"),
});
