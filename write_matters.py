import os

content = r'''import { useState } from "react";
import { Plus, Folder, FolderOpen, FileText, Upload, Link, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "../types";
import { cn } from "@/lib/utils";

const CASE_TYPES: Record<string, string> = {
  "Civil Litigation": "CL", "Commercial": "CM", "Family Law": "FL",
  "Criminal": "CR", "Conveyancing": "CV", "Intellectual Property": "IP",
  "Probate & Administration": "PA",
};
const STAFF_LIST = ["Managing Partner", "Associate Counsel", "Paralegal Officer"];

interface Doc { id: string; name: string; date: string; uploadedBy: string; type: "pleading"|"invoice"|"correspondence"|"financial"|"docket"|"other"; }
interface SubFolder { id: string; name: string; documents: Doc[]; }
interface CaseFolder { id: string; caseNumber: string; caseType: string; title: string; plaintiffs: string; defendants: string; assignedTo: string; status: "active"|"closed"|"pending"; subfolders: SubFolder[]; documents: Doc[]; secureLink?: string; }
interface ClientFolder { id: string; clientName: string; clientEmail: string; clientPhone: string; cases: CaseFolder[]; }

function genCaseNum(type: string, count: number) {
  return `OM/${CASE_TYPES[type]||"GN"}/${new Date().getFullYear()}/${String(count).padStart(3,"0")}`;
}

const DOC_COLOR: Record<string,string> = {
  pleading:"text-muted-foreground", invoice:"text-brand-gold",
  correspondence:"text-primary", financial:"text-blue-400",
  docket:"text-green-400", other:"text-muted-foreground"
};

export function MatterHub({ role }: { role: Role }) {
  const [clients, setClients] = useState<ClientFolder[]>([]);
  const [expClient, setExpClient] = useState<string|null>(null);
  const [expCase, setExpCase] = useState<string|null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newCaseOpen, setNewCaseOpen] = useState<string|null>(null);
  const [newSFOpen, setNewSFOpen] = useState<{cId:string;csId:string}|null>(null);
  const [draftOpen, setDraftOpen] = useState<{cId:string;csId:string}|null>(null);
  const [linkModal, setLinkModal] = useState<string|null>(null);
  const [cf, setCf] = useState({name:"",email:"",phone:""});
  const [csf, setCsf] = useState({caseType:"Civil Litigation",title:"",plaintiffs:"",defendants:"",assignedTo:"Managing Partner"});
  const [sfName, setSfName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const addClient = () => {
    if (!cf.name) return;
    setClients(p=>[...p,{id:`c${Date.now()}`,clientName:cf.name,clientEmail:cf.email,clientPhone:cf.phone,cases:[]}]);
    setCf({name:"",email:"",phone:""}); setNewClientOpen(false);
  };

  const addCase = (cId: string) => {
    if (!csf.title) return;
    setClients(p=>p.map(c=>{
      if(c.id!==cId) return c;
      const num=c.cases.length+1;
      return {...c,cases:[...c.cases,{id:`cs${Date.now()}`,caseNumber:genCaseNum(csf.caseType,num),caseType:csf.caseType,title:csf.title,plaintiffs:csf.plaintiffs,defendants:csf.defendants,assignedTo:csf.assignedTo,status:"active",subfolders:[],documents:[]}]};
    }));
    setCsf({caseType:"Civil Litigation",title:"",plaintiffs:"",defendants:"",assignedTo:"Managing Partner"}); setNewCaseOpen(null);
  };

  const addSF = (cId:string,csId:string) => {
    if(!sfName) return;
    setClients(p=>p.map(c=>c.id!==cId?c:{...c,cases:c.cases.map(cs=>cs.id!==csId?cs:{...cs,subfolders:[...cs.subfolders,{id:`sf${Date.now()}`,name:sfName,documents:[]}]})}));
    setSfName(""); setNewSFOpen(null);
  };

  const upload = (cId:string,csId:string,type:Doc["type"],sfId?:string) => {
    const inp=document.createElement("input"); inp.type="file";
    inp.onchange=(e)=>{
      const file=(e.target as HTMLInputElement).files?.[0]; if(!file) return;
      const doc:Doc={id:`d${Date.now()}`,name:file.name,date:new Date().toISOString().slice(0,10),uploadedBy:role,type};
      setClients(p=>p.map(c=>c.id!==cId?c:{...c,cases:c.cases.map(cs=>{
        if(cs.id!==csId) return cs;
        if(sfId) return {...cs,subfolders:cs.subfolders.map(sf=>sf.id===sfId?{...sf,documents:[...sf.documents,doc]}:sf)};
        return {...cs,documents:[...cs.documents,doc]};
      })}));
    }; inp.click();
  };

  const genLink=(cId:string,csId:string)=>{
    const link=`${window.location.origin}/client/${btoa(`${csId}-${Date.now()}`).slice(0,16)}`;
    setClients(p=>p.map(c=>c.id!==cId?c:{...c,cases:c.cases.map(cs=>cs.id===csId?{...cs,secureLink:link}:cs)}));
    setLinkModal(link);
  };

  const saveDraft=(cId:string,csId:string)=>{
    if(!draftTitle) return;
    const doc:Doc={id:`d${Date.now()}`,name:`${draftTitle}.docx`,date:new Date().toISOString().slice(0,10),uploadedBy:role,type:"correspondence"};
    setClients(p=>p.map(c=>c.id!==cId?c:{...c,cases:c.cases.map(cs=>cs.id===csId?{...cs,documents:[...cs.documents,doc]}:cs)}));
    setDraftTitle(""); setDraftBody(""); setDraftOpen(null);
  };

  const canEdit = role==="partner"||role==="associate";

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-brand-gold/80 font-mono mb-2">Client Files</p>
          <h2 className="text-4xl font-serif">Matter <span className="text-gradient-gold">Hub</span></h2>
        </div>
        {canEdit && <Button onClick={()=>setNewClientOpen(true)} className="bg-brand-gold text-primary-foreground"><Plus className="w-4 h-4 mr-2"/>New Client</Button>}
      </div>
      <div className="gold-divider mb-6"/>

      {clients.length===0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">No clients yet. Add your first client to get started.</div>
      ) : (
        <div className="space-y-3">
          {clients.map(client=>(
            <div key={client.id} className="glass-card rounded-2xl overflow-hidden">
              <button onClick={()=>setExpClient(expClient===client.id?null:client.id)} className="w-full flex items-center gap-4 p-5 hover:bg-white/5 transition text-left">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-serif text-primary font-bold text-sm">
                  {client.clientName.split(" ").map((n:string)=>n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{client.clientName}</p>
                  <p className="text-xs text-muted-foreground">{client.cases.length} case{client.cases.length!==1?"s":""} · {client.clientEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && <Button size="sm" variant="ghost" className="text-brand-gold h-8 text-xs" onClick={e=>{e.stopPropagation();setNewCaseOpen(client.id);}}><Plus className="w-3 h-3 mr-1"/>Add Case</Button>}
                  {expClient===client.id?<ChevronDown className="w-4 h-4 text-muted-foreground"/>:<ChevronRight className="w-4 h-4 text-muted-foreground"/>}
                </div>
              </button>

              {expClient===client.id && (
                <div className="border-t border-border/50 divide-y divide-border/30">
                  {client.cases.length===0 ? <p className="text-center text-sm text-muted-foreground py-6">No cases yet.</p>
                  : client.cases.map(cs=>(
                    <div key={cs.id}>
                      <button onClick={()=>setExpCase(expCase===cs.id?null:cs.id)} className="w-full flex items-start gap-4 px-5 py-4 hover:bg-white/5 transition text-left">
                        {expCase===cs.id?<FolderOpen className="w-5 h-5 text-brand-gold mt-0.5"/>:<Folder className="w-5 h-5 text-brand-gold/60 mt-0.5"/>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-primary/15 text-primary px-2 py-0.5 rounded">{cs.caseNumber}</span>
                            <span className="font-medium text-sm">{cs.title}</span>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full",cs.status==="active"?"bg-success/15 text-success":"bg-muted/40 text-muted-foreground")}>{cs.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1"><span className="text-foreground/70">Plaintiff:</span> {cs.plaintiffs} <span className="mx-1">vs</span> <span className="text-foreground/70">Defendant:</span> {cs.defendants}</p>
                          <p className="text-xs text-muted-foreground">Assigned: {cs.assignedTo} · {cs.caseType}</p>
                        </div>
                        {expCase===cs.id?<ChevronDown className="w-4 h-4 text-muted-foreground"/>:<ChevronRight className="w-4 h-4 text-muted-foreground"/>}
                      </button>

                      {expCase===cs.id && (
                        <div className="px-5 pb-5 bg-white/[0.02]">
                          <div className="flex flex-wrap gap-2 mb-4 pt-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs border border-border/50" onClick={()=>upload(client.id,cs.id,"pleading")}><Upload className="w-3 h-3 mr-1"/>Upload Document</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs border border-border/50" onClick={()=>setDraftOpen({cId:client.id,csId:cs.id})}><FileText className="w-3 h-3 mr-1"/>Draft Document</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs border border-border/50" onClick={()=>setNewSFOpen({cId:client.id,csId:cs.id})}><Folder className="w-3 h-3 mr-1"/>Add Subfolder</Button>
                            {canEdit && <Button size="sm" variant="ghost" className="h-7 text-xs border border-brand-gold/40 text-brand-gold" onClick={()=>genLink(client.id,cs.id)}><Link className="w-3 h-3 mr-1"/>Generate Client Link</Button>}
                          </div>

                          {cs.subfolders.length>0 && (
                            <div className="mb-4">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Subfolders</p>
                              {cs.subfolders.map(sf=>(
                                <div key={sf.id} className="glass-panel rounded-lg p-3 mb-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2"><Folder className="w-4 h-4 text-brand-gold/60"/><span className="text-sm font-medium">{sf.name}</span><span className="text-[10px] text-muted-foreground">({sf.documents.length})</span></div>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={()=>upload(client.id,cs.id,"other",sf.id)}><Upload className="w-3 h-3 mr-1"/>Upload</Button>
                                  </div>
                                  {sf.documents.map(d=>(
                                    <div key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground pl-6 py-1">
                                      <FileText className={`w-3 h-3 ${DOC_COLOR[d.type]}`}/><span>{d.name}</span><span className="ml-auto">{d.date}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                          {cs.documents.length>0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Case Documents</p>
                              {cs.documents.map(d=>(
                                <div key={d.id} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-white/5">
                                  <FileText className={`w-4 h-4 ${DOC_COLOR[d.type]}`}/><span className="flex-1 truncate">{d.name}</span>
                                  <span className="text-muted-foreground capitalize">{d.type}</span><span className="text-muted-foreground">{d.date}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {cs.documents.length===0&&cs.subfolders.length===0&&(
                            <p className="text-xs text-muted-foreground text-center py-4">No documents yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Client */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">New Client</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={cf.name} onChange={e=>setCf(f=>({...f,name:e.target.value}))} placeholder="e.g. Kamau Njoroge"/></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={cf.email} onChange={e=>setCf(f=>({...f,email:e.target.value}))} placeholder="client@email.com"/></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={cf.phone} onChange={e=>setCf(f=>({...f,phone:e.target.value}))} placeholder="+254 7XX XXX XXX"/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setNewClientOpen(false)}>Cancel</Button>
            <Button onClick={addClient} className="bg-brand-gold text-primary-foreground">Create Client Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Case */}
      <Dialog open={!!newCaseOpen} onOpenChange={()=>setNewCaseOpen(null)}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">New Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Case Type</Label>
              <Select value={csf.caseType} onValueChange={v=>setCsf(f=>({...f,caseType:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{Object.keys(CASE_TYPES).map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Case Title</Label><Input value={csf.title} onChange={e=>setCsf(f=>({...f,title:e.target.value}))} placeholder="e.g. Sale of Land at Karen"/></div>
            <div className="space-y-2"><Label>Plaintiff(s)</Label><Input value={csf.plaintiffs} onChange={e=>setCsf(f=>({...f,plaintiffs:e.target.value}))} placeholder="e.g. John Kamau"/></div>
            <div className="space-y-2"><Label>Defendant(s)</Label><Input value={csf.defendants} onChange={e=>setCsf(f=>({...f,defendants:e.target.value}))} placeholder="e.g. Jane Wanjiku"/></div>
            <div className="space-y-2"><Label>Assign To</Label>
              <Select value={csf.assignedTo} onValueChange={v=>setCsf(f=>({...f,assignedTo:v}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{STAFF_LIST.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setNewCaseOpen(null)}>Cancel</Button>
            <Button onClick={()=>newCaseOpen&&addCase(newCaseOpen)} className="bg-brand-gold text-primary-foreground">Create Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subfolder */}
      <Dialog open={!!newSFOpen} onOpenChange={()=>setNewSFOpen(null)}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Add Subfolder</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Folder Name</Label><Input value={sfName} onChange={e=>setSfName(e.target.value)} placeholder="e.g. Pleadings, Invoices, Correspondence"/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setNewSFOpen(null)}>Cancel</Button>
            <Button onClick={()=>newSFOpen&&addSF(newSFOpen.cId,newSFOpen.csId)} className="bg-brand-gold text-primary-foreground">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draft */}
      <Dialog open={!!draftOpen} onOpenChange={()=>setDraftOpen(null)}>
        <DialogContent className="glass-card border-border max-w-2xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Draft Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title</Label><Input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="e.g. Letter to Client re: Hearing"/></div>
            <div className="space-y-2"><Label>Content</Label><textarea value={draftBody} onChange={e=>setDraftBody(e.target.value)} className="w-full h-48 bg-transparent border border-border rounded-lg p-3 text-sm font-mono focus:outline-none resize-none" placeholder="Type your document here..."/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setDraftOpen(null)}>Cancel</Button>
            <Button onClick={()=>draftOpen&&saveDraft(draftOpen.cId,draftOpen.csId)} className="bg-brand-gold text-primary-foreground">Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secure Link */}
      <Dialog open={!!linkModal} onOpenChange={()=>setLinkModal(null)}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Secure Client Link</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">Share this link with your client. They can only view their specific case.</p>
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <Link className="w-4 h-4 text-primary shrink-0"/>
              <span className="text-xs font-mono text-primary break-all">{linkModal}</span>
            </div>
            <Button className="w-full mt-3" variant="ghost" onClick={()=>{navigator.clipboard.writeText(linkModal||"");setLinkModal(null);}}>Copy Link</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'''
with open("/tmp/Matters.tsx", "w") as f:
    f.write(content)
print("Written:", len(content), "chars")
