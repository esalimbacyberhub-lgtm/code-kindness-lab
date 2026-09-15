path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = '''import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";'''

new = '''import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";'''

if old not in content:
    print("❌ Anchor not found — file may have changed. Aborting.")
elif new in content:
    print("⚠️ Import already present — no change made.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w") as f:
        f.write(content)
    print("✅ Added missing DialogFooter import in Matters.tsx")
