"use client";

import { useState } from "react";
import type { ItemOption, LineItem, Project, Section } from "@/lib/types";
import { lineTotal, money, parseProductLink, uid } from "@/lib/format";
import {
  OPTION_LIBRARY,
  homeDepotSearchUrl,
  matchLibrary,
} from "@/lib/research";
import { MoneyInput, NumInput, TextInput } from "./inputs";

type Update = (fn: (prev: Project) => Project) => void;

const UNITS = [
  "ea",
  "sq ft",
  "lin ft",
  "sheet",
  "bundle",
  "roll",
  "bag",
  "box",
  "gal",
  "cu yd",
  "set",
  "lot",
  "kit",
  "ton",
  "bath",
  "mo",
  "pull",
  "system",
  "16-ft board",
  "per sheet",
];

export function SheetTable({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const patchSection = (sid: string, fn: (s: Section) => Section) =>
    update((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === sid ? fn(s) : s)),
    }));

  const patchItem = (sid: string, iid: string, fn: (i: LineItem) => LineItem) =>
    patchSection(sid, (s) => ({
      ...s,
      items: s.items.map((i) => (i.id === iid ? fn(i) : i)),
    }));

  const moveSection = (sid: string, dir: -1 | 1) =>
    update((p) => {
      const idx = p.sections.findIndex((s) => s.id === sid);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= p.sections.length) return p;
      const sections = [...p.sections];
      [sections[idx], sections[to]] = [sections[to], sections[idx]];
      return { ...p, sections };
    });

  const moveItem = (sid: string, iid: string, dir: -1 | 1) =>
    patchSection(sid, (s) => {
      const idx = s.items.findIndex((i) => i.id === iid);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= s.items.length) return s;
      const items = [...s.items];
      [items[idx], items[to]] = [items[to], items[idx]];
      return { ...s, items };
    });

  const addSection = () =>
    update((p) => ({
      ...p,
      sections: [...p.sections, { id: uid(), name: "New section", items: [] }],
    }));

  return (
    <div className="grid gap-4">
      {project.sections.map((sec, sIdx) => (
        <SectionBlock
          key={sec.id}
          section={sec}
          index={sIdx}
          isFirst={sIdx === 0}
          isLast={sIdx === project.sections.length - 1}
          onPatchSection={(fn) => patchSection(sec.id, fn)}
          onPatchItem={(iid, fn) => patchItem(sec.id, iid, fn)}
          onMoveSection={(dir) => moveSection(sec.id, dir)}
          onMoveItem={(iid, dir) => moveItem(sec.id, iid, dir)}
          onDeleteSection={() =>
            update((p) => ({
              ...p,
              sections: p.sections.filter((s) => s.id !== sec.id),
            }))
          }
        />
      ))}
      <button className="btn w-full" onClick={addSection}>
        + Add section
      </button>
    </div>
  );
}

function SectionBlock({
  section,
  index,
  isFirst,
  isLast,
  onPatchSection,
  onPatchItem,
  onMoveSection,
  onMoveItem,
  onDeleteSection,
}: {
  section: Section;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onPatchSection: (fn: (s: Section) => Section) => void;
  onPatchItem: (iid: string, fn: (i: LineItem) => LineItem) => void;
  onMoveSection: (dir: -1 | 1) => void;
  onMoveItem: (iid: string, dir: -1 | 1) => void;
  onDeleteSection: () => void;
}) {
  const [pasteText, setPasteText] = useState("");
  const secTotal = section.items.reduce((a, i) => a + (lineTotal(i) ?? 0), 0);
  const collapsed = !!section.collapsed;

  const addItemFromPaste = () => {
    const raw = pasteText.trim();
    if (!raw) return;
    const parsed = parseProductLink(raw);
    const optId = uid();
    const item: LineItem = parsed
      ? {
          id: uid(),
          name: parsed.title || "New item",
          qty: 1,
          unit: "ea",
          options: [
            {
              id: optId,
              label: parsed.store,
              url: parsed.url,
              unitPrice: null,
            },
          ],
          activeOptionId: optId,
          done: false,
        }
      : {
          id: uid(),
          name: raw,
          qty: 1,
          unit: "ea",
          options: [{ id: optId, label: "", url: "", unitPrice: null }],
          activeOptionId: optId,
          done: false,
        };
    onPatchSection((s) => ({ ...s, items: [...s.items, item] }));
    setPasteText("");
  };

  return (
    <section className="panel bg-paper">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b bg-ink px-3 py-2 text-paper">
        <button
          className="font-mono text-xs text-paper/60 hover:text-paper"
          onClick={() => onPatchSection((s) => ({ ...s, collapsed: !collapsed }))}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span className="microlabel !text-paper/50 tnum">
          S{String(index + 1).padStart(2, "0")}
        </span>
        <HeaderName
          value={section.name}
          onCommit={(v) => onPatchSection((s) => ({ ...s, name: v }))}
        />
        <span className="microlabel !text-paper/50 tnum hidden sm:inline">
          {section.items.length} items
        </span>
        <span className="tnum ml-auto font-mono text-sm">{money(secTotal)}</span>
        <div className="ml-2 flex items-center gap-1 border-l border-paper/20 pl-2">
          <button
            className="px-1 font-mono text-[0.625rem] text-paper/50 hover:text-paper disabled:opacity-20"
            disabled={isFirst}
            onClick={() => onMoveSection(-1)}
            title="Move section up"
          >
            ▲
          </button>
          <button
            className="px-1 font-mono text-[0.625rem] text-paper/50 hover:text-paper disabled:opacity-20"
            disabled={isLast}
            onClick={() => onMoveSection(1)}
            title="Move section down"
          >
            ▼
          </button>
          <button
            className="px-1 font-mono text-xs text-paper/50 hover:text-paper"
            onClick={() => {
              if (
                section.items.length === 0 ||
                confirm(`Delete section "${section.name}" and its ${section.items.length} items?`)
              )
                onDeleteSection();
            }}
            title="Delete section"
          >
            ✕
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Column headings */}
            <div className="grid grid-cols-[28px_1fr_64px_84px_96px_104px_72px_56px] items-center gap-1 border-b px-2 py-1.5">
              <span />
              <span className="microlabel">Item</span>
              <span className="microlabel text-right">Qty</span>
              <span className="microlabel">Unit</span>
              <span className="microlabel text-right">@ Price</span>
              <span className="microlabel text-right">Total</span>
              <span className="microlabel text-center">Options</span>
              <span />
            </div>

            {section.items.map((item, iIdx) => (
              <ItemRow
                key={item.id}
                item={item}
                isFirst={iIdx === 0}
                isLast={iIdx === section.items.length - 1}
                onPatch={(fn) => onPatchItem(item.id, fn)}
                onMove={(dir) => onMoveItem(item.id, dir)}
                onDelete={() =>
                  onPatchSection((s) => ({
                    ...s,
                    items: s.items.filter((i) => i.id !== item.id),
                  }))
                }
              />
            ))}

            {/* Paste-to-add row */}
            <div className="flex items-center gap-2 px-2 py-2">
              <span className="microlabel shrink-0">+</span>
              <input
                className="field field-quiet flex-1 font-mono text-xs"
                placeholder="Paste a Home Depot link (or type an item name) and hit Enter…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItemFromPaste()}
                onPaste={(e) => {
                  const txt = e.clipboardData.getData("text");
                  if (/^https?:\/\//i.test(txt.trim())) {
                    e.preventDefault();
                    setPasteText(txt);
                    // let state settle, then add
                    setTimeout(() => {
                      setPasteText("");
                      const parsed = parseProductLink(txt);
                      const optId = uid();
                      onPatchSection((s) => ({
                        ...s,
                        items: [
                          ...s.items,
                          {
                            id: uid(),
                            name: parsed?.title || "New item",
                            qty: 1,
                            unit: "ea",
                            options: [
                              {
                                id: optId,
                                label: parsed?.store ?? "",
                                url: parsed?.url ?? txt.trim(),
                                unitPrice: null,
                              },
                            ],
                            activeOptionId: optId,
                            done: false,
                          },
                        ],
                      }));
                    }, 0);
                  }
                }}
              />
              <button className="btn btn-xs btn-ghost" onClick={addItemFromPaste}>
                Add item
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Editable section title that stays legible on the black header bar. */
function HeaderName({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      className="min-w-0 flex-shrink bg-transparent font-display text-xs uppercase tracking-[0.08em] text-paper outline-none placeholder:text-paper/40"
      style={{ width: `${Math.max((text ?? value).length + 2, 10)}ch` }}
      value={text ?? value}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null && text.trim()) onCommit(text.trim());
        setText(null);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

function ItemRow({
  item,
  isFirst,
  isLast,
  onPatch,
  onMove,
  onDelete,
}: {
  item: LineItem;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (fn: (i: LineItem) => LineItem) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active =
    item.options.find((o) => o.id === item.activeOptionId) ?? item.options[0];
  const total = lineTotal(item);
  const extraOptions = item.options.length - 1;

  const patchOption = (oid: string, fn: (o: ItemOption) => ItemOption) =>
    onPatch((i) => ({
      ...i,
      options: i.options.map((o) => (o.id === oid ? fn(o) : o)),
    }));

  const addOption = () => {
    const id = uid();
    onPatch((i) => ({
      ...i,
      options: [...i.options, { id, label: "", url: "", unitPrice: null }],
    }));
    setOpen(true);
  };

  return (
    <div className={`border-b last:border-b-0 ${item.done ? "bg-paper-2" : ""}`}>
      <div className="grid grid-cols-[28px_1fr_64px_84px_96px_104px_72px_56px] items-center gap-1 px-2 py-1">
        <input
          type="checkbox"
          className="checkbox justify-self-center"
          checked={item.done}
          onChange={(e) => onPatch((i) => ({ ...i, done: e.target.checked }))}
          title="Mark as handled"
        />
        <div className="min-w-0">
          <TextInput
            value={item.name}
            onCommit={(v) => onPatch((i) => ({ ...i, name: v }))}
            className={`field-quiet w-full text-[0.8125rem] font-medium ${
              item.done ? "text-mute line-through" : ""
            }`}
            placeholder="Item name"
          />
          {active?.url ? (
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              className="ml-1 block truncate font-mono text-[0.625rem] text-mute hover:text-ink hover:underline"
              title={active.url}
            >
              ↗ {active.label || active.url.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : active?.label ? (
            <span className="ml-1 block truncate font-mono text-[0.625rem] text-mute">
              {active.label}
            </span>
          ) : null}
        </div>
        <NumInput
          value={item.qty}
          onCommit={(v) => onPatch((i) => ({ ...i, qty: v }))}
          className="field-quiet text-right text-xs"
        />
        <select
          className="field field-quiet font-mono text-[0.6875rem]"
          value={UNITS.includes(item.unit) ? item.unit : "__custom"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom") {
              const custom = prompt("Custom unit:", item.unit);
              if (custom) onPatch((i) => ({ ...i, unit: custom }));
            } else onPatch((i) => ({ ...i, unit: v }));
          }}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
          {!UNITS.includes(item.unit) && (
            <option value="__custom">{item.unit}</option>
          )}
          {UNITS.includes(item.unit) && <option value="__custom">custom…</option>}
        </select>
        <MoneyInput
          value={active?.unitPrice ?? null}
          onCommit={(v) =>
            active && patchOption(active.id, (o) => ({ ...o, unitPrice: v }))
          }
          className="field-quiet text-right text-xs"
        />
        <span
          className={`tnum pr-1 text-right font-mono text-[0.8125rem] ${
            total === null ? "text-mute" : ""
          }`}
        >
          {total === null ? "· · ·" : money(total)}
        </span>
        <button
          className={`btn btn-xs justify-self-center ${
            extraOptions > 0 ? "" : "btn-ghost"
          }`}
          onClick={() => setOpen(!open)}
          title="Product options & links"
        >
          {extraOptions > 0 ? `${item.options.length}▾` : open ? "▴" : "link▾"}
        </button>
        <div className="flex items-center justify-end gap-0.5">
          <button
            className="px-0.5 font-mono text-[0.625rem] text-mute hover:text-ink disabled:opacity-20"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            title="Move up"
          >
            ▲
          </button>
          <button
            className="px-0.5 font-mono text-[0.625rem] text-mute hover:text-ink disabled:opacity-20"
            disabled={isLast}
            onClick={() => onMove(1)}
            title="Move down"
          >
            ▼
          </button>
          <button
            className="px-0.5 font-mono text-xs text-mute hover:text-ink"
            onClick={onDelete}
            title="Delete item"
          >
            ✕
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-dashed bg-paper-2/60 px-3 py-2 pl-9">
          <p className="microlabel mb-1.5">
            Product options — the selected one is priced into the quote
          </p>
          <div className="grid gap-1">
            {item.options.map((opt) => (
              <OptionRow
                key={opt.id}
                option={opt}
                isActive={opt.id === (item.activeOptionId ?? item.options[0]?.id)}
                canDelete={item.options.length > 1}
                itemQty={item.qty}
                onSelect={() =>
                  onPatch((i) => ({ ...i, activeOptionId: opt.id }))
                }
                onPatch={(fn) => patchOption(opt.id, fn)}
                onDelete={() =>
                  onPatch((i) => {
                    const options = i.options.filter((o) => o.id !== opt.id);
                    return {
                      ...i,
                      options,
                      activeOptionId:
                        i.activeOptionId === opt.id
                          ? (options[0]?.id ?? null)
                          : i.activeOptionId,
                    };
                  })
                }
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button className="btn btn-xs" onClick={addOption}>
              + Add alternative (compare products)
            </button>
            <TierLibraryPicker
              itemName={item.name}
              onInsert={(opts) =>
                onPatch((i) => {
                  // Drop the starter blank option if it's still untouched.
                  const keep = i.options.filter(
                    (o) => o.label || o.url || o.unitPrice !== null,
                  );
                  const options = [...keep, ...opts];
                  return {
                    ...i,
                    options,
                    activeOptionId:
                      keep.find((o) => o.id === i.activeOptionId)?.id ??
                      options[0].id,
                  };
                })
              }
            />
            <TextInput
              value={item.note ?? ""}
              onCommit={(v) => onPatch((i) => ({ ...i, note: v || undefined }))}
              placeholder="Item note (shows on the printed sheet)…"
              className="field-quiet min-w-52 flex-1 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inserts researched material tiers (laminate → LVP → hardwood → marble…)
 * as ready-made options. Prices prefill at the mid of the researched range,
 * flagged as estimates; links go to a Home Depot search for that product.
 */
function TierLibraryPicker({
  itemName,
  onInsert,
}: {
  itemName: string;
  onInsert: (opts: ItemOption[]) => void;
}) {
  const suggested = matchLibrary(itemName);
  const entries = suggested
    ? [suggested, ...OPTION_LIBRARY.filter((e) => e !== suggested)]
    : OPTION_LIBRARY;

  return (
    <select
      className="field field-quiet w-56 font-mono text-[0.6875rem]"
      value=""
      onChange={(e) => {
        const entry = OPTION_LIBRARY.find((x) => x.item === e.target.value);
        if (!entry) return;
        onInsert(
          entry.options.map((o) => {
            const mid = Math.round(((o.lowUSD + o.highUSD) / 2) * 100) / 100;
            return {
              id: uid(),
              label: o.laborIncluded ? `${o.name} (installed price)` : o.name,
              url: o.homeDepotSearch ? homeDepotSearchUrl(o.homeDepotSearch) : "",
              unitPrice: mid,
              note: `typ. $${o.lowUSD}–$${o.highUSD}/${entry.unit} — est., verify at store`,
            };
          }),
        );
      }}
    >
      <option value="" disabled>
        ⊞ Insert researched tiers…
      </option>
      {entries.map((entry) => (
        <option key={entry.item} value={entry.item}>
          {entry.item}
          {entry === suggested ? " ← suggested" : ""} ({entry.options.length}{" "}
          tiers)
        </option>
      ))}
    </select>
  );
}

function OptionRow({
  option,
  isActive,
  canDelete,
  itemQty,
  onSelect,
  onPatch,
  onDelete,
}: {
  option: ItemOption;
  isActive: boolean;
  canDelete: boolean;
  itemQty: number;
  onSelect: () => void;
  onPatch: (fn: (o: ItemOption) => ItemOption) => void;
  onDelete: () => void;
}) {
  const commitUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onPatch((o) => ({ ...o, url: "" }));
      return;
    }
    const parsed = parseProductLink(trimmed);
    onPatch((o) => ({
      ...o,
      url: parsed?.url ?? trimmed,
      // Fill an empty label from the link so options are identifiable.
      label:
        o.label ||
        (parsed?.title
          ? `${parsed.title}`.slice(0, 60)
          : (parsed?.store ?? "")),
    }));
  };

  return (
    <div
      className={`grid grid-cols-[16px_minmax(120px,1fr)_minmax(140px,1.2fr)_92px_40px_20px] items-center gap-1.5 border px-2 py-1 ${
        isActive ? "border-ink bg-paper" : "border-line bg-transparent"
      }`}
    >
      <input
        type="radio"
        checked={isActive}
        onChange={onSelect}
        className="accent-ink"
        title="Use this option in the quote"
      />
      <TextInput
        value={option.label}
        onCommit={(v) => onPatch((o) => ({ ...o, label: v }))}
        placeholder="Option name (e.g. LVP — Sterling Oak)"
        className="field-quiet text-xs"
      />
      <TextInput
        value={option.url}
        onCommit={commitUrl}
        placeholder="Paste product link…"
        className="field-quiet font-mono text-[0.6875rem]"
      />
      <MoneyInput
        value={option.unitPrice}
        onCommit={(v) => onPatch((o) => ({ ...o, unitPrice: v }))}
        className="field-quiet text-right text-xs"
      />
      {option.url ? (
        <a
          href={option.url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-xs btn-ghost !px-1.5"
          title="Open product page"
        >
          ↗
        </a>
      ) : (
        <span />
      )}
      <button
        className="justify-self-center font-mono text-xs text-mute hover:text-ink disabled:opacity-20"
        disabled={!canDelete}
        onClick={onDelete}
        title="Remove option"
      >
        ✕
      </button>
      {(option.note || (isActive && option.unitPrice !== null && itemQty !== 1)) && (
        <span className="col-span-6 -mt-0.5 flex justify-between gap-3">
          <span className="microlabel !normal-case !tracking-normal truncate">
            {option.note ?? ""}
          </span>
          {isActive && option.unitPrice !== null && itemQty !== 1 && (
            <span className="microlabel tnum shrink-0">
              × {itemQty} = {money(option.unitPrice * itemQty)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
