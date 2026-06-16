file_path = r"d:\mohamed projects\erp\erp-v1-main\erp-v1-main\frontend\src\app\globals.css"

content_to_add = """
/* ── Mobile Responsive Fixes ── */

/* Prevent horizontal scroll */
html,
body {
  overflow-x: hidden;
  max-width: 100vw;
}

/* iOS safe area for Bottom Nav */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Better tap targets on mobile */
@media (max-width: 768px) {
  button,
  a[role='button'] {
    min-height: 44px;
  }
}

/* Tables horizontal scroll on small screens */
.table-scroll-mobile {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
"""

with open(file_path, "a", encoding="utf-8") as f:
    f.write(content_to_add)

print("globals.css updated successfully.")
