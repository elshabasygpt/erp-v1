import re

file_path = r"d:\mohamed projects\erp\erp-v1-main\erp-v1-main\frontend\src\app\[locale]\dashboard\layout.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
imports_to_add = """import MobileHeader from '@/components/layout/MobileHeader';
import BottomNav from '@/components/layout/BottomNav';
"""
content = content.replace("import { LanguageProvider } from '@/i18n/LanguageContext';", 
                          "import { LanguageProvider } from '@/i18n/LanguageContext';\n" + imports_to_add)

# 2. Modify state: remove mobileMenuOpen
content = re.sub(r"const \[mobileMenuOpen, setMobileMenuOpen\] = useState\(false\);\n", "", content)

# 3. Replace the structure
# Find from {/* Mobile Overlay */} down to <main className=...
search_pattern = re.compile(r"\{\/\* Mobile Overlay \*\/}.*?\{/\* Main Content \*/}\s*<main className=\{`min-h-screen transition-all duration-300 ms-0 \$\{sidebarW\}`\}>", re.DOTALL)

replacement = """{/* Mobile Header — يظهر على الموبايل فقط */}
                    <MobileHeader isRTL={isRTL} title={dict.common?.appName || 'ERP'} />

                    {/* Mock Mode Banner */}
                    {isMock && (
                        <div className="sticky top-0 z-30 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold"
                            style={{ background: 'rgba(245,158,11,0.15)', borderBottom: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {isRTL
                                ? '⚠️ وضع العرض التجريبي — البيانات وهمية. الخادم غير متصل.'
                                : '⚠️ Demo Mode — Showing mock data. Backend server is offline.'}
                        </div>
                    )}

                    <div className="flex">
                        {/* Sidebar */}
                        <Sidebar locale={locale as any} dict={dict} />

                        {/* Main Content */}
                        <main className={`flex-1 min-w-0 overflow-x-hidden pt-14 pb-20 md:pt-0 md:pb-0 min-h-screen transition-all duration-300 ms-0 ${sidebarW}`}>"""

content = search_pattern.sub(replacement, content)

# 4. Remove setMobileMenuOpen from header
content = content.replace("onClick={() => setMobileMenuOpen(true)}", "onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}))}") # Hacky way to fix TS if toggleCollapsed is not available in scope, but we can just use useSidebar() toggleCollapsed

# Let's properly add toggleCollapsed to useSidebar
content = content.replace("const { collapsed, mode } = useSidebar();", "const { collapsed, mode, toggleCollapsed } = useSidebar();")
content = content.replace("onClick={() => setMobileMenuOpen(true)}", "onClick={toggleCollapsed}")

# 5. Add BottomNav at the end
# We need to insert it right before:
#                     </main>
#                 </div>
#             </LanguageProvider>

end_pattern = re.compile(r"(\s*</main>\s*</div>\s*</LanguageProvider>)", re.DOTALL)
end_replacement = """\n                    </main>
                    </div>
                    {/* Bottom Navigation — يظهر على الموبايل فقط */}
                    <BottomNav locale={locale} />
                </div>
            </LanguageProvider>"""
content = end_pattern.sub(end_replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("layout.tsx updated successfully.")
