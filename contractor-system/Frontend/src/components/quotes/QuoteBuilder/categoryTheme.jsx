export const CATEGORY_THEME = {
  cat_paint_plaster: {
    bg: "bg-blue-50/40",
    border: "border-blue-300",
    text: "text-blue-800",
    accent: "text-blue-600",
  },
  cat_tiling: {
    bg: "bg-orange-50/40",
    border: "border-orange-300",
    text: "text-orange-800",
    accent: "text-orange-600",
  },
  cat_demolition: {
    bg: "bg-red-50/40",
    border: "border-red-300",
    text: "text-red-800",
    accent: "text-red-600",
  },
  cat_electricity: {
    bg: "bg-yellow-50/40",
    border: "border-yellow-300",
    text: "text-yellow-800",
    accent: "text-yellow-600",
  },
  cat_plumbing: {
    bg: "bg-teal-50/40",
    border: "border-teal-300",
    text: "text-teal-800",
    accent: "text-teal-600",
  },
  cat_construction: {
    bg: "bg-purple-50/40",
    border: "border-purple-300",
    text: "text-purple-800",
    accent: "text-purple-600",
  },
};

export const getCategoryTheme = (categoryId) => {
  return CATEGORY_THEME[categoryId] || CATEGORY_THEME.cat_construction;
};