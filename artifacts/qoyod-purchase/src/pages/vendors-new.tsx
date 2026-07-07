import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useCreateVendor, useListVendorCategories } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Building2, Landmark, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const vendorSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  bankName: z.string().min(2, "Bank name is required"),
  bankAccountName: z.string().min(2, "Account name is required"),
  bankAccountNumber: z.string().optional(),
  iban: z.string().min(15, "IBAN must be at least 15 characters").max(34, "IBAN too long").regex(/^[A-Z]{2}[0-9A-Z]{13,32}$/i, "Invalid IBAN format (e.g. SA12...)"),
  swiftCode: z.string().optional(),
  notes: z.string().optional(),
  categoryIds: z.array(z.number()).min(1, "Select at least one category"),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

export default function NewVendorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: categories, isLoading: catLoading } = useListVendorCategories();
  const createMutation = useCreateVendor();

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
      iban: "",
      swiftCode: "",
      notes: "",
      categoryIds: [],
    },
  });

  const onSubmit = async (data: VendorFormValues) => {
    try {
      // Clean up empty strings to undefined
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === "" ? undefined : v])
      ) as VendorFormValues;
      
      const response = await createMutation.mutateAsync({ data: cleanData });
      
      toast({
        title: "Vendor created successfully",
        description: `${response.companyName} has been added to the registry.`,
      });
      setLocation("/vendors");
    } catch (error) {
      toast({
        title: "Error creating vendor",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  };

  // Only Admin or Accounts Manager can add vendors
  if (user && user.role !== "admin" && user.role !== "accounts_manager") {
    return <div className="p-8 text-center">Unauthorized. Only administrators can add vendors.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/vendors">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary">New Vendor Registration</h1>
          <p className="text-muted-foreground text-sm">Add a new supplier to the procurement system</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Card>
            <CardHeader className="border-b pb-4 bg-muted/10">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company/Legal Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Al Rajhi Trading Est." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="sales@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+966 50 000 0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 mt-2">
                <FormField
                  control={form.control}
                  name="categoryIds"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Categories <span className="text-destructive">*</span></FormLabel>
                        <FormDescription>Select all that apply to this vendor</FormDescription>
                      </div>
                      {catLoading ? (
                        <div>Loading categories...</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {categories?.map((category) => (
                            <FormField
                              key={category.id}
                              control={form.control}
                              name="categoryIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={category.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm hover:bg-muted/50 cursor-pointer"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(category.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, category.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== category.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm cursor-pointer w-full">{category.name}</FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4 bg-muted/10">
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" />
                Banking Details <span className="text-xs font-normal text-muted-foreground ml-2">(Required for payments)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SNB, Riyad Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiary Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Must match commercial registration exactly" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input className="font-mono uppercase" placeholder="SA..." {...field} onChange={e => field.onChange(e.target.value.toUpperCase().replace(/\s/g, ''))} />
                      </FormControl>
                      <FormDescription>Standard Saudi IBAN starts with SA followed by 22 digits.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bankAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number (Optional)</FormLabel>
                    <FormControl>
                      <Input className="font-mono" placeholder="Internal bank account number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="swiftCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SWIFT/BIC Code (Optional)</FormLabel>
                    <FormControl>
                      <Input className="font-mono uppercase" placeholder="For international transfers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information about this vendor..." 
                        className="resize-none h-20" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/vendors">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending} className="min-w-40">
              {createMutation.isPending ? "Saving..." : "Save Vendor"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
