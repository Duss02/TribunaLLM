"use client";

import { type KeyboardEvent, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type PickerOption, searchOptions } from "@/lib/model-search";

const LIMIT = 40;

interface Props {
  label: string;
  options: PickerOption[];
  value: string;
  disabled: boolean;
  onChange: (key: string) => void;
}

export function ModelPicker({ label, options, value, disabled, onChange }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.key === value);
  const { shown, matched } = useMemo(() => searchOptions(options, query, LIMIT), [options, query]);
  const hidden = options.filter((option) => !option.curated).length;
  const optionId = (index: number) => `${id}-option-${index}`;

  // A list anchored to a picker near the right edge would run off the screen: slide it back.
  useLayoutEffect(() => {
    const element = list.current;
    if (!open || !element) return;
    element.style.transform = "";
    const overflow = element.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflow > 0) element.style.transform = `translateX(${-overflow}px)`;
  }, [open, shown.length]);

  useLayoutEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  });

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(option: PickerOption) {
    onChange(option.key);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (open) setActive((index) => Math.min(index + 1, shown.length - 1));
      else setOpen(true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && shown[active]) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  }

  const summary =
    query.trim() === ""
      ? hidden > 0
        ? `${hidden} more models from your keys. Type to search.`
        : ""
      : matched === 0
        ? `No model matches "${query.trim()}".`
        : matched > shown.length
          ? `${matched} matches, showing the first ${shown.length}. Keep typing to narrow it.`
          : `${matched} ${matched === 1 ? "match" : "matches"}.`;

  return (
    <div
      ref={root}
      className="relative flex w-full min-w-44 flex-col gap-1 text-xs text-muted sm:w-auto sm:flex-1"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) close();
      }}
    >
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={open ? query : (selected?.label ?? value)}
        placeholder={open ? (selected?.label ?? "Search models") : undefined}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="rounded border border-line bg-bg px-2 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      />
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[18rem] max-w-[calc(100vw-1rem)] rounded border border-line bg-bg shadow-lg sm:w-[28rem]">
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={`${label} model`}
            className="max-h-80 overflow-y-auto py-1 text-sm text-fg"
          >
            {shown.map((option, index) => (
              <li key={option.key} role="presentation">
                {(index === 0 || option.curated !== shown[index - 1]?.curated) && (
                  <p className="px-3 pb-1 pt-2 text-xs uppercase tracking-wider text-muted">
                    {option.curated ? "Roster" : "More from your keys"}
                  </p>
                )}
                <div
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.key === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={`cursor-pointer px-3 py-1.5 ${index === active ? "bg-line" : ""}`}
                >
                  <span className="block truncate font-medium">
                    {option.label}
                    {option.key === value && <span className="ml-2 font-normal text-muted">selected</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {option.curated ? option.detail : `${option.group} · ${option.detail}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {summary && (
            <p role="status" className="border-t border-line px-3 py-2 text-xs text-muted">
              {summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
