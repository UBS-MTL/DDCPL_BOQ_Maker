import { z } from "zod";

export const STATUSES = [
  "draft",
  "internal_review",
  "approved",
  "sent",
  "follow_up",
  "negotiation",
  "won",
  "lost",
  "expired",
  "cancelled",
  "rejected", // legacy status from seed data
] as const;

export const USER_ROLES = ["admin", "sales_person", "user"] as const;

const dateString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional().nullable(),
  password: z.string().min(6).max(200),
  role: z.enum(USER_ROLES).default("sales_person"),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  password: z.string().min(6).max(200).optional(),
  role: z.enum(USER_ROLES).optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  // empty string would violate the unique constraint on second blank-SKU product — store null instead
  sku: z.string().trim().max(100).optional().nullable().transform((v) => (v === "" ? null : v)),
  brand: z.string().trim().max(200).optional().nullable(),
  modelNumber: z.string().trim().max(200).optional().nullable(),
  specifications: z.string().max(4000).optional().nullable(),
  subCategory: z.string().trim().max(200).optional().nullable(),
  costPrice: z.coerce.number().nonnegative().max(100000000).optional().nullable(),
  unit: z.string().trim().min(1).max(50).default("nos"),
  rate: z.coerce.number().nonnegative().max(100000000),
  gstRate: z.coerce.number().min(0).max(100).default(18),
  hsnCode: z.string().trim().max(50).optional().nullable(),
  image: z.string().max(500).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
  categoryId: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(200),
  icon: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(300),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(300).optional().nullable(),
  address: z.string().max(2000).optional().nullable(),
  gstNumber: z.string().trim().max(50).optional().nullable(),
});

export const verticalSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

export const solutionSchema = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  verticalId: z.string().min(1),
});

export const packageItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive().max(1000000).default(1),
  rate: z.coerce.number().nonnegative().max(100000000),
  discount: z.coerce.number().min(0).max(100).default(0),
});

export const packageSchema = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  solutionId: z.string().min(1),
  basePrice: z.coerce.number().nonnegative().max(100000000).default(0),
  isActive: z.coerce.boolean().default(true),
  items: z.array(packageItemSchema).max(200).default([]),
});

export const quoteItemSchema = z.object({
  productId: z.string().optional().nullable(),
  solutionId: z.string().optional().nullable(),
  itemType: z.enum(["ITEM", "SECTION", "CUSTOM"]).default("ITEM"),
  description: z.string().trim().min(1).max(4000),
  brand: z.string().trim().max(200).optional().nullable(),
  modelNumber: z.string().trim().max(200).optional().nullable(),
  specifications: z.string().max(4000).optional().nullable(),
  hsnCode: z.string().trim().max(50).optional().nullable(),
  unit: z.string().trim().min(1).max(50).default("nos"),
  quantity: z.coerce.number().positive().max(1000000),
  rate: z.coerce.number().nonnegative().max(100000000),
  discount: z.coerce.number().min(0).max(100).default(0),
  gstRate: z.coerce.number().min(0).max(100).default(18),
  installationRate: z.coerce.number().nonnegative().max(100000000).default(0),
  isOptional: z.coerce.boolean().default(false),
});

export const quotationSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(STATUSES).default("draft"),
  validTill: dateString,
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.coerce.number().nonnegative().max(100000000).default(0),
  additionalCharges: z.coerce.number().nonnegative().max(100000000).default(0),
  shippingCharges: z.coerce.number().nonnegative().max(100000000).default(0),
  installationCharge: z.coerce.number().nonnegative().max(100000000).default(0),
  taxExcluded: z.coerce.boolean().default(false),
  notes: z.string().max(10000).optional().nullable(),
  terms: z.string().max(10000).optional().nullable(),
  rejectionReason: z.string().max(2000).optional().nullable(),
  projectName: z.string().trim().max(300).optional().nullable(),
  projectRef: z.string().trim().max(200).optional().nullable(),
  siteAddress: z.string().max(2000).optional().nullable(),
  contactPerson: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().max(200).optional().nullable(),
  preparedBy: z.string().trim().max(200).optional().nullable(),
  paymentTerms: z.string().max(2000).optional().nullable(),
  deliveryTimeline: z.string().max(500).optional().nullable(),
  warranty: z.string().max(2000).optional().nullable(),
  installationScope: z.string().max(2000).optional().nullable(),
  exclusions: z.string().max(4000).optional().nullable(),
  assumptions: z.string().max(4000).optional().nullable(),
  technicalNotes: z.string().max(4000).optional().nullable(),
  authorizedSignatory: z.string().trim().max(200).optional().nullable(),
  followUpDate: dateString,
  responseDeadline: dateString,
  customerId: z.string().min(1),
  userId: z.string().optional(),
  revision: z.coerce.number().int().min(1).max(9999).optional(),
  items: z.array(quoteItemSchema).max(500).default([]),
});

export const statusUpdateSchema = z.object({
  status: z.enum(STATUSES),
  rejectionReason: z.string().max(2000).optional().nullable(),
  newRevision: z.coerce.boolean().default(false),
});

export const settingsUpdateSchema = z.object({
  companyName: z.string().trim().min(1).max(300).optional(),
  address: z.string().max(1000).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  gstNumber: z.string().trim().max(50).optional().nullable(),
  panNumber: z.string().trim().max(50).optional().nullable(),
  cinNumber: z.string().trim().max(50).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  instagramUrl: z.string().trim().max(300).optional().nullable(),
  linkedinUrl: z.string().trim().max(300).optional().nullable(),
  bankName: z.string().trim().max(200).optional().nullable(),
  bankAccountName: z.string().trim().max(200).optional().nullable(),
  bankAccountNumber: z.string().trim().max(50).optional().nullable(),
  bankIfsc: z.string().trim().max(50).optional().nullable(),
  bankBranch: z.string().trim().max(200).optional().nullable(),
  bankUpiId: z.string().trim().max(100).optional().nullable(),
  bankQrPath: z.string().trim().max(500).optional().nullable(),
  logoPath: z.string().max(500).optional().nullable(),
  signaturePath: z.string().max(500).optional().nullable(),
  currency: z.string().trim().min(1).max(10).optional(),
  locale: z.string().trim().max(20).optional(),
  defaultGstRate: z.coerce.number().min(0).max(100).optional(),
  defaultValidityDays: z.coerce.number().int().min(1).max(3650).optional(),
  defaultTerms: z.string().max(10000).optional().nullable(),
  defaultNotes: z.string().max(10000).optional().nullable(),
  quoteNumberPrefix: z.string().trim().min(1).max(10).optional(),
  reminderDays: z.string().max(100).optional(),
  requireApproval: z.coerce.boolean().optional(),
  includeCertificates: z.coerce.boolean().optional(),
});

export const importProductsSchema = z.object({
  products: z.array(productSchema).min(1).max(1000),
});

export function parseOr400<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { data: z.infer<T> } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const msg = first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid input";
    return { error: msg };
  }
  return { data: result.data };
}
