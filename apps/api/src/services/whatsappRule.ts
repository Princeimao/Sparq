export const hasBusinessIntend = (message: string) => {
  const ACTION_KEYWORDS = [
    "order",
    "book",
    "appointment",
    "cancel",
    "reorder",
    "track",
    "status",
    "reserve",
    "table",
    "buy",
    "purchase",
  ];

  const normalized = message.toLowerCase();

  return ACTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
};
