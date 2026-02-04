"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, Loader2, Camera, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitVerification } from "@/lib/verification/actions";

interface FileUpload {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  key: string | null;
}

interface FileUploadBoxProps {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  file: FileUpload;
  setFile: React.Dispatch<React.SetStateAction<FileUpload>>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  type: "document" | "selfie";
  required?: boolean;
  onError: (msg: string) => void;
}

function FileUploadBox({
  label,
  description,
  icon: Icon,
  file,
  setFile,
  inputRef,
  type,
  required = true,
  onError,
}: FileUploadBoxProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      onError("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        file: selectedFile,
        preview: reader.result as string,
        uploading: false,
        key: `temp_${type}_${Date.now()}`,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const removeFile = () => {
    setFile({ file: null, preview: null, uploading: false, key: null });
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          file.preview
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file.preview ? (
          <div className="relative">
            {file.file?.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.preview}
                alt={label}
                className="max-h-40 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-40 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{file.file?.name}</p>
              </div>
            )}
            <button
              type="button"
              onClick={removeFile}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full hover:bg-destructive/80"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Icon className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Click to upload</p>
              <p className="text-xs">{description}</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export function VerificationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState<string>("");
  const [document, setDocument] = useState<FileUpload>({
    file: null,
    preview: null,
    uploading: false,
    key: null,
  });
  const [selfie, setSelfie] = useState<FileUpload>({
    file: null,
    preview: null,
    uploading: false,
    key: null,
  });

  const documentRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (!documentType) {
      setError("Please select a document type");
      setIsSubmitting(false);
      return;
    }

    if (!document.file || !document.key) {
      setError("Please upload your ID document");
      setIsSubmitting(false);
      return;
    }

    if (!selfie.file || !selfie.key) {
      setError("Please upload a selfie holding your ID");
      setIsSubmitting(false);
      return;
    }

    // In production, files would be uploaded to R2 here
    // For now, we simulate with the temp keys
    const result = await submitVerification({
      documentType: documentType as "id_card" | "passport" | "drivers_license",
      documentKey: document.key,
      selfieKey: selfie.key,
    });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to submit verification");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Type</CardTitle>
          <CardDescription>
            Select the type of identity document you will upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="documentType">ID Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id_card">National ID / Smart Card</SelectItem>
                <SelectItem value="passport">Passport</SelectItem>
                <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload clear photos of your ID. Files must be JPEG, PNG, WebP or PDF (max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploadBox
            label="ID Document"
            description="Clear photo of your ID (front side)"
            icon={CreditCard}
            file={document}
            setFile={setDocument}
            inputRef={documentRef}
            type="document"
            onError={setError}
          />

          <FileUploadBox
            label="Selfie with ID"
            description="Take a photo of yourself holding your ID"
            icon={Camera}
            file={selfie}
            setFile={setSelfie}
            inputRef={selfieRef}
            type="selfie"
            onError={setError}
          />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit for Verification
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Your information is encrypted and securely stored. We use it only for identity
        verification and will never share it with third parties.
      </p>
    </form>
  );
}
