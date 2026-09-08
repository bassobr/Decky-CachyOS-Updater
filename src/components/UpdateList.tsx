import { useState } from "react";
import { PanelSection, PanelSectionRow, DropdownItem, ButtonItem } from "@decky/ui";
import type { UpdateEntry } from "../types";
import { CATEGORY_LABELS } from "../types";
import { StatusBadge } from "./StatusBadge";
import { theme } from "../theme";
import { formatBytes } from "../utils";

interface UpdateListProps {
  updates: UpdateEntry[];
  filter: string; // "all" | "gaming"
  onFilterChange: (mode: string) => void;
}

const FILTER_OPTIONS = [
  { data: "all", label: "All packages" },
  { data: "gaming", label: "Gaming-relevant only" },
];

const COLLAPSED_COUNT = 10;

// Pending updates, gaming-relevant ones first (the backend sorts them that
// way) with a category chip. Collapsed to a handful of rows by default so
// a 200-package sync doesn't turn the QAM into an endless scroll.
export function UpdateList({ updates, filter, onFilterChange }: UpdateListProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = filter === "gaming" ? updates.filter((u) => u.relevant) : updates;
  const visible = expanded ? shown : shown.slice(0, COLLAPSED_COUNT);
  const hidden = shown.length - visible.length;

  return (
    <PanelSection title={`Pending updates (${updates.length})`}>
      <PanelSectionRow>
        <DropdownItem
          label="Show"
          rgOptions={FILTER_OPTIONS}
          selectedOption={filter === "gaming" ? "gaming" : "all"}
          onChange={(option: { data: string }) => onFilterChange(option.data)}
        />
      </PanelSectionRow>
      {shown.length === 0 && (
        <PanelSectionRow>
          <div style={{ fontSize: theme.fontSize.small, color: theme.text.subtitle }}>
            No gaming-relevant packages in this batch.
          </div>
        </PanelSectionRow>
      )}
      {visible.map((u) => (
        <PanelSectionRow key={u.name}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              padding: "4px 0",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
              <span
                style={{
                  fontSize: theme.fontSize.body,
                  color: u.relevant ? theme.text.primary : theme.text.secondary,
                  fontWeight: u.relevant ? 600 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.name}
              </span>
              {u.relevant && u.category && (
                <StatusBadge badge="active" text={CATEGORY_LABELS[u.category] ?? u.category} />
              )}
            </div>
            <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.muted }}>
              {u.old_version} → {u.new_version}
              {u.download_size ? ` · ${formatBytes(u.download_size)}` : ""}
              {u.repo ? ` · ${u.repo}` : ""}
            </div>
          </div>
        </PanelSectionRow>
      ))}
      {(hidden > 0 || expanded) && shown.length > COLLAPSED_COUNT && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show fewer" : `Show all (${hidden} more)`}
          </ButtonItem>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}
