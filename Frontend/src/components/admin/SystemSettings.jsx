import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Clock, Bell, ShieldCheck } from "lucide-react";

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
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
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
          disabled={loading}
          className="bg-[#111827] hover:bg-[#1f2937] text-white rounded-xl h-9 px-4 text-xs font-semibold shadow-xs gap-1.5 shrink-0"
        >
          <Save className="h-4 w-4" />
          {loading ? "Saving..." : "Save Settings"}
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
      </Tabs>
    </div>
  );
}

export default SystemSettings;
