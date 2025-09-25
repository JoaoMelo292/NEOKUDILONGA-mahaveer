
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import type { Product } from "@/lib/types";
import { useEffect, useState, ChangeEvent, useMemo } from "react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";
import { PlusCircle, Trash2, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { useData } from "@/context/data-context";
import { useLanguage } from "@/context/language-context";


interface AddEditBookSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  book?: Product;
}

const readingPlanItemSchema = z.object({
  schoolId: z.string().min(1, "A escola é obrigatória."),
  grade: z.union([z.coerce.number(), z.string()]).refine(val => val !== '', "O ano é obrigatório."),
  status: z.enum(["mandatory", "recommended"]),
});

const bookFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  price: z.coerce.number().min(0, "O preço deve ser um número positivo."),
  stock: z.coerce.number().min(0, "O stock deve ser um número positivo."),
  image: z.string().min(1, "A imagem é obrigatória."),
  category: z.string().min(1, "A categoria é obrigatória."), // Will store the i18n name
  publisher: z.string().optional(),
  stockStatus: z.enum(['in_stock', 'out_of_stock', 'sold_out']),
  readingPlan: z.array(readingPlanItemSchema).optional(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

export function AddEditBookSheet({
  isOpen,
  setIsOpen,
  book,
}: AddEditBookSheetProps) {
  const { schools, categories, publishers, readingPlan, addProduct, updateProduct } = useData();
  const { t, language } = useLanguage();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bookCategories = useMemo(() => categories.filter(c => c.type === 'book'), [categories]);

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      image: "",
      category: "",
      publisher: "",
      stockStatus: 'in_stock',
      readingPlan: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "readingPlan",
  });

  useEffect(() => {
    if (isOpen) {
      if (book) {
        const bookReadingPlan = readingPlan
          .filter(rp => rp.productId === book.id)
          .map(rp => ({ schoolId: rp.schoolId, grade: rp.grade, status: rp.status }));
        
        form.reset({
          name: book.name,
          description: book.description,
          price: book.price,
          stock: book.stock,
          image: book.image,
          category: book.category,
          publisher: book.publisher,
          stockStatus: book.stockStatus || 'in_stock',
          readingPlan: bookReadingPlan
        });
        setImagePreview(book.image);
      } else {
        form.reset({
          name: "",
          description: "",
          price: 0,
          stock: 0,
          image: "",
          category: "",
          publisher: "",
          stockStatus: "in_stock",
          readingPlan: [],
        });
        setImagePreview(null);
      }
    }
  }, [book, form, isOpen, readingPlan]);


  const onSubmit = async (data: BookFormValues) => {
    setAsyncError(null);
    setIsSaving(true);
    const productData: Product = {
      id: book?.id || '',
      type: 'book',
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      image: data.image,
      images: [],
      category: data.category,
      publisher: data.publisher,
      stockStatus: data.stockStatus
    };
    const readingPlanData = data.readingPlan || [];
    try {
      if (book) {
        await updateProduct(productData, readingPlanData);
      } else {
        await addProduct(productData, readingPlanData);
      }
      setIsOpen(false);
    } catch (err: any) {
      setAsyncError(err?.message || "Erro ao guardar alterações. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };
  
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Upload to Firebase Storage
      const storage = getStorage(app);
      const fileRef = storageRef(storage, `products/${Date.now()}_${file.name}`);
      uploadBytes(fileRef, file)
        .then(async (snapshot) => {
          const url = await getDownloadURL(fileRef);
          form.setValue("image", url);
          setImagePreview(url);
        })
        .catch((error) => {
          alert("Failed to upload image: " + error.message);
        });
    }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result as string;
                        form.setValue("image", base64String);
                        setImagePreview(base64String);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{book ? "Editar Livro" : "Adicionar Novo Livro"}</SheetTitle>
              <SheetDescription>
                {book
                  ? "Atualize os detalhes deste livro."
                  : "Preencha os detalhes para o novo livro."}
              </SheetDescription>
            </SheetHeader>
            {asyncError && (
              <div className="mb-2 rounded border border-red-500 bg-red-100 px-3 py-2 text-sm text-red-700">
                {asyncError}
              </div>
            )}
            <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-6">
              <div className="space-y-2">
         <Label>Nome do Livro</Label>
         <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
          <FormItem>
            <FormControl>
            <Input placeholder="Nome do Livro" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
          )}
        />
              </div>

         <div className="space-y-2">
         <Label>Descrição</Label>
         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
          <FormItem>
            <FormControl>
            <Textarea placeholder="Descrição do Livro" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
          )}
        />
        </div>
              
               <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem da Capa do Livro</FormLabel>
                    <FormControl>
                        <div 
                            className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background/50 p-4 text-center transition-colors hover:border-primary"
                            onPaste={handlePaste}
                        >
                            {imagePreview ? (
                                <Image src={imagePreview} alt="Pré-visualização da capa do livro" width={200} height={200} className="mb-2 max-h-48 w-auto rounded-md object-contain" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Upload className="h-8 w-8" />
                                    <p className="font-semibold">Cole uma imagem</p>
                                    <p className="text-xs">ou</p>
                                </div>
                            )}
                            
                             <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>
                                <Upload className="mr-2" />
                                Carregar uma Imagem
                            </Button>

                            <Input 
                                id="image-upload" 
                                type="file" 
                                className="sr-only" 
                                accept="image/*"
                                onChange={handleImageChange}
                             />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preço</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Stock</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma categoria" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {bookCategories.map((category) => (
                                  <SelectItem key={category.name.pt + category.name.en} value={category.name[language]}>
                                    {category.name[language]}
                                  </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="publisher"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Editora</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma editora" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {publishers.map(pub => (
                                    <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="stockStatus"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Estado do Stock</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="in_stock" />
                                </FormControl>
                                <FormLabel className="font-normal">Em Stock</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="out_of_stock" />
                                </FormControl>
                                <FormLabel className="font-normal">Atraso na Entrega</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="sold_out" />
                                </FormControl>
                                <FormLabel className="font-normal">Esgotado</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

              <div>
                <Label>Plano de Leitura</Label>
                 <FormDescription className="mb-2">
                    Adicione este livro aos planos de leitura das escolas.
                </FormDescription>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-4 rounded-md border p-4">
                        <div className="flex items-end gap-2">
                            <FormField
                                control={form.control}
                                name={`readingPlan.${index}.schoolId`}
                                render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Escola</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma escola" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {schools.map(school => (
                                        <SelectItem key={school.id} value={school.id}>{school.name[language] || school.name.pt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`readingPlan.${index}.grade`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ano</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Ex: 1 ou Iniciação" className="w-28" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <FormField
                            control={form.control}
                            name={`readingPlan.${index}.status`}
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Estado</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="mandatory" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Obrigatório</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="recommended" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Recomendado</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ schoolId: '', grade: '', status: 'mandatory' })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar ao Plano de Leitura
                  </Button>
                </div>
              </div>


            </div>
            <SheetFooter className="mt-auto pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "A guardar..." : "Guardar Alterações"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
