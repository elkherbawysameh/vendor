import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useCreatePurchaseRequest, useListVendors } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const requestSchema = z.object({
  department: z.string().min(1, "Department is required"),
  itemDescription: z.string().min(3, "Description must be at least 3 characters"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  vendorId: z.coerce.number().min(1, "Please select a vendor"),
  estimatedAmount: z.coerce.number().optional(),
  reason: z.string().min(10, "Please provide a detailed reason for this purchase"),
  managerEmail: z.string().email("Invalid email").endsWith("@qoyod.com", "Manager email must end with @qoyod.com"),
});

type RequestFormValues = z.infer<typeof requestSchema>;

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Operations",
  "IT"
];

export default function NewRequestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [successData, setSuccessData] = useState<{ id: number, requestNumber: string } | null>(null);

  const { data: vendors, isLoading: vendorsLoading } = useListVendors();
  const createMutation = useCreatePurchaseRequest();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      department: "",
      itemDescription: "",
      quantity: 1,
      estimatedAmount: undefined,
      reason: "",
      managerEmail: "",
    },
  });

  const onSubmit = async (data: RequestFormValues) => {
    if (!user) return;
    
    try {
      const response = await createMutation.mutateAsync({
        data: {
          ...data,
          requesterEmail: user.email,
        }
      });
      
      setSuccessData({ id: response.id, requestNumber: response.requestNumber });
      window.scrollTo(0,0);
    } catch (error) {
      toast({
        title: "Error submitting request",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Card className="border-success/20 shadow-lg text-center p-6">
          <CardContent className="pt-6 space-y-6">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Request Submitted Successfully!</h2>
              <p className="text-muted-foreground">Your purchase request has been routed to your manager for approval.</p>
              <div className="mt-4 p-4 bg-muted rounded-lg inline-block">
                <span className="text-sm font-medium text-muted-foreground block mb-1">Request Number / رقم الطلب</span>
                <span className="text-xl font-mono font-bold text-primary">{successData.requestNumber}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link href={`/requests/${successData.id}`}>
                <Button className="w-full sm:w-auto">View Request Details</Button>
              </Link>
              <Link href="/requests">
                <Button variant="outline" className="w-full sm:w-auto">Back to Requests</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/requests">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">New Purchase Request</h1>
          <p className="text-muted-foreground text-sm">Fill out the form below to submit a new procurement request</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">1. Item Details / تفاصيل العنصر</h3>
                
                <FormField
                  control={form.control}
                  name="itemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Description <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. MacBook Pro 14, Office Chairs, Software License" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Total Amount (SAR)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="Optional estimated cost" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">2. Vendor Information / معلومات المورد</h3>
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vendor <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        disabled={vendorsLoading} 
                        onValueChange={(val) => field.onChange(Number(val))} 
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select a vendor from the list"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors?.map((vendor) => (
                            <SelectItem key={vendor.id} value={String(vendor.id)}>
                              {vendor.companyName} {vendor.contactEmail ? `(${vendor.contactEmail})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Can't find the vendor? Contact an admin to add them to the system first.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">3. Business Justification / مبرر العمل</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEPARTMENTS.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="managerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager Email <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="manager@qoyod.com" {...field} />
                        </FormControl>
                        <FormDescription>The manager who needs to approve this request.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Request <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Why is this purchase necessary for your work? Be specific." 
                          className="resize-none h-24" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Link href="/requests">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} className="min-w-32">
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
