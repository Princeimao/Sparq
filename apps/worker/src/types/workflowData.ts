export interface WorkflowData {
  productIds?: string[];
  selectedProductId?: string;
  serviceIds?: string[];
  selectedServiceId?: string;
  quantity?: number;
  customerId?: string;
  addressId?: string;
  appointmentId?: string;
  reservationId?: string;
  orderId?: string;
  notes?: string;
  /** The SaaS user/org ID who owns this conversation */
  userId?: string;
  /** Extra structured data (dates, times, party sizes, etc.) */
  metadata?: Record<string, unknown>;
  /** Step-by-step field definitions for sequential detail collection */
  detailFields?: Array<{ id: string; label: string; required?: boolean }>;
  /** Current index into detailFields */
  detailIndex?: number;
  /** Answers collected so far, keyed by field id */
  collectedDetails?: Record<string, string>;
  /** Validated pending address text */
  pendingAddress?: string;
  /** True when the user is providing a replacement shipping address */
  changingAddress?: boolean;
  /** Home-visit vs in-business choice for BOTH-mode services */
  locationChoice?: "AT_BUSINESS" | "AT_CUSTOMER";
  /** Visit address collected fresh for this booking (never auto-filled) */
  visitAddress?: { line1?: string; city?: string; pincode?: string; landmark?: string };
  visitAddressId?: string;
  selectedStaffId?: string;
  /** Assignment + eligibility resolved during the flow */
  assignmentMode?: "CUSTOMER_CHOICE" | "BUSINESS_ASSIGN" | "AUTO" | "SINGLE";
  eligibleStaffIds?: string[];
  linkedResourceIds?: string[];
  /** Allocated table for reservation flows */
  tableId?: string;
  tableName?: string;
}
