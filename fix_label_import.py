path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = 'import { Input } from "@/components/ui/input";'
new = 'import { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";'

if old not in content:
    print("❌ Anchor not found — file may have changed. Aborting.")
elif new in content:
    print("⚠️ Import already present — no change made.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w") as f:
        f.write(content)
    print("✅ Added missing import for Label in Matters.tsx")
