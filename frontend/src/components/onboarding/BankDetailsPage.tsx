import { useApp } from "@/hooks/useApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { bankOptions } from "@/data/mockData";
import { createBankAccounts, setupBankAccounts } from "@/api/bank";
import { toast } from "@/utils/toast";
import type { BankProviderEnum } from "@/api/types";

const bankProviderMap: Record<string, BankProviderEnum> = {
  "Mane-zo": "MANE-ZO",
  "Rev-o-trot": "REV-O-TROT",
  "Buck-lays": "BUCK-LAYS",
  "Hay-ch SBC": "HAY-CHSBC",
};

const formSchema = z.object({
  sortCode: z
    .string()
    .min(6, "Sort code must be 6 digits")
    .max(8, "Sort code must be 6-8 characters"),
  accountNumber: z.string().regex(/^\d{8}$/, "Account number must be exactly 8 digits"),
  savingAccountNumber: z
    .string()
    .regex(/^$|^\d{8}$/, "Savings account number must be exactly 8 digits"),
  accountType: z.enum(["CURRENT", "SAVING"]),
  amount: z.number().min(0, "Amount must be non-negative"),
});

type FormData = z.infer<typeof formSchema>;

const BankDetailsPage = () => {
  const { connectedBank, setOnboardingStep, isAddBankMode, setAddBankStep, completeAddBankFlow } =
    useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the selected bank's details for styling
  const selectedBank = bankOptions.find((bank) => bank.name === connectedBank);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sortCode: "",
      accountNumber: "",
      savingAccountNumber: "",
      accountType: "CURRENT",
      amount: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!connectedBank) {
      setError("Please select a bank first");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Get the provider enum value
      const provider = bankProviderMap[connectedBank];
      if (!provider) {
        throw new Error(`Unknown bank provider: ${connectedBank}`);
      }

      if (isAddBankMode) {
        // Convert amount to pence (API expects cents)
        const amountInPence = Math.round(data.amount * 100);

        await createBankAccounts({
          provider,
          type: data.accountType,
          account_number: data.accountNumber,
          sort_code: data.sortCode.replace(/-/g, ""),
          amount: amountInPence,
        });

        toast(
          `${data.accountType === "CURRENT" ? "Checking" : "Savings"} account created successfully! 🐎`,
        );

        // Complete add bank flow and return to main app
        await completeAddBankFlow();
      } else {
        if (!data.savingAccountNumber) {
          setError("Savings account number is required for onboarding setup.");
          return;
        }

        await setupBankAccounts({
          provider,
          current: {
            account_number: data.accountNumber,
            sort_code: data.sortCode.replace(/-/g, ""),
          },
          saving: {
            account_number: data.savingAccountNumber,
            sort_code: data.sortCode.replace(/-/g, ""),
          },
        });

        toast("Bank accounts connected successfully! 🐎");

        // Continue to next step in regular onboarding
        setOnboardingStep(3);
      }
    } catch (error) {
      console.error("Bank account creation failed:", error);

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create bank account. Please try again.";

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (isSubmitting) return; // Prevent navigation during submission

    if (isAddBankMode) {
      setAddBankStep(1); // Go back to bank selection in add bank flow
    } else {
      setOnboardingStep(1); // Go back to bank selection in regular onboarding
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={goBack}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold">
            {isAddBankMode ? "Create Bank Account" : "Connect Bank Accounts"}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {isAddBankMode
            ? `Enter your ${connectedBank} account details to create a new account.`
            : `Enter your ${connectedBank} account details to complete setup.`}
        </p>
      </div>

      {selectedBank && (
        <div className="flex items-center justify-center">
          <div
            className={`w-16 h-16 rounded-xl flex items-center justify-center ${selectedBank.name === "Mane-zo" ? "overflow-hidden" : "p-3"}`}
            style={{
              backgroundColor:
                selectedBank.name === "Rev-o-trot" ? "#ffffff" : selectedBank.color + "18",
              border: `2px solid ${selectedBank.color}20`,
            }}
          >
            <img
              src={selectedBank.icon}
              alt={selectedBank.name}
              className={`w-full h-full ${selectedBank.name === "Mane-zo" ? "object-cover" : "object-contain"}`}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="animate-fade-up">
          <AlertDescription>
            {error}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-destructive underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {isAddBankMode && (
            <div className="card-neigh animate-fade-up" style={{ animationDelay: "100ms" }}>
              <h3 className="font-semibold mb-4">Account Type</h3>
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Account Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CURRENT">Checking Account</SelectItem>
                          <SelectItem value="SAVING">Savings Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Bank Details */}
          <div className="card-neigh animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="font-semibold mb-4">Bank Details</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="sortCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12-34-56"
                        {...field}
                        onChange={(e) => {
                          // Auto-format sort code with dashes
                          let value = e.target.value.replace(/\D/g, "");
                          if (value.length >= 2) value = value.slice(0, 2) + "-" + value.slice(2);
                          if (value.length >= 5)
                            value = value.slice(0, 5) + "-" + value.slice(5, 7);
                          field.onChange(value);
                        }}
                        maxLength={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isAddBankMode ? "Account Number" : "Current Account Number"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isAddBankMode ? "12345678" : "Current account number"}
                        {...field}
                        maxLength={8}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isAddBankMode && (
                <FormField
                  control={form.control}
                  name="savingAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Savings Account Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Savings account number"
                          {...field}
                          maxLength={8}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {isAddBankMode && (
            <div className="card-neigh animate-fade-up" style={{ animationDelay: "300ms" }}>
              <h3 className="font-semibold mb-4">Initial Amount</h3>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (£)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center animate-fade-up disabled:opacity-50"
            style={{ animationDelay: "400ms" }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isAddBankMode ? "Creating account..." : "Connecting accounts..."}</span>
              </>
            ) : (
              <>
                <span>{isAddBankMode ? "Create Account" : "Connect Accounts"}</span>
                <img src="/horse-gallop.png" alt="Horse" className="w-5 h-5 object-contain" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default BankDetailsPage;
