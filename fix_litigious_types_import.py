path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = 'import { useSupabaseCaseActivities } from "../hooks/useSupabaseCaseActivities";'
new = 'import { useSupabaseCaseActivities, LITIGIOUS_ACTIVITY_TYPES } from "../hooks/useSupabaseCaseActivities";'

if old not in content:
    print("❌ Anchor not found — file may have changed. Aborting.")
elif new in content:
    print("⚠️ Import already present — no change made.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w") as f:
        f.write(content)
    print("✅ Added missing import for LITIGIOUS_ACTIVITY_TYPES in Matters.tsx")
