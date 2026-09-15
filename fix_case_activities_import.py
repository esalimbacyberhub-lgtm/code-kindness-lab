path = "src/features/legal/views/Matters.tsx"
with open(path, "r") as f:
    content = f.read()

old = 'import { useMatterFolders } from "../hooks/useMatterFolders";'
new = 'import { useMatterFolders } from "../hooks/useMatterFolders";\nimport { useSupabaseCaseActivities } from "../hooks/useSupabaseCaseActivities";'

if old not in content:
    print("❌ Anchor not found — file may have changed. Aborting.")
elif new in content:
    print("⚠️ Import already present — no change made.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w") as f:
        f.write(content)
    print("✅ Added missing import for useSupabaseCaseActivities in Matters.tsx")
