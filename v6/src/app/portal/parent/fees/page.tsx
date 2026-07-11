"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  MessageCircle, 
  Globe, 
  X, 
  ArrowRight, 
  Info, 
  Calendar, 
  Banknote 
} from "lucide-react";
import { payInvoice } from "@/lib/actions/billing";
import { getParentInvoices } from "@/lib/actions/finance";
import { useSession } from "@/lib/auth-client";

const REGIONS = [
  { flag:'🇲🇾', name:'Malaysia', currency:'MYR — Malaysian Ringgit',
    gateways:['FPX','DuitNow','TNG eWallet'],
    steps:'<strong>1.</strong> DC admin sends you a payment link or bank account details.<br><strong>2.</strong> Pay via FPX (online banking) or DuitNow QR through your banking app.<br><strong>3.</strong> Include Invoice ID in the remarks field.<br><strong>4.</strong> Screenshot and WhatsApp to DC.',
    gwName:'FPX / DuitNow (Malaysia)',
    gwInstructions:'Transfer to the DC bank account provided by admin via WhatsApp. Use <strong>FPX</strong> through your online banking portal or <strong>DuitNow QR</strong> via any Malaysian banking app (Maybank2u, CIMB Clicks, RHB Now, etc.). Always include your Invoice ID in the reference.' },
  { flag:'🇬🇧', name:'United Kingdom', currency:'GBP — British Pound',
    gateways:['Stripe Visa','Bank Transfer'],
    steps:'<strong>1.</strong> DC admin sends a Stripe link via email.<br><strong>2.</strong> Pay securely by card via Stripe checkout.<br><strong>3.</strong> A receipt is emailed automatically.',
    gwName:'Stripe Visa (UK)',
    gwInstructions:'DC admin will email you a <strong>Stripe checkout link</strong>. Pay by debit or credit card — Visa, Mastercard, or Amex.' },
  { flag:'🇺🇸', name:'United States', currency:'USD — US Dollar',
    gateways:['Stripe Visa','Wise'],
    steps:'<strong>1.</strong> DC admin shares Wise details or Stripe link.<br><strong>2.</strong> Pay via Wise (low fees) or card.<br><strong>3.</strong> Forward receipt to DC.',
    gwName:'Stripe Visa / Wise (US)',
    gwInstructions:'Use <strong>Wise</strong> (recommended) to send to the DC account. Alternatively, a Stripe checkout link can be provided.' },
  { flag:'🇧🇩', name:'Bangladesh', currency:'BDT — Bangladeshi Taka',
    gateways:['bKash','Nagad','Bank Transfer'],
    steps:'<strong>1.</strong> DC admin shares bKash/Nagad number.<br><strong>2.</strong> Transfer from your wallet app.<br><strong>3.</strong> Include Invoice ID in reference.',
    gwName:'bKash / Nagad (Bangladesh)',
    gwInstructions:'Transfer to the <strong>bKash</strong> or <strong>Nagad</strong> number shared by DC admin. Always include your Invoice ID.' },
  { flag:'🇦🇪', name:'UAE', currency:'AED — Emirati Dirham',
    gateways:['Stripe Visa','Bank Transfer'],
    steps:'<strong>1.</strong> DC admin shares Stripe link or IBAN.<br><strong>2.</strong> Pay via card or bank transfer.<br><strong>3.</strong> Include Invoice ID in remarks.',
    gwName:'Stripe Visa (UAE)',
    gwInstructions:'DC admin will email you a <strong>Stripe checkout link</strong> (Visa/Mastercard). For local transfers, use the IBAN provided.' },
  { flag:'🇸🇬', name:'Singapore', currency:'SGD — Singapore Dollar',
    gateways:['Stripe PayPal','PayNow'],
    steps:'<strong>1.</strong> DC admin shares PayNow QR or PayPal link.<br><strong>2.</strong> Pay via PayNow or PayPal account.<br><strong>3.</strong> Forward confirmation to DC.',
    gwName:'Stripe PayPal / PayNow (Singapore)',
    gwInstructions:'Use <strong>PayNow</strong> QR shared by admin or the <strong>Stripe PayPal</strong> link for secure checkout.' },
  { flag:'🇸🇦', name:'Saudi Arabia', currency:'SAR — Saudi Riyal',
    gateways:['Al Rajhi','STC Pay','Mada','Western Union'],
    steps:'<strong>1.</strong> DC admin provides IBAN or STC Pay number.<br><strong>2.</strong> Transfer via bank app or Western Union.<br><strong>3.</strong> Include Invoice ID in notes.',
    gwName:'Al Rajhi / STC Pay / Western Union (KSA)',
    gwInstructions:'Transfer via <strong>Al Rajhi Bank</strong>, <strong>STC Pay</strong>, or <strong>Western Union</strong> for cash pickup. Details shared by admin.' },
  { flag:'🇮🇳', name:'India', currency:'INR — Indian Rupee',
    gateways:['Razorpay','UPI','NEFT'],
    steps:'<strong>1.</strong> DC admin shares UPI ID or Razorpay link.<br><strong>2.</strong> Pay from any UPI app (GPay/PhonePe).<br><strong>3.</strong> Include Invoice ID in remarks.',
    gwName:'Razorpay / UPI (India)',
    gwInstructions:'Use the <strong>UPI ID</strong> shared by admin. Pay from GPay, PhonePe, or Paytm. Add Invoice ID in remarks.' },
  { flag:'🇵🇰', name:'Pakistan', currency:'PKR — Pakistani Rupee',
    gateways:['EasyPaisa','JazzCash','Bank Transfer'],
    steps:'<strong>1.</strong> DC admin shares EasyPaisa/JazzCash number.<br><strong>2.</strong> Send payment from your wallet app.<br><strong>3.</strong> Screenshot and WhatsApp to DC.',
    gwName:'EasyPaisa / JazzCash (Pakistan)',
    gwInstructions:'Transfer to the <strong>EasyPaisa</strong> or <strong>JazzCash</strong> number shared by DC admin. Include Invoice ID.' },
];

export default function ParentFeesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("invoices");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    if (session?.user) { const u = session.user as any; getParentInvoices(u.id).then(setInvoices); }
  }, [isPayModalOpen, session]);

  const outstanding = invoices.filter(inv => inv.status !== "paid");
  const history = invoices.filter(inv => inv.status === "paid");

  const selectedRegionData = REGIONS.find(r => r.name === selectedRegion);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Fees & Payments</h1>
          <p className="text-[var(--text-muted)] font-medium mt-1">Manage billing, track receipts, and view payment guides.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <CheckCircle size={14} /> Account in good standing
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-secondary)] dark:bg-white/5 p-1 rounded-2xl w-fit">
        {[
          { id: "invoices", label: "Invoices", icon: FileText },
          { id: "guide", label: "Payment Guide", icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeTab === tab.id 
                ? "bg-white dark:bg-white/10 text-[var(--gold)] shadow-sm" 
                : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "invoices" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Outstanding */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <AlertCircle size={16} className="text-[var(--gold)]" /> Outstanding
            </h3>
            <div className="space-y-4">
              {outstanding.length > 0 ? outstanding.map((inv) => (
                <div key={inv.id} className="p-6 border-2 border-red-200 dark:border-red-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-red-500 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl flex items-center justify-center">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{inv.id.slice(-8).toUpperCase()}</p>
                      <p className="text-lg font-black text-[var(--navy)] dark:text-white uppercase">{inv.month} Tuition</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-1">Due {new Date(inv.issuedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-black text-red-600">£{inv.amount}</p>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-red-100 text-red-700 rounded-full uppercase tracking-widest">{inv.status}</span>
                    </div>
                    <button 
                      onClick={() => { setSelectedInvoice(inv); setIsPayModalOpen(true); }}
                      className="px-6 py-3 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-[var(--text-muted)] uppercase text-[10px] font-black tracking-widest">
                  No outstanding invoices.
                </div>
              )}
            </div>
          </div>

          {/* History */}
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={16} className="text-[var(--gold)]" /> Payment History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] dark:bg-white/5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {history.length > 0 ? history.map((inv, i) => (
                    <tr key={i} className="text-xs group hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--navy)] dark:text-white uppercase text-[10px]">{inv.month} Tuition</span>
                          <span className="text-[11px] text-[var(--text-muted)] font-black uppercase tracking-widest">{inv.id.slice(-8).toUpperCase()} · Paid {new Date(inv.issuedAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-black text-[var(--navy)] dark:text-white">£{inv.amount}</td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Cleared</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => alert(`Downloading Receipt for ${inv.id.slice(-8).toUpperCase()}...`)}
                          className="p-2 bg-[var(--bg-secondary)] dark:bg-white/10 text-[var(--text-muted)] hover:text-[var(--gold)] rounded-lg transition-all flex items-center gap-2 ml-auto text-[11px] font-black uppercase tracking-widest"
                        >
                          <Download size={12} /> Receipt
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)] uppercase text-[10px] font-black tracking-widest italic">
                        No payment history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-6 rounded-2xl flex items-center gap-4">
            <MessageCircle size={20} className="text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
              <strong>Payment queries?</strong> WhatsApp us directly for receipts, disputes, or fee adjustments. <span className="underline cursor-pointer ml-1">Chat with DC →</span>
            </p>
          </div>
        </div>
      )}

      {activeTab === "guide" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm">
            <div className="max-w-3xl">
              <h3 className="text-sm font-black text-[var(--navy)] dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                <Globe size={16} className="text-[var(--gold)]" /> Regional Payment Guide
              </h3>
              <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed mb-8 uppercase tracking-tight">
                DivergenCIE accepts payments from global regions. Find your region below for recommended gateways.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {REGIONS.map((r, i) => (
                <div key={i} className="p-6 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl group hover:border-[var(--gold)] transition-all">
                  <div className="text-3xl mb-4">{r.flag}</div>
                  <p className="text-sm font-black text-[var(--navy)] dark:text-white uppercase">{r.name}</p>
                  <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{r.currency}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {r.gateways.map(g => (
                      <span key={g} className="text-[10px] font-black px-2 py-0.5 bg-white dark:bg-white/10 border border-[var(--border-subtle)] rounded-full uppercase tracking-widest text-[var(--navy)] dark:text-white">{g}</span>
                    ))}
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] leading-relaxed" dangerouslySetInnerHTML={{ __html: r.steps }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--navy)] text-white rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-8">
              <div className="flex-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2"><Info size={16} /> Important Notes</h3>
                <ul className="space-y-3">
                  {[
                    "Always include your Invoice ID in the payment reference field.",
                    "Payments are confirmed within 1–2 business days automatically.",
                    "Receipts are emailed within 24 hours of confirmation.",
                    "For international transfers, use Wise for best exchange rates."
                  ].map((note, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs font-medium text-white/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-1.5 shrink-0"></div>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl max-w-xs">
                <p className="text-xs font-black uppercase tracking-widest mb-4">Support Team</p>
                <p className="text-[10px] font-medium text-white/60 leading-relaxed mb-6">Our finance team is available 9 AM–9 PM (UTC+0) to assist with any payment issues.</p>
                <button className="w-full py-4 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <MessageCircle size={14} /> WhatsApp Us
                </button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-[#111] border border-[var(--border-subtle)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--navy)] dark:text-white uppercase tracking-tight">Pay Invoice</h3>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{selectedInvoice?.id.slice(-8).toUpperCase()} · £{selectedInvoice?.amount}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-full transition-all">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Select Your Region</label>
                <select 
                  className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-[var(--gold)] appearance-none cursor-pointer"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="">— Choose Region —</option>
                  {REGIONS.map(r => <option key={r.name} value={r.name}>{r.flag} {r.name}</option>)}
                </select>
              </div>

              {selectedRegionData && (
                <div className="animate-in slide-in-from-top-2 duration-300 space-y-6">
                  <div className="p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-2xl">
                    <p className="text-[10px] font-black text-[var(--gold)] uppercase tracking-widest mb-2">{selectedRegionData.gwName}</p>
                    <div className="text-[11px] font-bold text-[var(--text-muted)] leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedRegionData.gwInstructions }}></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Reference (Optional)</label>
                    <input type="text" placeholder="Transaction ID / UTR" className="w-full p-4 bg-[var(--bg-secondary)] dark:bg-white/5 border border-[var(--border-subtle)] rounded-xl text-xs font-black outline-none focus:border-[var(--gold)]" />
                  </div>

                  <button 
                    disabled={loading}
                    onClick={async () => { 
                      if (selectedInvoice) {
                        setLoading(true);
                        await payInvoice(selectedInvoice.id);
                        setLoading(false);
                        setIsPayModalOpen(false);
                      }
                    }}
                    className="w-full py-5 bg-[var(--gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Confirm & Notify DC"}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-[var(--bg-secondary)] dark:bg-white/5 border-t border-[var(--border-subtle)] text-center">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center justify-center gap-2">
                <Info size={12} className="text-[var(--gold)]" /> Admin will verify within 1–2 days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
