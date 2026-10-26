export default {
  "mainContainer": {
    "flex": 1,
    "display": "flex",
    "flexDirection": "column",
    "minWidth": 0,
    "height": "100vh",
    "overflowY": "auto"
  },
  "toggleLabel": {
    "fontSize": 13,
    "color": "var(--color-slate-600)",
    "display": "flex",
    "alignItems": "center",
    "cursor": "pointer"
  },
  "filterBar": {
    "display": "flex",
    "gap": "10px",
    "flexWrap": "wrap",
    "marginBottom": "20px",
    "alignItems": "center"
  },
  "tableCard": {
    "position": "relative",
    "backgroundColor": "var(--color-white)",
    "borderRadius": "12px",
    "border": "1px solid var(--color-slate-200)",
    "overflow": "hidden",
    "boxShadow": "0 1px 3px rgba(0, 0, 0, 0.04)"
  },
  "table": {
    "width": "100%",
    "borderCollapse": "collapse",
    "fontSize": "13px",
    "textAlign": "left"
  },
  "th": {
    "padding": "12px 16px",
    "backgroundColor": "var(--color-slate-50)",
    "borderBottom": "1px solid var(--color-slate-200)",
    "color": "var(--color-slate-600)",
    "fontWeight": "600",
    "fontSize": "11px",
    "textTransform": "uppercase",
    "letterSpacing": "0.04em",
    "whiteSpace": "nowrap"
  },
  "tr": {
    "borderBottom": "1px solid var(--color-slate-100)",
    "transition": "background-color 0.12s ease"
  },
  "td": {
    "padding": "12px 16px",
    "whiteSpace": "nowrap",
    "color": "var(--color-slate-800)",
    "verticalAlign": "middle"
  },
  "detailBtn": {
    "padding": "5px 12px",
    "backgroundColor": "transparent",
    "color": "var(--color-primary)",
    "border": "1px solid var(--color-primary)",
    "borderRadius": "6px",
    "fontSize": "12px",
    "fontWeight": "600",
    "cursor": "pointer",
    "transition": "all 0.15s ease"
  },
  "emptyCell": {
    "textAlign": "center",
    "padding": "40px",
    "color": "var(--color-slate-400)",
    "fontSize": "14px"
  },
  "loadingOverlay": {
    "position": "absolute",
    "inset": 0,
    "backgroundColor": "rgba(255,255,255,0.7)",
    "display": "flex",
    "justifyContent": "center",
    "alignItems": "center",
    "zIndex": 5,
    "borderRadius": "12px"
  },
  "spinnerLg": {
    "width": "36px",
    "height": "36px",
    "border": "3px solid var(--color-slate-200)",
    "borderTopColor": "var(--color-primary)",
    "borderRadius": "50%",
    "animation": "spin 0.8s linear infinite"
  },
  "paginationRow": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": "12px 18px",
    "borderTop": "1px solid var(--color-slate-100)"
  },
  "paginationText": {
    "fontSize": "12px",
    "color": "var(--color-slate-500)"
  },
  "pageBtn": {
    "padding": "6px 14px",
    "backgroundColor": "var(--color-white)",
    "border": "1px solid var(--color-slate-300)",
    "borderRadius": "6px",
    "fontSize": "12px",
    "fontWeight": "600",
    "cursor": "pointer",
    "color": "var(--color-slate-700)",
    "transition": "all 0.15s ease"
  },
  "overlay": {
    "position": "fixed",
    "inset": 0,
    "backgroundColor": "rgba(15, 23, 42, 0.45)",
    "backdropFilter": "blur(4px)",
    "display": "flex",
    "justifyContent": "center",
    "alignItems": "center",
    "zIndex": 1000
  },
  "modalHeader": {
    "display": "flex",
    "justifyContent": "space-between",
    "alignItems": "center",
    "padding": "18px 24px",
    "borderBottom": "1px solid var(--color-slate-200)"
  },
  "modalTitle": {
    "margin": 0,
    "fontSize": "17px",
    "fontWeight": "700",
    "color": "var(--color-slate-900)"
  },
  "closeBtn": {
    "background": "none",
    "border": "none",
    "fontSize": "18px",
    "cursor": "pointer",
    "color": "var(--color-slate-400)",
    "lineHeight": 1
  },
  "modalBody": {
    "padding": "20px 24px"
  },
  "detailRow": {
    "display": "flex",
    "flexDirection": "column",
    "padding": "12px 0",
    "borderBottom": "1px solid var(--color-slate-100)",
    "gap": "4px"
  },
  "detailLabel": {
    "fontSize": "12px",
    "fontWeight": "600",
    "color": "var(--color-slate-500)",
    "textTransform": "uppercase",
    "letterSpacing": "0.04em"
  },
  "detailValue": {
    "fontSize": "14px",
    "color": "var(--color-slate-900)",
    "lineHeight": 1.5
  }
}
