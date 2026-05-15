import type { ChecklistTemplateDefinition, VerticalKey } from "@operationhub/shared";

export const verticalMeta: Record<
  VerticalKey,
  { title: string; accent: string; summary: string }
> = {
  fire: {
    title: "FireOps",
    accent: "#b42318",
    summary: "Daily and weekly fire safety inspections with evidence capture."
  },
  parking: {
    title: "ParkOps",
    accent: "#175cd3",
    summary: "Patrol rounds, bay checks, signage issues, and enforcement tasks."
  },
  pool: {
    title: "PoolOps",
    accent: "#0e7490",
    summary: "Water chemistry, filter checks, and facility safety rounds."
  }
};

export const verticalTemplates: ChecklistTemplateDefinition[] = [
  {
    vertical: "fire",
    name: "Daily Extinguisher Inspection",
    description: "Pressure, seal, signage, and access checks for fire extinguishers.",
    category: "fire-safety",
    recurrence: "0 8 * * *",
    items: [
      { key: "pressure_ok", label: "Pressure gauge in green zone", type: "checkbox", required: true },
      { key: "seal_intact", label: "Tamper seal intact", type: "checkbox", required: true },
      { key: "location_clear", label: "Access path clear", type: "checkbox", required: true },
      { key: "photo", label: "Gauge photo", type: "photo", required: true }
    ]
  },
  {
    vertical: "fire",
    name: "Emergency Exit Route Check",
    description: "Verify exits are unlocked, lit, and unobstructed.",
    category: "fire-safety",
    recurrence: "0 7 * * *",
    items: [
      { key: "doors_clear", label: "Exit doors unobstructed", type: "checkbox", required: true },
      { key: "lights_working", label: "Emergency lights working", type: "checkbox", required: true },
      { key: "notes", label: "Observations", type: "text" }
    ]
  },
  {
    vertical: "parking",
    name: "Morning Parking Patrol",
    description: "Patrol entry points, signage, and disabled access bays.",
    category: "parking",
    recurrence: "0 6 * * *",
    items: [
      { key: "barrier_operational", label: "Barrier operational", type: "checkbox", required: true },
      { key: "signage_visible", label: "Signage visible", type: "checkbox", required: true },
      { key: "disabled_bays_clear", label: "Disabled bays available", type: "checkbox", required: true },
      { key: "incident_photo", label: "Incident photo if issue found", type: "photo" }
    ]
  },
  {
    vertical: "parking",
    name: "EV Charger Readiness Check",
    description: "Check charger health and cable condition.",
    category: "parking",
    recurrence: "0 9 * * *",
    items: [
      { key: "charger_status", label: "Charger status", type: "choice", required: true, options: ["available", "fault", "offline"] },
      { key: "cable_condition", label: "Cable condition notes", type: "text", required: true }
    ]
  },
  {
    vertical: "pool",
    name: "Water Quality Test",
    description: "Capture key chemistry metrics and flag deviations.",
    category: "pool-safety",
    recurrence: "0 9,14,18 * * *",
    items: [
      { key: "ph", label: "pH Level", type: "number", required: true },
      { key: "chlorine", label: "Chlorine ppm", type: "number", required: true },
      { key: "temperature", label: "Water temperature C", type: "number", required: true },
      { key: "photo", label: "Test strip photo", type: "photo" }
    ]
  },
  {
    vertical: "pool",
    name: "Poolside Safety Walk",
    description: "Check slip hazards, signage, and lifeguard equipment.",
    category: "pool-safety",
    recurrence: "0 10 * * *",
    items: [
      { key: "deck_dry", label: "Deck free from slip hazards", type: "checkbox", required: true },
      { key: "signage_visible", label: "Safety signage visible", type: "checkbox", required: true },
      { key: "rescue_kit_ready", label: "Rescue kit ready", type: "checkbox", required: true }
    ]
  }
];
