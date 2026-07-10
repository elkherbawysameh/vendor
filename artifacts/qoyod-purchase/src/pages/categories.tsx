import { useAuth } from "@/hooks/use-auth";
import {
  useListVendorCategories,
  useCreateVendorCategory,
  useUpdateVendorCategory,
  useDeleteVendorCategory
} from "@workspace/api-client-react";
import { getListVendorCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { listDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Tags, Trash2, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DOCUMENT_TYPES_QUERY_KEY = ["vendor-document-types"];

export default function CategoriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<{id?: number, name: string, description: string} | null>(null);

  const { data: categories, isLoading } = useListVendorCategories();
  const createMut = useCreateVendorCategory();
  const updateMut = useUpdateVendorCategory();
  const deleteMut = useDeleteVendorCategory();

  const [docTypeModalOpen, setDocTypeModalOpen] = useState(false);
  const [editingDocType, setEditingDocType] = useState<{ id?: number; name: string } | null>(null);

  const { data: documentTypes, isLoading: docTypesLoading } = useQuery({
    queryKey: DOCUMENT_TYPES_QUERY_KEY,
    queryFn: listDocumentTypes,
  });

  const docTypeCreateMut = useMutation({
    mutationFn: (name: string) => createDocumentType(name),
  });
  const docTypeUpdateMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateDocumentType(id, name),
  });
  const docTypeDeleteMut = useMutation({
    mutationFn: (id: number) => deleteDocumentType(id),
  });

  // Role checks
  const canManage = user?.role === "admin" || user?.role === "accounts_manager";

  if (!canManage) {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized. Administrative access required.</div>;
  }

  const handleSave = async () => {
    if (!editingCat?.name.trim()) return;
    
    try {
      if (editingCat.id) {
        await updateMut.mutateAsync({ 
          id: editingCat.id, 
          data: { name: editingCat.name, description: editingCat.description || undefined } 
        });
        toast({ title: "Category updated" });
      } else {
        await createMut.mutateAsync({ 
          data: { name: editingCat.name, description: editingCat.description || undefined } 
        });
        toast({ title: "Category created" });
      }
      queryClient.invalidateQueries({ queryKey: getListVendorCategoriesQueryKey() });
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Operation failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteMut.mutateAsync({ id });
        queryClient.invalidateQueries({ queryKey: getListVendorCategoriesQueryKey() });
        toast({ title: "Category deleted" });
      } catch (e) {
        toast({ title: "Failed to delete", description: "Category might be in use", variant: "destructive" });
      }
    }
  };

  const handleSaveDocType = async () => {
    if (!editingDocType?.name.trim()) return;
    try {
      if (editingDocType.id) {
        await docTypeUpdateMut.mutateAsync({ id: editingDocType.id, name: editingDocType.name });
        toast({ title: "Document type updated" });
      } else {
        await docTypeCreateMut.mutateAsync(editingDocType.name);
        toast({ title: "Document type created" });
      }
      queryClient.invalidateQueries({ queryKey: DOCUMENT_TYPES_QUERY_KEY });
      setDocTypeModalOpen(false);
    } catch (e) {
      toast({ title: "Operation failed", variant: "destructive" });
    }
  };

  const handleDeleteDocType = async (id: number) => {
    if (confirm("Are you sure you want to delete this document type?")) {
      try {
        await docTypeDeleteMut.mutateAsync(id);
        queryClient.invalidateQueries({ queryKey: DOCUMENT_TYPES_QUERY_KEY });
        toast({ title: "Document type deleted" });
      } catch (e) {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Vendor Categories</h1>
          <p className="text-muted-foreground text-sm">Organize suppliers by type</p>
        </div>
        <Button onClick={() => { setEditingCat({name: '', description: ''}); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-primary pl-6 w-1/3">Name</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right pr-6 w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full max-w-sm" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    <Tags className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No categories defined yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((cat) => (
                  <TableRow key={cat.id} className="group">
                    <TableCell className="pl-6 font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" 
                          onClick={() => { setEditingCat({id: cat.id, name: cat.name, description: cat.description || ''}); setModalOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                          onClick={() => handleDelete(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
            <DialogTitle>{editingCat?.id ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name <span className="text-destructive">*</span></Label>
              <Input 
                value={editingCat?.name || ''} 
                onChange={e => setEditingCat(prev => prev ? {...prev, name: e.target.value} : null)} 
                placeholder="e.g. IT Equipment, Marketing Services"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input 
                value={editingCat?.description || ''} 
                onChange={e => setEditingCat(prev => prev ? {...prev, description: e.target.value} : null)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editingCat?.name.trim() || createMut.isPending || updateMut.isPending}>
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center pt-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Vendor Document Types</h1>
          <p className="text-muted-foreground text-sm">Manage the options offered in "Document Type" when recording a vendor document</p>
        </div>
        <Button onClick={() => { setEditingDocType({ name: '' }); setDocTypeModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Document Type
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-primary pl-6">Name</TableHead>
                <TableHead className="text-right pr-6 w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docTypesLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : documentTypes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No document types defined yet.
                  </TableCell>
                </TableRow>
              ) : (
                documentTypes?.map((docType) => (
                  <TableRow key={docType.id} className="group">
                    <TableCell className="pl-6 font-medium">{docType.name}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingDocType({ id: docType.id, name: docType.name }); setDocTypeModalOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDocType(docType.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={docTypeModalOpen} onOpenChange={setDocTypeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDocType?.id ? 'Edit Document Type' : 'New Document Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={editingDocType?.name || ''}
                onChange={e => setEditingDocType(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="e.g. Insurance Certificate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocTypeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDocType} disabled={!editingDocType?.name.trim() || docTypeCreateMut.isPending || docTypeUpdateMut.isPending}>
              Save Document Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
