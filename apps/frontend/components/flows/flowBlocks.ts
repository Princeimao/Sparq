/** All pre-built field blocks available in the flow builder */
export const PRESET_FIELD_BLOCKS = [
  {
    id: "name",
    type: "text",
    label: "Full Name",
    placeholder: "Enter your full name",
    required: true,
  },
  {
    id: "phone",
    type: "phone",
    label: "Phone Number",
    placeholder: "+91 9876543210",
    required: true,
  },
  {
    id: "email",
    type: "email",
    label: "Email Address",
    placeholder: "you@example.com",
    required: false,
  },
  {
    id: "address_line1",
    type: "text",
    label: "Street Address",
    placeholder: "Building, Street, Area",
    required: true,
  },
  {
    id: "city",
    type: "text",
    label: "City",
    placeholder: "e.g. Mumbai",
    required: true,
  },
  {
    id: "state",
    type: "text",
    label: "State",
    placeholder: "e.g. Maharashtra",
    required: true,
  },
  {
    id: "pincode",
    type: "text",
    label: "Pincode / ZIP",
    placeholder: "400001",
    required: true,
  },
  {
    id: "preferred_date",
    type: "date",
    label: "Preferred Date",
    placeholder: "YYYY-MM-DD",
    required: true,
  },
  {
    id: "preferred_time",
    type: "time",
    label: "Preferred Time",
    placeholder: "10:00 AM",
    required: true,
  },
  {
    id: "party_size",
    type: "number",
    label: "Number of Guests",
    placeholder: "e.g. 4",
    required: true,
  },
  {
    id: "notes",
    type: "textarea",
    label: "Additional Notes",
    placeholder: "Any special requests or preferences",
    required: false,
  },
  {
    id: "gender",
    type: "select",
    label: "Gender",
    required: false,
    options: ["Male", "Female", "Prefer not to say"],
  },
  {
    id: "age",
    type: "number",
    label: "Age",
    placeholder: "e.g. 30",
    required: false,
  },
  {
    id: "custom_text",
    type: "text",
    label: "Custom Text Field",
    placeholder: "Your answer",
    required: false,
  },
] as const;

export type PresetBlock = (typeof PRESET_FIELD_BLOCKS)[number];

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  phone: "Phone",
  email: "Email",
  number: "Number",
  date: "Date",
  time: "Time",
  textarea: "Long Text",
  select: "Dropdown",
};

export const BLOCK_TYPE_ICONS: Record<string, string> = {
  text: "T",
  phone: "📞",
  email: "✉️",
  number: "#",
  date: "📅",
  time: "⏰",
  textarea: "📝",
  select: "▾",
};
