path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = 'import { Label } from "@/components/ui/label";'
new = '''import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";'''

if old not in content:
    print("❌ Anchor not found — file may have changed. Aborting.")
elif new in content:
    print("⚠️ Import already present — no change made.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w") as f:
        f.write(content)
    print("✅ Added missing Select component imports in Matters.tsx")
