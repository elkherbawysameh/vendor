import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPolicies, uploadPolicy, deletePolicy } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

const POLICIES_QUERY_KEY = ["policies"];

export default function PoliciesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const canManage = user?.role === "admin" || user?.role === "accounts_manager";

  const { data: policies, isLoading } = useQuery({ queryKey: POLICIES_QUERY_KEY, queryFn: listPolicies });

  const uploadMut = useMutation({
    mutationFn: () => uploadPolicy(title, file!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POLICIES_QUERY_KEY });
      toast({ title: "Policy uploaded" });
      setModalOpen(false);
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => toast({ title: "Failed to upload policy", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POLICIES_QUERY_KEY });
      toast({ title: "Policy deleted" });
    },
    onError: () => toast({ title: "Failed to delete policy", variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Policies & Procedures</h1>
          <p className="text-muted-foreground text-sm">Purchase policies and work process documents / سياسات وإجراءات العمل</p>
        </div>
        {canManage && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Upload Policy
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-primary pl-6">Title</TableHead>
                <TableHead className="font-semibold">Uploaded By</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-right pr-6 w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : policies?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No policies uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                policies?.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="pl-6 font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.uploadedBy}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                          <a href={p.fileUrl} target="_blank" rel="noreferrer" download={p.fileName}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => confirm(`Delete "${p.title}"?`) && deleteMut.mutate(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Purchase Approval Policy" />
            </div>
            <div className="space-y-2">
              <Label>File <span className="text-destructive">*</span></Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => uploadMut.mutate()} disabled={!title.trim() || !file || uploadMut.isPending}>
              {uploadMut.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
