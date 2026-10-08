/**
 * FlowFallbackService
 *
 * When a business uses a new/unverified phone number, Meta restricts sending
 * native WhatsApp Flows (interactive type:"flow"). This service replicates the
 * same data-collection experience by converting the Flow's field schema into a
 * sequential text-message conversation.
 *
 * The collected answers are stored in the conversation state under
 * `data.collectedDetails` in the same shape as if a FlowResponse was received,
 * so downstream handlers don't need to know which path was taken.
 */

export interface FlowField {
  id: string;
  label: string;         // Question to ask the user
  type?: string;         // text | number | email | phone | select | date | time | checkbox | rating
  required?: boolean;
  options?: string[];    // For select fields
  placeholder?: string;
}

export interface FallbackFlowState {
  fields: FlowField[];
  currentIndex: number;
  collected: Record<string, string>;
  /** Original flow ID for reference */
  flowId: string;
}

export class FlowFallbackService {
  /**
   * Convert a published Flow's `flowSchema` to a list of sequential fields.
   * Supports both our custom form schema and WhatsApp native flow schemas.
   */
  extractFields(flowSchema: Record<string, any>): FlowField[] {
    const fields: FlowField[] = [];

    // Our custom form builder schema: { fields: FormField[] }
    if (Array.isArray(flowSchema.fields)) {
      for (const f of flowSchema.fields) {
        if (!f.label) continue;
        fields.push({
          id: f.id ?? f.label.toLowerCase().replace(/\s+/g, "_"),
          label: this.buildQuestion(f),
          type: f.type ?? "text",
          required: f.required ?? false,
          options: f.options,
        });
      }
      return fields;
    }

    // WhatsApp native flow schema: screens[] -> { layout: { children: [] } }
    if (Array.isArray(flowSchema.screens)) {
      for (const screen of flowSchema.screens) {
        const children = screen.layout?.children ?? [];
        for (const child of this.flattenComponents(children)) {
          if (!child["label"] && !child["name"]) continue;
          const id = child["name"] ?? child["id"] ?? String(fields.length);
          const label = child["label"] ?? child["name"] ?? `Field ${id}`;
          fields.push({
            id,
            label: `${label}:`,
            type: this.mapNativeType(child["type"]),
            required: child["required"] ?? false,
          });
        }
      }
      return fields;
    }

    // Generic fallback: treat schema as a map of { fieldId: { label, type } }
    for (const [key, val] of Object.entries(flowSchema)) {
      if (typeof val === "object" && val !== null && "label" in val) {
        fields.push({
          id: key,
          label: (val as any).label + ":",
          type: (val as any).type ?? "text",
          required: (val as any).required ?? false,
        });
      }
    }

    return fields;
  }

  /**
   * Build the text question shown to the WhatsApp user.
   */
  buildQuestion(field: FlowField): string {
    let q = field.label ?? field.id;
    if (!q.endsWith("?") && !q.endsWith(":")) q += ":";

    if (field.type === "select" && field.options && field.options.length > 0) {
      const optionList = field.options
        .map((o, i) => `  ${i + 1}. ${o}`)
        .join("\n");
      q += `\n\n${optionList}\n\n_(Reply with a number or type your choice)_`;
    }

    if (!field.required) {
      q += " _(or type *skip*)_";
    }

    return q;
  }

  /**
   * Resolve a select answer: user may type "1", "2" or the actual option name.
   */
  resolveSelectAnswer(answer: string, options: string[]): string {
    const num = parseInt(answer.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1]!;
    }
    const match = options.find(
      (o) => o.toLowerCase() === answer.trim().toLowerCase()
    );
    return match ?? answer.trim();
  }

  /**
   * Format collected answers back to a flat key→value record (same shape as
   * a WhatsApp Flow nfm_reply response_json so downstream is identical).
   */
  formatResponse(
    fields: FlowField[],
    collected: Record<string, string>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const f of fields) {
      result[f.id] = collected[f.id] ?? "";
    }
    return result;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private flattenComponents(children: any[]): any[] {
    const result: any[] = [];
    for (const child of children) {
      if (child.type === "Form" || child.type === "Footer") {
        result.push(...this.flattenComponents(child.children ?? []));
      } else {
        result.push(child);
      }
    }
    return result;
  }

  private mapNativeType(type: string): string {
    const map: Record<string, string> = {
      TextInput: "text",
      TextArea: "textarea",
      DatePicker: "date",
      CheckboxGroup: "select",
      RadioButtonsGroup: "select",
      Dropdown: "select",
    };
    return map[type] ?? "text";
  }
}
