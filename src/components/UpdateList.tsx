import { useState } from "react";
import { PanelSection, PanelSectionRow, DropdownItem, ButtonItem, Focusable } from "@decky/ui";
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

const INITIAL_COUNT = 10;
const PAGE_SIZE = 20;

// Pending updates, gaming-relevant ones first (the backend sorts them that
// way) with a category chip. Rows are Focusable so the D-pad walks the list
// and scrolls it; the list grows in pages so a 200-package sync never dumps
// everything into the QAM at once.
export function UpdateList({ updates, filter, onFilterChange }: UpdateListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const shown = filter === "gaming" ? updates.filter((u) => u.relevant) : updates;
  const visible = shown.slice(0, visibleCount);
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
          <Focusable
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              padding: "5px 8px",
              borderRadius: theme.radius.md,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
              <span
                style={{
                  fontSize: theme.fontSize.body,
                  color: u.relevant ? theme.text.primary : theme.text.secondary,
                  fontWeight: u.relevant ? 600 : 400,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.name}
              </span>
              {u.relevant && u.category && <StatusBadge text={CATEGORY_LABELS[u.category] ?? u.category} />}
            </div>
            <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.muted, overflowWrap: "anywhere" }}>
              {u.old_version} → {u.new_version}
              {u.download_size ? ` · ${formatBytes(u.download_size)}` : ""}
              {u.repo ? ` · ${u.repo}` : ""}
            </div>
          </Focusable>
        </PanelSectionRow>
      ))}
      {hidden > 0 && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, hidden)} more ({hidden} hidden)
          </ButtonItem>
        </PanelSectionRow>
      )}
      {hidden === 0 && shown.length > INITIAL_COUNT && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setVisibleCount(INITIAL_COUNT)}>
            Show fewer
          </ButtonItem>
        </PanelSectionRow>
      )}
    </PanelSection>
  );
}
