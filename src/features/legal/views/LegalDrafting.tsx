import { useState } from "react";
import { FileText, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TEMPLATES: { id: string; name: string; category: string; content: string }[] = [
  { id: "plaint", name: "Plaint", category: "Litigation",
    content: `IN THE HIGH COURT OF KENYA AT NAIROBI
CIVIL DIVISION

CIVIL CASE NO. _______ OF _______

[PLAINTIFF NAME] ................................................................PLAINTIFF

VERSUS

[DEFENDANT NAME] ............................................................DEFENDANT

PLAINT

1. The Plaintiff is [description of plaintiff].

2. The Defendant is [description of defendant] and may be served at [address].

3. The Plaintiff's claim against the Defendant is for [cause of action].

4. On or about [date], the Defendant [describe the wrong/breach].

5. By reason of the matters aforesaid, the Plaintiff has suffered loss and damage.

PARTICULARS OF LOSS AND DAMAGE
(a) [Particulars]

6. WHEREFORE the Plaintiff prays for judgement against the Defendant for:
(a) KES ____________ being general damages;
(b) Interest thereon;
(c) Costs of this suit;
(d) Any other relief the Court deems fit.

Dated at Nairobi this _______ day of _______ 20____

.............................
[Advocate Name]
Omuyoma & Co. Advocates
For the Plaintiff` },
  { id: "defence", name: "Statement of Defence", category: "Litigation",
    content: `IN THE HIGH COURT OF KENYA AT NAIROBI
CIVIL CASE NO. _______ OF _______

[DEFENDANT NAME] ............................................................DEFENDANT

STATEMENT OF DEFENCE

1. The Defendant denies each and every allegation of fact contained in the Plaint save what is hereinafter expressly admitted.

2. The Defendant admits paragraph __ of the Plaint.

3. The Defendant denies paragraph __ of the Plaint and puts the Plaintiff to strict proof thereof.

4. [State defendant's version of events]

5. In the premises, the Plaintiff's suit is frivolous, vexatious and an abuse of court process and ought to be dismissed with costs.

WHEREFORE the Defendant prays that:
(a) The suit be dismissed with costs to the Defendant;
(b) Any other relief the Court deems fit.

Dated at Nairobi this _______ day of _______ 20____

.............................
[Advocate Name]
Omuyoma & Co. Advocates
For the Defendant` },
  { id: "affidavit", name: "Affidavit", category: "Litigation",
    content: `IN THE HIGH COURT OF KENYA AT NAIROBI

CIVIL CASE NO. _______ OF _______

AFFIDAVIT OF [DEPONENT NAME]

I, [FULL NAME], of P.O. Box _______, [Town], Kenya, do hereby make oath and state as follows:

1. I am the [Plaintiff/Defendant/Applicant] herein and I have authority to make this Affidavit.

2. I am conversant with the facts herein deposed to from my own personal knowledge save where otherwise stated.

3. [State the facts]

4. [Continue with facts]

5. That what I have herein stated is true to the best of my knowledge and belief.

SWORN at NAIROBI ]
this _______ day of ]
_______ 20____ by the ]  ...................................
said [NAME] ]  DEPONENT

BEFORE ME:
.............................
COMMISSIONER FOR OATHS` },
  { id: "sale-agreement", name: "Sale Agreement", category: "Conveyancing",
    content: `AGREEMENT FOR SALE OF LAND

THIS AGREEMENT is made this _____ day of __________ 20____

BETWEEN:

[VENDOR FULL NAME], ID No. _____________, of P.O. Box _______, Nairobi (hereinafter called "the Vendor")

AND

[PURCHASER FULL NAME], ID No. _____________, of P.O. Box _______, Nairobi (hereinafter called "the Purchaser")

WHEREAS the Vendor is registered as the proprietor of all that piece of land known as [TITLE NUMBER] measuring approximately [SIZE] situated at [LOCATION].

NOW IT IS AGREED as follows:

1. PURCHASE PRICE
The Vendor agrees to sell and the Purchaser agrees to purchase the said property at the agreed purchase price of KES _____________ (Kenya Shillings _____________ only).

2. PAYMENT TERMS
(a) Deposit of KES __________ payable upon signing;
(b) Balance of KES __________ payable on completion.

3. COMPLETION DATE
Completion shall take place within [90] days of the date hereof.

4. VACANT POSSESSION
The Vendor shall give vacant possession on completion.

5. TITLE
The Vendor warrants that he/she has good title to the property free from encumbrances.

IN WITNESS WHEREOF the parties have set their hands the day and year first written above.

Signed by the VENDOR:          Signed by the PURCHASER:
.............................    .............................
In the presence of:             In the presence of:
Omuyoma & Co. Advocates` },
  { id: "lease", name: "Lease Agreement", category: "Conveyancing",
    content: `LEASE AGREEMENT

THIS LEASE is made the ______ day of ___________ 20____

BETWEEN:
[LANDLORD NAME] (hereinafter "the Landlord")
AND
[TENANT NAME] (hereinafter "the Tenant")

PROPERTY: [Full description of premises]

TERM: [Number] years commencing [Start Date]

RENT: KES _____________ per month payable in advance on the 1st of each month.

DEPOSIT: KES _____________ (equivalent to [2] months rent).

CONDITIONS:
1. The Tenant shall use the premises for [purpose] only.
2. The Tenant shall not sub-let without written consent of the Landlord.
3. The Tenant shall maintain the premises in good repair.
4. The Landlord shall be responsible for structural repairs.

Signed: ......................    Signed: ......................
        LANDLORD                         TENANT
Date: ________________          Date: ________________

Witnessed by Omuyoma & Co. Advocates` },
  { id: "employment", name: "Employment Contract", category: "Corporate",
    content: `EMPLOYMENT CONTRACT

This Contract is entered into on ________ between:

EMPLOYER: [Company Name], a company incorporated in Kenya (hereinafter "the Employer")

AND

EMPLOYEE: [Employee Full Name], ID No. _____________ (hereinafter "the Employee")

1. POSITION: The Employee is employed as [Job Title] reporting to [Supervisor].

2. COMMENCEMENT: Employment commences on [Start Date].

3. REMUNERATION: Gross salary of KES _____________ per month.

4. WORKING HOURS: [Hours] per week, [Days].

5. LEAVE: 21 working days annual leave as per the Employment Act, 2007.

6. NOTICE PERIOD: 28 days written notice by either party.

7. PROBATION: [3] months probationary period.

8. CONFIDENTIALITY: The Employee shall maintain confidentiality of all company information.

9. GOVERNING LAW: This contract is governed by the laws of Kenya.

Signed: ...........................    Signed: ...........................
        EMPLOYER                               EMPLOYEE
Witness: Omuyoma & Co. Advocates` },
];

export function LegalDrafting() {
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [content, setContent] = useState(TEMPLATES[0].content);
  const [category, setCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(TEMPLATES.map(t => t.category)))];
  const filtered = category === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === category);

  const selectTemplate = (t: typeof TEMPLATES[0]) => {
    setSelected(t);
    setContent(t.content);
  };

  const printPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${selected.name} — Omuyoma & Co.</title>
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 2cm; color: #000; }
      .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 48pt; color: rgba(180,140,0,0.08); font-weight: bold; white-space: nowrap; pointer-events: none; z-index: -1; }
      .header { text-align: center; border-bottom: 2px solid #c9a84c; padding-bottom: 12px; margin-bottom: 20px; }
      .header h1 { font-size: 11pt; text-transform: uppercase; letter-spacing: 2px; color: #1a1a2e; }
      .header p { font-size: 9pt; color: #666; }
      pre { white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.8; }
      .footer { position: fixed; bottom: 1cm; width: 100%; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
      @media print { .watermark { display: block; } }
    </style></head><body>
    <div class="watermark">OMUYOMA &amp; CO. ADVOCATES</div>
    <div class="header"><h1>Omuyoma &amp; Co. Advocates</h1><p>Nairobi, Kenya &nbsp;|&nbsp; Confidential Legal Document</p></div>
    <pre>${content.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
    <div class="footer">Generated by Omuyoma &amp; Co. Legal OS &nbsp;|&nbsp; ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Confidential</div>
    <script>window.onload=()=>{window.print();}</script></body></html>`);
    win.document.close();
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Kenyan Legal Templates</p>
          <h2 className="text-4xl font-serif">Legal <span className="text-gradient-gold">Drafting</span></h2>
        </div>
        <Button onClick={printPDF} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90"><Download className="w-4 h-4 mr-2" /> Export PDF</Button>
      </div>
      <div className="gold-divider mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{minHeight: 600}}>
        {/* Template list */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex gap-1 mb-4 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-[10px] px-2 py-1 rounded-full border transition ${category === c ? "bg-brand-gold text-primary-foreground border-brand-gold" : "border-border text-muted-foreground hover:border-brand-gold/50"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {filtered.map(t => (
              <button key={t.id} onClick={() => selectTemplate(t)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${selected.id === t.id ? "bg-brand-gold/15 text-brand-gold" : "hover:bg-secondary/40"}`}>
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category}</p>
                </div>
                {selected.id === t.id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 glass-card rounded-2xl flex flex-col">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{selected.name}</h3>
              <p className="text-xs text-muted-foreground">Click anywhere in the document to edit</p>
            </div>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="flex-1 bg-transparent p-6 resize-none font-mono text-sm leading-7 focus:outline-none text-foreground"
            style={{minHeight: 520}}
          />
        </div>
      </div>
    </div>
  );
}
