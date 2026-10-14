import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  Building,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export const ContactPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Enterprise Platform Inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await axios.post("/api/public/contact", {
        name,
        email,
        phone,
        subject,
        message,
      });

      setSubmitted(true);
      toast.success("Thank you! Your message has been received by our operations desk.");
    } catch (err) {
      console.error("Contact error:", err);
      toast.error("Failed to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] text-[#172033] min-h-screen pb-24">
      {/* Header */}
      <section className="bg-white border-b border-[#E5E7EB] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6558D9]">
            Contact PatilOne
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#172033] tracking-tight">
            Connect With Our Team
          </h1>
          <p className="text-[#667085] text-lg max-w-2xl leading-relaxed">
            Whether you have questions about deploying PatilOne across your enterprise or
            need support with your employee workspace, we are here to help.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5 shadow-xs">
              <h3 className="font-bold text-base text-[#172033]">Direct Channels</h3>
              <div className="space-y-4 text-xs text-[#667085]">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#6558D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#172033] block">Platform Inquiries</span>
                    <span>support@patilone.com</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#6558D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#172033] block">Enterprise Helpdesk</span>
                    <span>+1 (555) 019-2834</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#6558D9] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#172033] block">Corporate Headquarters</span>
                    <span>Chicago Operations Center, Suite 400, Chicago, IL</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <h4 className="text-xs font-bold text-[#172033]">Already an Employee?</h4>
              <p className="text-[11px] text-[#667085] leading-relaxed">
                If you are an active employee experiencing credential or permission issues,
                reach out directly to your HR administrator or sign in via the portal.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-xs">
              {submitted ? (
                <div className="text-center py-12 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="text-lg font-bold text-[#172033]">Inquiry Submitted</h3>
                  <p className="text-xs text-[#667085] max-w-sm mx-auto">
                    Thank you for contacting PatilOne. A member of our enterprise operations team
                    will follow up with you within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-bold text-lg text-[#172033] mb-4">
                    Send an Inquiry
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#172033] block">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full h-9 px-3 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6558D9] focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#172033] block">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full h-9 px-3 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6558D9] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#172033] block">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full h-9 px-3 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6558D9] focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#172033] block">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6558D9] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#172033] block">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help your organization?"
                      className="w-full p-3 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#6558D9] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Sending..." : "Submit Inquiry"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
