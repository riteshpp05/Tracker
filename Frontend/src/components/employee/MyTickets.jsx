import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { motion } from "framer-motion";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "../../components/ui/dialog";
import {
  Search,
  Ticket as TicketIcon,
  Calendar,
  Loader2,
  AlertCircle,
  Eye,
} from "lucide-react";
import timesheetService from "../../services/timesheetService";
import { format } from "date-fns";
import { toast } from "sonner";
import { minutesToHHMM, formatMinutesDisplay } from "../../utils/timeUtils";
import ViewTicketDialog from "../ui/viewTicketDialog";

// ============================================
// MAIN COMPONENT
// ============================================

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await timesheetService.getMyTickets();
      console.log("✅ My Tickets Response:", data);

      setTickets(Array.isArray(data) ? data : data?.tickets || []);
    } catch (error) {
      console.error("Failed to load tickets:", error);
      setError(error.response?.data?.error || "Failed to load tickets");
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (ticket) => {
    setViewingTicket(ticket);
    setShowViewDialog(true);
  };

  const filteredTickets = tickets.filter((t) => {
    const query = searchQuery.toLowerCase();
    const client = t.client_name?.toLowerCase() || "";
    const project = t.project_name?.toLowerCase() || "";
    const ticket = t.ticket_name?.toLowerCase() || "";
    const projectCode = t.project_code?.toLowerCase() || "";
    const ticketCode = t.ticket_code?.toLowerCase() || "";
    const description = t.description?.toLowerCase() || "";

    return (
      client.includes(query) ||
      project.includes(query) ||
      ticket.includes(query) ||
      projectCode.includes(query) ||
      ticketCode.includes(query) ||
      description.includes(query)
    );
  });

  const getPageTitle = () => {
    switch (user?.role) {
      case "MANAGER":
        return "My Tickets";
      case "EMPLOYEE":
        return "My Tickets";
      case "ADMIN":
        return "All Tickets";
      default:
        return "My Tickets";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">{getPageTitle()}</h1>
          <p className="text-[13px] text-[#667085] mt-0.5">Track your active ticket assignments, budget allocations, and logged hours</p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667085]" />
          <Input
            placeholder="Search tickets by name, code, or description..."
            className="pl-9 h-9 text-xs rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#172033]">
            Assigned Tickets ({filteredTickets.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E5E7EB] bg-[#FAFBFC]">
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[22%]">Ticket</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[12%]">Code</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[26%]">Description</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[12%] text-center">Assigned</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[12%] text-center">Used</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[8%] text-center">Status</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-wider text-[#667085] uppercase py-3 px-4 w-[8%] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <TicketIcon className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium">
                          {searchQuery
                            ? "No tickets found matching your search"
                            : "No tickets assigned yet"}
                        </p>
                        {!searchQuery && user?.role === "EMPLOYEE" && (
                          <p className="text-sm text-muted-foreground">
                            Contact your manager for ticket assignments
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((t) => {
                    // ✅ FIXED: Values are already in minutes from backend
                    const budgetMinutes = Number(t.budget_minutes) || 0;
                    const usedMinutes = Number(t.used_minutes) || 0;
                    const isBudgetExceeded = usedMinutes > budgetMinutes;
                    const isInactive = t.ticket_is_active === false;

                    return (
                      <TableRow
                        key={t.assignment_id || t.ticket_id}
                        className={isInactive ? "opacity-50 bg-muted/30" : ""}
                      >
                        {/* Ticket Name */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{t.ticket_name}</span>
                            {isInactive && (
                              <Badge
                                variant="outline"
                                className="text-xs flex-shrink-0"
                              >
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Ticket Code */}
                        <TableCell>
                          {t.ticket_code ? (
                            <Badge className="text-xs font-normal">
                              {t.ticket_code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>

                        {/* Description Column */}
                        <TableCell>
                          <div className="max-w-xs">
                            {t.description ? (
                              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                {t.description}
                              </p>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                No description
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* ✅ FIXED: Assigned Hours (Display HH:MM) */}
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {minutesToHHMM(budgetMinutes)}
                          </span>
                        </TableCell>

                        {/* ✅ FIXED: Used Hours (Display HH:MM) */}
                        <TableCell className="text-center">
                          <span
                            className={`text-sm font-bold ${
                              isInactive
                                ? "text-muted-foreground"
                                : isBudgetExceeded
                                  ? "text-red-600"
                                  : usedMinutes > budgetMinutes * 0.9
                                    ? "text-yellow-600"
                                    : "text-green-600"
                            }`}
                          >
                            {minutesToHHMM(usedMinutes)}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <Badge
                            variant={isInactive ? "secondary" : "default"}
                            className={
                              isInactive
                                ? ""
                                : "bg-green-500 hover:bg-green-600"
                            }
                          >
                            {isInactive ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTicket(t)}
                            title="View Details"
                            className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                          >
                            <Eye className="h-4 w-4 text-[#667085] hover:text-[#172033]" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      {/* View Ticket Dialog (single instance) */}
      <ViewTicketDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        ticket={viewingTicket}
      />
    </div>
  );
}
