import React, { useEffect } from "react";

// Utilities
const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
const parsePrice = (text) => {
  if (!text) return 0;
  const cleaned = String(text).replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Find the last "area" block visually above the button
const findAreaBeforeButton = (btn) => {
  const btnRect = btn.getBoundingClientRect();
  const allDivs = Array.from(document.querySelectorAll("div"));
  const candidates = allDivs
    .filter((el) => {
      const t = norm(el.textContent);
      // Heuristics to detect an area block
      const hasKeyTexts =
        t.includes('כמות (מ"ר)') ||
        t.includes("בחר סוג ריצוף") ||
        /^אזור\s*\d+/.test(t);
      const hasInputs =
        el.querySelector("input") ||
        el.querySelector('button[role="combobox"]') ||
        el.querySelector("select");
      if (!(hasKeyTexts && hasInputs)) return false;
      try {
        const r = el.getBoundingClientRect();
        return r.top < btnRect.top - 4 && r.height > 60;
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
  return candidates[0] || null;
};

// Quantity
const readQty = (area) => {
  const input =
    area.querySelector('input[type="number"]') ||
    Array.from(area.querySelectorAll("input")).find((i) => {
      const ph = i.getAttribute("placeholder") || "";
      return ph.includes("לדוגמה") || ph.includes("מ\"ר") || ph.includes("50");
    }) ||
    area.querySelector("input");
  if (!input) return 0;
  const v = input.value ?? input.getAttribute("value") ?? "";
  const num = Number(String(v).trim());
  return isNaN(num) ? 0 : num;
};

// Type
const readSelectedType = (area) => {
  const trigger =
    area.querySelector('button[role="combobox"]') ||
    area.querySelector('button[aria-haspopup="listbox"]') ||
    area.querySelector("button");
  const txt = norm(trigger?.textContent || "");
  if (txt && !txt.includes("בחר")) return txt;
  const title = Array.from(area.querySelectorAll("*")).find((n) =>
    norm(n.textContent).match(/^אזור\s*\d+/)
  );
  if (title) return norm(title.textContent);
  return "אזור";
};

// Money by label or best-guess
const readMoney = (area, prefer = "price") => {
  const all = Array.from(area.querySelectorAll("*"));
  const withCurrency = all.filter((n) => (n.textContent || "").includes("₪"));
  const values = withCurrency.map((n) => parsePrice(n.textContent)).filter((x) => x >= 0);
  if (!values.length) return 0;
  // Heuristic: highest = מחיר ללקוח, lowest = עלות לקבלן, middle = רווח
  const sorted = [...values].sort((a, b) => a - b);
  if (prefer === "price") return sorted[sorted.length - 1] || 0;
  if (prefer === "cost") return sorted[0] || 0;
  return sorted[Math.floor(sorted.length / 2)] || 0;
};

export default function TilingAutoSaveOnAddArea({ onAddItemToQuote }) {
  useEffect(() => {
    const onClickCapture = (e) => {
      const targetBtn = e.target.closest("button, a, div[role='button']");
      if (!targetBtn) return;
      const text = norm(targetBtn.textContent);
      // Support both button texts variants
      if (!text.includes("הוסף אזור נוסף")) return;

      // Find area above the button
      const area = findAreaBeforeButton(targetBtn);
      if (!area) return;

      // Read values
      const qty = readQty(area);
      const totalPrice = readMoney(area, "price");
      const totalCost = readMoney(area, "cost");
      const profit = Math.max(0, totalPrice - totalCost);
      const selectedType = readSelectedType(area);

      // Require minimum sane values
      if (!qty || qty <= 0 || !totalPrice || totalPrice <= 0) return;

      const unitPrice = qty > 0 ? Math.round((totalPrice / qty) * 100) / 100 : totalPrice;

      const item = {
        id: `tiling_area_${Date.now()}`,
        source: "tiling_area_autosave",
        categoryId: "cat_tiling",
        categoryName: "ריצוף וחיפוי",
        description: `אזור • ${selectedType}`,
        quantity: qty,
        unit: 'מ"ר',
        unitPrice,
        totalPrice,
        totalCost: totalCost || 0,
        profit,
        meta: { savedBy: "add_area_button" },
      };

      const addFn =
        typeof onAddItemToQuote === "function"
          ? onAddItemToQuote
          : typeof window !== "undefined" && typeof window.__b44AddItemToQuote === "function"
          ? window.__b44AddItemToQuote
          : null;

      if (addFn) {
        addFn(item);
      }
      // Do not prevent default; allow creating the new area afterwards
    };

    // Capture phase to run before React creates the new area
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [onAddItemToQuote]);

  return null;
}