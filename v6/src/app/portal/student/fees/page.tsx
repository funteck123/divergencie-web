"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { getStudentInvoices, submitManualPaymentReceipt } from "@/lib/actions/billing";
import { 
  CreditCard, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  FileText, 
  ArrowRight,
  TrendingUp,
  X,
  FileCheck,
  ChevronDown,
  Info
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  paid: { label: "Paid", bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  unpaid: { label: "Unpaid", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", icon: Clock },
  overdue: { label: "Overdue", bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-700 dark:text-rose-400", icon: AlertCircle },
  processing: { label: "Processing", bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", icon: Loader2 },
  draft: { label: "Draft", bg: "bg-gray-50 dark:bg-gray-900/40", text: "text-gray-700 dark:text-gray-400", icon: FileText }
};

export default function StudentFeesPage() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Receipt upload modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadInvoice, setUploadInvoice] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Accordion state
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const data = await getStudentInvoices(session.user.id);
      setInvoices(data);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchInvoices();
    }
  }, [session]);

  const handleStripePay = async (invoiceId: string) => {
    setCheckoutLoading(invoiceId);
    try {
      const res = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout session");
      }
    } catch (err) {
      console.error("Stripe payment error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadInvoice || !selectedFile) return;

    setUploading(true);
    try {
      // 1. Upload receipt to Supabase storage bucket via api endpoint
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const uploadRes = await fetch("/api/upload/receipt", {
        method: "POST",
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (uploadData.error) {
        throw new Error(uploadData.error);
      }

      // 2. Submit payment record using server action
      await submitManualPaymentReceipt({
        invoiceId: uploadInvoice.id,
        receiptUrl: uploadData.url,
        amount: uploadInvoice.netAmount,
        currency: uploadInvoice.currency,
        notes: uploadNotes
      });

      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadNotes("");
      setUploadInvoice(null);
      
      alert("Receipt uploaded and submitted for verification successfully!");
      await fetchInvoices();
    } catch (err: any) {
      console.error("Manual receipt upload failed:", err);
      alert(err.message || "Failed to upload receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Compute stats
  const unpaidInvoices = invoices.filter(inv => inv.status === "unpaid" || inv.status === "overdue");
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
  const currencySymbol = unpaidInvoices[0]?.currency === "USD" ? "$" : "£";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Tuition & Fees</h1>
        <p className="text-[var(--text-muted)] font-medium mt-1">Settle tuition invoices, view class billing details, and manage payment receipts.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Outstanding Balance */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Outstanding Balance</p>
            <h3 className="text-3xl font-black text-[var(--navy)] dark:text-white mt-1">
              {currencySymbol}{totalOutstanding.toFixed(2)}
            </h3>
            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase">
              {unpaidInvoices.length} Unpaid {unpaidInvoices.length === 1 ? 'invoice' : 'invoices'}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
            <Clock size={24} />
          </div>
        </div>

        {/* Payment Speed */}
        <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Invoiced</p>
            <h3 className="text-3xl font-black text-[var(--navy)] dark:text-white mt-1">
              {currencySymbol}{invoices.reduce((s, i) => s + i.netAmount, 0).toFixed(2)}
            </h3>
            <p className="text-[9px] font-bold text-[var(--text-muted)] mt-1 uppercase">
              Accumulated billing
            </p>
          </div>
          <div className="w-12 h-12 bg-[var(--navy)]/10 rounded-2xl flex items-center justify-center text-[var(--navy)] dark:text-blue-400">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-gradient-to-br from-[var(--navy)] to-blue-900 text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-200">DivergenCIE Direct Bank Details</p>
            <div className="mt-2 space-y-1 text-[10px] font-bold text-blue-100">
              <p>Bank: Barclays Bank PLC</p>
              <p>Account: 83921029</p>
              <p>Sort Code: 20-45-89</p>
              <p>Ref: Include student name</p>
            </div>
          </div>
          <p className="text-[8px] font-black uppercase text-amber-400 tracking-wider mt-4">Settle manually or via Stripe</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2 px-2">
          <FileText size={14} className="text-[var(--gold)]" /> Invoices List
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[var(--gold)]" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
            No invoices generated yet
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => {
              const status = inv.status?.toLowerCase() || "draft";
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              const isUnpaid = status === "unpaid" || status === "overdue";
              const isProcessing = status === "processing";
              const isExpanded = expandedInvoiceId === inv.id;

              return (
                <div 
                  key={inv.id} 
                  className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl shadow-sm overflow-hidden transition-all duration-300"
                >
                  {/* Invoice Main Row */}
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[var(--bg-secondary)] dark:bg-white/5 rounded-2xl text-[var(--navy)] dark:text-white shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-[var(--navy)] dark:text-white flex items-center gap-2">
                          Tuition Invoice — {inv.month}
                          {inv.serialNo && (
                            <span className="text-[9px] font-bold text-[var(--text-muted)]">
                              #{inv.serialNo}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.text}`}>
                            <StatusIcon size={9} className={isProcessing ? "animate-spin" : ""} /> {cfg.label}
                          </span>
                          <span className="text-[9px] font-bold text-[var(--text-muted)]">
                            Net: {currencySymbol}{inv.netAmount.toFixed(2)}
                          </span>
                          {inv.dueAmount > 0 && (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                              Due: {currencySymbol}{inv.dueAmount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Accordion Toggle */}
                      <button
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                        className="py-2.5 px-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 text-[var(--navy)] dark:text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:border-[var(--gold)] transition-colors flex items-center gap-1.5"
                      >
                        Details <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isUnpaid && (
                        <>
                          <button
                            onClick={() => { setUploadInvoice(inv); setIsUploadOpen(true); }}
                            className="py-2.5 px-4 bg-white dark:bg-white/5 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:border-amber-500 transition-colors flex items-center gap-1.5"
                          >
                            <Upload size={13} /> Bank Receipt
                          </button>
                          <button
                            disabled={checkoutLoading === inv.id}
                            onClick={() => handleStripePay(inv.id)}
                            className="py-2.5 px-5 bg-[var(--navy)] hover:bg-[var(--navy)]/90 dark:bg-white dark:hover:bg-white/95 text-white dark:text-black text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {checkoutLoading === inv.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CreditCard size={13} />
                            )}
                            Pay Online
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Invoice Line Items Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-[var(--border-subtle)] dark:border-white/10 pt-5 bg-[var(--bg-secondary)]/30 dark:bg-black/10 space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">Line Items Breakdown</h5>
                      
                      <div className="space-y-2.5">
                        {!inv.lineItems || inv.lineItems.length === 0 ? (
                          <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider py-2">No individual line items registered for this invoice.</p>
                        ) : (
                          inv.lineItems.map((item: any) => {
                            const formattedDate = item.sessionDate ? new Date(item.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                            return (
                              <div 
                                key={item.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl hover:border-[var(--gold)]/40 transition-colors gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-[var(--bg-secondary)] dark:bg-white/10 rounded-md text-[var(--text-muted)]">
                                      {item.lineType || "CLASS"}
                                    </span>
                                    {item.sessionHours && (
                                      <span className="text-[9px] font-bold text-[var(--text-muted)]">
                                        {item.sessionHours} hrs
                                      </span>
                                    )}
                                    {item.rateSnapshot && (
                                      <span className="text-[9px] font-bold text-[var(--text-muted)]">
                                        {currencySymbol}{item.rateSnapshot}/hr
                                      </span>
                                    )}
                                  </div>
                                  <h6 className="text-[10px] font-black uppercase tracking-tight text-[var(--navy)] dark:text-white">
                                    {item.description || item.serviceNameSnapshot || "Class Session"}
                                  </h6>
                                  {item.sessionDate && (
                                    <p className="text-[8px] font-bold text-[var(--text-muted)]">
                                      Session Date: {formattedDate}
                                    </p>
                                  )}
                                </div>

                                <span className="text-xs font-black text-[var(--navy)] dark:text-white shrink-0 self-end sm:self-center">
                                  {currencySymbol}{(item.convertedAmount || item.correctionAmount || item.originalAmount || 0.0).toFixed(2)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Upload Receipt Modal */}
      {isUploadOpen && uploadInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] dark:border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border-subtle)] dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Upload Payment Receipt</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Submit bank transfer receipt for invoice {uploadInvoice.month}</p>
              </div>
              <button onClick={() => { setIsUploadOpen(false); setUploadInvoice(null); }} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full transition-all">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form onSubmit={handleReceiptSubmit} className="p-8 space-y-5">
              <div className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-2xl flex gap-3.5 items-start">
                <Info size={16} className="text-[var(--navy)] dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[10px] font-bold text-[var(--text-muted)] dark:text-gray-300 leading-normal space-y-1">
                  <p className="font-black uppercase tracking-wider text-[var(--navy)] dark:text-white">Manual Wire Instructions</p>
                  <p>Send wire transfers of <span className="text-[var(--gold)] font-black">{currencySymbol}{uploadInvoice.netAmount.toFixed(2)}</span> to our Barclays account shown on dashboard.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select Receipt File</label>
                <div className="flex items-center justify-center border-2 border-dashed border-[var(--border-subtle)] dark:border-white/20 rounded-2xl p-6 hover:border-[var(--gold)] transition-colors relative">
                  <input 
                    type="file" 
                    required
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  />
                  <div className="text-center space-y-2.5">
                    <FileCheck size={28} className={selectedFile ? "text-emerald-500 mx-auto" : "text-[var(--text-muted)] mx-auto"} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                        {selectedFile ? selectedFile.name : "Choose File"}
                      </p>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] mt-1">JPEG, PNG, WEBP or PDF (max 5MB)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Payment Notes (Optional)</label>
                <textarea 
                  rows={2} 
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="Reference number, date, or other details..." 
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:border-[var(--gold)]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={uploading || !selectedFile}
                className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
                Submit Receipt
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
