path = "src/features/legal/views/Dashboard.tsx"
with open(path, "r") as f:
    content = f.read()

edits = [
    (
        '''export function Dashboard({ tasks, deadlines = [], matters = [], invoices = [], onMoveTask, onAddTask, onDeleteTask, onNewMatter, onGoToCalendar, onGoToMatters }: Props) {''',
        '''export function Dashboard({ tasks, deadlines = [], matters = [], invoices = [], onMoveTask, onAddTask, onDeleteTask, onNewMatter, onGoToCalendar, onGoToMatters }: Props) {
  const openMatterFromDeadline = (d: Deadline) => {
    const match = d.matter && d.matter !== "General" ? matters.find((m: any) => m.title === d.matter) : null;
    if (match) {
      sessionStorage.setItem("omuyoma_open_matter_id", match.id);
    }
    onGoToMatters?.();
  };
'''
    ),
    (
        '''                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all border-l-4 border-l-brand-gold/40">''',
        '''                <button
                  key={d.id}
                  onClick={() => openMatterFromDeadline(d)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all border-l-4 border-l-brand-gold/40"
                >'''
    ),
    (
        '''                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskBoard''',
        '''                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TaskBoard'''
    ),
]

for i, (old, new) in enumerate(edits, 1):
    if old not in content:
        print(f"❌ Edit {i} FAILED — anchor text not found. Stopping, no changes written.")
        raise SystemExit(1)
    content = content.replace(old, new, 1)
    print(f"✅ Edit {i} applied")

with open(path, "w") as f:
    f.write(content)

print("\nAll edits applied successfully.")
