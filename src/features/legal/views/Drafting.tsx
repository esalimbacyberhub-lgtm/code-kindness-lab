import { useMemo, useState } from "react";
import { FileSignature, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import jsPDF from "jspdf";

type TemplateKey =
  | "plaint" | "defence" | "affidavit" | "sale" | "lease" | "employment";

interface Template {
  key: TemplateKey;
  name: string;
  blurb: string;
  body: string;
}

const TODAY = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const TEMPLATES: Template[] = [
  {
    key: "plaint",
    name: "Plaint",
    blurb: "Civil suit pleading",
    body: `REPUBLIC OF KENYA
IN THE HIGH COURT OF KENYA AT NAIROBI
CIVIL SUIT NO. _____ OF ${new Date().getFullYear()}

BETWEEN

[PLAINTIFF NAME] ..................................... PLAINTIFF

VERSUS

[DEFENDANT NAME] .................................... DEFENDANT

PLAINT

1. The Plaintiff is an adult of sound mind whose address of service for the purposes of this suit shall be care of M/s Omuyoma & Co. Advocates, P.O. Box _____, Nairobi.

2. The Defendant is, as the Plaintiff verily believes, [describe defendant] whose address of service shall be _____.

3. [State the facts giving rise to the cause of action, in numbered paragraphs.]

4. By reason of the matters aforesaid, the Plaintiff has suffered loss and damage.

REASONS WHEREFORE the Plaintiff prays for judgment against the Defendant for:
(a) [Relief sought];
(b) Costs of this suit;
(c) Interest on (a) and (b) at court rates;
(d) Any other relief this Honourable Court may deem fit to grant.

DATED at NAIROBI this ____ day of __________ ${new Date().getFullYear()}.

__________________________
OMUYOMA & CO. ADVOCATES
ADVOCATES FOR THE PLAINTIFF`,
  },
  {
    key: "defence",
    name: "Defence",
    blurb: "Statement of defence",
    body: `REPUBLIC OF KENYA
IN THE HIGH COURT OF KENYA AT NAIROBI
CIVIL SUIT NO. _____ OF ${new Date().getFullYear()}

BETWEEN

[PLAINTIFF NAME] ..................................... PLAINTIFF
VERSUS
[DEFENDANT NAME] .................................... DEFENDANT

STATEMENT OF DEFENCE

1. Save as is hereinafter expressly admitted, the Defendant denies each and every allegation contained in the Plaint as if the same were set out herein and traversed seriatim.

2. Paragraph 1 of the Plaint is admitted only insofar as it relates to the description of the Plaintiff.

3. Paragraph 2 of the Plaint is admitted.

4. Paragraph 3 of the Plaint is denied and the Plaintiff is put to strict proof thereof.

5. The Defendant shall raise a preliminary objection that [state objection].

REASONS WHEREFORE the Defendant prays that the Plaintiff's suit be dismissed with costs.

DATED at NAIROBI this ____ day of __________ ${new Date().getFullYear()}.

__________________________
OMUYOMA & CO. ADVOCATES
ADVOCATES FOR THE DEFENDANT`,
  },
  {
    key: "affidavit",
    name: "Affidavit",
    blurb: "Sworn statement",
    body: `REPUBLIC OF KENYA
IN THE HIGH COURT OF KENYA AT NAIROBI
MISC. APPLICATION NO. _____ OF ${new Date().getFullYear()}

AFFIDAVIT

I, [DEPONENT FULL NAME], of P.O. Box _____, Nairobi, in the Republic of Kenya, do solemnly swear and state as follows:

1. THAT I am the [capacity] herein and competent to swear this affidavit.

2. THAT [state facts within personal knowledge in numbered paragraphs].

3. THAT what is deponed to herein is true to the best of my knowledge, information and belief.

SWORN at Nairobi by the said      )
[DEPONENT NAME]                    )    _______________________
this ____ day of _______ ${new Date().getFullYear()}        )         DEPONENT

BEFORE ME

__________________________
COMMISSIONER FOR OATHS

DRAWN & FILED BY:
OMUYOMA & CO. ADVOCATES`,
  },
  {
    key: "sale",
    name: "Sale Agreement",
    blurb: "Property / asset sale",
    body: `AGREEMENT FOR SALE

THIS AGREEMENT is made on the ____ day of __________ ${new Date().getFullYear()}

BETWEEN

[VENDOR NAME] of P.O. Box _____, (hereinafter called "the Vendor") of the one part;

AND

[PURCHASER NAME] of P.O. Box _____, (hereinafter called "the Purchaser") of the other part.

WHEREAS the Vendor is the registered/beneficial owner of [describe property/asset] (hereinafter "the Property") and has agreed to sell the same to the Purchaser on the terms set out herein.

NOW IT IS HEREBY AGREED as follows:

1. PURCHASE PRICE
   The purchase price shall be Kenya Shillings _________ (KES _________) payable as follows:
   (a) Deposit of 10% on execution hereof;
   (b) Balance on completion.

2. COMPLETION
   Completion shall take place on or before the ____ day of __________ ${new Date().getFullYear()} at the offices of M/s Omuyoma & Co. Advocates.

3. TITLE
   The Vendor shall deliver good and marketable title free from all encumbrances.

4. LAW & JURISDICTION
   This Agreement shall be governed by the laws of Kenya.

IN WITNESS WHEREOF the parties have executed this Agreement the day and year first hereinabove written.

SIGNED by the VENDOR        )      _______________________
SIGNED by the PURCHASER     )      _______________________

IN THE PRESENCE OF:
OMUYOMA & CO. ADVOCATES`,
  },
  {
    key: "lease",
    name: "Lease Agreement",
    blurb: "Tenancy / lease",
    body: `LEASE AGREEMENT

THIS LEASE is made on the ____ day of __________ ${new Date().getFullYear()}

BETWEEN

[LANDLORD NAME] (hereinafter "the Landlord") of the one part;
AND
[TENANT NAME] (hereinafter "the Tenant") of the other part.

1. DEMISED PREMISES
   The Landlord lets and the Tenant takes ALL THAT property known as [address/LR No.] (hereinafter "the Premises").

2. TERM
   The term shall be _____ years commencing on the ____ day of __________ ${new Date().getFullYear()}.

3. RENT
   The Tenant shall pay rent of KES _________ per month, payable monthly in advance on the 1st day of each calendar month.

4. DEPOSIT
   A refundable deposit equal to two (2) months' rent shall be paid on execution hereof.

5. TENANT'S COVENANTS
   The Tenant covenants to:
   (a) Pay rent and all utilities punctually;
   (b) Keep the Premises in good and tenantable repair;
   (c) Not assign or sublet without the Landlord's written consent.

6. LANDLORD'S COVENANTS
   The Landlord covenants for quiet enjoyment of the Premises.

7. TERMINATION
   Either party may terminate this Lease by giving three (3) months' written notice.

SIGNED by the LANDLORD      )      _______________________
SIGNED by the TENANT        )      _______________________

DRAWN BY: OMUYOMA & CO. ADVOCATES`,
  },
  {
    key: "employment",
    name: "Employment Contract",
    blurb: "Employer–employee terms",
    body: `CONTRACT OF EMPLOYMENT

THIS CONTRACT is made on the ____ day of __________ ${new Date().getFullYear()}

BETWEEN

[EMPLOYER NAME] (hereinafter "the Employer");
AND
[EMPLOYEE NAME] of ID No. _________ (hereinafter "the Employee").

1. APPOINTMENT
   The Employer engages the Employee in the position of [job title] reporting to [supervisor].

2. COMMENCEMENT & PROBATION
   Employment commences on _____ and shall be subject to a probationary period of six (6) months.

3. REMUNERATION
   The Employee shall be paid a gross monthly salary of KES _________, less statutory deductions (PAYE, NSSF, SHIF, AHL).

4. HOURS OF WORK
   Working hours shall be Monday to Friday, 8:00 a.m. to 5:00 p.m., with a one-hour lunch break.

5. LEAVE
   The Employee shall be entitled to twenty-one (21) working days of annual leave, in addition to statutory leave entitlements under the Employment Act, 2007.

6. CONFIDENTIALITY
   The Employee shall keep all proprietary information confidential during and after employment.

7. TERMINATION
   This contract may be terminated by either party giving one (1) month's written notice or payment in lieu thereof, save for summary dismissal under section 44 of the Employment Act.

8. GOVERNING LAW
   This contract is governed by the Employment Act, 2007 and the laws of Kenya.

SIGNED by the EMPLOYER      )      _______________________
SIGNED by the EMPLOYEE      )      _______________________

DRAWN BY: OMUYOMA & CO. ADVOCATES`,
  },
];

export function Drafting() {
  const [activeKey, setActiveKey] = useState<TemplateKey>("plaint");
  const active = useMemo(() => TEMPLATES.find(t => t.key === activeKey)!, [activeKey]);
  const [title, setTitle] = useState(active.name);
  const [body, setBody] = useState(active.body);

  const selectTemplate = (key: TemplateKey) => {
    const tpl = TEMPLATES.find(t => t.key === key)!;
    setActiveKey(key);
    setTitle(tpl.name);
    setBody(tpl.body);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 56;
    const contentW = pageW - margin * 2;

    const COURT_PLEADINGS = ["plaint", "defence", "affidavit"];
    const drawHeaderFooter = () => {
      const addWatermark = !COURT_PLEADINGS.includes(activeKey);
      // Watermark
      if (addWatermark) { doc.saveGraphicsState();
      // @ts-expect-error - setGState exists at runtime in jsPDF
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      doc.setFont("times", "bold");
      doc.setFontSize(72);
      doc.setTextColor(61, 26, 31); // brand burgundy
      doc.text("OMUYOMA & CO.", pageW / 2, pageH / 2, { align: "center", angle: 30 });
      doc.text("ADVOCATES", pageW / 2, pageH / 2 + 60, { align: "center", angle: 30 });
      doc.restoreGraphicsState(); }

      // Header band
      doc.setFillColor(61, 26, 31);
      doc.rect(0, 0, pageW, 6, "F");
      doc.setFillColor(201, 162, 39);
      doc.rect(0, 6, pageW, 2, "F");

      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.setTextColor(61, 26, 31);
      doc.text("OMUYOMA & CO. ADVOCATES", margin, 36);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(TODAY, pageW - margin, 50, { align: "right" });

      // Divider
      doc.setDrawColor(201, 162, 39);
      doc.setLineWidth(0.7);
      doc.line(margin, 60, pageW - margin, 60);

      // Footer
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, pageH - 48, pageW - margin, pageH - 48);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Omuyoma & Co. Advocates  •  P.O. Box _____, Nairobi  •  info@omuyomaadvocates.co.ke",
        pageW / 2,
        pageH - 32,
        { align: "center" },
      );
    };

    drawHeaderFooter();

    // Title
    let y = 92;
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text(title.toUpperCase(), pageW / 2, y, { align: "center" });
    y += 24;

    // Body
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(body, contentW) as string[];
    const lineH = 16;

    for (const line of lines) {
      if (y > pageH - 70) {
        doc.addPage();
        drawHeaderFooter();
        y = 92;
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
      }
      doc.text(line, margin, y);
      y += lineH;
    }

    const filename = `${title.replace(/[^a-z0-9]+/gi, "_")}_${Date.now()}.pdf`;
    doc.save(filename);
    toast.success("PDF exported");
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-serif">Legal Drafting</h2>
          <p className="text-sm text-muted-foreground mt-1">Draft court documents from vetted templates.</p>
        </div>
        <Button onClick={exportPdf} className="bg-brand-gold text-primary-foreground hover:bg-brand-gold/90">
          <Download className="w-4 h-4" /> Download as PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="glass-card rounded-2xl p-3 h-fit">
          <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/70 px-2 py-2">Templates</p>
          {TEMPLATES.map(t => {
            const active = t.key === activeKey;
            return (
              <button
                key={t.key}
                onClick={() => selectTemplate(t.key)}
                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition mb-1 ${
                  active ? "bg-brand-gold/15 text-brand-gold" : "hover:bg-secondary/40"
                }`}
              >
                <FileSignature className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{t.blurb}</p>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="glass-card rounded-2xl p-4 md:p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-gold" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-serif text-lg border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
              placeholder="Document title"
            />
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck
            className="paper min-h-[60vh] font-serif text-[13px] leading-relaxed whitespace-pre-wrap"
          />
          <p className="text-[11px] text-muted-foreground">
            Tip: replace placeholders in [SQUARE BRACKETS] before exporting. The PDF includes the firm watermark, header band, and footer automatically.
          </p>
        </section>
      </div>
    </div>
  );
}