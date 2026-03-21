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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { bankOptions } from "@/data/mockData";
import { setupBankAccounts } from "@/api/bank";
import { transformFormToApiPayload } from "@/utils/bankMapper";
import { toast } from "@/utils/toast";

const formSchema = z.object({
  // Shared sort code for both accounts
  sortCode: z
    .string()
    .min(6, "Sort code must be 6 digits")
    .max(8, "Sort code must be 6-8 characters"),

  // Checking account details
  checkingAccountNumber: z.string().min(8, "Account number must be at least 8 digits"),
  checkingAccountName: z.string().min(1, "Account name is required"),

  // Savings account details
  savingsAccountNumber: z.string().min(8, "Account number must be at least 8 digits"),
  savingsAccountName: z.string().min(1, "Account name is required"),
});

type FormData = z.infer<typeof formSchema>;

const BankDetailsPage = () => {
  const {
    connectedBank,
    setOnboardingStep,
    saveBankDetails,
    isAddBankMode,
    setAddBankStep,
    completeAddBankFlow,
  } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the selected bank's details for styling
  const selectedBank = bankOptions.find((bank) => bank.name === connectedBank);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sortCode: "",
      checkingAccountNumber: "",
      checkingAccountName: "",
      savingsAccountNumber: "",
      savingsAccountName: "",
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

      // Transform form data to API payload
      const apiPayload = transformFormToApiPayload(connectedBank, data);

      // Call the setupBankAccounts API
      const response = await setupBankAccounts(apiPayload);

      // Save the bank details to context (for backward compatibility)
      const bankDetails = {
        bank: connectedBank,
        sortCode: data.sortCode,
        checkingAccount: {
          number: data.checkingAccountNumber,
          name: data.checkingAccountName,
        },
        savingsAccount: {
          number: data.savingsAccountNumber,
          name: data.savingsAccountName,
        },
      };

      saveBankDetails(bankDetails);

      // Show success message
      toast("Bank accounts connected successfully! 🐎");

      if (isAddBankMode) {
        // Complete add bank flow and return to main app
        await completeAddBankFlow();
      } else {
        // Continue to next step in regular onboarding
        setOnboardingStep(3);
      }
    } catch (error) {
      console.error("Bank setup failed:", error);

      // Show user-friendly error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to connect bank accounts. Please try again.";

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
          <h2 className="text-xl font-bold">Connect to {connectedBank}</h2>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your account details to link your checking and savings accounts.
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
          {/* Shared Sort Code */}
          <div className="card-neigh animate-fade-up" style={{ animationDelay: "100ms" }}>
            <h3 className="font-semibold mb-4">Bank Details</h3>
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
                        if (value.length >= 5) value = value.slice(0, 5) + "-" + value.slice(5, 7);
                        field.onChange(value);
                      }}
                      maxLength={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Checking Account */}
          <div className="card-neigh animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="font-semibold mb-4">Checking Account</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="checkingAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Checking Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkingAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345678"
                        {...field}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Savings Account */}
          <div className="card-neigh animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="font-semibold mb-4">Savings Account</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="savingsAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Savings Account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="savingsAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="87654321"
                        {...field}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 active:scale-[0.97] flex items-center gap-2 justify-center animate-fade-up disabled:opacity-50"
            style={{ animationDelay: "400ms" }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Connecting accounts...</span>
              </>
            ) : (
              <>
                <span>Connect Accounts</span>
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
