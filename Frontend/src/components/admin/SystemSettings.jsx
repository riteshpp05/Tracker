import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Clock, Bell, ShieldCheck, Loader2, IndianRupee, Shield, Building2, Calculator } from "lucide-react";
import api from "@/services/api";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    max_hours_per_day: "8",
    max_hours_per_week: "40",
    working_days_per_week: "5",
    allow_overtime: false,
    timesheet_submission_reminder: true,
    email_notifications_enabled: true,
    approval_required: true,
    auto_approve_within_hours: "24",
    // Payroll Statutory & CTC Engine Config
    pf_wage_ceiling_mode: "25000",
    default_hra_type: "METRO",
    default_basic_pct: "50",
    gratuity_provision_enabled: true,
    default_tax_regime: "New",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const res = await api.get("/settings");
      if (res.data && Object.keys(res.data).length > 0) {
        setSettings((prev) => ({
          ...prev,
          max_hours_per_day: res.data.max_hours_per_day || prev.max_hours_per_day,
          max_hours_per_week: res.data.max_hours_per_week || prev.max_hours_per_week,
          working_days_per_week: res.data.working_days_per_week || prev.working_days_per_week,
          auto_approve_within_hours: res.data.auto_approve_within_hours || prev.auto_approve_within_hours,
          allow_overtime: res.data.allow_overtime === "true" || res.data.allow_overtime === true,
          timesheet_submission_reminder: res.data.timesheet_submission_reminder === "true" || res.data.timesheet_submission_reminder === true,
          email_notifications_enabled: res.data.email_notifications_enabled === "true" || res.data.email_notifications_enabled === true,
          approval_required: res.data.approval_required === "true" || res.data.approval_required === true,
          pf_wage_ceiling_mode: res.data.pf_wage_ceiling_mode || prev.pf_wage_ceiling_mode,
          default_hra_type: res.data.default_hra_type || prev.default_hra_type,
          default_basic_pct: res.data.default_basic_pct || prev.default_basic_pct,
          gratuity_provision_enabled: res.data.gratuity_provision_enabled === undefined ? prev.gratuity_provision_enabled : (res.data.gratuity_provision_enabled === "true" || res.data.gratuity_provision_enabled === true),
          default_tax_regime: res.data.default_tax_regime || prev.default_tax_regime,
        }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load live settings from server");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        max_hours_per_day: String(settings.max_hours_per_day),
        max_hours_per_week: String(settings.max_hours_per_week),
        working_days_per_week: String(settings.working_days_per_week),
        allow_overtime: String(settings.allow_overtime),
        timesheet_submission_reminder: String(settings.timesheet_submission_reminder),
        email_notifications_enabled: String(settings.email_notifications_enabled),
        approval_required: String(settings.approval_required),
        auto_approve_within_hours: String(settings.auto_approve_within_hours),
        pf_wage_ceiling_mode: String(settings.pf_wage_ceiling_mode),
        default_hra_type: String(settings.default_hra_type),
        default_basic_pct: String(settings.default_basic_pct),
        gratuity_provision_enabled: String(settings.gratuity_provision_enabled),
        default_tax_regime: String(settings.default_tax_regime),
      };
      await api.put("/settings", { settings: payload });
      toast.success("System policies & statutory settings saved successfully");
    } catch (error) {
      console.error("Save settings error:", error);
      toast.error(error.response?.data?.error || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#172033] tracking-tight">
            System Settings
          </h1>
          <p className="text-[13px] text-[#667085] mt-1">
            Configure enterprise policies, working hour rules, and automated workflow triggers.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || fetching}
          className="bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl h-9 px-4 text-xs font-semibold shadow-xs gap-1.5 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Saving..." : fetching ? "Loading..." : "Save Settings"}
        </Button>
      </div>

      <Tabs defaultValue="working-hours" className="space-y-4">
        <TabsList className="bg-[#F7F8FA] border border-[#E5E7EB] p-1 rounded-xl">
          <TabsTrigger value="working-hours" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-xs">
            <Clock className="w-3.5 h-3.5" /> Working Hours
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-xs">
            <Bell className="w-3.5 h-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" /> Approval Policy
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#172033] data-[state=active]:shadow-xs">
            <IndianRupee className="w-3.5 h-3.5" /> Payroll &amp; Statutory
          </TabsTrigger>
        </TabsList>

        {/* ── Working Hours ── */}
        <TabsContent value="working-hours" className="space-y-4 mt-2">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#F1F3F5] pb-4">
              <h2 className="text-[14px] font-semibold text-[#172033]">
                Standard Working Hours Policy
              </h2>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Set baseline capacity limits for weekly and daily timesheet submissions.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#172033]">Max Hours Per Day</Label>
                <Input
                  type="number"
                  value={settings.max_hours_per_day}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_hours_per_day: e.target.value,
                    })
                  }
                  className="h-9 text-[13px] rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
                />
                <p className="text-[11px] text-[#667085]">
                  Standard daily working hour target (default: 8 hours).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#172033]">Max Hours Per Week</Label>
                <Input
                  type="number"
                  value={settings.max_hours_per_week}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_hours_per_week: e.target.value,
                    })
                  }
                  className="h-9 text-[13px] rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
                />
                <p className="text-[11px] text-[#667085]">
                  Standard weekly billable threshold (default: 40 hours).
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <Label className="text-[13px] font-medium text-[#172033]">Working Days Per Week</Label>
              <Input
                type="number"
                value={settings.working_days_per_week}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    working_days_per_week: e.target.value,
                  })
                }
                className="h-9 text-[13px] rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
              />
              <p className="text-[11px] text-[#667085]">
                Active shift days considered in regular pay periods.
              </p>
            </div>

            <div className="border-t border-[#F1F3F5] pt-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[13px] font-medium text-[#172033]">Allow Overtime Logging</Label>
                <p className="text-[12px] text-[#667085]">
                  Permit employees to log more than standard scheduled hours.
                </p>
              </div>
              <Switch
                checked={settings.allow_overtime}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, allow_overtime: checked })
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="space-y-4 mt-2">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#F1F3F5] pb-4">
              <h2 className="text-[14px] font-semibold text-[#172033]">
                Notification &amp; Alert Delivery
              </h2>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Control automated notification channels and scheduled reminders.
              </p>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-[13px] font-medium text-[#172033]">Email Notifications</Label>
                <p className="text-[12px] text-[#667085]">
                  Dispatch email notifications for critical approvals, changes, and assignments.
                </p>
              </div>
              <Switch
                checked={settings.email_notifications_enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    email_notifications_enabled: checked,
                  })
                }
              />
            </div>

            <div className="border-t border-[#F1F3F5] pt-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[13px] font-medium text-[#172033]">Timesheet Submission Reminders</Label>
                <p className="text-[12px] text-[#667085]">
                  Automatically remind employees to submit weekly timesheets before deadline.
                </p>
              </div>
              <Switch
                checked={settings.timesheet_submission_reminder}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    timesheet_submission_reminder: checked,
                  })
                }
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Approval Workflow ── */}
        <TabsContent value="approval" className="space-y-4 mt-2">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#F1F3F5] pb-4">
              <h2 className="text-[14px] font-semibold text-[#172033]">
                Governance &amp; Approval Rules
              </h2>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Manage managerial authorization policies and automatic escalation thresholds.
              </p>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-[13px] font-medium text-[#172033]">Require Mandatory Approval</Label>
                <p className="text-[12px] text-[#667085]">
                  All submitted timesheets must be explicitly signed off by a designated manager.
                </p>
              </div>
              <Switch
                checked={settings.approval_required}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, approval_required: checked })
                }
              />
            </div>

            <div className="border-t border-[#F1F3F5] pt-5 space-y-1.5 max-w-xs">
              <Label className="text-[13px] font-medium text-[#172033]">Auto-Approve Window (Hours)</Label>
              <Input
                type="number"
                value={settings.auto_approve_within_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    auto_approve_within_hours: e.target.value,
                  })
                }
                className="h-9 text-[13px] rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
              />
              <p className="text-[11px] text-[#667085]">
                Automatically approve submissions if no action is taken within this duration.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── Payroll & Statutory Configuration ── */}
        <TabsContent value="payroll" className="space-y-4 mt-2">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#F1F3F5] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-[#172033]">
                  Indian Statutory &amp; CTC Calculation Engine
                </h2>
                <p className="text-[12px] text-[#667085] mt-0.5">
                  Configure company-wide PF wage ceiling, reverse CTC breakup parameters, and statutory withholding defaults.
                </p>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Zero-Mismatch Active
              </span>
            </div>

            {/* PF Wage Ceiling Setting */}
            <div className="space-y-1.5 max-w-md">
              <Label className="text-[13px] font-medium text-[#172033] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-violet-600" />
                <span>EPF Wage Ceiling Mode (Statutory Cap)</span>
              </Label>
              <select
                value={settings.pf_wage_ceiling_mode}
                onChange={(e) => setSettings({ ...settings, pf_wage_ceiling_mode: e.target.value })}
                className="w-full h-9 px-3 text-[13px] rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033] cursor-pointer"
              >
                <option value="15000">₹15,000 / month — Legacy Statutory Limit (Max Employee PF: ₹1,800)</option>
                <option value="25000">₹25,000 / month — Enhanced Statutory Limit (Max Employee PF: ₹3,000)</option>
                <option value="ACTUAL">Actual Basic Salary — Full Wage Uncapped PF</option>
              </select>
              <p className="text-[11px] text-[#667085]">
                EPFO 2025/2026 amendment readiness. Note: EPS-95 pension wage ceiling remains strictly capped at ₹15,000 per statutory law.
              </p>
            </div>

            {/* HRA & Basic Percent Defaults */}
            <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-[#F1F3F5]">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#172033] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Default HRA Location Regime</span>
                </Label>
                <select
                  value={settings.default_hra_type}
                  onChange={(e) => setSettings({ ...settings, default_hra_type: e.target.value })}
                  className="w-full h-9 px-3 text-[13px] rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033] cursor-pointer"
                >
                  <option value="METRO">Metro Cities — 50% of Basic Salary (Mumbai, Pune, Delhi, etc.)</option>
                  <option value="NON_METRO">Non-Metro Cities — 40% of Basic Salary</option>
                </select>
                <p className="text-[11px] text-[#667085]">
                  Used by reverse CTC engine to calculate default tax-exempt House Rent Allowance.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#172033] flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-slate-500" />
                  <span>Default Basic Salary (% of Monthly CTC)</span>
                </Label>
                <Input
                  type="number"
                  min="30"
                  max="70"
                  step="5"
                  value={settings.default_basic_pct}
                  onChange={(e) => setSettings({ ...settings, default_basic_pct: e.target.value })}
                  className="h-9 text-[13px] rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
                />
                <p className="text-[11px] text-[#667085]">
                  Standard Indian enterprise benchmark is 50% of CTC to ensure compliance with New Wage Code.
                </p>
              </div>
            </div>

            {/* Gratuity & Tax Regime Switches */}
            <div className="border-t border-[#F1F3F5] pt-4 space-y-4">
              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <Label className="text-[13px] font-medium text-[#172033]">Gratuity Provisioning (4.81% of Basic)</Label>
                  <p className="text-[12px] text-[#667085]">
                    Automatically include Payment of Gratuity Act provision in monthly employer CTC burden.
                  </p>
                </div>
                <Switch
                  checked={settings.gratuity_provision_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, gratuity_provision_enabled: checked })}
                />
              </div>

              <div className="space-y-1.5 max-w-xs pt-2">
                <Label className="text-[13px] font-medium text-[#172033]">Default Employee Income Tax Regime</Label>
                <select
                  value={settings.default_tax_regime}
                  onChange={(e) => setSettings({ ...settings, default_tax_regime: e.target.value })}
                  className="w-full h-9 px-3 text-[13px] rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033] cursor-pointer"
                >
                  <option value="New">New Tax Regime (Section 115BAC — Default with ₹75k std. deduction)</option>
                  <option value="Old">Old Tax Regime (Standard slabs with Chapter VI-A deductions)</option>
                </select>
                <p className="text-[11px] text-[#667085]">
                  Applied to new onboarding employees if not declared during appointment.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SystemSettings;
