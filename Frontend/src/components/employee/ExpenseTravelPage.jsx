import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import {
  Receipt,
  Plane,
  Plus,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building,
  Calendar,
  X,
  Check,
  ExternalLink
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const EXPENSE_CATEGORIES = [
  "Travel & Flights",
  "Accommodation",
  "Meals & Subsistence",
  "Tools & Equipment",
  "Client Entertainment",
  "Software & Subscriptions",
  "Miscellaneous",
];

export default function ExpenseTravelPage() {
  const { user } = useAuth();
  const isApprover = ["ADMIN", "HR", "MANAGER"].includes(user?.role);
  const isFinance = ["ADMIN", "HR"].includes(user?.role);

  const [activeSection, setActiveSection] = useState("expenses"); // 'expenses' or 'travel'
  const [activeView, setActiveView] = useState("my"); // 'my' or 'approvals'

  // Data
  const [myClaims, setMyClaims] = useState([]);
  const [myTravels, setMyTravels] = useState([]);
  const [pendingExpenseApprovals, setPendingExpenseApprovals] = useState([]);
  const [pendingTravelApprovals, setPendingTravelApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    category: EXPENSE_CATEGORIES[0],
    expenseDate: new Date().toISOString().split("T")[0],
    amount: "",
    currency: "USD",
    description: "",
    receiptUrl: "",
  });

  const [travelForm, setTravelForm] = useState({
    destination: "",
    purpose: "",
    departureDate: "",
    returnDate: "",
    estimatedBudget: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [claimsRes, travelsRes] = await Promise.all([
        api.get("/expenses/my-claims").catch(() => ({ data: [] })),
        api.get("/travel/my-requests").catch(() => ({ data: [] })),
      ]);

      setMyClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
      setMyTravels(Array.isArray(travelsRes.data) ? travelsRes.data : []);

      if (isApprover) {
        const [pExpRes, pTrvRes] = await Promise.all([
          api.get("/expenses/pending-approvals").catch(() => ({ data: [] })),
          api.get("/travel/pending-approvals").catch(() => ({ data: [] })),
        ]);
        setPendingExpenseApprovals(Array.isArray(pExpRes.data) ? pExpRes.data : []);
        setPendingTravelApprovals(Array.isArray(pTrvRes.data) ? pTrvRes.data : []);
      }
    } catch (err) {
      console.error("Expense/Travel fetch error:", err);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post("/expenses/claim", {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
      });
      toast.success("Expense claim submitted for approval!");
      setShowExpenseModal(false);
      setExpenseForm({
        category: EXPENSE_CATEGORIES[0],
        expenseDate: new Date().toISOString().split("T")[0],
        amount: "",
        currency: "USD",
        description: "",
        receiptUrl: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit expense claim");
    }
  };

  const handleCreateTravel = async (e) => {
    e.preventDefault();
    try {
      await api.post("/travel/request", {
        ...travelForm,
        estimatedBudget: parseFloat(travelForm.estimatedBudget || 0),
      });
      toast.success("Travel authorization request submitted!");
      setShowTravelModal(false);
      setTravelForm({
        destination: "",
        purpose: "",
        departureDate: "",
        returnDate: "",
        estimatedBudget: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit travel request");
    }
  };

  const handleExpenseAction = async (id, action) => {
    try {
      const endpoint =
        action === "Approve" ? `/expenses/approve/${id}` : `/expenses/reject/${id}`;
      await api.post(endpoint, { comments: `${action}d by manager` });
      toast.success(`Expense claim ${action.toLowerCase()}d!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action.toLowerCase()} claim`);
    }
  };

  const handleReimburse = async (id) => {
    try {
      await api.patch(`/expenses/reimburse/${id}`, { reimbursementStatus: "Paid" });
      toast.success("Expense marked as Paid / Reimbursed!");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update reimbursement");
    }
  };

  const handleTravelAction = async (id, action) => {
    try {
      const endpoint =
        action === "Approve" ? `/travel/approve/${id}` : `/travel/reject/${id}`;
      await api.post(endpoint, { comments: `${action}d by manager` });
      toast.success(`Travel request ${action.toLowerCase()}d!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${action.toLowerCase()} travel`);
    }
  };

  // Metrics
  const totalClaimed = myClaims.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
  const totalApproved = myClaims
    .filter((c) => c.status === "Approved")
    .reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
  const totalReimbursed = myClaims
    .filter((c) => c.reimbursement_status === "Paid")
    .reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#172033]">
            Travel & Corporate Expenses
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Submit business travel requests, file expense reimbursements, and monitor approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Section switcher */}
          <div className="flex bg-[#F7F8FA] border border-[#E5E7EB] p-1 rounded-xl">
            <button
              onClick={() => setActiveSection("expenses")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSection === "expenses"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Expenses
            </button>
            <button
              onClick={() => setActiveSection("travel")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSection === "travel"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              <Plane className="w-3.5 h-3.5" /> Travel
            </button>
          </div>

          {activeSection === "expenses" ? (
            <Button
              onClick={() => setShowExpenseModal(true)}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs h-9 px-4 gap-2 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" /> New Expense Claim
            </Button>
          ) : (
            <Button
              onClick={() => setShowTravelModal(true)}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs h-9 px-4 gap-2 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" /> Request Travel
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Claimed</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ${totalClaimed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{myClaims.length} total claims submitted</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Approved Amount</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ${totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-1">Ready for reimbursement</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Reimbursed</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            ${totalReimbursed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-indigo-500 mt-1">Disbursed to payroll</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Travel Authorizations</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {myTravels.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Corporate trips on file</p>
        </div>
      </div>

      {/* Approver Switcher (My vs Team Approvals) */}
      {isApprover && (
        <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveView("my")}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeView === "my"
                ? "border-[#635BFF] text-[#635BFF] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My {activeSection === "expenses" ? "Expense Claims" : "Travel Requests"}
          </button>
          <button
            onClick={() => setActiveView("approvals")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeView === "approvals"
                ? "border-[#635BFF] text-[#635BFF] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Team Approvals
            <span className="w-4 h-4 rounded-full bg-[#635BFF] text-white text-[10px] flex items-center justify-center font-bold">
              {activeSection === "expenses"
                ? pendingExpenseApprovals.length
                : pendingTravelApprovals.length}
            </span>
          </button>
        </div>
      )}

      {/* Main Table Content */}
      {activeSection === "expenses" ? (
        activeView === "my" ? (
          /* My Expenses */
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4">Reimbursement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {myClaims.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No expense claims submitted yet.
                      </td>
                    </tr>
                  ) : (
                    myClaims.map((claim) => (
                      <tr
                        key={claim.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(claim.expense_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {claim.category}
                        </td>
                        <td className="py-3 px-4 max-w-sm truncate text-slate-600 dark:text-slate-400">
                          {claim.description}
                          {claim.receipt_url && (
                            <a
                              href={claim.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#635BFF] ml-2 inline-flex items-center gap-0.5"
                            >
                              Receipt <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          ${parseFloat(claim.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                              claim.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : claim.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {claim.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              claim.reimbursement_status === "Paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : claim.reimbursement_status === "Processing"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {claim.reimbursement_status || "Unpaid"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Team Expense Approvals */
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {pendingExpenseApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No pending team expense claims to review.
                      </td>
                    </tr>
                  ) : (
                    pendingExpenseApprovals.map((claim) => (
                      <tr
                        key={claim.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {claim.employee_name}
                          <div className="text-[11px] text-slate-400 font-normal">
                            {claim.employee_code}
                          </div>
                        </td>
                        <td className="py-3 px-4">{claim.category}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(claim.expense_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                          {claim.description}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          ${parseFloat(claim.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleExpenseAction(claim.id, "Approve")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleExpenseAction(claim.id, "Reject")}
                            className="text-xs h-7 px-2.5 gap-1"
                          >
                            <X className="w-3 h-3" /> Reject
                          </Button>
                          {isFinance && claim.status === "Approved" && claim.reimbursement_status !== "Paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReimburse(claim.id)}
                              className="text-xs h-7 px-2.5 text-indigo-600"
                            >
                              Mark Reimbursed
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeView === "my" ? (
        /* My Travel Requests */
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Travel Dates</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Est. Budget</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Manager Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {myTravels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No corporate travel authorizations filed.
                    </td>
                  </tr>
                ) : (
                  myTravels.map((trv) => (
                    <tr
                      key={trv.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {trv.destination}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(trv.departure_date).toLocaleDateString()} –{" "}
                        {new Date(trv.return_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 max-w-sm truncate text-slate-600 dark:text-slate-400">
                        {trv.purpose}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        ${parseFloat(trv.estimated_budget || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            trv.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : trv.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {trv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {trv.manager_comments || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Team Travel Approvals */
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Est. Budget</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {pendingTravelApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No pending team travel requests to review.
                    </td>
                  </tr>
                ) : (
                  pendingTravelApprovals.map((trv) => (
                    <tr
                      key={trv.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {trv.employee_name}
                      </td>
                      <td className="py-3 px-4 font-medium">{trv.destination}</td>
                      <td className="py-3 px-4">
                        {new Date(trv.departure_date).toLocaleDateString()} –{" "}
                        {new Date(trv.return_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 max-w-sm truncate text-slate-600 dark:text-slate-400">
                        {trv.purpose}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        ${parseFloat(trv.estimated_budget || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleTravelAction(trv.id, "Approve")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTravelAction(trv.id, "Reject")}
                          className="text-xs h-7 px-2.5 gap-1"
                        >
                          <X className="w-3 h-3" /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#635BFF]" />
                  Submit Expense Claim
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Claim business expense for manager and HR approval.
                </p>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  required
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (USD)
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Expense Date
                  </label>
                  <Input
                    required
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, expenseDate: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description & Business Justification
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the business context, project, or client engagement..."
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, description: e.target.value })
                  }
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Receipt URL / Document Link (Optional)
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={expenseForm.receiptUrl}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpenseModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#635BFF] hover:bg-[#5248e3] text-white text-xs gap-1.5"
                >
                  Submit Claim
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Travel Modal */}
      {showTravelModal && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plane className="w-5 h-5 text-[#635BFF]" />
                  Corporate Travel Authorization
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Request pre-approval for business travel and accommodations.
                </p>
              </div>
              <button
                onClick={() => setShowTravelModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTravel} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Destination (City / Facility)
                </label>
                <Input
                  required
                  placeholder="e.g. Detroit Manufacturing Plant, MI"
                  value={travelForm.destination}
                  onChange={(e) =>
                    setTravelForm({ ...travelForm, destination: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Departure Date
                  </label>
                  <Input
                    required
                    type="date"
                    value={travelForm.departureDate}
                    onChange={(e) =>
                      setTravelForm({ ...travelForm, departureDate: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Return Date
                  </label>
                  <Input
                    required
                    type="date"
                    value={travelForm.returnDate}
                    onChange={(e) =>
                      setTravelForm({ ...travelForm, returnDate: e.target.value })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Estimated Budget (USD)
                </label>
                <Input
                  required
                  type="number"
                  placeholder="1200"
                  value={travelForm.estimatedBudget}
                  onChange={(e) =>
                    setTravelForm({ ...travelForm, estimatedBudget: e.target.value })
                  }
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Travel Purpose / Scope
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State client site audit, vendor inspection, conference, etc..."
                  value={travelForm.purpose}
                  onChange={(e) =>
                    setTravelForm({ ...travelForm, purpose: e.target.value })
                  }
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTravelModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#635BFF] hover:bg-[#5248e3] text-white text-xs gap-1.5"
                >
                  Request Authorization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
