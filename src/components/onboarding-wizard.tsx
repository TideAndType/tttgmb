"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CheckCircle, ArrowRight, FolderOpen, Receipt, FileText } from "lucide-react";
import Link from "next/link";

const INDUSTRIES = ["Agency", "E-commerce", "Healthcare", "Other"];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

function formatTimezone(tz: string): string {
  return tz.replace("_", " ").replace("/", " / ");
}

export function OnboardingWizard() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    industry: "Agency",
    name: "",
    phone: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    if (status !== "authenticated") return;
    const user = session?.user as any;

    // Only show for CLIENT role
    if (user?.role !== "CLIENT") return;

    // Check localStorage first
    if (typeof window !== "undefined" && localStorage.getItem("onboardingComplete")) return;

    // Show if companyName is missing
    if (!user?.companyName) {
      setFormData((prev) => ({ ...prev, name: user?.name ?? "" }));
      setShow(true);
    }
  }, [status, session]);

  const handleComplete = async () => {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || (session?.user as any)?.name,
          email: (session?.user as any)?.email,
          companyName: formData.company,
        }),
      });
    } catch {
      // fail silently — don't block onboarding
    } finally {
      setSaving(false);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("onboardingComplete", "true");
    }
    setStep(4);
  };

  const handleFinish = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {step === 1 && <StepWelcome onNext={() => setStep(2)} />}
          {step === 2 && (
            <StepCompanyInfo
              company={formData.company}
              industry={formData.industry}
              onChange={(key, value) => setFormData((prev) => ({ ...prev, [key]: value }))}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepContact
              name={formData.name}
              phone={formData.phone}
              timezone={formData.timezone}
              onChange={(key, value) => setFormData((prev) => ({ ...prev, [key]: value }))}
              onNext={handleComplete}
              onBack={() => setStep(2)}
              saving={saving}
            />
          )}
          {step === 4 && <StepDone onFinish={handleFinish} />}
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="px-8 pb-6 flex justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? "w-8 bg-primary" : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome to Your Portal!</h2>
        <p className="text-muted-foreground mt-2">
          Let&apos;s get you set up in just a few steps. It only takes a minute.
        </p>
      </div>
      <Button onClick={onNext} className="w-full" size="lg">
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

interface StepCompanyInfoProps {
  company: string;
  industry: string;
  onChange: (key: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepCompanyInfo({ company, industry, onChange, onNext, onBack }: StepCompanyInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Company Info</h2>
        <p className="text-muted-foreground text-sm mt-1">Tell us about your business.</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label>Company Name *</Label>
          <Input
            value={company}
            onChange={(e) => onChange("company", e.target.value)}
            placeholder="Your company name"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Industry</Label>
          <Select value={industry} onChange={(e) => onChange("industry", e.target.value)} className="mt-1">
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} disabled={!company.trim()} className="flex-1">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface StepContactProps {
  name: string;
  phone: string;
  timezone: string;
  onChange: (key: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

function StepContact({ name, phone, timezone, onChange, onNext, onBack, saving }: StepContactProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Your Contact</h2>
        <p className="text-muted-foreground text-sm mt-1">Confirm your contact details.</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label>Your Name</Label>
          <Input
            value={name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Full name"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Phone Number</Label>
          <Input
            value={phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+1 555 000 0000"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Timezone</Label>
          <Select value={timezone} onChange={(e) => onChange("timezone", e.target.value)} className="mt-1">
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{formatTimezone(tz)}</option>)}
          </Select>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} disabled={saving} className="flex-1">
          {saving ? "Saving..." : "Complete Setup"}
          {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Portal Is Ready!</h2>
        <p className="text-muted-foreground mt-2">
          Everything is set up. Here are some quick links to get you started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/projects" onClick={onFinish} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors">
          <FolderOpen className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Projects</span>
        </Link>
        <Link href="/invoices" onClick={onFinish} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors">
          <Receipt className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Invoices</span>
        </Link>
        <Link href="/files" onClick={onFinish} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Files</span>
        </Link>
      </div>
      <Button onClick={onFinish} className="w-full">
        Go to Dashboard
      </Button>
    </div>
  );
}
